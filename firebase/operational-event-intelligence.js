import { calculateDistance } from "./eta-utils.js";
import { isDebugEnabled } from "./observability.js";

export const operationalEventDefaults = {
  longStopDurationMs: 3 * 60 * 1000,
  stalledProgressMs: 8 * 60 * 1000,
  prolongedPausedMs: 2 * 60 * 1000,
  routeDeviationDistanceKm: 1.2,
  routeDeviationDurationMs: 45 * 1000,
  signalWindowMs: 4 * 60 * 1000,
  unstableSignalSamples: 3,
  unstableSignalDurationMs: 45 * 1000,
  recoveryTransitionCount: 2,
  etaConfidenceWindowMs: 3 * 60 * 1000,
  etaDegradedSamples: 3,
  etaDegradedDurationMs: 45 * 1000
};

const SEVERITY_RANK = {
  info: 1,
  warning: 2,
  critical: 3
};

const LOW_CONFIDENCE_LABELS = [
  "limited live signal",
  "gps recovering",
  "moderate confidence"
];

function normalizeThresholds(options) {
  return Object.assign({}, operationalEventDefaults, options && options.thresholds);
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePoint(point) {
  if (Array.isArray(point) && point.length >= 2) {
    return {
      latitude: Number(point[0]),
      longitude: Number(point[1])
    };
  }

  if (point && typeof point === "object") {
    return {
      latitude: Number(point.latitude),
      longitude: Number(point.longitude)
    };
  }

  return null;
}

function hasCoordinate(point) {
  return (
    point &&
    typeof point.latitude === "number" &&
    Number.isFinite(point.latitude) &&
    typeof point.longitude === "number" &&
    Number.isFinite(point.longitude)
  );
}

function pruneWindow(items, now, windowMs) {
  return items.filter(function (item) {
    return item && now - item.at <= windowMs;
  });
}

function pushWindow(items, item, now, windowMs) {
  items.push(item);
  return pruneWindow(items, now, windowMs);
}

function getSeverityRank(severity) {
  return SEVERITY_RANK[severity] || SEVERITY_RANK.info;
}

function makeEvent(type, severity, title, message, meta) {
  return Object.assign(
    {
      type: type,
      event_type: type,
      severity: severity,
      title: title,
      message: message,
      tone: severity === "critical" ? "danger" : severity === "warning" ? "warning" : "healthy"
    },
    meta || {}
  );
}

function getProgressIndex(input) {
  if (input && input.progress && typeof input.progress.currentStopIndex === "number") {
    return input.progress.currentStopIndex;
  }

  if (input && typeof input.currentStopIndex === "number") {
    return input.currentStopIndex;
  }

  if (input && input.location && typeof input.location.currentStopIndex === "number") {
    return input.location.currentStopIndex;
  }

  return null;
}

function isAtStop(input) {
  return !!(
    (input && input.progress && input.progress.atStop) ||
    (input && input.location && input.location.atStop) ||
    (input && input.atStop)
  );
}

function getSignalState(input) {
  return normalizeStatus(
    input &&
      (
        (input.signalHealth && input.signalHealth.state) ||
        input.signalState ||
        input.trackingStatus
      )
  );
}

function getRouteDistanceKm(location, routePoints) {
  var livePoint = normalizePoint(location);
  var points = Array.isArray(routePoints) ? routePoints.map(normalizePoint).filter(hasCoordinate) : [];
  var bestDistance = Infinity;

  if (!hasCoordinate(livePoint) || !points.length) {
    return null;
  }

  points.forEach(function (point) {
    var distance = calculateDistance(livePoint, point);
    if (typeof distance === "number" && distance < bestDistance) {
      bestDistance = distance;
    }
  });

  return bestDistance === Infinity ? null : bestDistance;
}

function isLowConfidence(label) {
  var normalized = normalizeStatus(label);

  return LOW_CONFIDENCE_LABELS.some(function (candidate) {
    return normalized.indexOf(candidate) !== -1;
  });
}

export function createOperationalEventTracker() {
  return {
    atStopSinceMs: null,
    lastStopIndex: null,
    lastProgressAtMs: null,
    pausedSinceMs: null,
    deviationSinceMs: null,
    previousSignalState: "",
    signalSamples: [],
    recoveryTransitions: [],
    etaConfidenceSamples: []
  };
}

export function detectOperationalEvents(input, tracker, options) {
  var now =
    typeof (input && input.now) === "number" && Number.isFinite(input.now)
      ? input.now
      : Date.now();
  var thresholds = normalizeThresholds(options);
  var activeTracker = tracker || createOperationalEventTracker();
  var events = [];
  var debug = isDebugEnabled();
  var progressIndex = getProgressIndex(input);
  var atStop = isAtStop(input);
  var trackingStatus = normalizeStatus(input && input.trackingStatus);
  var signalState = getSignalState(input);
  var routeDistanceKm = getRouteDistanceKm(input && input.location, input && input.routePoints);
  var etaConfidenceLabel = String(input && input.etaConfidence || "").trim();

  if (activeTracker.lastProgressAtMs === null) {
    activeTracker.lastProgressAtMs = now;
  }

  if (progressIndex !== null && progressIndex !== activeTracker.lastStopIndex) {
    activeTracker.lastStopIndex = progressIndex;
    activeTracker.lastProgressAtMs = now;
    activeTracker.atStopSinceMs = atStop ? now : null;
  } else if (atStop && activeTracker.atStopSinceMs === null) {
    activeTracker.atStopSinceMs = now;
  } else if (!atStop) {
    activeTracker.atStopSinceMs = null;
  }

  if (trackingStatus === "paused") {
    if (activeTracker.pausedSinceMs === null) {
      activeTracker.pausedSinceMs = now;
    }
  } else {
    activeTracker.pausedSinceMs = null;
  }

  if (signalState) {
    activeTracker.signalSamples = pushWindow(
      activeTracker.signalSamples,
      { at: now, state: signalState },
      now,
      thresholds.signalWindowMs
    );

    if (
      signalState === "live" &&
      activeTracker.previousSignalState &&
      activeTracker.previousSignalState !== "live"
    ) {
      activeTracker.recoveryTransitions = pushWindow(
        activeTracker.recoveryTransitions,
        { at: now, from: activeTracker.previousSignalState, to: signalState },
        now,
        thresholds.signalWindowMs
      );
    } else {
      activeTracker.recoveryTransitions = pruneWindow(
        activeTracker.recoveryTransitions,
        now,
        thresholds.signalWindowMs
      );
    }

    activeTracker.previousSignalState = signalState;
  }

  if (etaConfidenceLabel) {
    activeTracker.etaConfidenceSamples = pushWindow(
      activeTracker.etaConfidenceSamples,
      { at: now, degraded: isLowConfidence(etaConfidenceLabel), label: etaConfidenceLabel },
      now,
      thresholds.etaConfidenceWindowMs
    );
  }

  if (
    activeTracker.atStopSinceMs !== null &&
    now - activeTracker.atStopSinceMs >= thresholds.longStopDurationMs
  ) {
    events.push(makeEvent(
      "long_stop_duration",
      "warning",
      "Long stop dwell",
      "This bus has remained at the same stop longer than expected.",
      Object.assign(
        { duration_ms: now - activeTracker.atStopSinceMs },
        debug
          ? {
              threshold_ms: thresholds.longStopDurationMs,
              triggered_at: now,
              at_stop_since: activeTracker.atStopSinceMs
            }
          : null
      )
    ));
  }

  if (
    trackingStatus === "active" &&
    progressIndex !== null &&
    activeTracker.lastProgressAtMs !== null &&
    now - activeTracker.lastProgressAtMs >= thresholds.stalledProgressMs
  ) {
    events.push(makeEvent(
      "stalled_stop_progression",
      "warning",
      "Stop progression stalled",
      "The bus has not advanced through the route for an extended period.",
      Object.assign(
        {
          duration_ms: now - activeTracker.lastProgressAtMs,
          current_stop_index: progressIndex
        },
        debug
          ? {
              threshold_ms: thresholds.stalledProgressMs,
              triggered_at: now,
              last_progress_at: activeTracker.lastProgressAtMs
            }
          : null
      )
    ));
  }

  if (
    activeTracker.pausedSinceMs !== null &&
    now - activeTracker.pausedSinceMs >= thresholds.prolongedPausedMs
  ) {
    events.push(makeEvent(
      "prolonged_paused_state",
      "warning",
      "Tracking paused",
      "The driver session has been paused for longer than usual.",
      Object.assign(
        { duration_ms: now - activeTracker.pausedSinceMs },
        debug
          ? {
              threshold_ms: thresholds.prolongedPausedMs,
              triggered_at: now,
              paused_since: activeTracker.pausedSinceMs
            }
          : null
      )
    ));
  }

  if (
    routeDistanceKm !== null &&
    routeDistanceKm > thresholds.routeDeviationDistanceKm &&
    trackingStatus === "active"
  ) {
    if (activeTracker.deviationSinceMs === null) {
      activeTracker.deviationSinceMs = now;
    }

    if (now - activeTracker.deviationSinceMs >= thresholds.routeDeviationDurationMs) {
      events.push(makeEvent(
        "possible_route_deviation",
        "critical",
        "Possible route deviation",
        "The live bus position is away from the expected route geometry.",
        Object.assign(
          { route_distance_km: routeDistanceKm },
          debug
            ? {
                threshold_km: thresholds.routeDeviationDistanceKm,
                threshold_ms: thresholds.routeDeviationDurationMs,
                deviation_since: activeTracker.deviationSinceMs,
                triggered_at: now
              }
            : null
        )
      ));
    }
  } else {
    activeTracker.deviationSinceMs = null;
  }

  var weakSignalSamples = activeTracker.signalSamples.filter(function (sample) {
    return sample.state === "delayed" || sample.state === "offline";
  });
  if (
    weakSignalSamples.length >= thresholds.unstableSignalSamples &&
    weakSignalSamples[weakSignalSamples.length - 1].at - weakSignalSamples[0].at >= thresholds.unstableSignalDurationMs
  ) {
    events.push(makeEvent(
      "unstable_live_signal",
      "warning",
      "Unstable live signal",
      "Realtime updates are intermittently delayed or unavailable.",
      Object.assign(
        { sample_count: weakSignalSamples.length },
        debug
          ? {
              threshold_samples: thresholds.unstableSignalSamples,
              threshold_ms: thresholds.unstableSignalDurationMs,
              window_ms: thresholds.signalWindowMs,
              first_sample_at: weakSignalSamples[0] ? weakSignalSamples[0].at : null,
              last_sample_at: weakSignalSamples.length
                ? weakSignalSamples[weakSignalSamples.length - 1].at
                : null
            }
          : null
      )
    ));
  }

  if (activeTracker.recoveryTransitions.length >= thresholds.recoveryTransitionCount) {
    events.push(makeEvent(
      "repeated_gps_recovery",
      "info",
      "Repeated GPS recovery",
      "Driver GPS has recovered multiple times recently.",
      Object.assign(
        { recovery_count: activeTracker.recoveryTransitions.length },
        debug
          ? {
              threshold_count: thresholds.recoveryTransitionCount,
              window_ms: thresholds.signalWindowMs
            }
          : null
      )
    ));
  }

  var degradedEtaSamples = activeTracker.etaConfidenceSamples.filter(function (sample) {
    return sample.degraded;
  });
  if (
    degradedEtaSamples.length >= thresholds.etaDegradedSamples &&
    degradedEtaSamples[degradedEtaSamples.length - 1].at - degradedEtaSamples[0].at >= thresholds.etaDegradedDurationMs
  ) {
    events.push(makeEvent(
      "eta_confidence_degrading",
      "info",
      "ETA confidence reduced",
      "ETA is using limited live signal or recovery data.",
      Object.assign(
        { sample_count: degradedEtaSamples.length },
        debug
          ? {
              threshold_samples: thresholds.etaDegradedSamples,
              threshold_ms: thresholds.etaDegradedDurationMs,
              window_ms: thresholds.etaConfidenceWindowMs,
              first_sample_at: degradedEtaSamples[0] ? degradedEtaSamples[0].at : null,
              last_sample_at: degradedEtaSamples.length
                ? degradedEtaSamples[degradedEtaSamples.length - 1].at
                : null
            }
          : null
      )
    ));
  }

  events.sort(function (a, b) {
    return getSeverityRank(b.severity) - getSeverityRank(a.severity);
  });

  return {
    events: events,
    primaryEvent: events[0] || null,
    tracker: activeTracker
  };
}

export function getPrimaryOperationalEvent(events) {
  if (!Array.isArray(events) || !events.length) {
    return null;
  }

  return events.slice().sort(function (a, b) {
    return getSeverityRank(b.severity) - getSeverityRank(a.severity);
  })[0];
}

if (typeof window !== "undefined") {
  window.BusTrackOperationalEvents = {
    defaults: operationalEventDefaults,
    createOperationalEventTracker: createOperationalEventTracker,
    detectOperationalEvents: detectOperationalEvents,
    getPrimaryOperationalEvent: getPrimaryOperationalEvent
  };
}
