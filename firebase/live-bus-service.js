import { realtimePaths } from "./realtime-paths.js";
import { realtimeService } from "./realtime-service.js";

export const driverSessionLockDefaults = {
  heartbeatTimeoutMs: 45000
};

const ENDED_DRIVER_STATUSES = ["completed", "ended", "inactive", "offline", "ready", "stopped"];

function getTimestampMs(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

function normalizeTrackingStatus(status) {
  return String(status || "").trim().toLowerCase();
}

function isDriverSessionEnded(session) {
  const status = normalizeTrackingStatus(session && session.tracking_status);

  return (
    !session ||
    !session.session_active ||
    ENDED_DRIVER_STATUSES.indexOf(status) !== -1
  );
}

function isDriverSessionStale(session, options) {
  const timeoutMs =
    Number(options && options.heartbeatTimeoutMs) ||
    driverSessionLockDefaults.heartbeatTimeoutMs;
  const heartbeatTime = getTimestampMs(
    session && (session.last_heartbeat || session.session_started_at)
  );

  if (isDriverSessionEnded(session)) {
    return true;
  }

  if (!heartbeatTime) {
    return true;
  }

  return Date.now() - heartbeatTime > timeoutMs;
}

function isSameDriverSession(session, sessionId) {
  return Boolean(session && session.session_id && session.session_id === sessionId);
}

function buildDriverSessionPayload(busId, session, timestamp) {
  return {
    bus_id: busId,
    session_id: session.sessionId || session.session_id || "",
    session_active: typeof session.sessionActive === "boolean" ? session.sessionActive : true,
    session_started_at: session.sessionStartedAt || session.session_started_at || timestamp,
    tracking_status: session.trackingStatus || session.tracking_status || "active",
    last_heartbeat: timestamp
  };
}

export const liveBusService = {
  subscribeToBusLocation: function (busId, onLocation, onError) {
    return realtimeService.subscribe(
      realtimePaths.busLocation(busId),
      onLocation,
      onError
    );
  },

  subscribeToBusEta: function (busId, stopId, onEta, onError) {
    return realtimeService.subscribe(
      realtimePaths.busEta(busId, stopId),
      onEta,
      onError
    );
  },

  subscribeToBusStatus: function (busId, onStatus, onError) {
    return realtimeService.subscribe(
      realtimePaths.busStatus(busId),
      onStatus,
      onError
    );
  },

  subscribeToRouteBuses: function (routeId, onBuses, onError) {
    return realtimeService.subscribe(
      realtimePaths.routeBuses(routeId),
      onBuses,
      onError
    );
  },

  subscribeToCrowdUpdates: function (busId, onUpdates, onError) {
    return realtimeService.subscribe(
      realtimePaths.crowdUpdates(busId),
      onUpdates,
      onError
    );
  },

  subscribeToActiveDriverSession: function (busId, onSession, onError) {
    return realtimeService.subscribe(
      realtimePaths.activeDriverSession(busId),
      onSession,
      onError
    );
  },

  subscribeToOperationalEvents: function (busId, onEvents, onError) {
    return realtimeService.subscribe(
      realtimePaths.busEventsActive(busId),
      onEvents,
      onError
    );
  },

  readActiveDriverSession: async function (busId) {
    return realtimeService.read(realtimePaths.activeDriverSession(busId));
  },

  acquireDriverSessionLock: async function (busId, session, options) {
    const current = await liveBusService.readActiveDriverSession(busId);

    if (!current.ok) {
      return current;
    }

    if (
      current.value &&
      !isSameDriverSession(current.value, session && (session.sessionId || session.session_id)) &&
      !isDriverSessionStale(current.value, options)
    ) {
      return {
        ok: false,
        locked: true,
        path: realtimePaths.activeDriverSession(busId),
        value: current.value,
        reason: "This bus already has an active live session."
      };
    }

    const timestamp = await realtimeService.timestamp();
    const payload = buildDriverSessionPayload(busId, session || {}, timestamp);
    const result = await realtimeService.write(
      realtimePaths.activeDriverSession(busId),
      payload
    );

    return Object.assign({}, result, {
      locked: false,
      value: payload
    });
  },

  heartbeatDriverSessionLock: async function (busId, session, options) {
    const sessionId = session && (session.sessionId || session.session_id);
    const current = await liveBusService.readActiveDriverSession(busId);

    if (!current.ok) {
      return current;
    }

    if (
      current.value &&
      !isSameDriverSession(current.value, sessionId) &&
      !isDriverSessionStale(current.value, options)
    ) {
      return {
        ok: false,
        locked: true,
        path: realtimePaths.activeDriverSession(busId),
        value: current.value,
        reason: "This bus already has an active live session."
      };
    }

    const timestamp = await realtimeService.timestamp();
    const payload = buildDriverSessionPayload(busId, session || {}, timestamp);
    const result = await realtimeService.patch(
      realtimePaths.activeDriverSession(busId),
      payload
    );

    return Object.assign({}, result, {
      locked: false,
      value: payload
    });
  },

  releaseDriverSessionLock: async function (busId, session) {
    const sessionId = session && (session.sessionId || session.session_id);
    const current = await liveBusService.readActiveDriverSession(busId);

    if (
      current.ok &&
      current.value &&
      sessionId &&
      !isSameDriverSession(current.value, sessionId) &&
      !isDriverSessionStale(current.value)
    ) {
      return {
        ok: false,
        locked: true,
        path: realtimePaths.activeDriverSession(busId),
        value: current.value,
        reason: "This bus already has an active live session."
      };
    }

    const timestamp = await realtimeService.timestamp();
    const payload = {
      bus_id: busId,
      session_id: session && (session.sessionId || session.session_id) || "",
      session_active: false,
      tracking_status: session && (session.trackingStatus || session.tracking_status) || "ended",
      last_heartbeat: timestamp,
      released_at: timestamp
    };

    return realtimeService.patch(
      realtimePaths.activeDriverSession(busId),
      payload
    );
  },

  publishCrowdUpdate: async function (busId, update) {
    update = update || {};

    const timestamp = await realtimeService.timestamp();
    const joinedAt = update.joinedAt || update.joined_at || timestamp;

    return realtimeService.add(realtimePaths.crowdUpdates(busId), {
      busId: busId,
      bus_id: update.bus_id || busId,
      type: update.type || "crowd_update",
      crowdLevel: update.crowdLevel || "",
      crowd_level: update.crowd_level || update.crowdLevel || "",
      confidence: update.confidence || 0,
      userId: update.userId || "anonymous",
      joinedAt: joinedAt,
      joined_at: joinedAt,
      destinationStop: update.destinationStop || "",
      destination_stop: update.destination_stop || update.destinationStop || "",
      sessionActive: typeof update.sessionActive === "boolean" ? update.sessionActive : !!update.session_active,
      session_active: typeof update.session_active === "boolean" ? update.session_active : !!update.sessionActive,
      createdAt: timestamp
    });
  },

  publishOperationalEvent: async function (busId, eventType, event) {
    event = event || {};
    const timestamp = await realtimeService.timestamp();
    const payload = {
      event_type: String(eventType || event.event_type || "").trim(),
      severity: String(event.severity || "info").trim(),
      title: String(event.title || "").trim(),
      message: String(event.message || "").trim(),
      started_at: event.started_at || event.startedAt || timestamp,
      last_seen_at: timestamp,
      bus_id: busId
    };

    if (!payload.event_type) {
      return {
        ok: false,
        reason: "eventType is required."
      };
    }

    // Patch into the active event slot.
    const result = await realtimeService.patch(
      "liveBuses/" + encodeURIComponent(busId),
      {
        events: {
          updated_at: timestamp,
          active: {
            [payload.event_type]: payload
          }
        }
      }
    );

    return Object.assign({}, result, { value: payload });
  },

  clearOperationalEvent: async function (busId, eventType) {
    const timestamp = await realtimeService.timestamp();
    const type = String(eventType || "").trim();
    if (!type) {
      return {
        ok: false,
        reason: "eventType is required."
      };
    }

    // Firebase RTDB deletes on patch with null.
    return realtimeService.patch("liveBuses/" + encodeURIComponent(busId), {
      events: {
        updated_at: timestamp,
        active: {
          [type]: null
        }
      }
    });
  },

  publishBusLocation: async function (busId, location, session) {
    const timestamp = await realtimeService.timestamp();
    const trackingStatus = session && session.trackingStatus
      ? session.trackingStatus
      : "active";
    const sessionActive = session && typeof session.sessionActive === "boolean"
      ? session.sessionActive
      : true;

    const payload = {
      bus_id: busId,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      speed: location.speed,
      heading: location.heading,
      timestamp: timestamp,
      session_active: sessionActive,
      tracking_status: trackingStatus
    };

    // Optional stop-aware route progression fields (additive; safe for older clients).
    if (typeof location.current_stop_index === "number") {
      payload.current_stop_index = location.current_stop_index;
    }
    if (typeof location.next_stop_index === "number") {
      payload.next_stop_index = location.next_stop_index;
    }
    if (typeof location.stops_total === "number") {
      payload.stops_total = location.stops_total;
    }
    if (typeof location.stops_remaining === "number") {
      payload.stops_remaining = location.stops_remaining;
    }
    if (typeof location.at_stop === "boolean") {
      payload.at_stop = location.at_stop;
    }
    if (typeof location.approaching_stop === "boolean") {
      payload.approaching_stop = location.approaching_stop;
    }
    if (location.current_stop_id) {
      payload.current_stop_id = location.current_stop_id;
    }
    if (location.current_stop_name) {
      payload.current_stop_name = location.current_stop_name;
    }
    if (location.next_stop_id) {
      payload.next_stop_id = location.next_stop_id;
    }
    if (location.next_stop_name) {
      payload.next_stop_name = location.next_stop_name;
    }
    if (location.trip_id) {
      payload.trip_id = location.trip_id;
    }
    if (location.trip_lifecycle) {
      payload.trip_lifecycle = location.trip_lifecycle;
    }
    if (location.trip_direction) {
      payload.trip_direction = location.trip_direction;
    }
    if (typeof location.trip_progress_percent === "number") {
      payload.trip_progress_percent = location.trip_progress_percent;
    }
    if (typeof location.trip_nearing_completion === "boolean") {
      payload.trip_nearing_completion = location.trip_nearing_completion;
    }
    if (location.trip_schedule_adherence) {
      payload.trip_schedule_adherence = location.trip_schedule_adherence;
    }
    if (location.trip_schedule_label) {
      payload.trip_schedule_label = location.trip_schedule_label;
    }
    if (typeof location.trip_delay_minutes === "number") {
      payload.trip_delay_minutes = location.trip_delay_minutes;
    }
    if (location.trip_operational_health) {
      payload.trip_operational_health = location.trip_operational_health;
    }

    // Lightweight consolidated operational state (optional; additive).
    if (location.operational_state_label) {
      payload.operational_state_label = location.operational_state_label;
    }
    if (location.operational_state_state) {
      payload.operational_state_state = location.operational_state_state;
    }
    if (location.operational_state_tone) {
      payload.operational_state_tone = location.operational_state_tone;
    }
    if (typeof location.operational_state_rank === "number") {
      payload.operational_state_rank = location.operational_state_rank;
    }
    if (typeof location.operational_state_confidence === "number") {
      payload.operational_state_confidence = location.operational_state_confidence;
    }
    if (location.operational_state_reason) {
      payload.operational_state_reason = location.operational_state_reason;
    }

    // Trust-weighted fusion (optional; additive, privacy-preserving aggregate only).
    if (typeof location.trust_score === "number") {
      payload.trust_score = location.trust_score;
    }
    if (location.trust_label) {
      payload.trust_label = location.trust_label;
    }
    if (location.trust_reason) {
      payload.trust_reason = location.trust_reason;
    }

    return realtimeService.write(realtimePaths.busLocation(busId), payload);
  },

  publishDriverLocation: async function (busId, location) {
    return liveBusService.publishBusLocation(busId, location, {
      sessionActive: true,
      trackingStatus: "active"
    });
  },

  updateTrackingStatus: async function (busId, session) {
    const timestamp = await realtimeService.timestamp();
    const trackingStatus = session && session.trackingStatus
      ? session.trackingStatus
      : "ready";
    const sessionActive = session && typeof session.sessionActive === "boolean"
      ? session.sessionActive
      : false;
    const closedAt = session && session.closed ? timestamp : null;
    const statusPayload = {
      bus_id: busId,
      session_active: sessionActive,
      tracking_status: trackingStatus,
      timestamp: timestamp
    };
    const locationPayload = {
      bus_id: busId,
      session_active: sessionActive,
      tracking_status: trackingStatus,
      timestamp: timestamp
    };

    if (closedAt) {
      statusPayload.closed_at = closedAt;
      locationPayload.closed_at = closedAt;
    }

    const busResult = await realtimeService.patch("liveBuses/" + encodeURIComponent(busId), {
      bus_id: busId,
      session_active: sessionActive,
      tracking_status: trackingStatus,
      updated_at: timestamp,
      closed_at: closedAt
    });

    const statusResult = await realtimeService.write(
      realtimePaths.busStatus(busId),
      statusPayload
    );

    const locationResult = await realtimeService.patch(
      realtimePaths.busLocation(busId),
      locationPayload
    );

    return {
      ok: busResult.ok && statusResult.ok && locationResult.ok,
      busResult: busResult,
      statusResult: statusResult,
      locationResult: locationResult
    };
  },

  setJourneyActive: async function (busId, active) {
    return liveBusService.updateTrackingStatus(busId, {
      sessionActive: !!active,
      trackingStatus: active ? "active" : "stopped"
    });
  },

  readBusSnapshot: async function (busId) {
    return realtimeService.read("liveBuses/" + encodeURIComponent(busId));
  }
};
