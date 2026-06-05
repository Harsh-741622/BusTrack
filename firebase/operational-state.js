export const operationalStateDefaults = {
  /**
   * How long a new non-critical state must persist before we switch to it.
   * Prevents UI flicker when signals bounce between "Stable" and "Minor Delay".
   */
  confirmChangeMs: 20000,
  /**
   * When recovering from a higher-severity state, hold a "Recovering Service"
   * interpretation for a short period so the transition feels coherent.
   */
  recoveryHoldMs: 60000,
  /**
   * If a new state is higher severity than the current state by at least this
   * delta, apply immediately.
   */
  immediateEscalationDelta: 1
};

import { trace, isDebugEnabled } from "./observability.js";

const SIGNAL_RANK = {
  live: 0,
  delayed: 1,
  paused: 2,
  offline: 3
};

const EVENT_RANK = {
  info: 1,
  warning: 2,
  critical: 3
};

const ETA_CONFIDENCE_RANK = {
  "high confidence": 0,
  "moderate confidence": 1,
  "learning route timing": 1,
  "gps recovering": 2,
  "limited live signal": 3
};

const OPERATIONAL_STATE_RANK = {
  "Stable Operation": 0,
  "Scheduled Service": 0,
  "Learning Route Timing": 1,
  "Minor Delay": 1,
  "Recovering Service": 1,
  "GPS Recovering": 2,
  "No Live Signal": 2,
  "Operational Disruption": 3
};

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeLower(value) {
  return normalizeText(value).toLowerCase();
}

function getNowMs(input) {
  if (input && typeof input.now === "number" && Number.isFinite(input.now)) {
    return input.now;
  }
  if (input && typeof input.nowMs === "number" && Number.isFinite(input.nowMs)) {
    return input.nowMs;
  }
  return Date.now();
}

