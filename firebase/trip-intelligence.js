export const tripIntelligenceDefaults = {
  onTimeWindowMinutes: 3,
  recoveringDelayMinutes: 3,
  nearingCompletionPercent: 85,
  activeEarlyWindowMinutes: 30,
  activeLateWindowMinutes: 120
};

const HEALTH_RANK = {
  "Stable Operation": 0,
  "Minor Delay": 1,
  "Recovering Signal": 2,
  "Operational Disruption": 3
};

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeStatus(value) {
  return normalizeText(value).toUpperCase();
}

function getMinutesOfDay(date) {
  var activeDate = date instanceof Date ? date : new Date();

  return activeDate.getHours() * 60 + activeDate.getMinutes();
}

export function getServiceDateKey(date) {
  return getServiceDateKeyInternal(date);
}

function getServiceDateKeyInternal(date) {
  var activeDate = date instanceof Date ? date : new Date();
  var year = activeDate.getFullYear();
  var month = String(activeDate.getMonth() + 1).padStart(2, "0");
  var day = String(activeDate.getDate()).padStart(2, "0");

  return year + "-" + month + "-" + day;
}

export function parseScheduleTime(value) {
  var parts = normalizeText(value).split(":");
  var hours = Number(parts[0]);
  var minutes = Number(parts[1]);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

export function getMinutesOfDayFor(date) {
  return getMinutesOfDay(date);
}

function getBusByNumber(network, busNo) {
  var buses = network && Array.isArray(network.buses) ? network.buses : [];
  var normalized = normalizeText(busNo).toUpperCase();

  return buses.find(function (bus) {
    return normalizeText(bus.bus_number).toUpperCase() === normalized ||
      normalizeText(bus.bus_id).toUpperCase() === normalized;
  }) || null;
}

function getRouteForBus(network, bus, routeId) {
  var routeMap = network && network.routeMap ? network.routeMap : {};
  var id = normalizeText(routeId || (bus && bus.assigned_route));

  return id ? routeMap[id] || null : null;
}

function getEffectiveStopTimings(trip, route) {
  // Trip-level stop_times override route-level stop_timings.
  var tripTimings = trip && Array.isArray(trip.stop_times) ? trip.stop_times : null;
  if (tripTimings && tripTimings.length) {
    return tripTimings;
  }

  return route && Array.isArray(route.stop_timings) ? route.stop_timings : [];
}

function getTripWindow(route, trip) {
  var timings = getEffectiveStopTimings(trip, route);
  var start = timings.length ? parseScheduleTime(timings[0].arrival_time) : null;
  var end = timings.length ? parseScheduleTime(timings[timings.length - 1].arrival_time) : null;

  if (start !== null && end !== null && end < start) {
    end += 24 * 60;
  }

  return {
    startMinutes: start,
    endMinutes: end
  };
}

export function getTripWindowForRoute(route) {
  return getTripWindow(route, null);
}

function scoreTripForNow(trip, route, nowMinutes, todayKey, defaults) {
  var status = normalizeStatus(trip && trip.live_status);
  var window = getTripWindow(route, trip);
  var serviceDate = normalizeText(trip && trip.service_date);
  var score = 0;
  var adjustedNow = nowMinutes;

  if (status === "RUNNING") {
    score -= 10000;
  }

  if (serviceDate && serviceDate !== todayKey) {
    score += 2000;
  }

  if (window.startMinutes === null || window.endMinutes === null) {
    return score + 1000;
  }

  if (adjustedNow < window.startMinutes - defaults.activeEarlyWindowMinutes && window.endMinutes > 24 * 60) {
    adjustedNow += 24 * 60;
  }

  if (
    adjustedNow >= window.startMinutes - defaults.activeEarlyWindowMinutes &&
    adjustedNow <= window.endMinutes + defaults.activeLateWindowMinutes
  ) {
    score -= 500;
  }

  return score + Math.abs(adjustedNow - window.startMinutes);
}

export function identifyActiveTrip(options) {
  options = options || {};
  var defaults = Object.assign({}, tripIntelligenceDefaults, options.thresholds);
  var network = options.network || {};
  var now = options.now instanceof Date ? options.now : new Date();
  var todayKey = getServiceDateKeyInternal(now);
  var nowMinutes = getMinutesOfDay(now);
  var bus = options.bus || getBusByNumber(network, options.busNo || options.busId);
  var route = getRouteForBus(network, bus, options.routeId);
  var trips = Array.isArray(network.trips) ? network.trips : [];
  var candidates;

  if (options.tripId) {
    var normalizedTripId = normalizeText(options.tripId);
    var explicit = trips.find(function (trip) {
      return trip && normalizeText(trip.trip_id) === normalizedTripId;
    }) || null;

    if (explicit) {
      // If a bus is known, ensure the trip is actually for that bus.
      if (bus && explicit.bus_id && explicit.bus_id !== bus.bus_id) {
        // fall through to normal selection
      } else {
        route = network.routeMap && explicit.route_id && network.routeMap[explicit.route_id]
          ? network.routeMap[explicit.route_id]
          : route;

        return {
          available: true,
          trip: explicit,
          bus: bus,
          route: route,
          reason: ""
        };
      }
    }
  }

  if (!bus || !route) {
    return {
      available: false,
      trip: null,
      bus: bus,
      route: route,
      reason: "Trip data unavailable"
    };
  }

  candidates = trips.filter(function (trip) {
    return trip &&
      trip.bus_id === bus.bus_id &&
      (!options.routeId || trip.route_id === route.route_id);
  });

  if (!candidates.length) {
    candidates = trips.filter(function (trip) {
      return trip && trip.bus_id === bus.bus_id;
    });
  }

  if (!candidates.length) {
    return {
      available: false,
      trip: null,
      bus: bus,
      route: route,
      reason: "No scheduled trip for this bus"
    };
  }

  candidates = candidates.slice().sort(function (a, b) {
    var routeA = network.routeMap && network.routeMap[a.route_id] ? network.routeMap[a.route_id] : route;
    var routeB = network.routeMap && network.routeMap[b.route_id] ? network.routeMap[b.route_id] : route;

    return scoreTripForNow(a, routeA, nowMinutes, todayKey, defaults) -
      scoreTripForNow(b, routeB, nowMinutes, todayKey, defaults);
  });

  route = network.routeMap && network.routeMap[candidates[0].route_id]
    ? network.routeMap[candidates[0].route_id]
    : route;

  return {
    available: true,
    trip: candidates[0],
    bus: bus,
    route: route,
    reason: ""
  };
}

function isSameServiceDate(trip, todayKey) {
  var serviceDate = normalizeText(trip && trip.service_date);
  return !serviceDate || serviceDate === todayKey;
}

export function isTripWithinServiceWindow(options) {
  options = options || {};
  var defaults = Object.assign({}, tripIntelligenceDefaults, options.thresholds);
  var trip = options.trip;
  var route = options.route;
  var now = options.now instanceof Date ? options.now : new Date();
  var nowMinutes = getMinutesOfDay(now);
  var todayKey = getServiceDateKeyInternal(now);
  var status = normalizeStatus(trip && trip.live_status);

  if (!trip || !route) {
    return false;
  }

  if (status === "RUNNING") {
    return true;
  }

  if (!isSameServiceDate(trip, todayKey)) {
    return false;
  }

  var window = getTripWindow(route, trip);
  if (window.startMinutes === null || window.endMinutes === null) {
    return false;
  }

  var adjustedNow = nowMinutes;
  if (adjustedNow < window.startMinutes - defaults.activeEarlyWindowMinutes && window.endMinutes > 24 * 60) {
    adjustedNow += 24 * 60;
  }

  return (
    adjustedNow >= window.startMinutes - defaults.activeEarlyWindowMinutes &&
    adjustedNow <= window.endMinutes + defaults.activeLateWindowMinutes
  );
}

function findStopIndex(route, stopIdOrIndex, trip) {
  if (typeof stopIdOrIndex === "number" && Number.isFinite(stopIdOrIndex)) {
    return Math.max(0, stopIdOrIndex);
  }

  var stopId = normalizeText(stopIdOrIndex);
  if (!stopId) return null;

  var timings = getEffectiveStopTimings(trip, route);
  var ordered = route && Array.isArray(route.ordered_stops) ? route.ordered_stops : [];

  var timingIndex = timings.findIndex(function (timing) {
    return timing && normalizeText(timing.stop_id) === stopId;
  });
  if (timingIndex >= 0) return timingIndex;

  var stopIndex = ordered.findIndex(function (id) {
    return normalizeText(id) === stopId;
  });
  if (stopIndex >= 0) return stopIndex;

  return null;
}

function normalizeMinutesForOvernight(window, scheduleMinutes) {
  if (!window || window.startMinutes === null || window.endMinutes === null) {
    return scheduleMinutes;
  }
  if (window.endMinutes <= 24 * 60) {
    return scheduleMinutes;
  }
  if (scheduleMinutes !== null && scheduleMinutes < window.startMinutes) {
    return scheduleMinutes + 24 * 60;
  }
  return scheduleMinutes;
}

function normalizeNowMinutesForOvernight(window, nowMinutes, defaults) {
  if (!window || window.startMinutes === null || window.endMinutes === null) {
    return nowMinutes;
  }
  if (window.endMinutes <= 24 * 60) {
    return nowMinutes;
  }

  var adjustedNow = nowMinutes;
  if (adjustedNow < window.startMinutes - defaults.activeEarlyWindowMinutes) {
    adjustedNow += 24 * 60;
  }
  return adjustedNow;
}

export function computeScheduledEta(options) {
  options = options || {};
  var defaults = Object.assign({}, tripIntelligenceDefaults, options.thresholds);
  var network = options.network || {};
  var now = options.now instanceof Date ? options.now : new Date();
  var identified = options.trip && options.route
    ? { available: true, trip: options.trip, route: options.route, bus: options.bus || null }
    : identifyActiveTrip({
        network: network,
        busNo: options.busNo || options.busId,
        busId: options.busId,
        routeId: options.routeId,
        tripId: options.tripId,
        now: now,
        thresholds: defaults
      });

  if (!identified.available || !identified.route || !identified.trip) {
    return {
      available: false,
      mode: "none",
      label: "No active service",
      reason: identified && identified.reason ? identified.reason : "Trip data unavailable",
      minutes: null,
      scheduledTime: "",
      tripId: "",
      routeId: ""
    };
  }

  // When the caller asks for a specific tripId (passenger search results),
  // allow ETA computation even when the trip is not yet in the "active service" window.
  if (!options.tripId) {
    if (!isTripWithinServiceWindow({ trip: identified.trip, route: identified.route, now: now, thresholds: defaults })) {
      return {
        available: false,
        mode: "none",
        label: "No active service",
        reason: "No active scheduled service window",
        minutes: null,
        scheduledTime: "",
        tripId: identified.trip.trip_id || "",
        routeId: identified.route.route_id || ""
      };
    }
  }

  var stopIndex = findStopIndex(
    identified.route,
    options.stopIndex !== undefined ? options.stopIndex : options.stopId,
    identified.trip
  );
  if (stopIndex === null) {
    return {
      available: false,
      mode: "none",
      label: "No active service",
      reason: "Stop timing unavailable",
      minutes: null,
      scheduledTime: "",
      tripId: identified.trip.trip_id || "",
      routeId: identified.route.route_id || ""
    };
  }

  var timings = getEffectiveStopTimings(identified.trip, identified.route);
  var timing = timings[Math.min(stopIndex, timings.length - 1)];
  var scheduleMinutes = timing ? parseScheduleTime(timing.arrival_time) : null;

  if (scheduleMinutes === null) {
    return {
      available: false,
      mode: "none",
      label: "No active service",
      reason: "Stop timing unavailable",
      minutes: null,
      scheduledTime: timing && timing.arrival_time ? timing.arrival_time : "",
      tripId: identified.trip.trip_id || "",
      routeId: identified.route.route_id || ""
    };
  }

  var window = getTripWindow(identified.route, identified.trip);
  var normalizedScheduleMinutes = normalizeMinutesForOvernight(window, scheduleMinutes);
  var adjustedNow = normalizeNowMinutesForOvernight(window, getMinutesOfDay(now), defaults);

  var delta = Math.round(normalizedScheduleMinutes - adjustedNow);
  if (delta < 0) {
    delta = 0;
  }

  var arrivingSoon = delta <= 1;
  var label = arrivingSoon ? "Arriving Soon" : "Arriving in " + delta + " min";

  return {
    available: true,
    mode: "scheduled",
    label: label,
    minutes: delta,
    arrivingSoon: arrivingSoon,
    scheduledTime: timing && timing.arrival_time ? timing.arrival_time : "",
    tripId: identified.trip.trip_id || "",
    routeId: identified.route.route_id || "",
    stopIndex: stopIndex
  };
}

function getScheduleMinutesForStop(route, stopIndex) {
  var timings = route && Array.isArray(route.stop_timings) ? route.stop_timings : [];
  var timing = timings[stopIndex];

  return timing ? parseScheduleTime(timing.arrival_time) : null;
}

function getScheduleOffsetMinutes(route, currentStopIndex, nowMinutes) {
  var scheduled = getScheduleMinutesForStop(route, currentStopIndex);
  var offset;

  if (scheduled === null || typeof currentStopIndex !== "number") {
    return null;
  }

  offset = nowMinutes - scheduled;

  if (offset < -12 * 60) {
    offset += 24 * 60;
  } else if (offset > 12 * 60) {
    offset -= 24 * 60;
  }

  return Math.round(offset);
}

export function computeTripProgress(route, currentStopIndex) {
  var stopCount = route && Array.isArray(route.ordered_stops) ? route.ordered_stops.length : 0;
  var safeIndex = typeof currentStopIndex === "number" ? currentStopIndex : 0;
  var denominator = Math.max(1, stopCount - 1);
  var percent = stopCount ? Math.max(0, Math.min(100, Math.round((safeIndex / denominator) * 100))) : 0;
  var stopsRemaining = stopCount ? Math.max(0, stopCount - 1 - safeIndex) : null;

  return {
    percent: percent,
    stopsRemaining: stopsRemaining,
    nearingCompletion: percent >= tripIntelligenceDefaults.nearingCompletionPercent,
    completed: stopCount > 0 && safeIndex >= stopCount - 1
  };
}

export function computeScheduleAdherence(options) {
  options = options || {};
  var defaults = Object.assign({}, tripIntelligenceDefaults, options.thresholds);
  var route = options.route;
  var now = options.now instanceof Date ? options.now : new Date();
  var nowMinutes = getMinutesOfDay(now);
  var currentStopIndex = typeof options.currentStopIndex === "number" ? options.currentStopIndex : 0;
  var delayMinutes = typeof options.delayMinutes === "number" ? options.delayMinutes : null;
  var offset = delayMinutes !== null ? delayMinutes : getScheduleOffsetMinutes(route, currentStopIndex, nowMinutes);
  var previousOffset = typeof options.previousOffsetMinutes === "number" ? options.previousOffsetMinutes : null;
  var label = "Schedule pending";
  var state = "unknown";

  if (offset === null) {
    return {
      state: state,
      label: label,
      offsetMinutes: null
    };
  }

  if (offset > defaults.onTimeWindowMinutes) {
    state = previousOffset !== null && previousOffset - offset >= defaults.recoveringDelayMinutes
      ? "recovering"
      : "late";
    label = state === "recovering"
      ? "Recovering Delay"
      : "Running " + offset + " min late";
  } else if (offset < -defaults.onTimeWindowMinutes) {
    state = "ahead";
    label = "Ahead of Schedule";
  } else {
    state = "on_time";
    label = "On Time";
  }

  return {
    state: state,
    label: label,
    offsetMinutes: offset
  };
}

function getEventSeverityRank(events) {
  var rank = 0;

  (events || []).forEach(function (event) {
    if (event && event.severity === "critical") {
      rank = Math.max(rank, 3);
    } else if (event && event.severity === "warning") {
      rank = Math.max(rank, 2);
    } else if (event) {
      rank = Math.max(rank, 1);
    }
  });

  return rank;
}

export function computeTripOperationalHealth(options) {
  options = options || {};
  var signalState = normalizeText(options.signalState || (options.signalHealth && options.signalHealth.state));
  var adherenceState = normalizeText(options.adherenceState);
  var etaConfidence = normalizeText(options.etaConfidence).toLowerCase();
  var eventRank = getEventSeverityRank(options.events);
  var label = "Stable Operation";

  if (eventRank >= 3) {
    label = "Operational Disruption";
  } else if (signalState === "offline" || signalState === "paused" || etaConfidence.indexOf("recovering") !== -1) {
    label = "Recovering Signal";
  } else if (eventRank >= 2 || signalState === "delayed" || adherenceState === "late" || adherenceState === "recovering") {
    label = "Minor Delay";
  }

  return {
    label: label,
    state: label.toLowerCase().replace(/\s+/g, "_"),
    rank: HEALTH_RANK[label]
  };
}

export function computeTripIntelligence(options) {
  options = options || {};
  var identified = identifyActiveTrip(options);
  var route = identified.route;
  var trip = identified.trip;
  var currentStopIndex =
    typeof options.currentStopIndex === "number"
      ? options.currentStopIndex
      : typeof (options.progress && options.progress.currentStopIndex) === "number"
        ? options.progress.currentStopIndex
        : 0;
  var progress = route ? computeTripProgress(route, currentStopIndex) : computeTripProgress(null, 0);
  var adherence = computeScheduleAdherence({
    route: route,
    now: options.now,
    currentStopIndex: currentStopIndex,
    delayMinutes:
      typeof options.delayMinutes === "number"
        ? options.delayMinutes
        : trip && typeof trip.delay_minutes === "number"
          ? trip.delay_minutes
          : null,
    previousOffsetMinutes: options.previousOffsetMinutes,
    thresholds: options.thresholds
  });
  var health = computeTripOperationalHealth({
    signalHealth: options.signalHealth,
    signalState: options.signalState,
    etaConfidence: options.etaConfidence,
    adherenceState: adherence.state,
    events: options.events || []
  });
  var direction = route && route.direction ? route.direction : "";
  var lifecycle = "Scheduled";

  if (trip && normalizeStatus(trip.live_status) === "RUNNING") {
    lifecycle = "Running";
  } else if (progress.completed) {
    lifecycle = "Completing";
  } else if (progress.nearingCompletion) {
    lifecycle = "Nearing Completion";
  } else if (identified.available) {
    lifecycle = "Scheduled";
  }

  return {
    available: identified.available,
    trip: trip,
    tripId: trip ? trip.trip_id : "",
    route: route,
    routeId: route ? route.route_id : "",
    direction: direction,
    lifecycle: lifecycle,
    progress: progress,
    adherence: adherence,
    health: health,
    summary: identified.available
      ? adherence.label + " - " + health.label
      : identified.reason
  };
}

if (typeof window !== "undefined") {
  window.BusTrackTripIntelligence = {
    defaults: tripIntelligenceDefaults,
    getServiceDateKey: getServiceDateKey,
    getMinutesOfDayFor: getMinutesOfDayFor,
    parseScheduleTime: parseScheduleTime,
    getTripWindowForRoute: getTripWindowForRoute,
    identifyActiveTrip: identifyActiveTrip,
    isTripWithinServiceWindow: isTripWithinServiceWindow,
    computeScheduledEta: computeScheduledEta,
    computeTripProgress: computeTripProgress,
    computeScheduleAdherence: computeScheduleAdherence,
    computeTripOperationalHealth: computeTripOperationalHealth,
    computeTripIntelligence: computeTripIntelligence
  };
}
