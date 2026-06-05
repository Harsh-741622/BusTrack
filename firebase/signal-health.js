export const signalHealthThresholds = {
  liveMaxAgeMs: 10000,
  delayedMaxAgeMs: 30000,
  offlineMaxAgeMs: 40000
};

const PAUSED_STATUSES = ["paused"];
const OFFLINE_STATUSES = [
  "completed",
  "ended",
  "error",
  "inactive",
  "offline",
  "ready",
  "standby",
  "stopped"
];

function parseTimestamp(timestamp) {
  if (typeof timestamp === "number" && Number.isFinite(timestamp)) {
    return timestamp;
  }

  if (timestamp instanceof Date) {
    return timestamp.getTime();
  }

  if (typeof timestamp === "string" && timestamp.trim()) {
    const parsed = Date.parse(timestamp);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

function normalizeStatus(status) {
  return String(status || "").trim().toLowerCase();
}

function normalizeThresholds(thresholds) {
  return {
    liveMaxAgeMs: Number(thresholds && thresholds.liveMaxAgeMs) || signalHealthThresholds.liveMaxAgeMs,
    delayedMaxAgeMs: Number(thresholds && thresholds.delayedMaxAgeMs) || signalHealthThresholds.delayedMaxAgeMs,
    offlineMaxAgeMs: Number(thresholds && thresholds.offlineMaxAgeMs) || signalHealthThresholds.offlineMaxAgeMs
  };
}

export function getAgeMs(timestamp, now) {
  const parsedTimestamp = parseTimestamp(timestamp);

  if (parsedTimestamp === null) {
    return null;
  }

  return Math.max(0, (typeof now === "number" ? now : Date.now()) - parsedTimestamp);
}

export function formatSignalAge(ageMs) {
  if (ageMs === null) {
    return "No realtime update yet";
  }

  const seconds = Math.max(0, Math.round(ageMs / 1000));

  if (seconds < 60) {
    return "Last updated " + seconds + " sec ago";
  }

  return "Last updated " + Math.round(seconds / 60) + " min ago";
}

export function getSignalHealth(lastUpdateTimestamp, trackingStatus, options) {
  const thresholds = normalizeThresholds(options && options.thresholds);
  const status = normalizeStatus(trackingStatus);
  const ageMs = getAgeMs(lastUpdateTimestamp, options && options.now);
  let state = "offline";

  if (PAUSED_STATUSES.indexOf(status) !== -1) {
    state = "paused";
  } else if (OFFLINE_STATUSES.indexOf(status) !== -1) {
    state = "offline";
  } else if (ageMs !== null && ageMs <= thresholds.liveMaxAgeMs) {
    state = "live";
  } else if (ageMs !== null && ageMs <= thresholds.delayedMaxAgeMs) {
    state = "delayed";
  } else {
    state = "offline";
  }

  return {
    state: state,
    label: state.toUpperCase(),
    tone: state === "live" ? "healthy" : state === "delayed" || state === "paused" ? "warning" : "danger",
    ageMs: ageMs,
    ageSeconds: ageMs === null ? null : Math.round(ageMs / 1000),
    freshnessText: formatSignalAge(ageMs),
    trackingStatus: status || "unknown",
    thresholds: thresholds
  };
}

export function getWorstSignalHealth(primaryHealth, secondaryHealth) {
  const rank = {
    live: 0,
    delayed: 1,
    paused: 2,
    offline: 3
  };
  const primaryRank = rank[primaryHealth && primaryHealth.state] ?? rank.offline;
  const secondaryRank = rank[secondaryHealth && secondaryHealth.state] ?? rank.offline;

  return primaryRank >= secondaryRank ? primaryHealth : secondaryHealth;
}

if (typeof window !== "undefined") {
  window.BusTrackSignalHealth = {
    thresholds: signalHealthThresholds,
    getSignalHealth: getSignalHealth,
    getAgeMs: getAgeMs,
    formatSignalAge: formatSignalAge,
    getWorstSignalHealth: getWorstSignalHealth
  };
}
