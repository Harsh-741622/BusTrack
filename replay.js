function getParam(name, fallback) {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get(name) || fallback;
  } catch (_) {
    return fallback;
  }
}

function normalizeText(value) {
  return String(value || "").trim();
}

function formatClock(ms) {
  if (!ms) return "—";
  try {
    return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch (_) {
    return "—";
  }
}

function setText(id, text) {
  const node = document.getElementById(id);
  if (node) node.innerText = text;
}

function appendLog(line) {
  const node = document.getElementById("replayLog");
  if (!node) return;
  const div = document.createElement("div");
  div.innerText = line;
  node.appendChild(div);
  node.scrollTop = node.scrollHeight;
}

function getBusRoutePoints(busNo) {
  // Prefer dataset directLiveBuses, fallback to pilot route coordinates.
  const data = window.BusTrackData || {};
  const direct = Array.isArray(data.directLiveBuses) ? data.directLiveBuses : [];
  const found = direct.find(function (b) { return String(b.busNo || "").toUpperCase() === String(busNo || "").toUpperCase(); });
  if (found && Array.isArray(found.routePoints) && found.routePoints.length) {
    return found.routePoints;
  }

  // Fallback: pilot route coordinates may contain route geometry, but not mapped to busNo always.
  // As a best-effort, try using the first pilot route coordinate set.
  const coords = data.pilotRouteCoordinates;
  if (coords && typeof coords === "object") {
    const keys = Object.keys(coords);
    if (keys.length && Array.isArray(coords[keys[0]])) {
      return coords[keys[0]];
    }
  }

  return [];
}

function toLatLng(point) {
  if (Array.isArray(point) && point.length >= 2) return [point[0], point[1]];
  if (point && typeof point === "object") return [point.latitude, point.longitude];
  return null;
}

async function waitForFirebaseReady() {
  if (window.BusTrackFirebase && window.BusTrackFirebase.isReady && window.BusTrackFirebase.isReady()) {
    return;
  }
  await new Promise(function (resolve) {
    window.addEventListener("busTrackFirebaseReady", function () { resolve(); }, { once: true });
  });
}

async function readOperationalLogs(busId, dateKey) {
  await waitForFirebaseReady();
  const svc = window.BusTrackFirebase && window.BusTrackFirebase.operationalJourneyLog;
  if (!svc || typeof svc.readEvents !== "function") {
    throw new Error("operationalJourneyLog.readEvents unavailable.");
  }
  const result = await svc.readEvents(busId, dateKey);
  if (!result.ok) {
    throw new Error(result.reason || "Failed to read operational journey logs.");
  }
  return result.events || [];
}

function renderFrame(frame, marker, map, polyline) {
  if (!frame) return;
  const evt = frame.event || {};
  const live = frame.liveLocation;
  const eta = frame.eta;
  const state = frame.operationalState;

  if (live && marker) {
    marker.setLatLng([live.latitude, live.longitude]);
    if (map && !map._replayCentered) {
      map.setView([live.latitude, live.longitude], 13);
      map._replayCentered = true;
    }
  }

  setText("replayEta", eta && eta.available ? eta.label : "ETA unavailable");
  setText("replayState", state && state.label ? (state.label + (typeof state.confidence === "number" ? " (" + Math.round(state.confidence * 100) + "%)" : "")) : "—");

  const type = String(frame.kind || evt.event_type || "").toUpperCase();
  const when = formatClock(frame.atMs);

  if (type === "OPERATIONAL_EVENT") {
    appendLog(when + " • EVENT • " + (evt.title || "Operational event") + " (" + (evt.severity || "info") + ")");
  } else if (type === "SEGMENT_COMPLETED") {
    appendLog(when + " • LEARNING • " + (evt.segment_id || "") + " observed " + (evt.observed_time_minutes || "?") + "m" +
      (evt.ema_time_minutes ? (" • EMA " + evt.ema_time_minutes.toFixed(1) + "m") : "") +
      (evt.sample_count ? (" • n=" + evt.sample_count) : "")
    );
  } else if (type === "JOURNEY_STARTED" || type === "JOURNEY_PAUSED" || type === "JOURNEY_RESUMED" || type === "JOURNEY_ENDED") {
    appendLog(when + " • " + type.replace(/_/g, " "));
  } else if (type === "GPS_UPDATE") {
    // Keep GPS updates quiet (too many). Only log occasionally.
  }
}

function parseStressPresets(value) {
  return normalizeText(value)
    .split(",")
    .map(function (v) { return normalizeText(v); })
    .filter(Boolean);
}

async function main() {
  const bus = normalizeText(getParam("bus", "GJ-18-Z-7932")).toUpperCase();
  const dateKey = normalizeText(getParam("date", new Date().toISOString().slice(0, 10)));
  const speed = Number(getParam("speed", "20")) || 20;
  const stressPresets = parseStressPresets(getParam("stress", ""));
  const stressSeed = Number(getParam("seed", "42")) || 42;

  setText("replayBus", bus);
  setText("replayDate", dateKey);
  const speedNode = document.getElementById("replaySpeed");
  if (speedNode) speedNode.value = String(speed);

  const routePoints = getBusRoutePoints(bus).map(toLatLng).filter(Boolean);

  const map = L.map("replayMap", { zoomControl: true });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

  const polyline = routePoints.length ? L.polyline(routePoints, { color: "#60a5fa", weight: 4, opacity: 0.7 }).addTo(map) : null;
  if (polyline) {
    map.fitBounds(polyline.getBounds().pad(0.15));
  } else {
    map.setView([20.5937, 78.9629], 5);
  }

  const marker = L.marker(routePoints.length ? routePoints[0] : [20.5937, 78.9629]).addTo(map);

  appendLog("Loading logs for " + bus + " on " + dateKey + "...");
  const events = await readOperationalLogs(bus, dateKey);
  appendLog("Loaded " + events.length + " events.");

  const engine = window.BusTrackReplayEngine;
  if (!engine || typeof engine.buildReplayTimeline !== "function") {
    appendLog("Replay engine not available.");
    return;
  }

  let timeline = engine.buildReplayTimeline({
    events: events,
    routePoints: routePoints
  });

  if (stressPresets.length && engine.applyStressToTimeline) {
    appendLog("Applying stress: " + stressPresets.join(", ") + " (seed " + stressSeed + ")");
    timeline = engine.applyStressToTimeline(timeline, {
      enabled: true,
      presets: stressPresets,
      seed: stressSeed
    });
  }

  if (engine.summarizeReplay) {
    const summary = engine.summarizeReplay(timeline);
    appendLog("Summary: frames=" + summary.frameCount +
      " • stateTransitions=" + summary.stateTransitions +
      " • etaSamples=" + summary.eta.samples +
      " • etaRange=" + (summary.eta.minMinutes === null ? "n/a" : (summary.eta.minMinutes + "-" + summary.eta.maxMinutes + "m")) +
      " • etaSpikes=" + summary.eta.volatilitySpikes +
      " • events=" + summary.events.operationalEvents +
      " • learning=" + summary.events.learningEvents
    );
  }

  if (!timeline.ok || !timeline.frames.length) {
    appendLog("No frames to replay.");
    return;
  }

  const player = engine.createReplayPlayer(
    timeline,
    {
      onFrame: function (frame) {
        renderFrame(frame, marker, map, polyline);
      },
      onEnd: function () {
        appendLog("Replay ended.");
      }
    },
    { speed: speed }
  );

  // Controls
  const playBtn = document.getElementById("replayPlayBtn");
  const pauseBtn = document.getElementById("replayPauseBtn");
  const restartBtn = document.getElementById("replayRestartBtn");

  if (playBtn) playBtn.addEventListener("click", function () { player.play(); });
  if (pauseBtn) pauseBtn.addEventListener("click", function () { player.pause(); });
  if (restartBtn) restartBtn.addEventListener("click", function () { player.stop(); });
  if (speedNode) speedNode.addEventListener("change", function () {
    player.setSpeed(Number(speedNode.value) || 20);
  });

  // Expose for console debugging
  window.BusTrackReplay = player;
  window.BusTrackReplayTimeline = timeline;

  appendLog("Ready. Click Play.");
}

main().catch(function (error) {
  appendLog("Replay failed: " + (error && error.message ? error.message : String(error)));
});
