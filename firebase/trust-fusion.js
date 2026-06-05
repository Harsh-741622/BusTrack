import { isDebugEnabled, trace } from "./observability.js";

export const trustFusionDefaults = {
  // Crowd contributor stability window (how long we consider a passenger "consistent").
  contributorStableMs: 4 * 60 * 1000,
  contributorForgetMs: 20 * 60 * 1000,
  maxContributorsPerBus: 120,

  // Base weight caps (kept lightweight; not "scoring people", only signals).
  weights: {
    driverGps: 0.45,
    crowd: 0.2,
    learning: 0.15,
    continuity: 0.15,
    agreement: 0.05
  }
};

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeLower(value) {
  return normalizeText(value).toLowerCase();
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function nowMs(input) {
  return typeof (input && input.nowMs) === "number" ? input.nowMs : Date.now();
}

function shallowCopy(obj) {
  return obj && typeof obj === "object" ? Object.assign({}, obj) : {};
}

function scoreSignalHealth(signalHealth, trackingStatus) {
  const state = normalizeLower((signalHealth && signalHealth.state) || trackingStatus || "");
  if (state === "live") return 1;
  if (state === "delayed") return 0.75;
  if (state === "paused") return 0.55;
  if (state === "offline") return 0.25;
  return 0.4;
}

function scoreContinuity(input) {
  // Treat "stable" consolidated state as a continuity booster.
  const op = input && input.operationalState;
  const stable = !!(op && (op.stable === true || op.changePending === false));
  const pending = !!(op && op.changePending);
  if (stable && !pending) return 1;
  if (pending) return 0.65;
  return 0.8;
}

function scoreLearning(input) {
  const learned = input && input.learnedData;
  const coverage = typeof (learned && learned.coverageRatio) === "number" ? learned.coverageRatio : null;
  const avgSamples = typeof (learned && learned.avgSampleCount) === "number" ? learned.avgSampleCount : null;
  if (coverage === null && avgSamples === null) {
    return null;
  }

  // Lightweight heuristic: coverage is primary, samples help.
  const coverageScore = coverage === null ? 0 : clamp01((coverage - 0.1) / 0.6); // 0.1→0, 0.7→1
  const sampleScore = avgSamples === null ? 0 : clamp01(avgSamples / 8); // 8 avg samples ~ strong
  return clamp01(0.7 * coverageScore + 0.3 * sampleScore);
}

function scoreCrowdAggregate(aggregate) {
  if (!aggregate || !aggregate.available) return null;
  const contributors = typeof aggregate.activeContributors === "number" ? aggregate.activeContributors : 0;
  // More active contributors -> more trustworthy crowd signal (still capped).
  return clamp01(contributors / 6);
}

function scoreAgreement(input) {
  // Agreement is about *signals*, not users. If multiple independent signals
  // point to a coherent picture, increase trust slightly.
  const signalsPresent = [];

  const driverScore = scoreSignalHealth(input && input.signalHealth, input && input.trackingStatus);
  if (Number.isFinite(driverScore)) signalsPresent.push({ key: "driver", score: driverScore });

  const crowd = scoreCrowdAggregate(input && input.crowdAggregate);
  if (crowd !== null) signalsPresent.push({ key: "crowd", score: crowd });

  const learning = scoreLearning(input);
  if (learning !== null) signalsPresent.push({ key: "learning", score: learning });

  if (signalsPresent.length < 2) return null;

  // If all scores are clustered, treat as agreement.
  const values = signalsPresent.map(function (s) { return s.score; });
  const min = Math.min.apply(null, values);
  const max = Math.max.apply(null, values);
  const spread = max - min;
  return clamp01(1 - spread); // spread 0 → 1, spread 1 → 0
}

export function createTrustFusionTracker() {
  return {
    byBus: {}
  };
}

function getBusBucket(tracker, busId) {
  const id = normalizeText(busId);
  if (!id) return null;
  if (!tracker.byBus[id]) {
    tracker.byBus[id] = {
      contributors: {},
      lastUpdatedAtMs: 0
    };
  }
  return tracker.byBus[id];
}

/**
 * Update per-bus contributor consistency from raw crowdUpdates payload.
 * This is local-only memory; it does NOT persist identities or expose them.
 */
export function updateCrowdConsistency(tracker, busId, updates, options) {
  const t = tracker || createTrustFusionTracker();
  const bucket = getBusBucket(t, busId);
  if (!bucket) return { tracker: t, ok: false };

  const now = nowMs(options);
  const defaults = Object.assign({}, trustFusionDefaults, options && options.defaults);
  const contributors = bucket.contributors;

  const raw = updates && typeof updates === "object" ? updates : {};
  Object.keys(raw).slice(0, defaults.maxContributorsPerBus).forEach(function (key) {
    const item = raw[key];
    const id = normalizeText((item && (item.userId || item.user_id || item.sessionId || item.session_id)) || key);
    if (!id) return;

    const createdAt =
      (typeof item.createdAt === "number" ? item.createdAt : null) ||
      (typeof item.created_at === "number" ? item.created_at : null) ||
      (typeof item.joinedAt === "number" ? item.joinedAt : null) ||
      (typeof item.joined_at === "number" ? item.joined_at : null) ||
      now;

    const existing = contributors[id];
    if (!existing) {
      contributors[id] = { firstSeenAtMs: createdAt, lastSeenAtMs: createdAt, seenCount: 1 };
      return;
    }

    existing.lastSeenAtMs = Math.max(existing.lastSeenAtMs, createdAt);
    existing.seenCount += 1;
  });

  // Evict old entries.
  Object.keys(contributors).forEach(function (id) {
    const c = contributors[id];
    if (!c) return;
    if (now - c.lastSeenAtMs > defaults.contributorForgetMs) {
      delete contributors[id];
    }
  });

  bucket.lastUpdatedAtMs = now;
  return { ok: true, tracker: t };
}

function computeCrowdConsistencyScore(bucket, now, defaults) {
  if (!bucket) return null;
  const contributors = bucket.contributors || {};
  const keys = Object.keys(contributors);
  if (!keys.length) return null;

  let stableCount = 0;
  keys.forEach(function (id) {
    const c = contributors[id];
    const age = Math.max(0, now - (c.firstSeenAtMs || now));
    if (age >= defaults.contributorStableMs) {
      stableCount += 1;
    }
  });

  // stable contributor ratio, but cap the effect
  return clamp01(stableCount / Math.max(3, keys.length));
}

export function computeTrustFusion(input, tracker, options) {
  input = input || {};
  const defaults = Object.assign({}, trustFusionDefaults, options && options.defaults);
  const weights = Object.assign({}, defaults.weights, options && options.weights);
  const now = nowMs(input);
  const busId = normalizeText(input.busId || input.bus_id || input.busNo);
  const t = tracker || createTrustFusionTracker();
  const bucket = busId ? getBusBucket(t, busId) : null;

  const reasons = [];

  const driverGps = scoreSignalHealth(input.signalHealth, input.trackingStatus);
  reasons.push("driver_gps:" + driverGps.toFixed(2));

  const continuity = scoreContinuity(input);
  reasons.push("continuity:" + continuity.toFixed(2));

  const learning = scoreLearning(input);
  if (learning !== null) reasons.push("learning:" + learning.toFixed(2));

  const crowd = scoreCrowdAggregate(input.crowdAggregate);
  if (crowd !== null) reasons.push("crowd:" + crowd.toFixed(2));

  const crowdConsistency = computeCrowdConsistencyScore(bucket, now, defaults);
  if (crowdConsistency !== null) reasons.push("crowd_consistency:" + crowdConsistency.toFixed(2));

  const agreement = scoreAgreement(input);
  if (agreement !== null) reasons.push("agreement:" + agreement.toFixed(2));

  // Fuse with lightweight normalization. Missing signals simply don't contribute their weight.
  let totalWeight = 0;
  let weighted = 0;

  function add(component, weight, label) {
    if (component === null || component === undefined) return;
    const w = Number(weight) || 0;
    if (w <= 0) return;
    totalWeight += w;
    weighted += clamp01(component) * w;
    if (label) {
      // label already included in reasons; keep here if we need expansion later.
    }
  }

  add(driverGps, weights.driverGps, "driverGps");
  add(crowd !== null ? clamp01(0.7 * crowd + 0.3 * (crowdConsistency ?? 0)) : null, weights.crowd, "crowd");
  add(learning, weights.learning, "learning");
  add(continuity, weights.continuity, "continuity");
  add(agreement, weights.agreement, "agreement");

  const score = totalWeight > 0 ? clamp01(weighted / totalWeight) : 0.5;

  // Map to a lightweight label (internal; UI can keep existing labels).
  const label = score >= 0.82 ? "High Trust" : score >= 0.6 ? "Medium Trust" : "Low Trust";

  // Penalize explicit conflicts: driver offline but many active crowd contributors suggests service ongoing but telemetry unreliable.
  if (driverGps <= 0.3 && crowd !== null && crowd >= 0.6) {
    reasons.push("conflict:driver_offline_vs_crowd_active");
  }

  const result = {
    score: score,
    label: label,
    reasons: reasons.slice(0, 8),
    components: {
      driverGps: driverGps,
      crowd: crowd,
      crowdConsistency: crowdConsistency,
      learning: learning,
      continuity: continuity,
      agreement: agreement
    },
    weights: shallowCopy(weights)
  };

  if (isDebugEnabled()) {
    trace("trust.fusion", Object.assign({ busId: busId }, result), { throttleMs: 1500 });
  }

  return { ok: true, tracker: t, trust: result };
}

/**
 * Apply trust to an existing confidence value (0..1).
 * This is intentionally conservative (does not amplify beyond +5%).
 */
export function applyTrustToConfidence(confidence, trustScore) {
  const c = clamp01(confidence);
  const t = clamp01(trustScore);
  // Mostly downweight; tiny boost only when trust is very high.
  const boost = t >= 0.9 ? 0.05 : 0;
  return clamp01(c * (0.55 + 0.45 * t) + boost);
}

if (typeof window !== "undefined") {
  window.BusTrackTrustFusion = {
    defaults: trustFusionDefaults,
    createTrustFusionTracker,
    updateCrowdConsistency,
    computeTrustFusion,
    applyTrustToConfidence
  };
}