function clamp01(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

function toSnakeCase(label) {
  return normalizeLower(label).replace(/[^\w]+/g, "_").replace(/^_+|_+$/g, "");
}

function getSignalRank(signalHealth, trackingStatus) {
  const state = normalizeLower(
    (signalHealth && signalHealth.state) || trackingStatus || ""
  );
  return SIGNAL_RANK[state] ?? SIGNAL_RANK.offline;
}

function getEtaConfidenceRank(label) {
  const normalized = normalizeLower(label);
  if (!normalized) {
    return ETA_CONFIDENCE_RANK["limited live signal"];
  }
  return ETA_CONFIDENCE_RANK[normalized] ?? ETA_CONFIDENCE_RANK["moderate confidence"];
}

function getWorstEventRank(events) {
  let worst = 0;
  (Array.isArray(events) ? events : []).forEach(function (event) {
    const sev = normalizeLower(event && event.severity);
    worst = Math.max(worst, EVENT_RANK[sev] || 0);
  });
  return worst;
}

function getTripHealthLabel(input) {
  const trip = input && input.tripIntelligence;
  const label =
    (trip && trip.health && trip.health.label) ||
    (trip && trip.healthLabel) ||
    normalizeText(input && input.tripOperationalHealth) ||
    "";
  return normalizeText(label);
}

function getTripHealthRank(label) {
  const normalized = normalizeText(label);
  if (!normalized) {
    return 0;
  }
  // Keep compatible with existing trip-intelligence labels.
  if (normalized === "Operational Disruption") {
    return 3;
  }
  if (normalized === "Recovering Signal") {
    return 2;
  }
  if (normalized === "Minor Delay") {
    return 1;
  }
  if (normalized === "Stable Operation") {
    return 0;
  }
  return 1;
}

function getAdherenceState(input) {
  const trip = input && input.tripIntelligence;
  return normalizeLower(
    (trip && trip.adherence && trip.adherence.state) ||
      (trip && trip.adherenceState) ||
      input.tripScheduleAdherence ||
      ""
  );
}

function getAdherenceRank(state) {
  if (state === "late") {
    return 2;
  }
  if (state === "recovering") {
    return 1;
  }
  // ahead/on_time/unknown → do not escalate by itself.
  return 0;
}

function isProgressionStalled(events) {
  return (Array.isArray(events) ? events : []).some(function (event) {
    return event && normalizeLower(event.type || event.event_type) === "stalled_stop_progression";
  });
}

function isRouteDeviation(events) {
  return (Array.isArray(events) ? events : []).some(function (event) {
    return event && normalizeLower(event.type || event.event_type) === "possible_route_deviation";
  });
}

function computeConfidence(options) {
  const signalRank = options.signalRank;
  const etaRank = options.etaConfidenceRank;
  const eventRank = options.eventRank;
  const tripRank = options.tripHealthRank;
  const adherenceRank = options.adherenceRank;

  // Start optimistic and reduce quickly with bad signals.
  let confidence = 1;

  confidence -= signalRank * 0.18;
  confidence -= etaRank * 0.12;
  confidence -= adherenceRank * 0.08;
  confidence -= tripRank * 0.12;
  confidence -= (eventRank >= 3 ? 0.35 : eventRank === 2 ? 0.18 : eventRank === 1 ? 0.05 : 0);

  if (options.progressionStalled) {
    confidence -= 0.12;
  }

  if (options.routeDeviation) {
    confidence -= 0.22;
  }

  return clamp01(confidence);
}

function computeCandidateOperationalState(input, tracker) {
  const events = Array.isArray(input && input.events) ? input.events : [];
  const signalRank = getSignalRank(input && input.signalHealth, input && input.trackingStatus);
  const signalState = normalizeLower(
    (input && input.signalHealth && input.signalHealth.state) ||
      (input && input.trackingStatus) ||
      ""
  );
  const etaConfidenceLabel = normalizeText(input && (input.etaConfidence || input.etaConfidenceLabel));
  const etaConfidenceRank = getEtaConfidenceRank(etaConfidenceLabel);
  const eventRank = getWorstEventRank(events);
  const tripHealthLabel = getTripHealthLabel(input);
  const tripHealthRank = getTripHealthRank(tripHealthLabel);
  const adherenceState = getAdherenceState(input);
  const adherenceRank = getAdherenceRank(adherenceState);
  const progressionStalled = isProgressionStalled(events);
  const routeDeviation = isRouteDeviation(events);
  const hasScheduledTrip = !!(input && input.tripIntelligence && input.tripIntelligence.available);

  const reasons = [];

  // Explicitly capture key drivers as reasons (kept short for RTDB payload).
  if (eventRank >= 3) reasons.push("critical_event");
  else if (eventRank === 2) reasons.push("warning_event");
  else if (eventRank === 1) reasons.push("info_event");
  if (routeDeviation) reasons.push("route_deviation");
  if (progressionStalled) reasons.push("stalled_progression");
  if (adherenceRank >= 1) reasons.push("schedule_" + adherenceState);
  if (signalState) reasons.push("signal_" + signalState);
  if (etaConfidenceLabel) reasons.push("eta_" + toSnakeCase(etaConfidenceLabel));

  // State resolution rules (lightweight, deterministic, conflict-aware).
  let label = "Stable Operation";

  if (eventRank >= 3 || tripHealthRank >= 3 || routeDeviation) {
    label = "Operational Disruption";
  } else if (signalRank >= 3 && hasScheduledTrip) {
    // Schedule-first UX: if a scheduled trip exists, offline telemetry should not look like failure.
    label = "Scheduled Service";
  } else if (signalRank >= 3) {
    label = "No Live Signal";
  } else if (signalState === "paused" || etaConfidenceRank >= 2) {
    // Recovering GPS or the ETA system is relying on recovery fallbacks.
    label = "GPS Recovering";
  } else if (etaConfidenceRank === 1 && normalizeLower(etaConfidenceLabel) === "learning route timing") {
    label = "Learning Route Timing";
  } else if (
    adherenceState === "recovering" ||
    (tracker &&
      tracker.previousSignalState &&
      tracker.previousSignalState !== "live" &&
      signalState === "live")
  ) {
    label = "Recovering Service";
  } else if (
    tripHealthRank >= 1 ||
    eventRank === 2 ||
    adherenceRank >= 1 ||
    signalRank === 1 ||
    progressionStalled
  ) {
    label = "Minor Delay";
  }

  const rank = OPERATIONAL_STATE_RANK[label] ?? 1;
  const tone = rank >= 3 ? "danger" : rank === 2 ? "warning" : rank === 1 ? "warning" : "healthy";
  const confidence = computeConfidence({
    signalRank,
    etaConfidenceRank,
    eventRank,
    tripHealthRank,
    adherenceRank,
    progressionStalled,
    routeDeviation
  });

  return {
    label,
    state: toSnakeCase(label),
    rank,
    tone,
    confidence,
    reasons
  };
}

export function createOperationalStateTracker() {
  return {
    current: null,
    pending: null,
    previousSignalState: "",
    lastSevereAtMs: 0,
    lastChangedAtMs: 0
  };
}

export function consolidateOperationalState(input, tracker, options) {
  const now = getNowMs(input);
  const defaults = Object.assign({}, operationalStateDefaults, options || {});
  const activeTracker = tracker || createOperationalStateTracker();

  const signalState = normalizeLower(
    (input && input.signalHealth && input.signalHealth.state) ||
      (input && input.trackingStatus) ||
      ""
  );
  const candidate = computeCandidateOperationalState(input, activeTracker);

  if (signalState) {
    activeTracker.previousSignalState = signalState;
  }

  // First computation always accepts candidate.
  if (!activeTracker.current) {
    activeTracker.current = Object.assign({}, candidate);
    activeTracker.lastChangedAtMs = now;
    if (candidate.rank >= 2) {
      activeTracker.lastSevereAtMs = now;
    }
    const result = {
      operationalState: Object.assign({}, candidate, {
        updatedAtMs: now,
        stable: true,
        changePending: false
      }),
      tracker: activeTracker
    };

    if (isDebugEnabled()) {
      trace("operational_state", {
        label: result.operationalState.label,
        confidence: result.operationalState.confidence,
        reasons: result.operationalState.reasons,
        signal: signalState
      }, { throttleMs: 2500 });
    }

    return result;
  }

  const current = activeTracker.current;

  // If we recently had a severe state, ensure we pass through "Recovering Service"
  // rather than snapping directly to "Stable Operation".
  if (
    current.rank >= 2 &&
    candidate.rank === 0 &&
    now - activeTracker.lastSevereAtMs < defaults.recoveryHoldMs
  ) {
    candidate.label = "Recovering Service";
    candidate.state = toSnakeCase(candidate.label);
    candidate.rank = OPERATIONAL_STATE_RANK[candidate.label];
    candidate.tone = "warning";
    candidate.reasons = Array.from(new Set((candidate.reasons || []).concat(["post_recovery_hold"])));
  }

  // Same candidate as current → accept + clear pending.
  if (candidate.label === current.label) {
    activeTracker.pending = null;
    activeTracker.current = Object.assign({}, candidate);
    const result = {
      operationalState: Object.assign({}, candidate, {
        updatedAtMs: now,
        stable: true,
        changePending: false
      }),
      tracker: activeTracker
    };

    if (isDebugEnabled()) {
      trace("operational_state", {
        label: result.operationalState.label,
        confidence: result.operationalState.confidence,
        reasons: result.operationalState.reasons,
        signal: signalState
      }, { throttleMs: 2500 });
    }

    return result;
  }

  const escalationDelta = candidate.rank - current.rank;

  // Escalate quickly when severity increases.
  if (escalationDelta >= defaults.immediateEscalationDelta || candidate.rank >= 3) {
    activeTracker.pending = null;
    activeTracker.current = Object.assign({}, candidate);
    activeTracker.lastChangedAtMs = now;
    if (candidate.rank >= 2) {
      activeTracker.lastSevereAtMs = now;
    }
    const result = {
      operationalState: Object.assign({}, candidate, {
        updatedAtMs: now,
        stable: true,
        changePending: false
      }),
      tracker: activeTracker
    };

    if (isDebugEnabled()) {
      trace("operational_state", {
        label: result.operationalState.label,
        confidence: result.operationalState.confidence,
        reasons: result.operationalState.reasons,
        signal: signalState
      }, { throttleMs: 2500 });
    }

    return result;
  }

  // For de-escalations / lateral transitions, require persistence.
  if (!activeTracker.pending || activeTracker.pending.label !== candidate.label) {
    activeTracker.pending = {
      label: candidate.label,
      sinceMs: now
    };
  }

  const pendingMs = now - (activeTracker.pending.sinceMs || now);
  const shouldCommit = pendingMs >= defaults.confirmChangeMs;

  if (shouldCommit) {
    activeTracker.current = Object.assign({}, candidate);
    activeTracker.pending = null;
    activeTracker.lastChangedAtMs = now;
    if (candidate.rank >= 2) {
      activeTracker.lastSevereAtMs = now;
    }
    const result = {
      operationalState: Object.assign({}, candidate, {
        updatedAtMs: now,
        stable: true,
        changePending: false
      }),
      tracker: activeTracker
    };

    if (isDebugEnabled()) {
      trace("operational_state", {
        label: result.operationalState.label,
        confidence: result.operationalState.confidence,
        reasons: result.operationalState.reasons,
        signal: signalState
      }, { throttleMs: 2500 });
    }

    return result;
  }

  const result = {
    operationalState: Object.assign({}, current, {
      updatedAtMs: now,
      stable: false,
      changePending: true,
      pendingLabel: candidate.label
    }),
    tracker: activeTracker
  };

  if (isDebugEnabled()) {
    trace("operational_state.pending", {
      current: current.label,
      candidate: candidate.label,
      pendingForMs: pendingMs,
      confirmChangeMs: defaults.confirmChangeMs
    }, { throttleMs: 2500 });
  }

  return result;
}

export function selfTestOperationalState() {
  const tracker = createOperationalStateTracker();
  const base = {
    signalHealth: { state: "live" },
    trackingStatus: "active",
    etaConfidence: "High Confidence",
    tripIntelligence: { health: { label: "Stable Operation" }, adherence: { state: "on_time" } },
    events: []
  };
  const a = consolidateOperationalState(base, tracker).operationalState;
  const b = consolidateOperationalState(Object.assign({}, base, { events: [{ severity: "critical", type: "possible_route_deviation" }] }), tracker).operationalState;
  return Boolean(a && a.label === "Stable Operation" && b && b.label === "Operational Disruption");
}

if (typeof window !== "undefined") {
  window.BusTrackOperationalState = {
    defaults: operationalStateDefaults,
    createOperationalStateTracker,
    consolidateOperationalState,
    selfTestOperationalState
  };
}
