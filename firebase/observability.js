const DEFAULT_BUFFER_SIZE = 250;
const DEFAULT_THROTTLE_MS = 2000;

let cachedEnabled = null;

function safeWindow() {
  return typeof window !== "undefined" ? window : null;
}

function safeLocationSearch() {
  const w = safeWindow();
  return w && w.location ? String(w.location.search || "") : "";
}

function getQueryFlag(name) {
  const search = safeLocationSearch();
  if (!search || search.indexOf("?") === -1) {
    return null;
  }
  try {
    const params = new URLSearchParams(search);
    if (!params.has(name)) return null;
    const value = params.get(name);
    if (value === null) return true;
    const normalized = String(value).trim().toLowerCase();
    if (!normalized) return true;
    return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
  } catch (_) {
    return null;
  }
}

function getLocalStorageFlag(key) {
  const w = safeWindow();
  if (!w || !w.localStorage) return null;
  try {
    const value = w.localStorage.getItem(key);
    if (value === null) return null;
    const normalized = String(value).trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
  } catch (_) {
    return null;
  }
}

export function isDebugEnabled() {
  if (cachedEnabled !== null) {
    return cachedEnabled;
  }

  const w = safeWindow();
  const explicitGlobal = w && typeof w.BusTrackDebug === "boolean" ? w.BusTrackDebug : null;
  if (explicitGlobal !== null) {
    cachedEnabled = explicitGlobal;
    return cachedEnabled;
  }

  const query = getQueryFlag("debug");
  if (query !== null) {
    cachedEnabled = !!query;
    return cachedEnabled;
  }

  const stored = getLocalStorageFlag("bustrack_debug");
  if (stored !== null) {
    cachedEnabled = !!stored;
    return cachedEnabled;
  }

  cachedEnabled = false;
  return cachedEnabled;
}

export function setDebugEnabled(enabled) {
  cachedEnabled = !!enabled;
  const w = safeWindow();
  if (!w) return;
  try {
    if (w.localStorage) {
      w.localStorage.setItem("bustrack_debug", enabled ? "1" : "0");
    }
  } catch (_) {}
  w.BusTrackDebug = !!enabled;
}

function createRingBuffer(maxSize) {
  const size = Math.max(10, Number(maxSize) || DEFAULT_BUFFER_SIZE);
  const buffer = new Array(size);
  let cursor = 0;
  let count = 0;

  return {
    push: function (item) {
      buffer[cursor] = item;
      cursor = (cursor + 1) % size;
      count = Math.min(size, count + 1);
    },
    list: function () {
      const out = [];
      for (let i = 0; i < count; i++) {
        const index = (cursor - count + i + size) % size;
        out.push(buffer[index]);
      }
      return out;
    }
  };
}

function getStore() {
  const w = safeWindow();
  if (!w) return null;
  if (!w.__busTrackObservabilityStore) {
    w.__busTrackObservabilityStore = {
      buffer: createRingBuffer(DEFAULT_BUFFER_SIZE),
      lastConsoleAtByTopic: {}
    };
  }
  return w.__busTrackObservabilityStore;
}

function nowMs() {
  return Date.now();
}

function shallowClone(value, depth) {
  const maxDepth = typeof depth === "number" ? depth : 3;

  if (maxDepth <= 0) {
    return "[depth]";
  }

  if (value === null || value === undefined) return value;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value.slice(0, 25).map(function (item) {
      return shallowClone(item, maxDepth - 1);
    });
  }

  if (typeof value === "object") {
    const out = {};
    const keys = Object.keys(value).slice(0, 40);
    keys.forEach(function (key) {
      out[key] = shallowClone(value[key], maxDepth - 1);
    });
    if (Object.keys(value).length > keys.length) {
      out.__truncated__ = true;
    }
    return out;
  }

  return String(value);
}

export function trace(topic, payload, options) {
  if (!isDebugEnabled()) return;

  const store = getStore();
  const entry = {
    atMs: nowMs(),
    topic: String(topic || "trace"),
    payload: shallowClone(payload, (options && options.depth) || 3)
  };

  if (store) {
    store.buffer.push(entry);
  }

  const throttleMs = Number(options && options.throttleMs) || DEFAULT_THROTTLE_MS;
  const consoleMode = (options && options.console) || "group";
  const w = safeWindow();
  if (!w || !w.console) return;

  const lastAt = store ? (store.lastConsoleAtByTopic[entry.topic] || 0) : 0;
  if (throttleMs > 0 && entry.atMs - lastAt < throttleMs) {
    return;
  }
  if (store) {
    store.lastConsoleAtByTopic[entry.topic] = entry.atMs;
  }

  const label = "[BusTrack] " + entry.topic;
  try {
    if (consoleMode === "log") {
      w.console.log(label, entry.payload);
      return;
    }
    if (w.console.groupCollapsed) {
      w.console.groupCollapsed(label);
      w.console.log(entry.payload);
      w.console.groupEnd();
    } else {
      w.console.log(label, entry.payload);
    }
  } catch (_) {}
}

export function getTraces(filter) {
  const store = getStore();
  if (!store) return [];
  const list = store.buffer.list();
  const topicPrefix = filter && filter.topicPrefix ? String(filter.topicPrefix) : "";
  const sinceMs = filter && typeof filter.sinceMs === "number" ? filter.sinceMs : 0;
  const limit = filter && typeof filter.limit === "number" ? filter.limit : 200;

  return list
    .filter(function (entry) {
      if (!entry) return false;
      if (sinceMs && entry.atMs < sinceMs) return false;
      if (topicPrefix && String(entry.topic).indexOf(topicPrefix) !== 0) return false;
      return true;
    })
    .slice(-Math.max(1, limit));
}

export function getLatestTrace(topicPrefix) {
  const traces = getTraces({ topicPrefix: topicPrefix || "", limit: 1 });
  return traces.length ? traces[0] : null;
}

if (typeof window !== "undefined") {
  window.BusTrackObservability = {
    isDebugEnabled,
    setDebugEnabled,
    trace,
    getTraces,
    getLatestTrace
  };
}

