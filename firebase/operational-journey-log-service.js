import { realtimePaths } from "./realtime-paths.js";
import { realtimeService } from "./realtime-service.js";

const LOG_SCHEMA_VERSION = 1;
const ALLOWED_EVENT_TYPES = [
  "journey_started",
  "gps_update",
  "crowd_update",
  "segment_completed",
  "operational_event",
  "journey_paused",
  "journey_resumed",
  "journey_ended"
];

function getDateKey(date) {
  const activeDate = date instanceof Date ? date : new Date();
  return activeDate.toISOString().slice(0, 10);
}

function normalizeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeEventType(value) {
  return ALLOWED_EVENT_TYPES.indexOf(value) !== -1 ? value : "gps_update";
}

function buildEventPayload(eventType, event) {
  event = event || {};

  return {
    schema_version: LOG_SCHEMA_VERSION,
    event_type: normalizeEventType(eventType),
    bus_id: normalizeText(event.bus_id || event.busId),
    route_id: normalizeText(event.route_id || event.routeId),
    session_id: normalizeText(event.session_id || event.sessionId),
    trip_id: normalizeText(event.trip_id || event.tripId),
    timestamp: event.timestamp || null,
    latitude: normalizeNumber(event.latitude),
    longitude: normalizeNumber(event.longitude),
    accuracy: normalizeNumber(event.accuracy),
    speed: normalizeNumber(event.speed),
    heading: normalizeNumber(event.heading),
    signal_health: normalizeText(event.signal_health || event.signalHealth),
    crowd_status: normalizeText(event.crowd_status || event.crowdStatus),
    // Optional learning/audit fields (used by lightweight adaptive learning).
    segment_id: normalizeText(event.segment_id || event.segmentId),
    from_stop_id: normalizeText(event.from_stop_id || event.fromStopId),
    to_stop_id: normalizeText(event.to_stop_id || event.toStopId),
    observed_time_minutes: normalizeNumber(event.observed_time_minutes ?? event.observedTimeMinutes),
    ema_time_minutes: normalizeNumber(event.ema_time_minutes ?? event.emaTimeMinutes),
    sample_count: normalizeNumber(event.sample_count ?? event.sampleCount),
    day_type: normalizeText(event.day_type || event.dayType),
    time_bucket: normalizeText(event.time_bucket || event.timeBucket),
    // Optional operational event intelligence fields.
    operational_event_type: normalizeText(event.operational_event_type || event.operationalEventType),
    severity: normalizeText(event.severity),
    title: normalizeText(event.title),
    message: normalizeText(event.message),
    tracking_status: normalizeText(event.tracking_status || event.trackingStatus),
    delay_minutes: normalizeNumber(event.delay_minutes ?? event.delayMinutes),
    trip_progress_percent: normalizeNumber(event.trip_progress_percent ?? event.tripProgressPercent),
    session_active:
      typeof event.session_active === "boolean"
        ? event.session_active
        : typeof event.sessionActive === "boolean"
          ? event.sessionActive
          : null
  };
}

export const operationalJourneyLogService = {
  eventTypes: ALLOWED_EVENT_TYPES.slice(),

  logEvent: async function (eventType, event) {
    const busId = normalizeText(event && (event.bus_id || event.busId));

    if (!busId) {
      return {
        ok: false,
        reason: "bus_id is required for operational journey logging."
      };
    }

    const timestamp = await realtimeService.timestamp();
    const payload = buildEventPayload(eventType, Object.assign({}, event, {
      timestamp: timestamp
    }));

    return realtimeService.add(
      realtimePaths.operationalJourneyEvents(busId, getDateKey()),
      payload
    );
  },

  /**
   * Read operational journey logs for a bus + day.
   *
   * Returns: { ok, path, events: Array<event>, raw }
   */
  readEvents: async function (busId, dateKey) {
    const safeBusId = normalizeText(busId);
    const safeDateKey = normalizeText(dateKey) || getDateKey();

    if (!safeBusId) {
      return {
        ok: false,
        reason: "busId is required."
      };
    }

    const path = realtimePaths.operationalJourneyEvents(safeBusId, safeDateKey);
    const result = await realtimeService.read(path);

    if (!result || !result.ok) {
      return Object.assign({ ok: false, path: path }, result || {});
    }

    const raw = result.value;
    const events = Object.keys(raw || {})
      .map(function (key) {
        const value = raw && raw[key];
        if (!value || typeof value !== "object") {
          return null;
        }
        return Object.assign({ _key: key }, value);
      })
      .filter(Boolean)
      .sort(function (a, b) {
        const t1 = typeof a.timestamp === "number" ? a.timestamp : 0;
        const t2 = typeof b.timestamp === "number" ? b.timestamp : 0;
        return t1 - t2;
      });

    return {
      ok: true,
      path: path,
      events: events,
      raw: raw
    };
  }
};

if (typeof window !== "undefined") {
  window.BusTrackOperationalJourneyLog = operationalJourneyLogService;
}
