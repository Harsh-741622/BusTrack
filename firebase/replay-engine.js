import { calculateETA } from "./eta-utils.js";
import { consolidateOperationalState, createOperationalStateTracker } from "./operational-state.js";
import { trace, isDebugEnabled } from "./observability.js";

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeLower(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getTimestampMs(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function sortByTimestamp(events) {
  return (Array.isArray(events) ? events : [])
    .slice()
    .filter(Boolean)
    .sort(function (a, b) {
      const t1 = getTimestampMs(a.timestamp) || 0;
      const t2 = getTimestampMs(b.timestamp) || 0;
      return t1 - t2;
    });
}

function toLiveLocation(snapshot) {
  if (!snapshot) return null;
  const lat = normalizeNumber(snapshot.latitude);
  const lng = normalizeNumber(snapshot.longitude);
  if (lat === null || lng === null) return null;

  return {
    available: true,
    latitude: lat,
    longitude: lng,
    accuracy: normalizeNumber(snapshot.accuracy),
    speed: normalizeNumber(snapshot.speed),
    heading: normalizeNumber(snapshot.heading),
    timestamp: snapshot.timestamp,
    trackingStatus: snapshot.tracking_status || snapshot.trackingStatus || "active",
    sessionActive:
      typeof snapshot.session_active === "boolean"
        ? snapshot.session_active
        : typeof snapshot.sessionActive === "boolean"
          ? snapshot.sessionActive
          : true,
    tripId: snapshot.trip_id || snapshot.tripId || "",
    tripProgressPercent: normalizeNumber(snapshot.trip_progress_percent ?? snapshot.tripProgressPercent),
    tripDelayMinutes: normalizeNumber(snapshot.delay_minutes ?? snapshot.delayMinutes),
    signalHealth: snapshot.signal_health ? { state: snapshot.signal_health } : null
  };
}

function withinWindow(nowMs, itemTimestampMs, windowMs) {
  if (!windowMs) return true;
  if (typeof nowMs !== "number" || typeof itemTimestampMs !== "number") return false;
  return Math.abs(nowMs - itemTimestampMs) <= windowMs;
}

function makeFrame(base) {
  return Object.assign(
    {
      atMs: 0,
      kind: "frame",
      event: null,
      liveLocation: null,
      eta: null,
      operationalState: null,
      operationalEvents: [],
      learningEvents: [],
      meta: {}
    },
    base || {}
  );
}

function makeRng(seed) {
  // Deterministic LCG: fast, good enough for debug-only stress tests.
  let state = (Number(seed) || 1) >>> 0;
  return function next() {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function metersToLat(meters) {
  return meters / 111320;
}

function metersToLng(meters, latitude) {
  const lat = typeof latitude === "number" ? latitude : 0;
  const metersPerDegree = 111320 * Math.cos((lat * Math.PI) / 180);
  return metersPerDegree ? meters / metersPerDegree : 0;
}

function cloneFrame(frame) {
  return Object.assign({}, frame, {
    event: frame && frame.event ? Object.assign({}, frame.event) : null,
    liveLocation: frame && frame.liveLocation ? Object.assign({}, frame.liveLocation) : null,
    eta: frame && frame.eta ? Object.assign({}, frame.eta) : null,
    operationalState: frame && frame.operationalState ? Object.assign({}, frame.operationalState) : null,
    operationalEvents: Array.isArray(frame && frame.operationalEvents) ? frame.operationalEvents.slice() : [],
    learningEvents: Array.isArray(frame && frame.learningEvents) ? frame.learningEvents.slice() : [],
    meta: frame && frame.meta ? Object.assign({}, frame.meta) : {}
  });
}

function injectOperationalEventFrame(baseFrame, type, severity, title, message, meta) {
  const frame = cloneFrame(baseFrame);
  frame.kind = "operational_event";
  frame.operationalEvents = [
    Object.assign(
      {
        operationalEventType: type,
        severity: severity,
        title: title,
        message: message
      },
      meta || {}
    )
  ];
  // Also shape it like operationalJourneyLog events so downstream stays consistent.
  frame.event = Object.assign({}, frame.event || {}, {
    event_type: "operational_event",
    operational_event_type: type,
    severity: severity,
    title: title,
    message: message
  });
  return frame;
}

function normalizeStressConfig(options) {
  options = options || {};
  const presets = Array.isArray(options.presets)
    ? options.presets
    : normalizeText(options.presets || "")
        .split(",")
        .map(function (p) { return normalizeText(p); })
        .filter(Boolean);

  return {
    enabled: !!options.enabled || presets.length > 0,
    seed: Number(options.seed) || 42,
    presets: presets,
    // generic knobs
    noiseMeters: typeof options.noiseMeters === "number" ? options.noiseMeters : 25,
    spikeMeters: typeof options.spikeMeters === "number" ? options.spikeMeters : 250,
    spikeChance: typeof options.spikeChance === "number" ? options.spikeChance : 0.02,
    dropChance: typeof options.dropChance === "number" ? options.dropChance : 0.12,
    offlineBurstChance: typeof options.offlineBurstChance === "number" ? options.offlineBurstChance : 0.04,
    offlineBurstFrames: typeof options.offlineBurstFrames === "number" ? options.offlineBurstFrames : 6,
    stallChance: typeof options.stallChance === "number" ? options.stallChance : 0.04,
    stallFrames: typeof options.stallFrames === "number" ? options.stallFrames : 10,
    pauseChance: typeof options.pauseChance === "number" ? options.pauseChance : 0.02,
    pauseFrames: typeof options.pauseFrames === "number" ? options.pauseFrames : 8,
    deviationChance: typeof options.deviationChance === "number" ? options.deviationChance : 0.015,
    deviationMeters: typeof options.deviationMeters === "number" ? options.deviationMeters : 1200,
    speedJitterPct: typeof options.speedJitterPct === "number" ? options.speedJitterPct : 0.35
  };
}

/**
 * Build a replay timeline from operationalJourneyLogs.
 *
 * Input events come directly from operationalJourneyLogService.readEvents().
 * Output frames are ordered and contain enough info to drive a map playback.
 */
export function buildReplayTimeline(options) {
  options = options || {};
  const events = sortByTimestamp(options.events || []);
  const routePoints = Array.isArray(options.routePoints) ? options.routePoints : [];
  const etaTargetIndex =
    typeof options.etaTargetIndex === "number"
      ? options.etaTargetIndex
      : routePoints.length
        ? routePoints.length - 1
        : 0;
  const eventWindowMs = typeof options.eventWindowMs === "number" ? options.eventWindowMs : 4 * 60 * 1000;

  const opTracker = createOperationalStateTracker();
  const recentOperationalEvents = [];
  const frames = [];

  events.forEach(function (evt) {
    const atMs = getTimestampMs(evt.timestamp);
    if (atMs === null) return;

    const type = normalizeLower(evt.event_type || evt.eventType);

    if (type === "operational_event") {
      // Store for later frames (operational-state reconstruction).
      recentOperationalEvents.push(evt);
      // Keep window small.
      while (
        recentOperationalEvents.length &&
        !withinWindow(atMs, getTimestampMs(recentOperationalEvents[0].timestamp), eventWindowMs)
      ) {
        recentOperationalEvents.shift();
      }
    }

    const liveLocation = type === "gps_update" ? toLiveLocation(evt) : null;
    const eta =
      liveLocation && routePoints.length
        ? calculateETA({
            livePoint: { latitude: liveLocation.latitude, longitude: liveLocation.longitude },
            routePoints: routePoints,
            targetIndex: etaTargetIndex,
            speed: liveLocation.speed
          })
        : null;

    const operationalState =
      liveLocation
        ? consolidateOperationalState(
            {
              nowMs: atMs,
              signalHealth: liveLocation.signalHealth,
              trackingStatus: liveLocation.trackingStatus,
              etaConfidence: "", // replay compute focuses on evolution; confidence label may be absent in logs
              tripOperationalHealth: evt.trip_operational_health || "",
              tripScheduleAdherence: evt.trip_schedule_adherence || "",
              tripIntelligence: null,
              events: recentOperationalEvents.map(function (raw) {
                return {
                  type: raw.operational_event_type || raw.type,
                  event_type: raw.operational_event_type || raw.type,
                  severity: raw.severity,
                  title: raw.title,
                  message: raw.message
                };
              })
            },
            opTracker,
            { confirmChangeMs: 0 } // replay shouldn't wait before state transitions
          ).operationalState
        : null;

    const learningEvents =
      type === "segment_completed"
        ? [
            {
              segmentId: evt.segment_id,
              fromStopId: evt.from_stop_id,
              toStopId: evt.to_stop_id,
              observedMinutes: evt.observed_time_minutes,
              emaMinutes: evt.ema_time_minutes,
              sampleCount: evt.sample_count,
              dayType: evt.day_type,
              timeBucket: evt.time_bucket
            }
          ]
        : [];

    const frame = makeFrame({
      atMs: atMs,
      kind: type,
      event: evt,
      liveLocation: liveLocation,
      eta: eta,
      operationalState: operationalState,
      operationalEvents:
        type === "operational_event"
          ? [
              {
                severity: evt.severity,
                title: evt.title,
                message: evt.message,
                operationalEventType: evt.operational_event_type
              }
            ]
          : [],
      learningEvents: learningEvents,
      meta: {
        busId: evt.bus_id || "",
        routeId: evt.route_id || "",
        sessionId: evt.session_id || "",
        tripId: evt.trip_id || ""
      }
    });

    frames.push(frame);
  });

  return {
    ok: true,
    frames: frames,
    startedAtMs: frames.length ? frames[0].atMs : null,
    endedAtMs: frames.length ? frames[frames.length - 1].atMs : null
  };
}

/**
 * Apply synthetic stress tests to an existing replay timeline.
 * Debug-only, deterministic (seeded), and does NOT touch Firebase/realtime.
 */
export function applyStressToTimeline(timeline, stressOptions) {
  const stress = normalizeStressConfig(stressOptions);
  if (!stress.enabled) {
    return Object.assign({ ok: true, stressApplied: false }, timeline);
  }

  const rng = makeRng(stress.seed);
  const frames = timeline && Array.isArray(timeline.frames) ? timeline.frames : [];
  const out = [];

  let offlineBurstLeft = 0;
  let stallLeft = 0;
  let pauseLeft = 0;
  let lastGoodLocation = null;

  function hasPreset(name) {
    return stress.presets.indexOf(name) !== -1;
  }

  frames.forEach(function (frame, idx) {
    const base = cloneFrame(frame);

    // Only meaningfully mutate GPS frames. Other frames pass through.
    if (!base.liveLocation) {
      out.push(base);
      return;
    }

    // Preset mappings (lightweight).
    const doWeakGps = hasPreset("weak_gps") || hasPreset("gps_noise") || hasPreset("noisy_gps");
    const doDrop = hasPreset("delayed_updates") || hasPreset("drop_updates");
    const doReconnectStorm = hasPreset("reconnect_storm");
    const doStall = hasPreset("stall") || hasPreset("stalled_progression");
    const doPause = hasPreset("pause") || hasPreset("prolonged_pause");
    const doDeviation = hasPreset("route_deviation") || hasPreset("deviation");
    const doEtaInstability = hasPreset("eta_instability") || hasPreset("speed_jitter");

    // Simulate dropped updates by skipping some GPS frames.
    if (doDrop && rng() < stress.dropChance && idx > 0) {
      // Keep determinism: skip without adding synthetic data.
      return;
    }

    // Reconnect storm / offline bursts: flip signal state for a few frames.
    if (doReconnectStorm && offlineBurstLeft <= 0 && rng() < stress.offlineBurstChance) {
      offlineBurstLeft = Math.max(1, stress.offlineBurstFrames);
      // Inject an "unstable_live_signal" explanation frame.
      out.push(
        injectOperationalEventFrame(
          base,
          "unstable_live_signal",
          "warning",
          "Unstable live signal (synthetic)",
          "Synthetic reconnect storm triggered for stress testing.",
          { synthetic: true, burst_frames: offlineBurstLeft }
        )
      );
    }

    // Progression stalls: hold position constant and inject a stall event.
    if (doStall && stallLeft <= 0 && rng() < stress.stallChance && lastGoodLocation) {
      stallLeft = Math.max(1, stress.stallFrames);
      out.push(
        injectOperationalEventFrame(
          base,
          "stalled_stop_progression",
          "warning",
          "Stop progression stalled (synthetic)",
          "Synthetic stop progression stall injected for robustness testing.",
          { synthetic: true, stall_frames: stallLeft }
        )
      );
    }

    // Prolonged pause: mark tracking paused for a few frames.
    if (doPause && pauseLeft <= 0 && rng() < stress.pauseChance) {
      pauseLeft = Math.max(1, stress.pauseFrames);
      out.push(
        Object.assign(cloneFrame(base), {
          kind: "journey_paused",
          event: Object.assign({}, base.event || {}, { event_type: "journey_paused" })
        })
      );
    }

    // Apply stateful modifiers for this frame.
    if (offlineBurstLeft > 0) {
      offlineBurstLeft -= 1;
      base.liveLocation.trackingStatus = "active";
      base.liveLocation.signalHealth = { state: "offline" };
      if (offlineBurstLeft === 0) {
        out.push(
          injectOperationalEventFrame(
            base,
            "repeated_gps_recovery",
            "info",
            "GPS recovered (synthetic)",
            "Synthetic GPS recovery after reconnect storm.",
            { synthetic: true }
          )
        );
      }
    } else if (pauseLeft > 0) {
      pauseLeft -= 1;
      base.liveLocation.trackingStatus = "paused";
      base.liveLocation.signalHealth = { state: "paused" };
      if (pauseLeft === 0) {
        out.push(
          Object.assign(cloneFrame(base), {
            kind: "journey_resumed",
            event: Object.assign({}, base.event || {}, { event_type: "journey_resumed" })
          })
        );
      }
    } else if (doWeakGps) {
      // Degrade signal state without fully dropping.
      const roll = rng();
      if (roll < 0.15) base.liveLocation.signalHealth = { state: "delayed" };
      else base.liveLocation.signalHealth = { state: "live" };
    }

    // Stall: freeze coordinates + progress while stallLeft is active.
    if (stallLeft > 0 && lastGoodLocation) {
      stallLeft -= 1;
      base.liveLocation.latitude = lastGoodLocation.latitude;
      base.liveLocation.longitude = lastGoodLocation.longitude;
      if (typeof lastGoodLocation.tripProgressPercent === "number") {
        base.liveLocation.tripProgressPercent = lastGoodLocation.tripProgressPercent;
      }
    }

    // Route deviation: kick the bus off-route with a large offset for one frame burst.
    if (doDeviation && rng() < stress.deviationChance) {
      const lat = base.liveLocation.latitude;
      const lng = base.liveLocation.longitude;
      const meters = stress.deviationMeters;
      const dir = rng() * Math.PI * 2;
      base.liveLocation.latitude = lat + metersToLat(meters) * Math.sin(dir);
      base.liveLocation.longitude = lng + metersToLng(meters, lat) * Math.cos(dir);
      out.push(
        injectOperationalEventFrame(
          base,
          "possible_route_deviation",
          "critical",
          "Possible route deviation (synthetic)",
          "Synthetic deviation injected to test anomaly and state behavior.",
          { synthetic: true, deviation_meters: meters }
        )
      );
    }

    // GPS noise: small jitter + rare spikes.
    if (doWeakGps || hasPreset("gps_instability")) {
      const lat = base.liveLocation.latitude;
      const lng = base.liveLocation.longitude;
      const meters = rng() < stress.spikeChance ? stress.spikeMeters : stress.noiseMeters;
      const dir = rng() * Math.PI * 2;
      base.liveLocation.latitude = lat + metersToLat(meters) * Math.sin(dir);
      base.liveLocation.longitude = lng + metersToLng(meters, lat) * Math.cos(dir);
    }

    // ETA instability: jitter speed to create ETA volatility (no ML, just inputs).
    if (doEtaInstability && typeof base.liveLocation.speed === "number") {
      const jitter = (rng() * 2 - 1) * stress.speedJitterPct;
      base.liveLocation.speed = Math.max(0, base.liveLocation.speed * (1 + jitter));
    }

    lastGoodLocation = Object.assign({}, base.liveLocation);
    out.push(base);
  });

  const stressedTimeline = Object.assign({}, timeline, {
    frames: out,
    stressApplied: true,
    stress: stress
  });

  if (isDebugEnabled()) {
    trace("stress.applied", { presets: stress.presets, seed: stress.seed, inFrames: frames.length, outFrames: out.length }, { throttleMs: 0, console: "log" });
  }

  return stressedTimeline;
}

export function summarizeReplay(timeline) {
  const frames = timeline && Array.isArray(timeline.frames) ? timeline.frames : [];
  let stateTransitions = 0;
  let lastState = "";
  let etaAvailable = 0;
  let etaMin = Infinity;
  let etaMax = 0;
  let etaVolatilitySpikes = 0;
  let lastEta = null;
  let eventCount = 0;
  let learningCount = 0;
  const stateCounts = {};

  frames.forEach(function (frame) {
    const state = frame && frame.operationalState && frame.operationalState.label ? frame.operationalState.label : "";
    if (state) {
      stateCounts[state] = (stateCounts[state] || 0) + 1;
      if (lastState && state !== lastState) {
        stateTransitions += 1;
      }
      lastState = state;
    }

    const eta = frame && frame.eta && frame.eta.available ? frame.eta.minutes : null;
    if (typeof eta === "number") {
      etaAvailable += 1;
      etaMin = Math.min(etaMin, eta);
      etaMax = Math.max(etaMax, eta);
      if (typeof lastEta === "number" && Math.abs(eta - lastEta) >= 6) {
        etaVolatilitySpikes += 1;
      }
      lastEta = eta;
    }

    eventCount += Array.isArray(frame && frame.operationalEvents) ? frame.operationalEvents.length : 0;
    learningCount += Array.isArray(frame && frame.learningEvents) ? frame.learningEvents.length : 0;
  });

  const summary = {
    frameCount: frames.length,
    stateTransitions: stateTransitions,
    stateCounts: stateCounts,
    eta: {
      samples: etaAvailable,
      minMinutes: etaMin === Infinity ? null : etaMin,
      maxMinutes: etaMax || null,
      volatilitySpikes: etaVolatilitySpikes
    },
    events: {
      operationalEvents: eventCount,
      learningEvents: learningCount
    }
  };

  if (isDebugEnabled()) {
    trace("stress.summary", summary, { throttleMs: 0, console: "log" });
  }

  return summary;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Create a lightweight replay player for a timeline.
 * The player calls onFrame(frame, index) when the active frame changes.
 */
export function createReplayPlayer(timeline, handlers, options) {
  handlers = handlers || {};
  options = options || {};

  const frames = timeline && Array.isArray(timeline.frames) ? timeline.frames : [];
  const speed = typeof options.speed === "number" && options.speed > 0 ? options.speed : 20;

  const state = {
    running: false,
    speed: speed,
    startedAtMs: frames.length ? frames[0].atMs : 0,
    cursorIndex: 0,
    wallStartMs: 0,
    timelineStartMs: frames.length ? frames[0].atMs : 0,
    timerId: null
  };

  function emitFrame(index) {
    const safeIndex = clamp(index, 0, Math.max(0, frames.length - 1));
    state.cursorIndex = safeIndex;
    if (handlers.onFrame) {
      handlers.onFrame(frames[safeIndex], safeIndex);
    }
  }

  function findFrameIndex(atMs) {
    if (!frames.length) return 0;
    let lo = 0;
    let hi = frames.length - 1;
    while (lo < hi) {
      const mid = Math.floor((lo + hi + 1) / 2);
      if (frames[mid].atMs <= atMs) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  function tick() {
    if (!state.running || !frames.length) return;

    const wallNow = Date.now();
    const elapsedWall = wallNow - state.wallStartMs;
    const elapsedTimeline = elapsedWall * state.speed;
    const targetAt = state.timelineStartMs + elapsedTimeline;

    const nextIndex = findFrameIndex(targetAt);
    if (nextIndex !== state.cursorIndex) {
      emitFrame(nextIndex);
    }

    if (nextIndex >= frames.length - 1) {
      api.pause();
      if (handlers.onEnd) {
        handlers.onEnd(frames[frames.length - 1], frames.length - 1);
      }
    }
  }

  const api = {
    getState: function () {
      return {
        running: state.running,
        speed: state.speed,
        cursorIndex: state.cursorIndex,
        atMs: frames[state.cursorIndex] ? frames[state.cursorIndex].atMs : null,
        startedAtMs: frames.length ? frames[0].atMs : null,
        endedAtMs: frames.length ? frames[frames.length - 1].atMs : null,
        frameCount: frames.length
      };
    },
    play: function () {
      if (!frames.length) return;
      if (state.running) return;
      state.running = true;
      state.wallStartMs = Date.now();
      state.timelineStartMs = frames[state.cursorIndex].atMs;
      state.timerId = setInterval(tick, 200);
      if (handlers.onPlay) handlers.onPlay(api.getState());
    },
    pause: function () {
      if (!state.running) return;
      state.running = false;
      if (state.timerId) clearInterval(state.timerId);
      state.timerId = null;
      if (handlers.onPause) handlers.onPause(api.getState());
    },
    seekIndex: function (index) {
      if (!frames.length) return;
      emitFrame(index);
      if (state.running) {
        state.wallStartMs = Date.now();
        state.timelineStartMs = frames[state.cursorIndex].atMs;
      }
    },
    seekTimeMs: function (atMs) {
      emitFrame(findFrameIndex(atMs));
      if (state.running) {
        state.wallStartMs = Date.now();
        state.timelineStartMs = frames[state.cursorIndex].atMs;
      }
    },
    setSpeed: function (nextSpeed) {
      const s = typeof nextSpeed === "number" && nextSpeed > 0 ? nextSpeed : state.speed;
      state.speed = s;
      if (state.running) {
        state.wallStartMs = Date.now();
        state.timelineStartMs = frames[state.cursorIndex].atMs;
      }
      if (handlers.onSpeed) handlers.onSpeed(api.getState());
    },
    stop: function () {
      api.pause();
      emitFrame(0);
      if (handlers.onStop) handlers.onStop(api.getState());
    },
    frames: frames
  };

  // Emit first frame so a UI can render immediately.
  if (frames.length) {
    emitFrame(0);
  }

  return api;
}

if (typeof window !== "undefined") {
  window.BusTrackReplayEngine = {
    buildReplayTimeline,
    applyStressToTimeline,
    summarizeReplay,
    createReplayPlayer
  };
}
