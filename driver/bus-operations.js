import { driverFirebaseSync } from "./driver-firebase-sync.js";
import { getSignalHealth, getWorstSignalHealth } from "../firebase/signal-health.js";
import { operationalJourneyLogService } from "../firebase/operational-journey-log-service.js";
import { createOperationalEventTracker, detectOperationalEvents } from "../firebase/operational-event-intelligence.js";
import { computeTripIntelligence } from "../firebase/trip-intelligence.js";
import { calculateDistance } from "../firebase/eta-utils.js";
import { timeLearningService } from "../firebase/time-learning-service.js";
import { liveBusService } from "../firebase/live-bus-service.js";
import {
  consolidateOperationalState,
  createOperationalStateTracker
} from "../firebase/operational-state.js";
import { isDebugEnabled, trace } from "../firebase/observability.js";
import { computeTrustFusion, createTrustFusionTracker } from "../firebase/trust-fusion.js";

(function () {
  var GPS_HISTORY_LOG_INTERVAL_MS = 15000;
  var SEGMENT_LEARNING_ENABLED = true;
  // Stop “arrival” geofence radius for segment completion detection.
  // Keep conservative to avoid noisy stop flips.
  var STOP_ARRIVAL_RADIUS_KM = 0.25;
  // Prevent double-firing if GPS jitters around a stop.
  var MIN_SEGMENT_TIME_SECONDS = 30;
  var EMA_ALPHA = 0.2;
  var EVENT_INTELLIGENCE_ENABLED = true;
  var EVENT_PUBLISH_COOLDOWN_MS = 30000;

  var driver = window.BusTrackDriver || {};
  var buses = driver.demoBuses || [];
  var gpsService = driver.browserGpsService;
  var simulationService = driver.gpsSimulationService;
  var params = new URLSearchParams(window.location.search);
  var requestedBus = String(params.get("bus") || "GJ-18-Z-7932").toUpperCase();
  var bus = buses.find(function (item) {
    return item.busNo.toUpperCase() === requestedBus;
  }) || buses[0];

  function buildSegmentMap() {
    var data = window.BusTrackData || {};
    var segments = Array.isArray(data.segments) ? data.segments : [];

    return segments.reduce(function (map, segment) {
      if (segment && segment.segment_id) {
        map[segment.segment_id] = segment;
      }
      return map;
    }, {});
  }

  var segmentMap = buildSegmentMap();

  var learning = {
    enabled: SEGMENT_LEARNING_ENABLED,
    currentStopIndex: null,
    atStop: false,
    segmentStartTimestampMs: null,
    lastDebugUpdate: null
  };

  var eventIntel = {
    enabled: EVENT_INTELLIGENCE_ENABLED,
    atStopSinceMs: null,
    lastStopIndex: null,
    lastStopProgressMs: 0,
    pausedSinceMs: null,
    signalTransitions: [],
    deviationSinceMs: null,
    lastPublishedAtByType: {},
    lastActiveTypes: {},
    tracker: createOperationalEventTracker(),
    monitorTimerId: null
  };

  var state = {
    status: "ready",
    seconds: 0,
    timerId: null,
    progress: 28,
    completedStops: 1,
    gpsStatus: "standby",
    gpsMessage: "Start sharing to request GPS and publish a live operational session.",
    simulationEnabled: false,
    driverSession: {
      id: "",
      startedAt: null,
      heartbeatTimerId: null,
      lockUnsubscribe: null,
      heartbeatTimeoutMs: 45000,
      locked: false,
      recoverable: false,
      recovering: false,
      message: ""
    },
    gps: {
      latitude: null,
      longitude: null,
      accuracy: null,
      speed: null,
      heading: null,
      updatedAt: "Not started",
      lastUpdatedAt: null
    },
    firebase: {
      status: "Not connected",
      lastSync: "Not synced",
      lastSyncAt: null,
      syncState: "Standby",
      ok: false,
      message: "Firebase sync will start after live GPS coordinates are available."
    },
    historicalLog: {
      lastGpsLogAt: 0
    },
    network: {
      browserOnline: navigator.onLine !== false,
      firebaseConnected: null,
      connectionUnsubscribe: null,
      message: "",
      restoring: false
    },
    operationalEvents: {
      events: [],
      primary: null
    },
    tripIntelligence: {
      activeTripId: "",
      lifecycle: "Scheduled",
      adherenceLabel: "Schedule pending",
      healthLabel: "Stable Operation",
      progressPercent: 0,
      previousOffsetMinutes: null,
      offsetMinutes: null,
      direction: ""
    },
    operationalState: {
      tracker: createOperationalStateTracker(),
      current: null,
      lastTracedLabel: "",
      lastTracedAtMs: 0
    },
    trustFusion: {
      tracker: createTrustFusionTracker(),
      current: null
    }
  };

  var elements = {
    statusPill: document.getElementById("operationsStatusPill"),
    liveBadge: document.getElementById("operationsLiveBadge"),
    busNo: document.getElementById("operationsBusNo"),
    routeName: document.getElementById("operationsRouteName"),
    driverMini: document.getElementById("operationsDriverMini"),
    driver: document.getElementById("operationsDriver"),
    shift: document.getElementById("operationsShift"),
    currentStop: document.getElementById("operationsCurrentStop"),
    nextStop: document.getElementById("operationsNextStop"),
    eta: document.getElementById("operationsEta"),
    occupancy: document.getElementById("operationsOccupancy"),
    accuracy: document.getElementById("operationsAccuracy"),
    liveStatus: document.getElementById("operationsLiveStatus"),
    timer: document.getElementById("operationsTimer"),
    startLiveBtn: document.getElementById("startLiveBtn"),
    pauseBtn: document.getElementById("pauseTrackingBtn"),
    resumeBtn: document.getElementById("resumeTrackingBtn"),
    stopBtn: document.getElementById("stopSharingBtn"),
    endBtn: document.getElementById("endJourneyBtn"),
    simulationToggle: document.getElementById("simulationModeToggle"),
    simulationToggleShell: document.querySelector(".simulation-toggle"),
    marker: document.getElementById("opsBusMarker"),
    timeline: document.getElementById("routeTimeline"),
    sideGps: document.getElementById("sideGps"),
    sideBattery: document.getElementById("sideBattery"),
    sideEngine: document.getElementById("sideEngine"),
    sideLoad: document.getElementById("sideLoad"),
    sideDelay: document.getElementById("sideDelay"),
    summary: document.getElementById("sessionSummary"),
    summaryDuration: document.getElementById("summaryDuration"),
    summaryStops: document.getElementById("summaryStops"),
    gpsDebugStatus: document.getElementById("gpsDebugStatus"),
    gpsLatitude: document.getElementById("gpsLatitude"),
    gpsLongitude: document.getElementById("gpsLongitude"),
    gpsAccuracyValue: document.getElementById("gpsAccuracyValue"),
    gpsLastUpdated: document.getElementById("gpsLastUpdated"),
    gpsDebugMessage: document.getElementById("gpsDebugMessage"),
    firebaseStatus: document.getElementById("firebaseStatus"),
    firebaseLastSync: document.getElementById("firebaseLastSync"),
    firebaseSyncState: document.getElementById("firebaseSyncState"),
    gpsConnectionStatus: document.getElementById("gpsConnectionStatus"),
    signalFreshness: document.getElementById("signalFreshness"),
    sessionState: document.getElementById("sessionState"),
    trackingStatus: document.getElementById("trackingStatus")
  };

  function ensureIcons() {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  function formatTime(totalSeconds) {
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;

    return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
  }

  function getLocalSyncTime() {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }

  function setText(node, text) {
    if (node) {
      node.innerText = text;
    }
  }

  function setToneClass(node, tone) {
    if (!node) {
      return;
    }

    node.classList.remove("healthy", "warning", "danger");
    node.classList.add(tone || "danger");
  }

  function formatCoordinate(value) {
    return typeof value === "number" ? value.toFixed(6) : "Waiting";
  }

  function formatAccuracy(value) {
    return typeof value === "number" ? Math.round(value) + "m" : "Not available";
  }

  function getStatusCopy() {
    if (state.driverSession.recovering) {
      return "Reconnecting";
    }

    if (state.driverSession.recoverable && state.status === "ready") {
      return "Resume available";
    }

    if (state.driverSession.locked) {
      return "Bus locked";
    }

    if (state.status === "active") {
      return "Active";
    }

    if (state.status === "paused") {
      return "Paused";
    }

    if (state.status === "stopped") {
      return "Sharing stopped";
    }

    if (state.status === "completed") {
      return "Completed";
    }

    return "Ready";
  }

  function renderTimeline() {
    var currentIndex = Math.min(state.completedStops, bus.stops.length - 1);

    elements.timeline.innerHTML = bus.stops
      .map(function (stop, index) {
        var stateClass = index < currentIndex ? "completed" : index === currentIndex ? "current" : "";
        var icon = index < currentIndex ? "&#10003;" : index === currentIndex ? "&#9679;" : "&#9675;";

        return (
          "<article class='" +
          stateClass +
          "'><span>" +
          icon +
          "</span><div><strong>" +
          stop +
          "</strong><p>" +
          (index < currentIndex ? "Completed" : index === currentIndex ? "Current stop" : "Upcoming stop") +
          "</p></div></article>"
        );
      })
      .join("");
  }

  function renderControls() {
    var isReady = state.status === "ready";
    var isActive = state.status === "active";
    var isPaused = state.status === "paused";
    var isStopped = state.status === "stopped";
    var isCompleted = state.status === "completed";
    var signalHealth = getDriverSignalHealth();

    elements.startLiveBtn.disabled = isCompleted || isActive || state.driverSession.locked || state.driverSession.recovering;
    elements.pauseBtn.disabled = !isActive;
    elements.resumeBtn.disabled = !(isPaused || isStopped);
    elements.stopBtn.disabled = !(isActive || isPaused);
    elements.endBtn.disabled = isReady || isCompleted;

    if (elements.simulationToggle) {
      elements.simulationToggle.checked = state.simulationEnabled;
      elements.simulationToggle.disabled = isActive || isPaused;
    }

    if (elements.simulationToggleShell) {
      elements.simulationToggleShell.classList.toggle("active", state.simulationEnabled);
      elements.simulationToggleShell.classList.toggle("disabled", isActive || isPaused);
    }

    elements.startLiveBtn.classList.toggle("active", isActive);
    elements.startLiveBtn.classList.toggle("paused", isPaused || isStopped);
    elements.startLiveBtn.classList.toggle("locked", state.driverSession.locked);
    elements.startLiveBtn.classList.toggle("recovering", state.driverSession.recovering);
    elements.liveBadge.classList.toggle("active", signalHealth.state === "live");
    elements.liveBadge.classList.toggle("paused", isPaused || isStopped);
    elements.marker.classList.toggle("active", isActive);
    elements.gpsDebugStatus.classList.toggle("active", state.gpsStatus === "watching");
    elements.gpsDebugStatus.classList.toggle("warning", state.gpsStatus === "requesting" || state.gpsStatus === "error");

    setText(
      elements.startLiveBtn.querySelector("span"),
      isActive
        ? "Live Session Active"
        : state.driverSession.recovering
          ? "Reconnecting Session"
        : state.driverSession.recoverable
          ? "Resume Existing Journey"
        : state.driverSession.locked
          ? "Bus Session Locked"
        : state.simulationEnabled
          ? "Start Simulated Live Sharing"
          : "Start Live Location Sharing"
    );
  }

  function getGpsStatusCopy() {
    if (state.simulationEnabled && state.gpsStatus === "watching") {
      return "Simulation live";
    }

    if (state.gpsStatus === "requesting") {
      return "Requesting permission";
    }

    if (state.gpsStatus === "watching") {
      return "Driver Signal Active";
    }

    if (state.gpsStatus === "paused") {
      return "Live Session Paused";
    }

    if (state.gpsStatus === "stopped") {
      return "GPS stopped";
    }

    if (state.gpsStatus === "error") {
      return "GPS error";
    }

    return "Ready for GPS";
  }

  function getTrackingStatusForHealth() {
    if (state.status === "active") {
      return "active";
    }

    if (state.status === "paused") {
      return "paused";
    }

    return state.status;
  }

  function getDriverSignalHealth() {
    var trackingStatus = getTrackingStatusForHealth();
    var gpsHealth = getSignalHealth(state.gps.lastUpdatedAt, trackingStatus);
    var firebaseTrackingStatus =
      state.firebase.status === "Syncing" || state.firebase.ok
        ? trackingStatus
        : "error";
    var firebaseHealth = getSignalHealth(
      state.firebase.lastSyncAt,
      firebaseTrackingStatus
    );

    if (trackingStatus === "paused") {
      return getSignalHealth(state.gps.lastUpdatedAt || state.firebase.lastSyncAt, "paused");
    }

    if (trackingStatus !== "active") {
      return getSignalHealth(state.gps.lastUpdatedAt || state.firebase.lastSyncAt, trackingStatus);
    }

    return getWorstSignalHealth(gpsHealth, firebaseHealth);
  }

  function getGpsConnectionCopy() {
    if (state.gpsStatus !== "watching") {
      return state.gpsStatus === "error" ? "GPS unavailable" : "Waiting for GPS";
    }

    return state.simulationEnabled ? "Simulation Connected" : "Realtime GPS Tracking";
  }

  function getFirebaseTone() {
    if (!state.network.browserOnline) {
      return "danger";
    }

    if (state.network.firebaseConnected === false) {
      return "warning";
    }

    if (state.firebase.ok) {
      return "healthy";
    }

    if (state.firebase.status === "Syncing") {
      return "warning";
    }

    return "danger";
  }

  function getNetworkRecoveryMessage() {
    if (!state.network.browserOnline) {
      return "Device is offline. Realtime updates will resume when the network returns.";
    }

    if (state.network.restoring) {
      return "Restoring operational session...";
    }

    if (state.network.firebaseConnected === false) {
      return "Reconnecting to live tracking...";
    }

    return state.network.message || "";
  }

  function getOperationalEventStatusNode() {
    var grid = document.querySelector(".gps-debug-grid");
    var node = document.getElementById("operationalEventStatus");
    var article;

    if (node || !grid) {
      return node;
    }

    article = document.createElement("article");
    article.innerHTML = "<span>Operational Event</span><strong id='operationalEventStatus'>Normal</strong>";
    grid.appendChild(article);
    return document.getElementById("operationalEventStatus");
  }

  function getTripIntelligenceStatusNode() {
    var grid = document.querySelector(".gps-debug-grid");
    var node = document.getElementById("tripIntelligenceStatus");
    var article;

    if (node || !grid) {
      return node;
    }

    article = document.createElement("article");
    article.innerHTML = "<span>Trip Health</span><strong id='tripIntelligenceStatus'>Stable Operation</strong>";
    grid.appendChild(article);
    return document.getElementById("tripIntelligenceStatus");
  }

  function ensureOperationalStateNodes() {
    if (!isDebugEnabled()) {
      return null;
    }

    var grid = document.querySelector(".gps-debug-grid");
    if (!grid) {
      return null;
    }

    function ensure(id, label) {
      var existing = document.getElementById(id);
      if (existing) return existing;
      var article = document.createElement("article");
      article.innerHTML = "<span>" + label + "</span><strong id='" + id + "'>Waiting</strong>";
      grid.appendChild(article);
      return document.getElementById(id);
    }

    return {
      opState: ensure("operationsOpState", "Op State"),
      opConfidence: ensure("operationsOpConfidence", "Op Confidence"),
      opReason: ensure("operationsOpReason", "Op Reason"),
      learning: ensure("operationsLearning", "Learning")
    };
  }

  function renderOperationalStateDebug() {
    if (!isDebugEnabled()) {
      return;
    }

    var nodes = ensureOperationalStateNodes();
    var op = state.operationalState.current;
    if (!nodes || !op) {
      return;
    }

    setText(nodes.opState, op.label || "Unknown");
    setToneClass(nodes.opState, op.tone || "healthy");

    var confPct = typeof op.confidence === "number"
      ? Math.round(op.confidence * 100) + "%"
      : "n/a";
    setText(nodes.opConfidence, confPct);
    setToneClass(nodes.opConfidence, op.tone || "healthy");

    setText(nodes.opReason, (op.reasons && op.reasons.length ? op.reasons.join(", ") : "none"));
    setToneClass(nodes.opReason, op.tone || "healthy");

    if (learning && learning.lastDebugUpdate) {
      var d = learning.lastDebugUpdate;
      setText(
        nodes.learning,
        (d.segmentId ? d.segmentId + " • " : "") +
          (typeof d.emaMinutes === "number" ? ("EMA " + d.emaMinutes.toFixed(1) + "m") : "EMA n/a") +
          (typeof d.sampleCount === "number" ? (" • n=" + d.sampleCount) : "")
      );
      setToneClass(nodes.learning, "healthy");
    } else {
      setText(nodes.learning, learning && learning.enabled ? "Learning enabled" : "Learning disabled");
      setToneClass(nodes.learning, learning && learning.enabled ? "healthy" : "warning");
    }
  }

  function getDriverLocationSnapshot(locationOverride) {
    var source = locationOverride || state.gps;

    if (
      !source ||
      typeof source.latitude !== "number" ||
      typeof source.longitude !== "number"
    ) {
      return null;
    }

    return {
      latitude: source.latitude,
      longitude: source.longitude,
      accuracy: source.accuracy,
      speed: source.speed,
      heading: source.heading,
      currentStopIndex: typeof source.currentStopIndex === "number" ? source.currentStopIndex : null,
      atStop: source.atStop === true
    };
  }

  function normalizeProgressForEvents(progressPayload) {
    if (progressPayload && typeof progressPayload.current_stop_index === "number") {
      return {
        currentStopIndex: progressPayload.current_stop_index,
        nextStopIndex: progressPayload.next_stop_index,
        atStop: progressPayload.at_stop === true,
        approaching: progressPayload.approaching_stop === true
      };
    }

    return {
      currentStopIndex: learning.currentStopIndex,
      nextStopIndex:
        learning.currentStopIndex === null
          ? null
          : Math.min(learning.currentStopIndex + 1, bus.stopSequence ? bus.stopSequence.length - 1 : learning.currentStopIndex),
      atStop: learning.atStop,
      approaching: false
    };
  }

  function getDriverEtaConfidenceLabel(signalHealth) {
    if (!signalHealth || signalHealth.state === "offline") {
      return "Limited Live Signal";
    }

    if (signalHealth.state === "paused") {
      return "GPS Recovering";
    }

    if (signalHealth.state === "delayed") {
      return "Moderate Confidence";
    }

    return "High Confidence";
  }

  function getPilotNetwork() {
    return window.BusTrackData && window.BusTrackData.pilotNetwork
      ? window.BusTrackData.pilotNetwork
      : null;
  }

  function computeDriverTripIntelligence(progressPayload) {
    var signalHealth = getDriverSignalHealth();
    var progress = normalizeProgressForEvents(progressPayload);
    var previousOffset = state.tripIntelligence.offsetMinutes;
    var result = computeTripIntelligence({
      network: getPilotNetwork(),
      busNo: bus.busNo,
      busId: bus.busId,
      routeId: getOperationalRouteId(),
      progress: progress,
      currentStopIndex: progress.currentStopIndex,
      signalHealth: signalHealth,
      etaConfidence: getDriverEtaConfidenceLabel(signalHealth),
      events: state.operationalEvents.events || [],
      previousOffsetMinutes: previousOffset
    });

    state.tripIntelligence = {
      activeTripId: result.tripId || "",
      lifecycle: result.lifecycle || "Scheduled",
      adherenceLabel: result.adherence.label,
      healthLabel: result.health.label,
      progressPercent: result.progress.percent,
      previousOffsetMinutes: previousOffset,
      offsetMinutes: result.adherence.offsetMinutes,
      direction: result.direction || ""
    };

    return result;
  }

  function detectDriverOperationalEvents(locationOverride, progressPayload) {
    var signalHealth = getDriverSignalHealth();
    var result;

    if (!eventIntel.enabled || (state.status !== "active" && state.status !== "paused")) {
      state.operationalEvents.events = [];
      state.operationalEvents.primary = null;
      return state.operationalEvents;
    }

    result = detectOperationalEvents(
      {
        busId: bus.busNo,
        routeId: getOperationalRouteId(),
        location: getDriverLocationSnapshot(locationOverride),
        routePoints: bus.routePoints || [],
        progress: normalizeProgressForEvents(progressPayload),
        trackingStatus: getTrackingStatusForHealth(),
        signalHealth: signalHealth,
        etaConfidence: getDriverEtaConfidenceLabel(signalHealth)
      },
      eventIntel.tracker
    );

    eventIntel.tracker = result.tracker;
    state.operationalEvents.events = result.events;
    state.operationalEvents.primary = result.primaryEvent;
    return state.operationalEvents;
  }

  function renderOperationalEventStatus() {
    var node = getOperationalEventStatusNode();
    var primaryEvent = state.operationalEvents.primary;

    if (!node) {
      return;
    }

    if (!primaryEvent) {
      setText(node, "Normal");
      setToneClass(node, "healthy");
      return;
    }

    setText(node, primaryEvent.title);
    setToneClass(node, primaryEvent.tone);
  }

  function renderTripIntelligenceStatus() {
    var node = getTripIntelligenceStatusNode();
    var trip = state.tripIntelligence;
    var tone = trip.healthLabel === "Operational Disruption"
      ? "danger"
      : trip.healthLabel === "Minor Delay" || trip.healthLabel === "Recovering Signal"
        ? "warning"
        : "healthy";

    setText(elements.eta, trip.adherenceLabel + " - " + trip.lifecycle);
    setText(elements.sideDelay, trip.adherenceLabel);

    if (node) {
      setText(node, trip.healthLabel + " - " + trip.progressPercent + "%");
      setToneClass(node, tone);
    }
  }

  function publishOperationalEventIfNeeded(event) {
    var now = Date.now();
    var lastPublishedAt = eventIntel.lastPublishedAtByType[event.type] || 0;

    if (!event || now - lastPublishedAt < EVENT_PUBLISH_COOLDOWN_MS) {
      return;
    }

    eventIntel.lastPublishedAtByType[event.type] = now;
    eventIntel.lastActiveTypes[event.type] = true;

    if (liveBusService && typeof liveBusService.publishOperationalEvent === "function") {
      liveBusService
        .publishOperationalEvent(bus.busNo, event.type, {
          severity: event.severity,
          title: event.title,
          message: event.message
        })
        .catch(function () {});
    }

    logOperationalJourneyEvent(
      "operational_event",
      {
        operational_event_type: event.type,
        severity: event.severity,
        title: event.title,
        message: event.message,
        latitude: state.gps.latitude,
        longitude: state.gps.longitude,
        accuracy: state.gps.accuracy,
        speed: state.gps.speed,
        heading: state.gps.heading
      },
      { force: true }
    );
  }

  function clearResolvedOperationalEvents(activeEvents) {
    var activeTypes = {};

    activeEvents.forEach(function (event) {
      activeTypes[event.type] = true;
    });

    Object.keys(eventIntel.lastActiveTypes).forEach(function (type) {
      if (activeTypes[type]) {
        return;
      }

      delete eventIntel.lastActiveTypes[type];
      if (liveBusService && typeof liveBusService.clearOperationalEvent === "function") {
        liveBusService.clearOperationalEvent(bus.busNo, type).catch(function () {});
      }
    });
  }

  function publishDetectedOperationalEvents() {
    var detection = detectDriverOperationalEvents();

    detection.events.forEach(publishOperationalEventIfNeeded);
    clearResolvedOperationalEvents(detection.events);
  }

  function startOperationalEventMonitor() {
    if (eventIntel.monitorTimerId) {
      return;
    }

    eventIntel.monitorTimerId = window.setInterval(function () {
      if (state.status !== "active" && state.status !== "paused") {
        return;
      }

      publishDetectedOperationalEvents();
      renderSession();
    }, 15000);
  }

  function stopOperationalEventMonitor() {
    if (eventIntel.monitorTimerId) {
      window.clearInterval(eventIntel.monitorTimerId);
      eventIntel.monitorTimerId = null;
    }
  }

  function setRealtimeRecoveryState(status, syncState, message, ok) {
    state.firebase.status = status;
    state.firebase.syncState = syncState;
    state.firebase.message = message;
    state.firebase.ok = !!ok;
    state.firebase.lastSync = getLocalSyncTime();
    state.firebase.lastSyncAt = Date.now();
    renderSession();
  }

  function renderGpsDebug() {
    var signalHealth = getDriverSignalHealth();
    var debugMessage = state.driverSession.locked
      ? state.driverSession.message
      : state.driverSession.recoverable && state.status === "ready"
        ? state.driverSession.message
      : state.driverSession.recovering
        ? "Reconnecting existing driver session. " + state.firebase.message
      : state.gpsMessage + " " + getNetworkRecoveryMessage() + " " + state.firebase.message;

    detectDriverOperationalEvents();
    computeDriverTripIntelligence();

    setText(elements.gpsDebugStatus, getGpsStatusCopy());
    setText(elements.gpsLatitude, formatCoordinate(state.gps.latitude));
    setText(elements.gpsLongitude, formatCoordinate(state.gps.longitude));
    setText(elements.gpsAccuracyValue, formatAccuracy(state.gps.accuracy));
    setText(elements.gpsLastUpdated, state.gps.updatedAt);
    setText(elements.firebaseStatus, state.firebase.status);
    setText(elements.firebaseLastSync, state.firebase.lastSync);
    setText(elements.firebaseSyncState, state.firebase.syncState);
    setText(elements.gpsConnectionStatus, getGpsConnectionCopy());
    setText(elements.signalFreshness, signalHealth.label + " - " + signalHealth.freshnessText);
    setText(elements.sessionState, getStatusCopy());
    setText(elements.trackingStatus, getTrackingStatusForHealth());
    setText(elements.gpsDebugMessage, debugMessage);

    if (state.gps.accuracy !== null) {
      setText(elements.accuracy, formatAccuracy(state.gps.accuracy));
      setText(elements.sideGps, formatAccuracy(state.gps.accuracy) + " lock");
    }

    setToneClass(elements.gpsConnectionStatus, state.gpsStatus === "watching" ? "healthy" : "danger");
    setToneClass(elements.firebaseStatus, getFirebaseTone());
    setToneClass(elements.firebaseSyncState, getFirebaseTone());
    setToneClass(elements.signalFreshness, signalHealth.tone);
    setToneClass(elements.trackingStatus, signalHealth.tone);
    renderOperationalEventStatus();
    renderTripIntelligenceStatus();
    renderOperationalStateDebug();
  }

  function setFirebasePending(label) {
    state.firebase.status = "Syncing";
    state.firebase.syncState = label;
    state.firebase.message = "Firebase sync in progress.";
    renderSession();
  }

  function applyFirebaseResult(result) {
    state.firebase.status = result.status;
    state.firebase.lastSync = result.syncedAt;
    state.firebase.lastSyncAt = Date.now();
    state.firebase.syncState = result.ok ? "Success" : "Error";
    state.firebase.ok = !!result.ok;
    state.firebase.message = result.message;

    if (result.locked) {
      state.driverSession.locked = true;
      state.driverSession.message = result.message;
    }

    renderSession();
  }

  function getDriverSessionStorageKey() {
    return "bustrack-driver-active-session-" + bus.busNo;
  }

  function readLocalDriverSession() {
    var saved = "";
    var parsed = null;

    try {
      saved = window.localStorage.getItem(getDriverSessionStorageKey()) || "";

      if (saved) {
        parsed = JSON.parse(saved);
      }
    } catch (error) {
      parsed = null;
    }

    if (
      !parsed ||
      parsed.bus_id !== bus.busNo ||
      !parsed.session_id ||
      !parsed.session_started_at
    ) {
      return null;
    }

    return parsed;
  }

  function saveLocalDriverSession() {
    if (!state.driverSession.id) {
      return;
    }

    try {
      window.localStorage.setItem(
        getDriverSessionStorageKey(),
        JSON.stringify({
          bus_id: bus.busNo,
          session_id: state.driverSession.id,
          session_started_at: state.driverSession.startedAt,
          simulation_enabled: state.simulationEnabled
        })
      );
    } catch (error) {}
  }

  function clearLocalDriverSession() {
    try {
      window.localStorage.removeItem(getDriverSessionStorageKey());
    } catch (error) {}
  }

  function createDriverSessionId() {
    var localSession = readLocalDriverSession();

    if (localSession) {
      state.driverSession.startedAt = localSession.session_started_at;
      state.simulationEnabled = !!localSession.simulation_enabled;
      return localSession.session_id;
    }

    return bus.busNo + "-" + Date.now() + "-" + Math.floor(Math.random() * 90000 + 10000);
  }

  function getTimestampMs(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim()) {
      var parsed = Date.parse(value);
      return isNaN(parsed) ? 0 : parsed;
    }

    return 0;
  }

  function isRemoteDriverSessionActive(session) {
    var trackingStatus = String(session && session.tracking_status || "").toLowerCase();
    var heartbeatAt = getTimestampMs(
      session && (session.last_heartbeat || session.session_started_at)
    );
    var stale = !heartbeatAt || Date.now() - heartbeatAt > state.driverSession.heartbeatTimeoutMs;

    return (
      !!session &&
      !!session.session_active &&
      trackingStatus !== "ended" &&
      trackingStatus !== "completed" &&
      trackingStatus !== "stopped" &&
      !stale
    );
  }

  function ownsRemoteDriverSession(session) {
    var localSession = readLocalDriverSession();

    return Boolean(
      session &&
        localSession &&
        localSession.bus_id === bus.busNo &&
        localSession.session_id === session.session_id
    );
  }

  function applyRecoverableSession(session) {
    var localSession = readLocalDriverSession();

    if (!localSession || !session) {
      return false;
    }

    state.driverSession.id = localSession.session_id;
    state.driverSession.startedAt = localSession.session_started_at;
    state.simulationEnabled = !!localSession.simulation_enabled;
    state.status = "ready";
    state.driverSession.locked = false;
    state.driverSession.recoverable = true;
    state.driverSession.recovering = false;
    state.driverSession.message = "Recoverable live operational session found. Resume to reconnect GPS publishing.";
    state.firebase.status = "Lock active";
    state.firebase.syncState = "Recoverable";
    state.firebase.ok = true;
    state.firebase.message = "Live operational session can be resumed.";
    state.firebase.lastSync = getLocalSyncTime();
    state.firebase.lastSyncAt = Date.now();
    state.gpsStatus = "paused";
    state.gpsMessage = "Recoverable live operational session found. Resume to reconnect GPS publishing.";
    renderSession();
    return true;
  }

  function subscribeToDriverSessionLock() {
    if (!driverFirebaseSync.subscribeToDriverSessionLock) {
      return;
    }

    driverFirebaseSync
      .subscribeToDriverSessionLock(
        bus.busNo,
        function (session) {
          var sessionId = state.driverSession.id || (readLocalDriverSession() && readLocalDriverSession().session_id) || "";
          var ownedRemoteSession = ownsRemoteDriverSession(session);
          var lockedByAnother =
            isRemoteDriverSessionActive(session) &&
            session.session_id &&
            session.session_id !== sessionId &&
            !ownedRemoteSession;

          if (ownedRemoteSession && state.status === "ready" && isRemoteDriverSessionActive(session)) {
            applyRecoverableSession(session);
            return;
          }

          if (sessionId) {
            state.driverSession.id = sessionId;
          }
          state.driverSession.locked = lockedByAnother;
          state.driverSession.message = lockedByAnother
            ? "This bus already has an active live session."
            : "";
          if (!lockedByAnother && !ownedRemoteSession) {
            state.driverSession.recoverable = false;
          }
          renderSession();
        },
        function () {}
      )
      .then(function (unsubscribe) {
        state.driverSession.lockUnsubscribe = unsubscribe;
      });
  }

  function subscribeToRealtimeConnection() {
    if (!driverFirebaseSync.subscribeToConnectionState) {
      return;
    }

    driverFirebaseSync
      .subscribeToConnectionState(
        function (connectionState) {
          state.network.firebaseConnected = !!(connectionState && connectionState.connected);

          if (connectionState && connectionState.disabled) {
            state.network.message = connectionState.message || "Firebase realtime connection is unavailable.";
            setRealtimeRecoveryState(
              "Firebase disabled",
              "Unavailable",
              state.network.message,
              false
            );
            return;
          }

          if (state.network.firebaseConnected) {
            state.network.message = "Syncing realtime updates...";
            if (state.firebase.status === "Reconnecting" || state.firebase.status === "Offline") {
              setRealtimeRecoveryState(
                "Connected",
                "Realtime online",
                "Realtime updates connected.",
                true
              );
              return;
            }
          } else {
            state.network.message = "Reconnecting to live tracking...";
            setRealtimeRecoveryState(
              "Reconnecting",
              "Waiting for network",
              "Reconnecting to live tracking...",
              false
            );
            return;
          }

          renderSession();
        },
        function () {
          state.network.firebaseConnected = false;
          state.network.message = "Realtime connection check failed. Retrying automatically.";
          setRealtimeRecoveryState(
            "Reconnecting",
            "Retrying",
            "Realtime connection check failed. Retrying automatically.",
            false
          );
        }
      )
      .then(function (unsubscribe) {
        state.network.connectionUnsubscribe = unsubscribe;
      });
  }

  function getDriverSessionPayload(trackingStatus, sessionActive) {
    if (!state.driverSession.id) {
      state.driverSession.id = createDriverSessionId();
    }

    if (!state.driverSession.startedAt) {
      state.driverSession.startedAt = Date.now();
    }

    saveLocalDriverSession();

    return {
      sessionId: state.driverSession.id,
      sessionStartedAt: state.driverSession.startedAt,
      trackingStatus: trackingStatus,
      sessionActive: sessionActive
    };
  }

  function getOperationalRouteId() {
    return String(
      bus.routeId ||
        bus.route_id ||
        bus.routeName ||
        bus.busNo ||
        "operations-route"
    );
  }

  function logOperationalJourneyEvent(eventType, details, options) {
    var now = Date.now();
    var signalHealth = getDriverSignalHealth();
    var payload;

    if (
      eventType === "gps_update" &&
      !(options && options.force) &&
      state.historicalLog.lastGpsLogAt &&
      now - state.historicalLog.lastGpsLogAt < GPS_HISTORY_LOG_INTERVAL_MS
    ) {
      return;
    }

    if (eventType === "gps_update") {
      state.historicalLog.lastGpsLogAt = now;
    }

    payload = Object.assign(
      {
        bus_id: bus.busNo,
        route_id: getOperationalRouteId(),
        session_id: state.driverSession.id,
        signal_health: signalHealth.state,
        tracking_status: getTrackingStatusForHealth(),
        session_active: state.status === "active" || state.status === "paused"
      },
      details || {}
    );

    operationalJourneyLogService
      .logEvent(eventType, payload)
      .catch(function () {});
  }

  function resetSegmentLearning() {
    learning.currentStopIndex = null;
    learning.atStop = false;
    learning.segmentStartTimestampMs = null;
  }

  function hasLearningRouteData() {
    return Boolean(
      bus &&
        Array.isArray(bus.stopSequence) &&
        bus.stopSequence.length >= 2 &&
        Array.isArray(bus.segmentIds) &&
        bus.segmentIds.length >= 1
    );
  }

  function getDistanceKmToStop(location, stop) {
    if (!location || !stop) {
      return null;
    }

    return calculateDistance(
      { latitude: location.latitude, longitude: location.longitude },
      { latitude: stop.latitude, longitude: stop.longitude }
    );
  }

  function initializeLearningIfPossible(location) {
    if (!hasLearningRouteData()) {
      return false;
    }

    if (learning.currentStopIndex !== null) {
      return true;
    }

    // Only initialize when we are clearly at a known stop (conservative).
    var i;
    for (i = 0; i < bus.stopSequence.length; i++) {
      var stop = bus.stopSequence[i];
      var distanceKm = getDistanceKmToStop(location, stop);
      if (distanceKm !== null && distanceKm <= STOP_ARRIVAL_RADIUS_KM) {
        learning.currentStopIndex = i;
        learning.atStop = true;
        learning.segmentStartTimestampMs = null;
        return true;
      }
    }

    return false;
  }

  function publishSegmentLearningUpdate(segmentIndex, observedMinutes) {
    if (!learning.enabled || !hasLearningRouteData()) {
      return;
    }

    var segmentId = bus.segmentIds[segmentIndex];
    var fromStop = bus.stopSequence[segmentIndex];
    var toStop = bus.stopSequence[segmentIndex + 1];
    var segmentMeta = segmentMap[segmentId] || null;
    var seedEmaMinutes = segmentMeta && typeof segmentMeta.avg_time_min === "number"
      ? segmentMeta.avg_time_min
      : null;

    if (!segmentId || !fromStop || !toStop) {
      return;
    }

    // Fire-and-forget: never block realtime GPS publishing.
    // We still record a lightweight audit event for replay/validation.
    timeLearningService
      .updateSegmentTimingEMA({
        routeId: getOperationalRouteId(),
        segmentId: segmentId,
        fromStopId: fromStop.stop_id,
        toStopId: toStop.stop_id,
        observedTimeMinutes: observedMinutes,
        alpha: EMA_ALPHA,
        seedEmaMinutes: seedEmaMinutes
      })
      .then(function (result) {
        if (!isDebugEnabled() || !result || !result.ok) {
          // Still log the observed learning so replay can show segment progression.
          logOperationalJourneyEvent(
            "segment_completed",
            {
              segment_id: segmentId,
              from_stop_id: fromStop.stop_id,
              to_stop_id: toStop.stop_id,
              observed_time_minutes: observedMinutes,
              day_type: timeLearningService.getDayType(new Date()),
              time_bucket: timeLearningService.getBucketKey(new Date(), timeLearningService.defaults.bucketMinutes)
            },
            { force: true }
          );
          return;
        }

        var value = result.value || {};
        learning.lastDebugUpdate = {
          routeId: value.route_id || value.routeId || getOperationalRouteId(),
          segmentId: value.segment_id || value.segmentId || segmentId,
          observedMinutes: value.observed_time_minutes,
          emaMinutes: value.ema_time_minutes,
          sampleCount: value.sample_count,
          at: value.last_updated_at || Date.now()
        };

        // Persist enriched learning snapshot for historical replay (EMA + samples).
        logOperationalJourneyEvent(
          "segment_completed",
          {
            segment_id: learning.lastDebugUpdate.segmentId,
            from_stop_id: fromStop.stop_id,
            to_stop_id: toStop.stop_id,
            observed_time_minutes: learning.lastDebugUpdate.observedMinutes,
            ema_time_minutes: learning.lastDebugUpdate.emaMinutes,
            sample_count: learning.lastDebugUpdate.sampleCount,
            day_type: timeLearningService.getDayType(new Date()),
            time_bucket: timeLearningService.getBucketKey(new Date(), timeLearningService.defaults.bucketMinutes)
          },
          { force: true }
        );

        trace("learning.segment_update", learning.lastDebugUpdate, { throttleMs: 1000 });
        renderOperationalStateDebug();
      })
      .catch(function () {});

    // Note: segment_completed is logged on success/fallback above to include EMA when available.
  }

  function maybeLearnSegmentTiming(location) {
    if (!learning.enabled) {
      return;
    }

    if (state.status !== "active") {
      return;
    }

    if (!initializeLearningIfPossible(location)) {
      return;
    }

    var now = Date.now();
    var currentIndex = learning.currentStopIndex;
    var currentStop = bus.stopSequence[currentIndex];
    var nextIndex = currentIndex + 1;

    if (!currentStop || nextIndex >= bus.stopSequence.length) {
      return;
    }

    var distanceToCurrent = getDistanceKmToStop(location, currentStop);
    if (distanceToCurrent === null) {
      return;
    }

    // Waiting at stop → segment starts when the bus leaves the stop geofence.
    if (learning.atStop) {
      if (distanceToCurrent > STOP_ARRIVAL_RADIUS_KM) {
        learning.atStop = false;
        learning.segmentStartTimestampMs = now;
      }
      return;
    }

    // In transit → segment completes when the bus arrives at the next stop geofence.
    var nextStop = bus.stopSequence[nextIndex];
    var distanceToNext = getDistanceKmToStop(location, nextStop);
    if (distanceToNext === null || distanceToNext > STOP_ARRIVAL_RADIUS_KM) {
      return;
    }

    if (!learning.segmentStartTimestampMs) {
      // No reliable departure timestamp yet; skip this transition.
      learning.currentStopIndex = nextIndex;
      learning.atStop = true;
      return;
    }

    var elapsedMs = now - learning.segmentStartTimestampMs;
    if (elapsedMs < MIN_SEGMENT_TIME_SECONDS * 1000) {
      return;
    }

    var observedMinutes = Math.max(0.1, elapsedMs / 60000);
    publishSegmentLearningUpdate(currentIndex, observedMinutes);

    learning.currentStopIndex = nextIndex;
    learning.atStop = true;
    learning.segmentStartTimestampMs = null;
  }

  function buildRouteProgressPayload(location) {
    if (!hasLearningRouteData()) {
      return null;
    }

    // Best-effort initialization when starting near a stop.
    if (learning.currentStopIndex === null) {
      initializeLearningIfPossible(location);
    }

    if (learning.currentStopIndex === null) {
      return null;
    }

    var currentIndex = learning.currentStopIndex;
    var nextIndex = Math.min(currentIndex + 1, bus.stopSequence.length - 1);
    var currentStop = bus.stopSequence[currentIndex];
    var nextStop = bus.stopSequence[nextIndex];
    var distanceToCurrent = currentStop ? getDistanceKmToStop(location, currentStop) : null;
    var distanceToNext = nextStop ? getDistanceKmToStop(location, nextStop) : null;
    var atStop = learning.atStop || (distanceToCurrent !== null && distanceToCurrent <= STOP_ARRIVAL_RADIUS_KM);
    var approachingStop = !atStop && distanceToNext !== null && distanceToNext <= 0.5;
    var stopsTotal = bus.stopSequence.length;
    var stopsRemaining = Math.max(0, (stopsTotal - 1) - currentIndex);

    return {
      current_stop_index: currentIndex,
      next_stop_index: nextIndex,
      current_stop_id: currentStop ? currentStop.stop_id : "",
      current_stop_name: currentStop ? currentStop.stop_name : "",
      next_stop_id: nextStop ? nextStop.stop_id : "",
      next_stop_name: nextStop ? nextStop.stop_name : "",
      stops_total: stopsTotal,
      stops_remaining: stopsRemaining,
      at_stop: !!atStop,
      approaching_stop: !!approachingStop
    };
  }

  async function acquireDriverSessionLock() {
    setFirebasePending("Session lock");

    var result = await driverFirebaseSync.acquireDriverSessionLock(
      bus.busNo,
      getDriverSessionPayload("active", true)
    );

    state.driverSession.locked = !!result.locked;
    state.driverSession.message = result.locked
      ? "This bus already has an active live session."
      : "";

    if (result.ok) {
      state.driverSession.recoverable = false;
      state.driverSession.recovering = false;
      saveLocalDriverSession();
    }

    applyFirebaseResult(result);

    return result.ok;
  }

  function stopDriverSessionHeartbeat() {
    if (state.driverSession.heartbeatTimerId) {
      window.clearInterval(state.driverSession.heartbeatTimerId);
      state.driverSession.heartbeatTimerId = null;
    }
  }

  function startDriverSessionHeartbeat(trackingStatus) {
    stopDriverSessionHeartbeat();

    state.driverSession.heartbeatTimerId = window.setInterval(function () {
      driverFirebaseSync.heartbeatDriverSessionLock(
        bus.busNo,
        getDriverSessionPayload(trackingStatus, true)
      ).then(function (result) {
        if (result.locked) {
          state.driverSession.locked = true;
          state.driverSession.message = result.message;
          state.status = "stopped";
          stopGpsWatch("stopped", "Another active driver session owns this bus.");
          stopTimer();
          renderSession();
        }
      });
    }, 15000);
  }

  async function releaseDriverSessionLock(trackingStatus) {
    stopDriverSessionHeartbeat();

    var result = await driverFirebaseSync.releaseDriverSessionLock(
      bus.busNo,
      getDriverSessionPayload(trackingStatus || "ended", false)
    );

    state.driverSession.locked = !!result.locked;
    state.driverSession.message = result.locked ? result.message : "";

    if (result.ok && !result.locked) {
      state.driverSession.recoverable = false;
      state.driverSession.recovering = false;
      clearLocalDriverSession();
    }

    applyFirebaseResult(result);

    return result.ok;
  }

  async function publishLocationToFirebase(location) {
    setFirebasePending("Location update");

    var progressPayload = buildRouteProgressPayload(location) || {};
    detectDriverOperationalEvents(location, progressPayload);
    var tripResult = computeDriverTripIntelligence(progressPayload);
    var signalHealth = getDriverSignalHealth();
    var operational = consolidateOperationalState(
      {
        signalHealth: signalHealth,
        trackingStatus: getTrackingStatusForHealth(),
        etaConfidence: getDriverEtaConfidenceLabel(signalHealth),
        tripIntelligence: tripResult,
        events: state.operationalEvents.events || []
      },
      state.operationalState.tracker
    );

    state.operationalState.tracker = operational.tracker;
    state.operationalState.current = operational.operationalState;

    // Trust-weighted multi-signal fusion (driver-side: GPS + continuity only; crowd is passenger-side).
    var trustResult = computeTrustFusion(
      {
        nowMs: Date.now(),
        busId: bus.busNo,
        signalHealth: signalHealth,
        trackingStatus: getTrackingStatusForHealth(),
        operationalState: state.operationalState.current
      },
      state.trustFusion.tracker
    );
    state.trustFusion.tracker = trustResult.tracker;
    state.trustFusion.current = trustResult.trust;

    if (isDebugEnabled()) {
      var now = Date.now();
      if (
        state.operationalState.current &&
        (
          state.operationalState.current.label !== state.operationalState.lastTracedLabel ||
          now - state.operationalState.lastTracedAtMs > 5000
        )
      ) {
        state.operationalState.lastTracedLabel = state.operationalState.current.label;
        state.operationalState.lastTracedAtMs = now;
        trace("driver.operational_state", {
          bus: bus.busNo,
          label: state.operationalState.current.label,
          confidence: state.operationalState.current.confidence,
          reasons: state.operationalState.current.reasons
        }, { throttleMs: 1500 });
      }
    }

    var result = await driverFirebaseSync.publishBusLocation(bus.busNo, Object.assign({
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      speed: location.speed,
      heading: location.heading,
      trip_id: tripResult.tripId || "",
      trip_lifecycle: tripResult.lifecycle,
      trip_direction: tripResult.direction,
      trip_progress_percent: tripResult.progress.percent,
      trip_nearing_completion: tripResult.progress.nearingCompletion,
      trip_schedule_adherence: tripResult.adherence.state,
      trip_schedule_label: tripResult.adherence.label,
      trip_delay_minutes: tripResult.adherence.offsetMinutes,
      trip_operational_health: tripResult.health.label,
      operational_state_label: operational.operationalState.label,
      operational_state_state: operational.operationalState.state,
      operational_state_tone: operational.operationalState.tone,
      operational_state_rank: operational.operationalState.rank,
      operational_state_confidence: Number(operational.operationalState.confidence.toFixed(2)),
      operational_state_reason: (operational.operationalState.reasons || [])[0] || "",
      trust_score: trustResult.trust ? Number(trustResult.trust.score.toFixed(2)) : null,
      trust_label: trustResult.trust ? trustResult.trust.label : "",
      trust_reason: trustResult.trust && trustResult.trust.reasons ? (trustResult.trust.reasons[0] || "") : ""
    }, progressPayload), {
      sessionActive: state.status === "active",
      trackingStatus: state.status === "active" ? "active" : state.status,
      sessionId: state.driverSession.id,
      sessionStartedAt: state.driverSession.startedAt
    });

    applyFirebaseResult(result);

    if (result && result.ok && state.status === "active") {
      logOperationalJourneyEvent("gps_update", {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        speed: location.speed,
        heading: location.heading,
        trip_id: tripResult.tripId || "",
        delay_minutes: tripResult.adherence.offsetMinutes,
        trip_progress_percent: tripResult.progress.percent,
        trip_schedule_adherence: tripResult.adherence.state,
        trip_schedule_label: tripResult.adherence.label,
        trip_operational_health: tripResult.health.label,
        operational_state_label: state.operationalState.current ? state.operationalState.current.label : "",
        operational_state_confidence: state.operationalState.current ? state.operationalState.current.confidence : null,
        operational_state_reason: state.operationalState.current && state.operationalState.current.reasons
          ? (state.operationalState.current.reasons[0] || "")
          : "",
        trust_score: state.trustFusion.current ? state.trustFusion.current.score : null,
        trust_label: state.trustFusion.current ? state.trustFusion.current.label : "",
        trust_reason: state.trustFusion.current && state.trustFusion.current.reasons
          ? (state.trustFusion.current.reasons[0] || "")
          : "",
        tracking_status: "active",
        session_active: true
      });
      publishDetectedOperationalEvents();
    }

    if (result.locked) {
      state.status = "stopped";
      stopGpsWatch("stopped", "Another active driver session owns this bus.");
      stopTimer();
      renderSession();
    }
  }

  async function updateFirebaseTrackingStatus(trackingStatus, sessionActive, closed) {
    setFirebasePending("Status update");

    var result = await driverFirebaseSync.updateTrackingStatus(bus.busNo, {
      trackingStatus: trackingStatus,
      sessionActive: sessionActive,
      closed: !!closed,
      sessionId: state.driverSession.id,
      sessionStartedAt: state.driverSession.startedAt
    });

    applyFirebaseResult(result);
  }

  function renderSession() {
    var statusCopy = getStatusCopy();
    var signalHealth = getDriverSignalHealth();

    setText(elements.timer, formatTime(state.seconds));
    setText(elements.liveStatus, signalHealth.label);
    setText(elements.sideEngine, state.status === "active" ? "Streaming" : statusCopy);

    elements.statusPill.innerHTML = "<span></span> " + signalHealth.label + " - " + signalHealth.freshnessText;
    elements.liveBadge.querySelector("strong").innerText = signalHealth.label;
    elements.liveBadge.classList.remove("delayed", "offline");
    elements.liveBadge.classList.toggle("delayed", signalHealth.state === "delayed");
    elements.liveBadge.classList.toggle("offline", signalHealth.state === "offline");
    elements.marker.style.left = state.progress + "%";

    renderGpsDebug();
    renderTimeline();
    renderControls();
  }

  function getActiveGpsService() {
    return state.simulationEnabled ? simulationService : gpsService;
  }

  function getGpsStartOptions() {
    return state.simulationEnabled
      ? {
          routePoints: bus.routePoints || []
        }
      : null;
  }

  function getGpsStartMessage() {
    return state.simulationEnabled
      ? "Demo simulation is publishing route movement."
      : "Realtime GPS tracking is active from this browser.";
  }

  function stopAllGpsProviders() {
    if (gpsService) {
      gpsService.stop();
    }

    if (simulationService) {
      simulationService.stop();
    }
  }

  function startGpsWatch() {
    var activeGpsService = getActiveGpsService();

    if (!activeGpsService) {
      state.gpsStatus = "error";
      state.gpsMessage = state.simulationEnabled
        ? "Simulation service could not be loaded."
        : "GPS service could not be loaded.";
      renderSession();
      return;
    }

    var gpsHandlers = {
      onStart: function (details) {
        var gpsStartStatus = details && details.status;

        state.gpsStatus = state.simulationEnabled ? "watching" : "requesting";
        if (state.simulationEnabled) {
          state.gpsMessage = "Simulation is publishing pilot route coordinates.";
        } else if (gpsStartStatus === "checking_permission") {
          state.gpsMessage = "Checking browser location permission...";
        } else if (gpsStartStatus === "waiting_for_gps") {
          state.gpsMessage = "Waiting for GPS...";
        } else {
          state.gpsMessage = "Waiting for location permission.";
        }
        renderSession();
      },
      onLocation: function (location) {
        state.gpsStatus = "watching";
        state.gps = {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          speed: location.speed,
          heading: location.heading,
          updatedAt: location.updatedAt,
          lastUpdatedAt: Date.now()
        };
        state.gpsMessage = getGpsStartMessage();
        renderSession();
        maybeLearnSegmentTiming(location);
        publishLocationToFirebase(location);
      },
      onError: function (error) {
        state.gpsStatus = "error";
        state.gpsMessage = error.message || "Unable to read browser GPS.";
        state.status = "stopped";
        stopTimer();

        stopAllGpsProviders();

        renderSession();
        updateFirebaseTrackingStatus("stopped", false, false);
      }
    };
    var startResult = null;

    if (state.simulationEnabled) {
      startResult = activeGpsService.start(getGpsStartOptions(), gpsHandlers);
    } else {
      startResult = activeGpsService.start(gpsHandlers);
    }

    if (startResult && startResult.ok === false) {
      state.gpsStatus = "error";
      state.status = "stopped";
      state.gpsMessage = startResult.reason === "unsupported"
        ? "Browser GPS is not available on this device or browser."
        : "Unable to start GPS tracking.";
      stopTimer();
      renderSession();
    }
  }

  function stopGpsWatch(nextGpsStatus, message) {
    stopAllGpsProviders();

    state.gpsStatus = nextGpsStatus;
    state.gpsMessage = message;
  }

  function tick() {
    state.seconds += 1;
    state.progress = Math.min(84, state.progress + 0.7);

    if (state.seconds > 8) {
      state.completedStops = 2;
    }

    if (state.seconds > 18) {
      state.completedStops = 3;
    }

    renderSession();
  }

  function startTimer() {
    if (state.timerId) {
      return;
    }

    state.timerId = window.setInterval(tick, 1000);
  }

  function stopTimer() {
    if (state.timerId) {
      window.clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function restoreActiveOperationalSession() {
    if (!(state.status === "active" || state.status === "paused")) {
      return;
    }

    state.network.restoring = true;
    state.network.message = "Restoring operational session...";
    renderSession();

    driverFirebaseSync
      .heartbeatDriverSessionLock(
        bus.busNo,
        getDriverSessionPayload(state.status === "active" ? "active" : "paused", true)
      )
      .then(function (result) {
        state.network.restoring = false;

        if (result.locked) {
          state.driverSession.locked = true;
          state.driverSession.message = result.message;
          state.status = "stopped";
          stopGpsWatch("stopped", "Another active driver session owns this bus.");
          stopTimer();
          renderSession();
          return;
        }

        if (state.status === "active") {
          startGpsWatch();
          startDriverSessionHeartbeat("active");
          startOperationalEventMonitor();
          startTimer();
        } else {
          startDriverSessionHeartbeat("paused");
          startOperationalEventMonitor();
        }

        updateFirebaseTrackingStatus(state.status, true, false);
        renderSession();
      })
      .catch(function () {
        state.network.restoring = false;
        state.network.message = "Syncing realtime updates...";
        renderSession();
      });
  }

  function handleBrowserOffline() {
    state.network.browserOnline = false;
    state.network.message = "Device is offline. Realtime updates will resume when the network returns.";
    setRealtimeRecoveryState(
      "Offline",
      "Offline",
      "Network offline. Realtime updates will retry automatically.",
      false
    );
  }

  function handleBrowserOnline() {
    state.network.browserOnline = true;
    state.network.message = "Network restored. Syncing realtime updates...";
    setRealtimeRecoveryState(
      "Reconnecting",
      "Syncing",
      "Network restored. Syncing realtime updates...",
      false
    );
    restoreActiveOperationalSession();
  }

  function handleVisibilityChange() {
    if (document.visibilityState !== "visible") {
      return;
    }

    state.network.browserOnline = navigator.onLine !== false;
    restoreActiveOperationalSession();
  }

  function cleanupRuntimeForPageExit() {
    stopAllGpsProviders();
    stopDriverSessionHeartbeat();
    stopOperationalEventMonitor();
    stopTimer();

    if (typeof state.network.connectionUnsubscribe === "function") {
      state.network.connectionUnsubscribe();
      state.network.connectionUnsubscribe = null;
    }

    if (typeof state.driverSession.lockUnsubscribe === "function") {
      state.driverSession.lockUnsubscribe();
      state.driverSession.lockUnsubscribe = null;
    }
  }

  async function startLiveSession() {
    var wasRecoverable = state.driverSession.recoverable;

    if (state.driverSession.recoverable) {
      state.driverSession.recovering = true;
      state.driverSession.message = "Reconnecting existing driver session.";
      state.gpsMessage = "Reconnecting existing driver session.";
      renderSession();
    }

    var lockAcquired = await acquireDriverSessionLock();

    if (!lockAcquired) {
      state.status = "ready";
      state.driverSession.recovering = false;
      stopGpsWatch(
        "stopped",
        state.driverSession.message || "This bus already has an active live session."
      );
      stopTimer();
      renderSession();
      return;
    }

    resetSegmentLearning();
    eventIntel.tracker = createOperationalEventTracker();
    state.operationalEvents.events = [];
    state.operationalEvents.primary = null;
    state.status = "active";
    state.driverSession.recoverable = false;
    state.driverSession.recovering = false;
    logOperationalJourneyEvent(wasRecoverable ? "journey_resumed" : "journey_started", {
      tracking_status: "active",
      session_active: true
    }, { force: true });
    updateFirebaseTrackingStatus("active", true, false);
    startGpsWatch();
    startDriverSessionHeartbeat("active");
    startOperationalEventMonitor();
    startTimer();
    renderSession();
  }

  function pauseTracking() {
    state.status = "paused";
    learning.segmentStartTimestampMs = null;
    stopGpsWatch(
      "paused",
      state.simulationEnabled
        ? "Simulation paused. Resume tracking to publish route movement again."
        : "GPS watcher paused. Resume tracking to request live coordinates again."
    );
    updateFirebaseTrackingStatus("paused", true, false);
    logOperationalJourneyEvent("journey_paused", {
      tracking_status: "paused",
      session_active: true
    }, { force: true });
    startDriverSessionHeartbeat("paused");
    startOperationalEventMonitor();
    stopTimer();
    renderSession();
  }

  function resumeTracking() {
    if (state.driverSession.locked) {
      renderSession();
      return;
    }

    state.status = "active";
    learning.segmentStartTimestampMs = null;
    updateFirebaseTrackingStatus("active", true, false);
    logOperationalJourneyEvent("journey_resumed", {
      tracking_status: "active",
      session_active: true
    }, { force: true });
    startGpsWatch();
    startDriverSessionHeartbeat("active");
    startOperationalEventMonitor();
    startTimer();
    renderSession();
  }

  function stopSharing() {
    state.status = "stopped";
    resetSegmentLearning();
    stopGpsWatch(
      "stopped",
      state.simulationEnabled
        ? "Simulation sharing stopped. Journey remains open."
        : "Live sharing stopped. Journey remains open."
    );
    releaseDriverSessionLock("stopped");
    updateFirebaseTrackingStatus("stopped", false, false);
    stopOperationalEventMonitor();
    clearResolvedOperationalEvents([]);
    stopTimer();
    renderSession();
  }

  function endJourney() {
    state.status = "completed";
    resetSegmentLearning();
    stopGpsWatch(
      "stopped",
      state.simulationEnabled
        ? "Simulation stopped because the journey ended."
        : "GPS watcher stopped because the journey ended."
    );
    releaseDriverSessionLock("ended");
    updateFirebaseTrackingStatus("completed", false, true);
    stopOperationalEventMonitor();
    clearResolvedOperationalEvents([]);
    logOperationalJourneyEvent("journey_ended", {
      tracking_status: "completed",
      session_active: false
    }, { force: true });
    stopTimer();
    elements.summary.hidden = false;
    setText(elements.summaryDuration, formatTime(state.seconds));
    setText(elements.summaryStops, state.completedStops + " of " + bus.stops.length);
    renderSession();
  }

  function renderBus() {
    document.title = "BusTrack Operations - " + bus.busNo;
    setText(elements.busNo, bus.busNo);
    setText(elements.routeName, bus.routeName);
    setText(elements.driverMini, bus.driverName);
    setText(elements.driver, bus.driverName);
    setText(elements.shift, bus.shiftTime);
    setText(elements.currentStop, bus.currentStop);
    setText(elements.nextStop, bus.nextStop);
    setText(elements.eta, bus.etaStatus);
    setText(elements.occupancy, bus.occupancy);
    setText(elements.accuracy, bus.gpsAccuracy);
    setText(elements.sideGps, bus.gpsAccuracy + " lock");
    setText(elements.sideBattery, bus.battery);
    setText(elements.sideLoad, bus.passengerLoad);
    setText(elements.sideDelay, bus.delayStatus);
    renderSession();
  }

  elements.startLiveBtn.addEventListener("click", startLiveSession);
  elements.pauseBtn.addEventListener("click", pauseTracking);
  elements.resumeBtn.addEventListener("click", resumeTracking);
  elements.stopBtn.addEventListener("click", stopSharing);
  elements.endBtn.addEventListener("click", endJourney);

  if (elements.simulationToggle) {
    elements.simulationToggle.addEventListener("change", function () {
      state.simulationEnabled = elements.simulationToggle.checked;
      state.gpsMessage = state.simulationEnabled
        ? "Simulation mode ready. Start sharing to publish pilot route movement."
        : "Start sharing to request GPS and publish a live operational session.";
      renderSession();
    });
  }

  renderBus();
  subscribeToDriverSessionLock();
  subscribeToRealtimeConnection();
  window.addEventListener("online", handleBrowserOnline);
  window.addEventListener("offline", handleBrowserOffline);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("pagehide", cleanupRuntimeForPageExit);
  ensureIcons();
})();
