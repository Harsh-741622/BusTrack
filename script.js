document.addEventListener("DOMContentLoaded", function () {
  var stateSelect = document.getElementById("stateSelect");
  var citySelect = document.getElementById("citySelect");
  var findBusBtn = document.getElementById("findBusBtn");
  var resultsBox = document.getElementById("resultsBox");
  var locationBtn = document.getElementById("useLocationBtn");
  var locationStatus = document.getElementById("locationStatus");
  var endLocation = document.getElementById("endLocation");
  var startStop = document.getElementById("startStop");
  var resultsPanel = document.getElementById("busResultsPanel");
  var mapSection = document.getElementById("mapSection");
  var directLiveBusForm = document.getElementById("directLiveBusForm");
  var directBusSearch = document.getElementById("directBusSearch");
  var directBusSuggestions = document.getElementById("directBusSuggestions");
  var directBusStatus = document.getElementById("directBusStatus");
  var searchTimeInput = document.getElementById("searchTimeInput");

  var hasBusTrackingUi =
    !!stateSelect &&
    !!citySelect &&
    !!findBusBtn &&
    !!resultsBox &&
    !!locationBtn &&
    !!locationStatus &&
    !!endLocation &&
    !!startStop &&
    !!resultsPanel &&
    !!mapSection;

  var transitData = window.BusTrackData || {};
  var cities = transitData.cities || {};
  var stops = transitData.legacyStops || transitData.stops || {};
  var busData = transitData.legacyBuses || transitData.buses || [];
  var busRoutes = transitData.legacyRoutes || transitData.routes || {};

  var currentLiveTrips = {};
  var map;
  var routeLine;
  var busMarker;
  var destMarker;
  var stopMarkers = [];
  var detailMap;
  var detailMapLayers = [];
  var detailBusMarker;
  var activePassengerLiveBusId = "";
  var activePassengerLiveUnsubscribe = null;
  var activePassengerOperationalEventsUnsubscribe = null;
  var activePassengerLiveLocation = null;
  var passengerLiveRefreshId = null;
  var activePassengerJourney = null;
  var activePassengerJourneyUnsubscribe = null;
  var currentCrowdAggregates = {};
  var searchResultRealtimeSubscriptions = {};
  var searchResultRefreshTimers = {};
  var searchResultOriginalOrder = {};
  var passengerOperationalTrackers = {};
  var passengerOperationalStateTrackers = {};
  var passengerTrustFusionTracker = null;
  var currentOperationalEvents = {};
  var currentRemoteOperationalEvents = {};
  var currentTripIntelligence = {};
  var selectedJourneyCrowdLevel = "";
  var activeDetailBusNo = "";
  var markerAnimationFrames = {};
  var currentBusResultStates = {};
  var isTracking = false;
  var showResults = false;
  var isLocationSelected = false;
  var directLiveBuses =
    transitData.directLiveBuses && transitData.directLiveBuses.length
      ? transitData.directLiveBuses
    : [
        {
          busNo: "GJ-18-Z-7932",
          routeName: "Bardoli to Navsari",
          from: "Bardoli GSRTC Bus Station",
          to: "Navsari GSRTC Bus Station",
          stops: ["Bardoli GSRTC Bus Station", "Sarbhon", "Navsari GSRTC Bus Station"],
          routePoints: [
            [21.124857, 73.11261],
            [21.052071, 73.087067],
            [20.94237, 72.92467]
          ]
        },
        {
          busNo: "GJ-18-Z-7945",
          routeName: "Bardoli to Navsari",
          from: "Bardoli GSRTC Bus Station",
          to: "Navsari GSRTC Bus Station",
          stops: ["Bardoli GSRTC Bus Station", "Sarbhon", "Navsari GSRTC Bus Station"],
          routePoints: [
            [21.124857, 73.11261],
            [21.052071, 73.087067],
            [20.94237, 72.92467]
          ]
        }
      ];

  function normalizeText(value) {
    return String(value || "").toLowerCase().trim();
  }

  function normalizeStopKey(value) {
    return normalizeText(value)
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\b(gsrtc|bus|station|central|depot|stand)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getPilotNetworkStopMap() {
    var network = window.BusTrackData && window.BusTrackData.pilotNetwork
      ? window.BusTrackData.pilotNetwork
      : null;
    return network && network.stopMap ? network.stopMap : {};
  }

  function getStopIdentityKeys(stop) {
    var keys = [];
    var aliases = stop && Array.isArray(stop.aliases) ? stop.aliases : [];

    function add(value) {
      var exact = normalizeText(value);
      var loose = normalizeStopKey(value);
      if (exact && keys.indexOf(exact) === -1) keys.push(exact);
      if (loose && keys.indexOf(loose) === -1) keys.push(loose);
    }

    if (stop) {
      add(stop.stop_id);
      add(stop.stop_name);
      aliases.forEach(add);
    }

    return keys;
  }

  function resolveStopIdentity(value) {
    var exact = normalizeText(value);
    var loose = normalizeStopKey(value);
    var stopMap = getPilotNetworkStopMap();
    var stopId;
    var stop;
    var keys;
    var i;

    if (!exact && !loose) {
      return null;
    }

    for (stopId in stopMap) {
      if (!Object.prototype.hasOwnProperty.call(stopMap, stopId)) {
        continue;
      }
      stop = stopMap[stopId];
      keys = getStopIdentityKeys(stop);
      if (keys.indexOf(exact) !== -1 || keys.indexOf(loose) !== -1) {
        return stop;
      }
    }

    // Legacy-friendly fallback: a passenger may type only "Bardoli" while
    // the canonical stop is "Bardoli GSRTC Bus Station".
    for (stopId in stopMap) {
      if (!Object.prototype.hasOwnProperty.call(stopMap, stopId)) {
        continue;
      }
      stop = stopMap[stopId];
      keys = getStopIdentityKeys(stop);
      for (i = 0; i < keys.length; i++) {
        if (
          loose &&
          keys[i] &&
          (keys[i].indexOf(loose) !== -1 || loose.indexOf(keys[i]) !== -1)
        ) {
          return stop;
        }
      }
    }

    return null;
  }

  function stopsMatch(candidateName, searchValue, candidateStopId) {
    var candidateExact = normalizeText(candidateName);
    var searchExact = normalizeText(searchValue);
    var candidateLoose = normalizeStopKey(candidateName);
    var searchLoose = normalizeStopKey(searchValue);
    var searchStop = resolveStopIdentity(searchValue);
    var candidateStop = candidateStopId ? getPilotNetworkStopMap()[candidateStopId] : resolveStopIdentity(candidateName);
    var candidateKeys = candidateStop ? getStopIdentityKeys(candidateStop) : [candidateExact, candidateLoose];
    var searchKeys = searchStop ? getStopIdentityKeys(searchStop) : [searchExact, searchLoose];
    var i;
    var j;

    if (!searchExact && !searchLoose) {
      return false;
    }

    if (searchStop && candidateStopId && searchStop.stop_id === candidateStopId) {
      return true;
    }

    for (i = 0; i < candidateKeys.length; i++) {
      for (j = 0; j < searchKeys.length; j++) {
        if (!candidateKeys[i] || !searchKeys[j]) continue;
        if (candidateKeys[i] === searchKeys[j]) return true;
        if (
          searchKeys[j].length >= 4 &&
          candidateKeys[i].indexOf(searchKeys[j]) !== -1
        ) {
          return true;
        }
        if (
          candidateKeys[i].length >= 4 &&
          searchKeys[j].indexOf(candidateKeys[i]) !== -1
        ) {
          return true;
        }
      }
    }

    return false;
  }

  function searchDebugLog(message, details) {
    if (!isDebugEnabled() || typeof console === "undefined" || !console.debug) {
      return;
    }
    console.debug("[BusTrack search]", message, details || {});
  }

  // ------------------------------------------------------------------
  // Trip-aware identity helpers
  // ------------------------------------------------------------------
  function getRealtimeBusId(busKey) {
    var key = String(busKey || "").trim();
    if (!key) return "";
    // Trip keys are stored as: "<busNumber>::<tripId>"
    if (key.indexOf("::") !== -1) {
      return key.split("::")[0];
    }
    return key;
  }

  function normalizeBusLookupValue(value) {
    return String(value || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
  }

  function busLookupMatches(candidate, requested) {
    var candidateKey = normalizeBusLookupValue(candidate);
    var requestedKey = normalizeBusLookupValue(requested);

    if (!candidateKey || !requestedKey) {
      return false;
    }

    return candidateKey === requestedKey ||
      candidateKey === "BUS" + requestedKey ||
      "BUS" + candidateKey === requestedKey;
  }

  function getTripIdFromBusKey(busKey) {
    var key = String(busKey || "").trim();
    if (key.indexOf("::") === -1) return "";
    return key.split("::")[1] || "";
  }

  function parseTimeToMinutes(value) {
    var raw = String(value || "").trim();
    if (!raw) return null;
    var match = raw.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    var h = Number(match[1]);
    var m = Number(match[2]);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
  }

  function formatScheduleTimeForDisplay(value) {
    var raw = String(value || "").trim();
    var match = raw.match(/^(\d{1,2}):(\d{2})$/);
    var hour;
    var minute;
    var displayHour;
    var suffix;

    if (!match) return raw;

    hour = Number(match[1]);
    minute = Number(match[2]);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return raw;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return raw;

    suffix = hour >= 12 ? "PM" : "AM";
    displayHour = hour % 12;
    if (displayHour === 0) {
      displayHour = 12;
    }

    return displayHour + ":" + String(minute).padStart(2, "0") + " " + suffix;
  }

  function getNowMinutes() {
    var now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }

  function getSearchTimeInputMinutes() {
    var selectedMinutes = searchTimeInput ? parseTimeToMinutes(searchTimeInput.value) : null;
    if (
      selectedMinutes === null &&
      searchTimeInput &&
      typeof searchTimeInput.valueAsNumber === "number" &&
      Number.isFinite(searchTimeInput.valueAsNumber)
    ) {
      selectedMinutes = Math.floor(searchTimeInput.valueAsNumber / 60000);
    }
    return selectedMinutes;
  }

  function getSelectedSearchMinutes() {
    var selectedMinutes = getSearchTimeInputMinutes();
    return selectedMinutes === null ? getNowMinutes() : selectedMinutes;
  }

  function getBusSearchKey(bus) {
    return bus ? (bus.busKey || bus.key || bus.busNo || "") : "";
  }

  function findBusDataByKey(busNo) {
    var normalized = String(busNo || "").trim().toUpperCase();
    var physical = getRealtimeBusId(normalized);
    var fallback = null;
    var i;

    for (i = 0; i < busData.length; i++) {
      if (String(getBusSearchKey(busData[i])).toUpperCase() === normalized) {
        return busData[i];
      }
      if (!fallback && String(busData[i].busNo || "").toUpperCase() === physical) {
        fallback = busData[i];
      }
    }

    return fallback;
  }

  function getTripScheduleMinutes(bus, stopIndex) {
    if (!bus || !bus.schedule || !Array.isArray(bus.stopIds) || stopIndex === null || stopIndex === undefined) {
      return null;
    }
    var stopId = bus.stopIds[stopIndex];
    var time = stopId ? bus.schedule[stopId] : "";
    var minutes = parseTimeToMinutes(time);
    if (minutes === null) return null;

    var delay = typeof bus.delayMinutes === "number" ? bus.delayMinutes : 0;
    return minutes + delay;
  }

  function isOperationallyActiveForSearch(bus) {
    var liveStatus = String(bus && bus.liveStatus || "").toUpperCase();
    var lifecycle = String(bus && (bus.lifecycleState || bus.lifecycle_state) || "").toUpperCase();
    var delay = typeof (bus && bus.delayMinutes) === "number" ? bus.delayMinutes : 0;

    return liveStatus === "RUNNING" || lifecycle === "ACTIVE" || delay > 0;
  }

  function shouldKeepBusForSearchTime(bus, fromStopIndex, searchMinutes) {
    var ACTIVE_TRIP_GRACE_MINUTES = 10;
    var scheduledMinutes;

    if (typeof searchMinutes !== "number" || fromStopIndex === -1) {
      return true;
    }

    scheduledMinutes = getTripScheduleMinutes(bus, fromStopIndex);
    if (scheduledMinutes === null) {
      return true;
    }

    if (isOperationallyActiveForSearch(bus)) {
      return scheduledMinutes >= searchMinutes - ACTIVE_TRIP_GRACE_MINUTES;
    }

    return scheduledMinutes >= searchMinutes;
  }

  function getFirstUpcomingStopIndex(bus, searchMinutes) {
    var stopsList = getBusStops(bus);
    var i;
    var scheduledMinutes;

    if (!bus || !stopsList.length) {
      return -1;
    }

    for (i = 0; i < stopsList.length; i++) {
      scheduledMinutes = getTripScheduleMinutes(bus, i);
      if (scheduledMinutes === null || scheduledMinutes >= searchMinutes) {
        return i;
      }
    }

    return -1;
  }

  function getNextScheduledStopForBusLookup(bus, searchMinutes) {
    var stopsList = getBusStops(bus);
    var i;
    var scheduledMinutes;
    var earliestIndex = -1;
    var earliestMinutes = null;

    if (!bus || !stopsList.length) {
      return {
        stopIndex: -1,
        minutesUntil: null
      };
    }

    if (typeof searchMinutes !== "number") {
      return {
        stopIndex: 0,
        minutesUntil: null
      };
    }

    for (i = 0; i < stopsList.length; i++) {
      scheduledMinutes = getTripScheduleMinutes(bus, i);

      if (scheduledMinutes === null) {
        return {
          stopIndex: i,
          minutesUntil: null
        };
      }

      if (earliestMinutes === null || scheduledMinutes < earliestMinutes) {
        earliestMinutes = scheduledMinutes;
        earliestIndex = i;
      }

      if (scheduledMinutes >= searchMinutes) {
        return {
          stopIndex: i,
          minutesUntil: scheduledMinutes - searchMinutes
        };
      }
    }

    return {
      stopIndex: earliestIndex,
      minutesUntil: earliestMinutes === null ? null : earliestMinutes + (24 * 60) - searchMinutes
    };
  }

  function getScheduledEtaTextForStop(bus, stopIndex, searchMinutes) {
    var scheduledMinutes = getTripScheduleMinutes(bus, stopIndex);
    var delta;

    if (scheduledMinutes === null || typeof searchMinutes !== "number") {
      return "Scheduled ETA";
    }

    delta = Math.max(0, scheduledMinutes - searchMinutes);

    if (delta <= 1) {
      return "Arriving Soon";
    }

    return "Arriving in " + delta + " min";
  }

  function findOperationalTripForBus(busNo) {
    var normalized = String(busNo || "").trim().toUpperCase();
    var realtimeBusId = getRealtimeBusId(normalized);
    var searchMinutes = getSelectedSearchMinutes();
    var candidates;

    if (!normalized) {
      return null;
    }

    candidates = busData.filter(function (bus) {
      var keys = [
        bus.busNo,
        bus.displayBusNo,
        bus.physicalBusNo,
        bus.realtimeBusId,
        bus.busId,
        bus.busKey,
        bus.key
      ];

      return keys.some(function (key) {
        return busLookupMatches(key, normalized) ||
          busLookupMatches(key, realtimeBusId);
      });
    });

    if (!candidates.length) {
      return null;
    }

    candidates = candidates
      .map(function (bus) {
        var nextScheduledStop = getNextScheduledStopForBusLookup(bus, searchMinutes);

        return {
          bus: bus,
          activePriority: getSearchTripPriority(bus),
          firstUpcomingStopIndex: nextScheduledStop.stopIndex,
          firstStopTime: nextScheduledStop.minutesUntil
        };
      })
      .filter(function (item) {
        return item.activePriority < 2 || item.firstUpcomingStopIndex >= 0;
      })
      .sort(function (a, b) {
        if (a.activePriority !== b.activePriority) {
          return a.activePriority - b.activePriority;
        }
        if (a.firstStopTime === null && b.firstStopTime === null) return 0;
        if (a.firstStopTime === null) return 1;
        if (b.firstStopTime === null) return -1;
        return a.firstStopTime - b.firstStopTime;
      });

    return candidates.length ? candidates[0] : null;
  }

  function getSearchTripPriority(bus) {
    var liveStatus = String(bus && bus.liveStatus || "").toUpperCase();
    var lifecycle = String(bus && (bus.lifecycleState || bus.lifecycle_state) || "").toUpperCase();

    if (liveStatus === "RUNNING" || lifecycle === "ACTIVE") {
      return 0;
    }

    if (isOperationallyActiveForSearch(bus)) {
      return 1;
    }

    return 2;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setText(node, text) {
    if (node) {
      node.innerText = text;
    }
  }

  function getInitialResultsMarkup() {
    return (
      "<h2 class='card-title'>Results</h2>" +
      "<p class='card-sub'>Track buses in realtime.</p>" +
      "<p class='hint'>Search a route to see active buses, driver signal, ETA, and live crowd updates.</p>"
    );
  }

  function resetResults() {
    stopPassengerLiveSubscription();
    stopPassengerJourneySubscription();
    stopSearchResultRealtimeSubscriptions();
    currentLiveTrips = {};
    currentBusResultStates = {};
    currentCrowdAggregates = {};
    currentOperationalEvents = {};
    currentRemoteOperationalEvents = {};
    currentTripIntelligence = {};
    passengerOperationalTrackers = {};
    passengerOperationalStateTrackers = {};
    passengerTrustFusionTracker = null;
    searchResultOriginalOrder = {};
    activePassengerJourney = null;
    activeDetailBusNo = "";
    showResults = false;
    resultsBox.innerHTML = "";
    resultsPanel.style.display = "none";
  }

  function setResultsHtml(html) {
    stopSearchResultRealtimeSubscriptions();
    showResults = true;
    resultsPanel.style.display = "";
    resultsBox.innerHTML = html;
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
    startSearchResultRealtimeSubscriptions();
  }

  function hideMap() {
    mapSection.style.display = "none";
  }

  function resetLocationChoice() {
    isLocationSelected = false;
    locationBtn.classList.remove("selected");
    locationStatus.innerText = "";
    locationStatus.classList.remove("success");
    startStop.value = "";
  }

  function setLocationSelected(cityName) {
    isLocationSelected = true;
    locationBtn.classList.add("selected");
    locationStatus.innerText = "Current location detected near " + cityName;
    locationStatus.classList.add("success");
    // Treat location-derived stop as the "From" stop (stop-centric flow).
    ensureStartStopOption(cityName);
  }

  function populateCities(selectedState) {
    citySelect.innerHTML = "<option value=''>Select City</option>";
    citySelect.disabled = true;

    if (!selectedState || !cities[selectedState]) {
      return;
    }

    for (var i = 0; i < cities[selectedState].length; i++) {
      var option = document.createElement("option");
      option.value = cities[selectedState][i];
      option.text = cities[selectedState][i];
      citySelect.add(option);
    }

    citySelect.disabled = false;
  }

  function populateStates() {
    var stateNames = Object.keys(cities || {});

    stateSelect.innerHTML = "<option value=''>Select Pilot Network</option>";

    stateNames.forEach(function (stateName) {
      var option = document.createElement("option");
      option.value = stateName;
      option.text = stateName;
      stateSelect.add(option);
    });
  }

  function populateStops(selectedCity) {
    startStop.innerHTML = "<option value=''>Select Nearby Stop (Optional)</option>";

    // Stop-centric UX: populate from all known stops (schedule dataset),
    // not a single city bucket.
    var network = getPilotNetwork();
    var stopList = [];
    if (network && Array.isArray(network.stops)) {
      stopList = network.stops
        .map(function (stop) { return stop && stop.stop_name ? stop.stop_name : ""; })
        .filter(Boolean);
    } else {
      // Fallback: use legacy stop buckets if pilotNetwork isn't available.
      Object.keys(stops || {}).forEach(function (key) {
        (stops[key] || []).forEach(function (name) {
          stopList.push(name);
        });
      });
    }

    // De-dupe + stable ordering.
    var seen = {};
    stopList
      .filter(function (name) {
        var n = normalizeText(name);
        if (!n || seen[n]) return false;
        seen[n] = true;
        return true;
      })
      .sort(function (a, b) { return String(a).localeCompare(String(b)); })
      .forEach(function (name) {
        var option = document.createElement("option");
        option.value = name;
        option.text = name;
        startStop.add(option);
      });
  }

  function ensureStartStopOption(value) {
    var text = String(value || "").trim();
    if (!text || !startStop) return;
    var normalized = normalizeText(text);
    var existing = Array.prototype.slice.call(startStop.options).find(function (option) {
      return normalizeText(option.value) === normalized;
    });
    if (!existing) {
      existing = document.createElement("option");
      existing.value = text;
      existing.text = text;
      startStop.appendChild(existing);
    }
    startStop.value = existing.value;
  }

  function createSeed(text) {
    var seed = 0;
    var i;

    for (i = 0; i < text.length; i++) {
      seed = (seed * 31 + text.charCodeAt(i)) % 2147483647;
    }

    return seed || 13579;
  }

  function seededRandom(seed) {
    var next = (seed * 48271) % 2147483647;
    return {
      seed: next,
      value: next / 2147483647
    };
  }

  function getBusStops(bus) {
    return [bus.city].concat(bus.via, [bus.to]);
  }

  function getStopIndexForBus(bus, stopName) {
    var stopsList = getBusStops(bus);
    var searchStop = resolveStopIdentity(stopName);
    var i;
    if (!normalizeText(stopName)) return -1;

    if (searchStop && Array.isArray(bus.stopIds)) {
      for (i = 0; i < bus.stopIds.length; i++) {
        if (bus.stopIds[i] === searchStop.stop_id) {
          return i;
        }
      }
    }

    for (i = 0; i < stopsList.length; i++) {
      if (stopsMatch(stopsList[i], stopName, bus.stopIds && bus.stopIds[i])) {
        return i;
      }
    }
    return -1;
  }

  function getBoardingTargetForBus(bus, fromStopName) {
    var label = String(fromStopName || "").trim();
    var stopIndex = getStopIndexForBus(bus, label);
    if (!label) {
      label = bus && bus.city ? bus.city + " pickup point" : "pickup point";
      stopIndex = 0;
    }
    if (stopIndex < 0) {
      stopIndex = 0;
    }
    return {
      label: label,
      stopIndex: stopIndex
    };
  }

  function getTargetMatch(bus, normalizedDestination) {
    var stopsList = getBusStops(bus);
    var destination = String(normalizedDestination || "").trim();
    var i;
    var stopName;

    if (!destination) {
      return null;
    }

    for (i = 1; i < stopsList.length; i++) {
      stopName = stopsList[i];

      if (stopsMatch(stopName, destination, bus.stopIds && bus.stopIds[i])) {
        return {
          label: stopName,
          stopIndex: i
        };
      }
    }

    return null;
  }

  function matchesDestination(bus, normalizedDestination) {
    return !!getTargetMatch(bus, normalizedDestination);
  }

  function getBusesFromCity(selectedState, selectedCity) {
    var matches = [];
    var i;

    for (i = 0; i < busData.length; i++) {
      if (
        busData[i].state === selectedState &&
        busData[i].city === selectedCity
      ) {
        matches.push(busData[i]);
      }
    }

    return matches;
  }

  function getBusesServingStop(selectedState, fromStopName, nowMinutes) {
    var matches = [];
    var normalizedFrom = normalizeText(fromStopName);
    var i;
    if (!normalizedFrom) {
      return matches;
    }

    for (i = 0; i < busData.length; i++) {
      if (busData[i].state !== selectedState) {
        continue;
      }
      var stopIndex = getStopIndexForBus(busData[i], fromStopName);
      if (stopIndex === -1) {
        searchDebugLog("reject: from stop not on trip", {
          bus: getBusSearchKey(busData[i]),
          from: fromStopName,
          stops: getBusStops(busData[i])
        });
        continue;
      }

      // Time-aware operational filter: do not show trips that already passed
      // the FROM stop unless realtime/lifecycle data makes them relevant.
      if (!shouldKeepBusForSearchTime(busData[i], stopIndex, nowMinutes)) {
        searchDebugLog("reject: trip already passed from stop", {
          bus: getBusSearchKey(busData[i]),
          from: fromStopName,
          stopIndex: stopIndex,
          searchMinutes: nowMinutes,
          scheduledMinutes: getTripScheduleMinutes(busData[i], stopIndex)
        });
        continue;
      }

      searchDebugLog("keep: trip serves from stop", {
        bus: getBusSearchKey(busData[i]),
        from: fromStopName,
        stopIndex: stopIndex,
        scheduledMinutes: getTripScheduleMinutes(busData[i], stopIndex)
      });
      matches.push(busData[i]);
    }

    return matches;
  }

  function findConnectingRoute(selectedState, fromStopName, normalizedDestination, nowMinutes) {
    var firstLegOptions = getBusesServingStop(selectedState, fromStopName, nowMinutes);
    var i;
    var j;
    var firstBus;
    var secondBus;

    for (i = 0; i < firstLegOptions.length; i++) {
      firstBus = firstLegOptions[i];

      for (j = 0; j < busData.length; j++) {
        secondBus = busData[j];

        if (secondBus.state !== selectedState) {
          continue;
        }

        if (normalizeText(secondBus.city) !== normalizeText(firstBus.to)) {
          continue;
        }

        if (matchesDestination(secondBus, normalizedDestination)) {
          return {
            firstBus: firstBus,
            secondBus: secondBus
          };
        }
      }
    }

    return null;
  }

  function getDistanceKm(pointA, pointB) {
    var lat1 = pointA[0] * Math.PI / 180;
    var lat2 = pointB[0] * Math.PI / 180;
    var deltaLat = (pointB[0] - pointA[0]) * Math.PI / 180;
    var deltaLng = (pointB[1] - pointA[1]) * Math.PI / 180;
    var a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(deltaLng / 2) *
        Math.sin(deltaLng / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return 6371 * c;
  }

  function interpolatePoint(pointA, pointB, ratio) {
    return [
      pointA[0] + (pointB[0] - pointA[0]) * ratio,
      pointA[1] + (pointB[1] - pointA[1]) * ratio
    ];
  }

  function getDistanceAlongRoute(routePoints, endIndex) {
    var distance = 0;
    var i;

    for (i = 0; i < endIndex; i++) {
      distance += getDistanceKm(routePoints[i], routePoints[i + 1]);
    }

    return distance;
  }

  function getPreRoutePoint(firstPoint, distanceKm) {
    return [
      firstPoint[0] + distanceKm / 111,
      firstPoint[1] - distanceKm / 111
    ];
  }

  function getPointAtDistance(routePoints, distanceFromStart) {
    var remaining = distanceFromStart;
    var segmentDistance;
    var i;

    if (distanceFromStart <= 0) {
      return routePoints[0];
    }

    for (i = 0; i < routePoints.length - 1; i++) {
      segmentDistance = getDistanceKm(routePoints[i], routePoints[i + 1]);

      if (remaining <= segmentDistance) {
        return interpolatePoint(
          routePoints[i],
          routePoints[i + 1],
          remaining / segmentDistance
        );
      }

      remaining -= segmentDistance;
    }

    return routePoints[routePoints.length - 1];
  }

  function getSegmentLabel(bus, targetIndex, currentDistanceFromStart, targetDistanceFromStart) {
    var routeStops = getBusStops(bus);
    var totalBeforeTarget = targetDistanceFromStart - currentDistanceFromStart;
    var previousLabel = routeStops[Math.max(0, targetIndex - 1)];

    if (totalBeforeTarget < 1.5) {
      return "almost at " + routeStops[targetIndex];
    }

    return "between " + previousLabel + " and " + routeStops[targetIndex];
  }

  function buildLiveSnapshot(bus, targetMatch) {
    var routePoints = busRoutes[getBusSearchKey(bus)] || bus.routePoints || busRoutes[bus.busNo];
    var routeStops = getBusStops(bus);
    var targetDistanceFromStart;
    var targetRouteIndex = 0;
    var stopRouteIndexes = null;
    var network = getPilotNetwork();
    var route = network && network.routeMap && bus && bus.routeId ? network.routeMap[bus.routeId] : null;
    var stopSequence = null;
    var searchMinutes = getSelectedSearchMinutes();
    var scheduledStopTime = bus.schedule && bus.stopIds && bus.stopIds[targetMatch.stopIndex]
      ? bus.schedule[bus.stopIds[targetMatch.stopIndex]]
      : "";

    if (!routePoints || !routePoints.length) {
      return null;
    }

    // Map stop index -> closest route polyline index (supports road-following geometry).
    if (route && typeof buildStopSequence === "function" && typeof buildStopRouteIndexes === "function") {
      stopSequence = buildStopSequence(route.route_id);
      stopRouteIndexes = buildStopRouteIndexes(routePoints, stopSequence);
    }
    targetRouteIndex =
      stopRouteIndexes && typeof stopRouteIndexes[targetMatch.stopIndex] === "number"
        ? stopRouteIndexes[targetMatch.stopIndex]
        : Math.max(0, routePoints.length - 1);

    targetDistanceFromStart = getDistanceAlongRoute(routePoints, targetRouteIndex);

    return {
      busNo: bus.busKey || bus.busNo,
      realtimeBusId: bus.busId || bus.busNo,
      tripId: bus.tripId || "",
      routeId: bus.routeId || "",
      routePoints: routePoints,
      targetPoint: routePoints[targetRouteIndex] || routePoints[routePoints.length - 1],
      targetIndex: targetRouteIndex,
      targetStopIndex: targetMatch.stopIndex,
      targetStop: targetMatch.label,
      etaMinutes: null,
      etaText: getScheduledEtaTextForStop(bus, targetMatch.stopIndex, searchMinutes),
      scheduledTime: scheduledStopTime,
      remainingDistanceKm: targetDistanceFromStart,
      currentPoint: null,
      currentStatus: "scheduled service",
      hasLiveEstimate: false
    };
  }

  function registerLiveSnapshot(snapshot) {
    if (snapshot) {
      currentLiveTrips[snapshot.busNo] = snapshot;
    }
  }

  function findDirectLiveBus(busNo) {
    var normalized = String(busNo || "").trim().toUpperCase();

    return directLiveBuses.find(function (bus) {
      return bus.busNo === normalized;
    }) || null;
  }

  function buildDirectLiveSnapshot(bus) {
    var routePoints = bus.routePoints || [];
    var targetIndex = Math.max(0, routePoints.length - 1);
    var targetStopIndex = 0;
    var network = getPilotNetwork();
    var route = network && network.routeMap && bus && bus.routeId ? network.routeMap[bus.routeId] : null;
    if (route && Array.isArray(route.ordered_stops) && route.ordered_stops.length) {
      targetStopIndex = Math.max(0, route.ordered_stops.length - 1);
    }
    var targetPoint = routePoints[targetIndex] || null;

    return {
      busNo: bus.busNo,
      routePoints: routePoints,
      targetPoint: targetPoint,
      targetIndex: targetIndex,
      targetStopIndex: targetStopIndex,
      targetStop: bus.to,
      etaMinutes: null,
      remainingDistanceKm: null,
      currentPoint: null,
      currentStatus: "scheduled service",
      hasLiveEstimate: false
    };
  }

  function getPassengerTrackingService() {
    return window.BusTrackPassengerTracking || null;
  }

  function getLiveBusService() {
    return window.BusTrackFirebase && window.BusTrackFirebase.liveBuses
      ? window.BusTrackFirebase.liveBuses
      : null;
  }

  function getEtaService() {
    return window.BusTrackETA || null;
  }

  function getObservabilityService() {
    return window.BusTrackObservability ||
      (
        window.BusTrackFirebase &&
        window.BusTrackFirebase.observability
      ) ||
      null;
  }

  function isDebugEnabled() {
    var obs = getObservabilityService();
    return !!(obs && typeof obs.isDebugEnabled === "function" && obs.isDebugEnabled());
  }

  function obsTrace(topic, payload, options) {
    var obs = getObservabilityService();
    if (obs && typeof obs.trace === "function") {
      obs.trace(topic, payload, options);
    }
  }

  function getOperationalEventService() {
    return window.BusTrackOperationalEvents ||
      (
        window.BusTrackFirebase &&
        window.BusTrackFirebase.operationalEvents
      ) ||
      null;
  }

  function getTripIntelligenceService() {
    return window.BusTrackTripIntelligence ||
      (
        window.BusTrackFirebase &&
        window.BusTrackFirebase.tripIntelligence
      ) ||
      null;
  }

  function getOperationalStateService() {
    return window.BusTrackOperationalState ||
      (
        window.BusTrackFirebase &&
        window.BusTrackFirebase.operationalState
      ) ||
      null;
  }

  function getTrustFusionService() {
    return window.BusTrackTrustFusion ||
      (
        window.BusTrackFirebase &&
        window.BusTrackFirebase.trustFusion
      ) ||
      null;
  }

  function getPassengerTrustTracker() {
    var trustService = getTrustFusionService();
    if (!passengerTrustFusionTracker &&
      trustService &&
      typeof trustService.createTrustFusionTracker === "function"
    ) {
      passengerTrustFusionTracker = trustService.createTrustFusionTracker();
    }
    return passengerTrustFusionTracker;
  }

  function getPassengerOperationalStateTracker(busNo) {
    var opService = getOperationalStateService();

    if (!passengerOperationalStateTrackers[busNo] &&
      opService &&
      typeof opService.createOperationalStateTracker === "function"
    ) {
      passengerOperationalStateTrackers[busNo] = opService.createOperationalStateTracker();
    }

    return passengerOperationalStateTrackers[busNo] || null;
  }

  function getPassengerOperationalTracker(busNo) {
    var eventService = getOperationalEventService();

    if (!passengerOperationalTrackers[busNo] && eventService && typeof eventService.createOperationalEventTracker === "function") {
      passengerOperationalTrackers[busNo] = eventService.createOperationalEventTracker();
    }

    return passengerOperationalTrackers[busNo] || null;
  }

  function getRemoteOperationalEvents(busNo) {
    var remote = currentRemoteOperationalEvents[busNo];

    if (!remote) {
      return [];
    }

    if (Array.isArray(remote)) {
      return remote;
    }

    if (remote.active && typeof remote.active === "object") {
      return Object.keys(remote.active)
        .map(function (key) {
          var event = remote.active[key];
          if (!event) {
            return null;
          }
          return {
            type: event.event_type || key,
            event_type: event.event_type || key,
            severity: event.severity || "info",
            title: event.title || "Operational event",
            message: event.message || "",
            tone: event.severity === "critical" ? "danger" : event.severity === "warning" ? "warning" : "healthy"
          };
        })
        .filter(Boolean);
    }

    return Object.keys(remote)
      .map(function (key) {
        var event = remote[key];
        if (!event || typeof event !== "object") {
          return null;
        }
        return {
          type: event.event_type || key,
          event_type: event.event_type || key,
          severity: event.severity || "info",
          title: event.title || "Operational event",
          message: event.message || "",
          tone: event.severity === "critical" ? "danger" : event.severity === "warning" ? "warning" : "healthy"
        };
      })
      .filter(Boolean);
  }

  function getCombinedOperationalEvents(busNo) {
    return (currentOperationalEvents[busNo] || []).concat(getRemoteOperationalEvents(busNo));
  }

  function getPrimaryPassengerOperationalEvent(busNo) {
    var eventService = getOperationalEventService();
    var events = getCombinedOperationalEvents(busNo);

    if (eventService && typeof eventService.getPrimaryOperationalEvent === "function") {
      return eventService.getPrimaryOperationalEvent(events);
    }

    return events[0] || null;
  }

  // ------------------------------------------------------------
  // Stop-aware progression + lightweight hybrid ETA blending
  // ------------------------------------------------------------

  var routeContextCache = {};
  var learnedBucketCache = {};

  function getPilotNetwork() {
    return window.BusTrackData && window.BusTrackData.pilotNetwork
      ? window.BusTrackData.pilotNetwork
      : null;
  }

  function getTimeLearningService() {
    return window.BusTrackTimeLearning ||
      (window.BusTrackFirebase && window.BusTrackFirebase.timeLearning)
      ? (window.BusTrackTimeLearning || window.BusTrackFirebase.timeLearning)
      : null;
  }

  function getRouteIdForBus(busNo) {
    var normalized = String(busNo || "").trim().toUpperCase();
    var directBus = findDirectLiveBus(normalized);
    var match = findBusDataByKey(normalized);

    if (directBus && directBus.routeId) {
      return directBus.routeId;
    }

    return match && match.routeId ? match.routeId : "";
  }

  function normalizePoint(point) {
    if (Array.isArray(point) && point.length >= 2) {
      return { latitude: Number(point[0]), longitude: Number(point[1]) };
    }

    if (point && typeof point === "object") {
      return { latitude: Number(point.latitude), longitude: Number(point.longitude) };
    }

    return null;
  }

  function buildStopSequence(routeId) {
    var network = getPilotNetwork();
    var route = network && network.routeMap ? network.routeMap[routeId] : null;
    var stopMap = network && network.stopMap ? network.stopMap : null;

    if (!route || !stopMap || !Array.isArray(route.ordered_stops)) {
      return [];
    }

    return route.ordered_stops
      .map(function (stopId) {
        var stop = stopMap[stopId];
        if (!stop) {
          return null;
        }
        return {
          stop_id: stop.stop_id,
          stop_name: stop.stop_name,
          latitude: stop.latitude,
          longitude: stop.longitude
        };
      })
      .filter(Boolean);
  }

  function buildStopRouteIndexes(routePoints, stopSequence) {
    var etaService = getEtaService();
    var points = Array.isArray(routePoints) ? routePoints.map(normalizePoint).filter(Boolean) : [];

    if (!etaService || typeof etaService.calculateDistance !== "function" || !points.length) {
      return null;
    }

    return stopSequence.map(function (stop) {
      var bestIndex = 0;
      var bestDistance = Infinity;
      var i;
      for (i = 0; i < points.length; i++) {
        var distance = etaService.calculateDistance(points[i], stop);
        if (typeof distance === "number" && distance < bestDistance) {
          bestDistance = distance;
          bestIndex = i;
        }
      }
      return bestIndex;
    });
  }

  function getRouteSliceDistance(routePoints) {
    var etaService = getEtaService();
    var points = Array.isArray(routePoints) ? routePoints.map(normalizePoint).filter(Boolean) : [];
    var total = 0;
    var i;

    if (!etaService || typeof etaService.calculateDistance !== "function" || points.length < 2) {
      return null;
    }

    for (i = 1; i < points.length; i++) {
      total += etaService.calculateDistance(points[i - 1], points[i]) || 0;
    }

    return total > 0 ? total : null;
  }

  function getRouteAwareRemainingRatio(context, currentStopIndex, liveLocation) {
    var etaService = getEtaService();
    var routePoints = context && Array.isArray(context.routePoints) ? context.routePoints : [];
    var stopRouteIndexes = context && Array.isArray(context.stopRouteIndexes) ? context.stopRouteIndexes : null;
    var startIndex = stopRouteIndexes ? stopRouteIndexes[currentStopIndex] : null;
    var targetIndex = stopRouteIndexes ? stopRouteIndexes[currentStopIndex + 1] : null;
    var slice;
    var routeDistance;
    var remainingDistance;

    if (
      !etaService ||
      typeof etaService.calculateRouteDistance !== "function" ||
      typeof startIndex !== "number" ||
      typeof targetIndex !== "number" ||
      targetIndex <= startIndex ||
      !liveLocation
    ) {
      return null;
    }

    slice = routePoints.slice(startIndex, targetIndex + 1);
    routeDistance = getRouteSliceDistance(slice);
    remainingDistance = etaService.calculateRouteDistance(
      slice,
      { latitude: liveLocation.latitude, longitude: liveLocation.longitude },
      slice.length - 1
    );

    if (
      typeof routeDistance !== "number" ||
      typeof remainingDistance !== "number" ||
      routeDistance <= 0.05
    ) {
      return null;
    }

    return Math.max(0, Math.min(1, remainingDistance / routeDistance));
  }

  function getRouteContext(busNo) {
    var routeId = getRouteIdForBus(busNo);
    var cacheKey = routeId || ("bus:" + busNo);
    var cached = routeContextCache[cacheKey];
    var snapshot = currentLiveTrips[busNo];
    var routePoints = snapshot && snapshot.routePoints ? snapshot.routePoints : (busRoutes[busNo] || []);

    if (cached && cached.routePoints === routePoints) {
      return cached;
    }

    if (!routeId) {
      return null;
    }

    var network = getPilotNetwork();
    var route = network && network.routeMap ? network.routeMap[routeId] : null;
    var stopSequence = buildStopSequence(routeId);
    var segmentIds = route && Array.isArray(route.segments) ? route.segments.slice() : [];
    var stopRouteIndexes = routePoints && routePoints.length
      ? buildStopRouteIndexes(routePoints, stopSequence)
      : null;

    cached = {
      routeId: routeId,
      routePoints: routePoints,
      stopSequence: stopSequence,
      segmentIds: segmentIds,
      stopRouteIndexes: stopRouteIndexes
    };
    routeContextCache[cacheKey] = cached;
    return cached;
  }

  function createStopMarkerIcon(stopState) {
    var className = "route-stop-marker route-stop-marker-" + stopState;
    var label = stopState === "current" ? "●" : stopState === "final" ? "◆" : "•";

    return L.divIcon({
      className: className,
      html: "<span>" + label + "</span>",
      iconSize: stopState === "upcoming" ? [16, 16] : [22, 22],
      iconAnchor: stopState === "upcoming" ? [8, 8] : [11, 11],
      popupAnchor: [0, -10]
    });
  }

  function renderRouteStopMarkers(targetMap, busNo) {
    var context = getRouteContext(busNo);
    var resultState = currentBusResultStates[busNo] || {};
    var progress = resultState.progress || {};
    var currentIndex = typeof progress.currentStopIndex === "number" ? progress.currentStopIndex : 0;
    var stopsList = context && Array.isArray(context.stopSequence) ? context.stopSequence : [];

    if (!targetMap || !window.L || !stopsList.length) {
      return [];
    }

    return stopsList
      .map(function (stop, index) {
        var stopState = index === currentIndex
          ? "current"
          : index === stopsList.length - 1
            ? "final"
            : "upcoming";
        var marker;

        if (typeof stop.latitude !== "number" || typeof stop.longitude !== "number") {
          return null;
        }

        marker = L.marker([stop.latitude, stop.longitude], {
          icon: createStopMarkerIcon(stopState),
          keyboard: false
        }).addTo(targetMap);

        marker.bindPopup(
          (stopState === "current" ? "Current stop: " : stopState === "final" ? "Final stop: " : "Route stop: ") +
            stop.stop_name
        );

        return marker;
      })
      .filter(Boolean);
  }

  function normalizeTextValue(value) {
    return String(value || "").trim().toLowerCase();
  }

  function getStopIndexByName(stopSequence, stopName) {
    var normalized = normalizeTextValue(stopName);
    var i;
    for (i = 0; i < stopSequence.length; i++) {
      if (normalizeTextValue(stopSequence[i].stop_name) === normalized) {
        return i;
      }
    }
    return -1;
  }

  function renderDetailStops(busNo, stopsList, fallbackScheduleMap) {
    var detailStopsList = document.getElementById("detailStopsList");
    var progress = (currentBusResultStates[busNo] && currentBusResultStates[busNo].progress) || {};
    var scheduleMap =
      (currentBusResultStates[busNo] && currentBusResultStates[busNo].scheduleTimesByStopKey) ||
      fallbackScheduleMap ||
      null;
    var currentIndex = typeof progress.currentStopIndex === "number" ? progress.currentStopIndex : 0;
    var nextIndex = typeof progress.nextStopIndex === "number"
      ? progress.nextStopIndex
      : Math.min(currentIndex + 1, stopsList.length - 1);
    var atStop = progress.atStop === true;
    var approaching = progress.approaching === true;
    var hasProgress = typeof progress.currentStopIndex === "number" ||
      typeof progress.nextStopIndex === "number";
    var searchMinutes = getSelectedSearchMinutes();
    var firstUpcomingScheduleIndex = -1;

    if (!detailStopsList || !Array.isArray(stopsList) || !stopsList.length) {
      return;
    }

    if (!hasProgress && scheduleMap) {
      stopsList.forEach(function (stop, index) {
        var scheduleTime = scheduleMap[normalizeTextValue(stop)] || "";
        var scheduleMinutes = parseTimeToMinutes(scheduleTime);
        if (
          firstUpcomingScheduleIndex === -1 &&
          (scheduleMinutes === null || scheduleMinutes >= searchMinutes)
        ) {
          firstUpcomingScheduleIndex = index;
        }
      });
    }

    detailStopsList.innerHTML = stopsList
      .map(function (stop, index) {
        var scheduleTime = scheduleMap ? scheduleMap[normalizeTextValue(stop)] || "" : "";
        var scheduleMinutes = parseTimeToMinutes(scheduleTime);
        var isCurrent = hasProgress && index === currentIndex;
        var isNext = hasProgress
          ? index === nextIndex && index !== currentIndex
          : index === firstUpcomingScheduleIndex;
        var isPassed = hasProgress
          ? index < currentIndex
          : scheduleMinutes !== null && scheduleMinutes < searchMinutes;
        var isLast = index === stopsList.length - 1;
        var stateClass = isCurrent ? "current" : isNext ? "next" : isPassed ? "completed" : isLast ? "final" : "";
        var subcopy = "";
        var badgeText = "UPCOMING";

        if (isCurrent) {
          subcopy = atStop ? "Bus is here now" : "Last passed stop";
          badgeText = "CURRENT";
        } else if (isNext) {
          subcopy = approaching ? "Approaching" : "Next stop";
          badgeText = "NEXT";
        } else if (isPassed) {
          subcopy = "Completed";
          badgeText = "PASSED";
        } else if (isLast) {
          subcopy = "Final destination";
        } else {
          subcopy = "Upcoming stop";
        }

        if (scheduleTime) {
          subcopy += " \u2022 Scheduled " + formatScheduleTimeForDisplay(scheduleTime);
        }

        return (
          "<article class='" +
          stateClass +
          "'>" +
          "<span></span><div><h4>" +
          escapeHtml(stop) +
          "</h4><p>" +
          escapeHtml(subcopy) +
          "</p></div>" +
          "<strong>" +
          badgeText +
          "</strong>" +
          "</article>"
        );
      })
      .join("");

    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  function getLearnedBucketKey(routeId, dayType, bucketKey) {
    return routeId + "|" + dayType + "|" + bucketKey;
  }

  function loadLearnedSegmentTimes(routeId, segmentIds) {
    var learningService = getTimeLearningService();
    var dayType = learningService ? learningService.getDayType(new Date()) : "weekday";
    var bucketKey = learningService ? learningService.getBucketKey(new Date(), (learningService.defaults && learningService.defaults.bucketMinutes) || 30) : "00:00";
    var cacheKey = getLearnedBucketKey(routeId, dayType, bucketKey);
    var cached = learnedBucketCache[cacheKey];
    var debug = isDebugEnabled();

    if (cached && cached.loadedAt && Date.now() - cached.loadedAt < 2 * 60 * 1000) {
      return Promise.resolve(cached.values || {
        minutesBySegment: {},
        sampleCountsBySegment: {},
        avgSampleCount: 0,
        coverageRatio: 0
      });
    }

    if (!learningService || !segmentIds || !segmentIds.length) {
      return Promise.resolve({
        minutesBySegment: {},
        sampleCountsBySegment: {},
        avgSampleCount: 0,
        coverageRatio: 0
      });
    }

    return Promise.all(
      segmentIds.map(function (segmentId) {
        return learningService
          .readSegmentTimingBucket(routeId, segmentId, { dayType: dayType, bucketKey: bucketKey })
          .then(function (result) {
            return {
              segmentId: segmentId,
              value: result && result.ok ? result.value : null
            };
          })
          .catch(function () {
            return { segmentId: segmentId, value: null };
          });
      })
    ).then(function (items) {
      var minutesBySegment = {};
      var sampleCountsBySegment = {};
      var withLearned = 0;
      var totalSamples = 0;
      items.forEach(function (item) {
        var v = item && item.value;
        var minutes = v && typeof v.ema_time_minutes === "number"
          ? v.ema_time_minutes
          : v && typeof v.observed_time_minutes === "number"
            ? v.observed_time_minutes
            : null;
        var sampleCount = v && typeof v.sample_count === "number" ? v.sample_count : 0;
        if (item && item.segmentId && typeof minutes === "number" && minutes > 0) {
          minutesBySegment[item.segmentId] = minutes;
          sampleCountsBySegment[item.segmentId] = sampleCount;
          withLearned += 1;
          totalSamples += sampleCount;
        }
      });

      var avgSampleCount = withLearned ? totalSamples / withLearned : 0;
      var coverageRatio = segmentIds.length ? withLearned / segmentIds.length : 0;

      var payload = {
        minutesBySegment: minutesBySegment,
        sampleCountsBySegment: sampleCountsBySegment,
        avgSampleCount: avgSampleCount,
        coverageRatio: coverageRatio
      };

      if (debug) {
        payload.routeId = routeId;
        payload.dayType = dayType;
        payload.bucketKey = bucketKey;
        payload.segmentCount = segmentIds.length;
        payload.learnedCount = withLearned;
        payload.loadedAtMs = Date.now();
      }

      learnedBucketCache[cacheKey] = {
        loadedAt: Date.now(),
        values: payload
      };

      return payload;
    });
  }

  function computeLearnedEtaMinutes(context, learnedData, currentStopIndex, targetStopIndex, liveLocation) {
    var etaService = getEtaService();

    if (!context || !context.stopSequence || !context.segmentIds || !learnedData) {
      return null;
    }

    if (typeof currentStopIndex !== "number" || typeof targetStopIndex !== "number") {
      return null;
    }

    if (targetStopIndex <= currentStopIndex) {
      return 0;
    }

    var minutesBySegment = learnedData.minutesBySegment || {};
    var total = 0;
    var i;
    var firstSegmentIndex = currentStopIndex;

    for (i = firstSegmentIndex; i < targetStopIndex; i++) {
      var segmentId = context.segmentIds[i];
      var segmentTime = minutesBySegment[segmentId];

      if (typeof segmentTime !== "number") {
        // No learned value yet; skip contribution for this segment (GPS ETA remains primary).
        continue;
      }

      if (i === firstSegmentIndex && liveLocation && context.stopSequence[i + 1]) {
        var fromStop = context.stopSequence[i];
        var toStop = context.stopSequence[i + 1];
        var routeAwareRatio = getRouteAwareRemainingRatio(context, currentStopIndex, liveLocation);

        if (typeof routeAwareRatio === "number") {
          total += segmentTime * routeAwareRatio;
          continue;
        }

        var distToNext = etaService && etaService.calculateDistance
          ? etaService.calculateDistance(
              { latitude: liveLocation.latitude, longitude: liveLocation.longitude },
              toStop
            )
          : null;
        var distSegment = etaService && etaService.calculateDistance
          ? etaService.calculateDistance(fromStop, toStop)
          : null;

        if (typeof distToNext === "number" && typeof distSegment === "number" && distSegment > 0.05) {
          var remainingRatio = Math.max(0, Math.min(1, distToNext / distSegment));
          total += segmentTime * remainingRatio;
          continue;
        }
      }

      total += segmentTime;
    }

    return total > 0 ? total : null;
  }

  function computeGpsEtaMinutesToStop(context, liveLocation, stopIndex) {
    var etaService = getEtaService();
    var routePoints = context && context.routePoints ? context.routePoints : null;
    var stopRouteIndexes = context && context.stopRouteIndexes ? context.stopRouteIndexes : null;

    if (!etaService || !routePoints || !routePoints.length || !stopRouteIndexes) {
      return null;
    }

    var targetIndex = stopRouteIndexes[stopIndex];
    if (typeof targetIndex !== "number") {
      return null;
    }

    var eta = etaService.calculateETA({
      livePoint: { latitude: liveLocation.latitude, longitude: liveLocation.longitude },
      routePoints: routePoints,
      targetIndex: targetIndex,
      speed: liveLocation.speed
    });

    return eta && eta.available ? eta.minutes : null;
  }

  function computeEtaReliability(health, liveLocation, learnedData, learnedWeight, gpsMinutesAvailable) {
    var status = health && health.state ? health.state : "offline";
    var hasSession = !!(liveLocation && liveLocation.sessionActive);
    var coverage = learnedData && typeof learnedData.coverageRatio === "number"
      ? learnedData.coverageRatio
      : 0;
    var avgSamples = learnedData && typeof learnedData.avgSampleCount === "number"
      ? learnedData.avgSampleCount
      : 0;
    var usingLearned = coverage > 0.15 && learnedWeight > 0;
    var etaMode = usingLearned ? "Hybrid ETA" : "Live ETA";
    var label = "Limited Live Signal";

    if (!hasSession || status === "offline") {
      return { label: "Limited Live Signal", etaMode: usingLearned ? "Hybrid ETA" : "Live ETA" };
    }

    if (status === "paused") {
      return { label: "GPS Recovering", etaMode: etaMode };
    }

    if (!gpsMinutesAvailable) {
      // GPS is present but we couldn't compute a clean ETA to the selected stop.
      return { label: "Limited Live Signal", etaMode: etaMode };
    }

    if (usingLearned && avgSamples > 0 && avgSamples < 3) {
      return { label: "Learning Route Timing", etaMode: "Hybrid ETA" };
    }

    if (status === "delayed") {
      return { label: "Moderate Confidence", etaMode: etaMode };
    }

    // LIVE + sessionActive + computed ETA
    return { label: "High Confidence", etaMode: etaMode };
  }

  function updateStopAwareDetail(busNo, liveLocation, health) {
    if (activeDetailBusNo !== busNo) {
      return;
    }

    if (!liveLocation || !liveLocation.available) {
      return;
    }

    var context = getRouteContext(busNo);
    if (!context || !context.stopSequence.length) {
      return;
    }

    var resultState = currentBusResultStates[busNo] || (currentBusResultStates[busNo] = {});
    var currentStopIndex =
      typeof liveLocation.currentStopIndex === "number"
        ? liveLocation.currentStopIndex
        : 0;
    var nextStopIndex =
      typeof liveLocation.nextStopIndex === "number"
        ? liveLocation.nextStopIndex
        : Math.min(currentStopIndex + 1, context.stopSequence.length - 1);

    var destinationStopName =
      activePassengerJourney &&
      activePassengerJourney.sessionActive &&
      activePassengerJourney.busId === busNo &&
      activePassengerJourney.destinationStop
        ? activePassengerJourney.destinationStop
        : (context.stopSequence[context.stopSequence.length - 1] && context.stopSequence[context.stopSequence.length - 1].stop_name);
    var destinationStopIndex = getStopIndexByName(context.stopSequence, destinationStopName);
    if (destinationStopIndex === -1) {
      destinationStopIndex = context.stopSequence.length - 1;
      destinationStopName = context.stopSequence[destinationStopIndex].stop_name;
    }

    var stopsAway = Math.max(0, destinationStopIndex - currentStopIndex);
    var atStop = liveLocation.atStop === true;
    var approaching = liveLocation.approachingStop === true;

    resultState.progress = {
      currentStopIndex: currentStopIndex,
      nextStopIndex: nextStopIndex,
      atStop: atStop,
      approaching: approaching,
      stopsAway: stopsAway,
      destinationStopName: destinationStopName
    };

    // Update stop list UI immediately (no waits).
    renderDetailStops(busNo, context.stopSequence.map(function (s) { return s.stop_name; }));

    // Surface route progression without UI redesign (reuse existing Status line).
    var nextStopName = context.stopSequence[nextStopIndex]
      ? context.stopSequence[nextStopIndex].stop_name
      : "";
    var stopsRemaining = Math.max(0, (context.stopSequence.length - 1) - currentStopIndex);
    var detailStatus = document.getElementById("detailStatus");
    if (detailStatus && nextStopName) {
      detailStatus.innerText =
        "Next stop: " +
        nextStopName +
        " • " +
        stopsRemaining +
        " stops remaining";
    }

    // Lightweight hybrid ETA blending: GPS primary, learned EMA is a small correction.
    var gpsMinutes = computeGpsEtaMinutesToStop(context, liveLocation, destinationStopIndex);
    var gpsNextMinutes = computeGpsEtaMinutesToStop(context, liveLocation, nextStopIndex);
    var learnedWeight = health && health.state === "delayed" ? 0.25 : 0.15;

    loadLearnedSegmentTimes(context.routeId, context.segmentIds).then(function (learnedData) {
      var learnedMinutes = computeLearnedEtaMinutes(
        context,
        learnedData,
        currentStopIndex,
        destinationStopIndex,
        liveLocation
      );
      var learnedNextMinutes = computeLearnedEtaMinutes(
        context,
        learnedData,
        currentStopIndex,
        nextStopIndex,
        liveLocation
      );
      var destinationMinutes = null;
      var nextMinutes = null;

      if (typeof gpsMinutes === "number" && typeof learnedMinutes === "number") {
        destinationMinutes = Math.max(1, Math.round(gpsMinutes * (1 - learnedWeight) + learnedMinutes * learnedWeight));
      } else if (typeof gpsMinutes === "number") {
        destinationMinutes = gpsMinutes;
      }

      if (typeof gpsNextMinutes === "number" && typeof learnedNextMinutes === "number") {
        nextMinutes = Math.max(1, Math.round(gpsNextMinutes * (1 - learnedWeight) + learnedNextMinutes * learnedWeight));
      } else if (typeof gpsNextMinutes === "number") {
        nextMinutes = gpsNextMinutes;
      } else if (atStop && nextStopIndex === currentStopIndex) {
        nextMinutes = 0;
      }

      if (destinationMinutes === null && nextMinutes === null) {
        return;
      }

      var reliability = computeEtaReliability(
        health,
        liveLocation,
        learnedData,
        learnedWeight,
        typeof destinationMinutes === "number" || typeof nextMinutes === "number"
      );

      if (isDebugEnabled()) {
        resultState.etaDecisionTrace = {
          signalState: health && health.state ? health.state : "",
          learnedWeight: learnedWeight,
          gpsDestinationMinutes: gpsMinutes,
          learnedDestinationMinutes: learnedMinutes,
          finalDestinationMinutes: destinationMinutes,
          gpsNextStopMinutes: gpsNextMinutes,
          learnedNextStopMinutes: learnedNextMinutes,
          finalNextStopMinutes: nextMinutes,
          etaMode: reliability.etaMode,
          confidenceLabel: reliability.label,
          learning: {
            coverageRatio: learnedData && learnedData.coverageRatio,
            avgSampleCount: learnedData && learnedData.avgSampleCount,
            learnedCount: learnedData && learnedData.learnedCount,
            segmentCount: learnedData && learnedData.segmentCount,
            bucketKey: learnedData && learnedData.bucketKey,
            dayType: learnedData && learnedData.dayType
          }
        };

        obsTrace("eta.decision", {
          bus: busNo,
          weight: learnedWeight,
          gps: gpsMinutes,
          learned: learnedMinutes,
          final: destinationMinutes,
          nextGps: gpsNextMinutes,
          nextLearned: learnedNextMinutes,
          nextFinal: nextMinutes,
          confidence: reliability.label,
          mode: reliability.etaMode
        }, { throttleMs: 1200 });
      }

      // Trust-weighted multi-signal fusion (lightweight; no UI changes).
      (function applyTrustFusion() {
        var trustService = getTrustFusionService();
        var tracker = getPassengerTrustTracker();
        if (!trustService || !tracker || typeof trustService.computeTrustFusion !== "function") {
          return;
        }

        // Build learnedData subset (avoid copying big objects).
        resultState.learnedDataForTrust = {
          coverageRatio: learnedData && learnedData.coverageRatio,
          avgSampleCount: learnedData && learnedData.avgSampleCount
        };

        var trustResult = trustService.computeTrustFusion(
          {
            nowMs: Date.now(),
            busId: busNo,
            signalHealth: health,
            trackingStatus: liveLocation && liveLocation.trackingStatus,
            crowdAggregate: currentCrowdAggregates[busNo] || null,
            learnedData: resultState.learnedDataForTrust,
            operationalState: resultState.operationalState || null
          },
          tracker
        );

        passengerTrustFusionTracker = trustResult.tracker;
        resultState.trust = trustResult.trust;

        // If operational state already exists, apply trust-weighting to its confidence.
        if (
          resultState.operationalState &&
          typeof resultState.operationalState.confidence === "number" &&
          trustResult.trust &&
          typeof trustService.applyTrustToConfidence === "function"
        ) {
          resultState.operationalState.confidence = trustService.applyTrustToConfidence(
            resultState.operationalState.confidence,
            trustResult.trust.score
          );
        }

        currentBusResultStates[busNo] = resultState;
      })();

      var detailEta = document.getElementById("detailEta");
      var detailEtaInline = document.getElementById("detailEtaInline");
      var label =
        typeof nextMinutes === "number"
          ? (nextMinutes <= 1
              ? "Arriving at " + nextStopName + " soon"
              : "Arriving at " + nextStopName + " in " + nextMinutes + " min")
          : (destinationMinutes <= 1
              ? "Arriving Soon"
              : "Arriving at " + destinationStopName + " in " + destinationMinutes + " min");
      var inline =
        typeof destinationMinutes === "number"
          ? (destinationMinutes <= 1
              ? "Arriving Soon"
              : "Destination: " +
                destinationStopName +
                " in " +
                destinationMinutes +
                " min" +
                (stopsAway ? " • " + stopsAway + " stops away" : ""))
          : "";

      // Only update if still on the same bus detail page.
      if (activeDetailBusNo !== busNo) {
        return;
      }

      resultState.eta = destinationMinutes !== null ? destinationMinutes : resultState.eta;
      resultState.etaText = label;
      resultState.etaConfidence = reliability.label;
      resultState.etaMode = reliability.etaMode;
      currentBusResultStates[busNo] = resultState;

      if (detailEta) {
        detailEta.innerText = label;
      }
      if (detailEtaInline) {
        detailEtaInline.innerText = inline;
      }

      // Refresh live indicator UI with confidence/mode appended (no UI redesign).
      updateLiveIndicator(busNo, health);
    });
  }

  function getFreshSignalHealth(liveLocation) {
    var signalHealth = window.BusTrackSignalHealth;

    if (
      liveLocation &&
      signalHealth &&
      typeof signalHealth.getSignalHealth === "function"
    ) {
      return signalHealth.getSignalHealth(
        liveLocation.timestamp,
        liveLocation.trackingStatus
      );
    }

    return liveLocation && liveLocation.signalHealth
      ? liveLocation.signalHealth
      : getSignalHealthFallback("offline");
  }

  function getSignalHealthFallback(status) {
    var label = getOperationalStatusLabel(status);

    return {
      state: status,
      label: label,
      freshnessText:
        status === "offline"
          ? "Waiting for driver signal"
          : status === "paused"
            ? "Operational session paused"
          : status === "delayed"
            ? "Recently updated"
          : "Realtime GPS tracking"
    };
  }

  function getOperationalStatus(liveLocation) {
    if (
      !liveLocation ||
      !liveLocation.available ||
      (!liveLocation.sessionActive && liveLocation.trackingStatus !== "paused")
    ) {
      return "offline";
    }

    if (liveLocation.signalHealth && liveLocation.signalHealth.state) {
      return getFreshSignalHealth(liveLocation).state;
    }

    return "live";
  }

  function getOperationalStatusLabel(status) {
    if (status === "delayed") {
      return "DELAYED";
    }

    if (status === "paused") {
      return "PAUSED";
    }

    if (status === "offline") {
      return "OFFLINE";
    }

    return "LIVE";
  }

  function getOperationalTrustLabel(health) {
    var status = health && health.state ? health.state : "offline";

    if (status === "live") {
      return "Driver Signal Active";
    }

    if (status === "delayed") {
      return "Recently Updated";
    }

    if (status === "paused") {
      return "Live Session Paused";
    }

    return "Waiting for Driver Signal";
  }

  function getLiveIndicatorMarkup(health, confidenceLabel, etaModeLabel, overrideMessage) {
    var suffix = "";
    var message = overrideMessage
      ? String(overrideMessage)
      : getOperationalTrustLabel(health) +
        " - " +
        (health.freshnessText || "Waiting for driver signal");

    if (confidenceLabel) {
      suffix += " \u2022 " + confidenceLabel;
    }

    if (etaModeLabel) {
      suffix += " \u2022 " + etaModeLabel;
    }

    return (
      "<span></span><b>" +
      health.label +
      "</b><small>" +
      escapeHtml(
        message + suffix
      ) +
      "</small>"
    );
  }

  function updateLiveIndicator(busNo, healthOrStatus) {
    var health =
      typeof healthOrStatus === "string"
        ? getSignalHealthFallback(healthOrStatus)
        : healthOrStatus || getSignalHealthFallback("offline");
    var status = health.state || "offline";
    var label = health.label || getOperationalStatusLabel(status);
    var selector = ".bus-card[data-bus-route='" + busNo + "'] .bus-live";
    var cardBadge = document.querySelector(selector);
    var detailLivePill = document.querySelector(".bus-detail-badges .live-pill");
    var trackingBadge = document.getElementById("detailTrackingBadge");
    var resultState = currentBusResultStates[busNo] || {};
    var confidenceLabel = resultState.etaConfidence || "";
    var etaModeLabel = resultState.etaMode || "";
    var scheduledMode = etaModeLabel === "Scheduled ETA";
    var overrideMessage = scheduledMode
      ? "Using scheduled trip timings until live tracking becomes available."
      : "";

    if (scheduledMode && status === "offline" && !resultState.activeDriverSession) {
      label = "SCHEDULED";
    }

    resultState.signalHealth = health;
    resultState.signalState = status;
    if (!confidenceLabel) {
      // Lightweight fallback confidence (keeps calculations cheap for list view).
      confidenceLabel =
        status === "live"
          ? "High Confidence"
          : status === "delayed"
            ? "Moderate Confidence"
            : status === "paused"
              ? "GPS Recovering"
              : "Limited Live Signal";
      resultState.etaConfidence = confidenceLabel;
    }
    currentBusResultStates[busNo] = resultState;

    if (cardBadge) {
      cardBadge.classList.remove("delayed", "paused", "offline");
      cardBadge.classList.toggle("delayed", status === "delayed");
      cardBadge.classList.toggle("paused", status === "paused");
      cardBadge.classList.toggle("offline", status === "offline");
      cardBadge.innerHTML = getLiveIndicatorMarkup({
        state: status,
        label: label,
        freshnessText: health.freshnessText
      }, confidenceLabel, etaModeLabel, overrideMessage);
    }

    if (activeDetailBusNo === busNo && detailLivePill) {
      detailLivePill.classList.remove("delayed", "paused", "offline");
      detailLivePill.classList.toggle("delayed", status === "delayed");
      detailLivePill.classList.toggle("paused", status === "paused");
      detailLivePill.classList.toggle("offline", status === "offline");
      detailLivePill.innerHTML =
        "<span class='dot'></span><b>" +
        label +
        "</b><small>" +
        escapeHtml(
          (overrideMessage || (getOperationalTrustLabel(health) + " - " + (health.freshnessText || "Waiting for driver signal"))) +
            (confidenceLabel ? " \u2022 " + confidenceLabel : "") +
            (etaModeLabel ? " \u2022 " + etaModeLabel : "")
        ) +
        "</small>";
    }

    if (activeDetailBusNo === busNo && trackingBadge) {
      trackingBadge.classList.add("show");
      trackingBadge.classList.remove("delayed", "paused", "offline");
      trackingBadge.classList.toggle("delayed", status === "delayed");
      trackingBadge.classList.toggle("paused", status === "paused");
      trackingBadge.classList.toggle("offline", status === "offline");
      trackingBadge.innerHTML =
        "<i data-lucide='navigation'></i> " +
        (status === "live"
          ? "Tracking"
          : status === "delayed"
            ? "Delayed"
          : status === "paused"
            ? "Paused"
          : scheduledMode && !resultState.activeDriverSession
            ? "Scheduled"
            : "Offline") +
        "<small>" +
        escapeHtml(
          (overrideMessage || getOperationalTrustLabel(health)) +
            (confidenceLabel ? " \u2022 " + confidenceLabel : "") +
            (etaModeLabel ? " \u2022 " + etaModeLabel : "")
        ) +
        "</small>";

      if (window.lucide && typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons();
      }
    }
  }

  function animateMarker(markerKey, marker, nextPoint) {
    var startLatLng;
    var startTime;
    var duration = 900;

    if (!marker || !nextPoint) {
      return;
    }

    startLatLng = marker.getLatLng();

    if (markerAnimationFrames[markerKey]) {
      window.cancelAnimationFrame(markerAnimationFrames[markerKey]);
    }

    startTime = performance.now();

    function step(now) {
      var progress = Math.min(1, (now - startTime) / duration);
      var lat = startLatLng.lat + (nextPoint[0] - startLatLng.lat) * progress;
      var lng = startLatLng.lng + (nextPoint[1] - startLatLng.lng) * progress;

      marker.setLatLng([lat, lng]);

      if (progress < 1) {
        markerAnimationFrames[markerKey] = window.requestAnimationFrame(step);
      }
    }

    markerAnimationFrames[markerKey] = window.requestAnimationFrame(step);
  }

  function getUnavailableEta() {
    return {
      available: false,
      label: "ETA pending",
      minutes: null,
      distanceKm: null,
      arrivingSoon: false
    };
  }

  function getRealtimeEta(busNo, liveLocation, health) {
    var etaService = getEtaService();
    var snapshot = currentLiveTrips[busNo];
    var status = health && health.state ? health.state : "offline";

    if (
      !etaService ||
      !snapshot ||
      !liveLocation ||
      (status !== "live" && status !== "delayed") ||
      typeof liveLocation.latitude !== "number" ||
      typeof liveLocation.longitude !== "number"
    ) {
      return getUnavailableEta();
    }

    return etaService.calculateETA({
      livePoint: {
        latitude: liveLocation.latitude,
        longitude: liveLocation.longitude
      },
      routePoints: snapshot.routePoints,
      targetIndex: snapshot.targetIndex,
      speed: liveLocation.speed
    });
  }

  function getEtaCardText(eta) {
    if (!eta || !eta.available) {
      return "ETA pending";
    }

    return eta.arrivingSoon ? "Arriving Soon" : "Arriving in " + eta.minutes + " min";
  }

  function getEtaInlineText(eta) {
    if (!eta || !eta.available) {
      return "Waiting for active tracking";
    }

    return eta.arrivingSoon ? "Arriving Soon" : eta.minutes + " minutes";
  }

  function formatStoredEta(value, inline) {
    if (typeof value === "number") {
      return inline ? value + " minutes" : value + " min";
    }

    if (
      String(value || "").toLowerCase().indexOf("unavailable") !== -1 ||
      String(value || "").toLowerCase().indexOf("pending") !== -1
    ) {
      return inline ? "Waiting for active tracking" : "ETA pending";
    }

    return String(value || (inline ? "8 minutes" : "8 min"));
  }

  function formatStoredDistance(value) {
    if (typeof value === "number") {
      return formatDistance(value);
    }

    var text = String(value || "").trim();
    if (!text) {
      return "—";
    }

    // Already has explicit units or is an operational status string.
    if (
      text.indexOf("km") !== -1 ||
      text.indexOf("m") !== -1 ||
      text.toLowerCase().indexOf("route") !== -1 ||
      text.toLowerCase().indexOf("service") !== -1 ||
      text.toLowerCase().indexOf("signal") !== -1 ||
      text.toLowerCase().indexOf("waiting") !== -1
    ) {
      return text;
    }

    // Pure numeric -> assume km (legacy fallback).
    if (/^\d+(\.\d+)?$/.test(text)) {
      return text + " km";
    }

    return text;
  }

  function getRouteDistanceKm(busNo, snapshot) {
    var network = getPilotNetwork();
    var routePoints = snapshot && snapshot.routePoints ? snapshot.routePoints : (busRoutes[busNo] || []);
    var routeId = snapshot && snapshot.routeId ? snapshot.routeId : getRouteIdForBus(busNo);
    var route = network && network.routeMap && routeId ? network.routeMap[routeId] : null;

    // Prefer segment distances when fully available (stable "operational" truth).
    if (route && network && network.segmentMap && Array.isArray(route.segments) && route.segments.length) {
      var sum = 0;
      var missing = 0;
      route.segments.forEach(function (segmentId) {
        var seg = network.segmentMap[segmentId];
        var d = seg && typeof seg.distance_km === "number" ? seg.distance_km : null;
        if (typeof d === "number" && d > 0) {
          sum += d;
        } else {
          missing += 1;
        }
      });
      if (!missing && sum > 0) {
        return sum;
      }
    }

    // Fallback: compute from static route geometry (road-following polyline).
    if (routePoints && routePoints.length > 1) {
      return getDistanceAlongRoute(routePoints, routePoints.length - 1);
    }

    return null;
  }

  function buildScheduleTimesByStopName(network, route) {
    var stopMap = network && network.stopMap ? network.stopMap : {};
    var timings = route && Array.isArray(route.stop_timings) ? route.stop_timings : [];
    var keyMap = {};

    timings.forEach(function (timing) {
      var stopId = timing && timing.stop_id ? timing.stop_id : "";
      var stop = stopMap[stopId];
      var stopName = stop && stop.stop_name ? stop.stop_name : "";
      var time = timing && timing.arrival_time ? timing.arrival_time : "";
      var key = normalizeTextValue(stopName);
      if (key && time) {
        keyMap[key] = time;
      }
    });

    return keyMap;
  }

  function getScheduledEta(busNo, stopIndex) {
    var tripService = getTripIntelligenceService();
    var network = getPilotNetwork();
    var now = new Date();
    var selectedMinutes = getSearchTimeInputMinutes();

    if (!tripService || !network || typeof tripService.computeScheduledEta !== "function") {
      return {
        available: false,
        mode: "none",
        label: "No active service",
        minutes: null
      };
    }

    if (selectedMinutes !== null) {
      now.setHours(Math.floor(selectedMinutes / 60), selectedMinutes % 60, 0, 0);
    }

    return tripService.computeScheduledEta({
      network: network,
      busNo: getRealtimeBusId(busNo),
      tripId: getTripIdFromBusKey(busNo),
      stopIndex: stopIndex,
      now: now
    });
  }

  function updateRealtimeEta(busNo, liveLocation, health) {
    var resultState = currentBusResultStates[busNo] || {};
    var snapshot = currentLiveTrips[busNo] || null;
    var sessionActive = !!resultState.activeDriverSession || !!(liveLocation && liveLocation.sessionActive);
    var eta = null;
    var cardEta = document.querySelector(
      ".bus-card[data-bus-route='" + busNo + "'] .bus-card-eta-value"
    );
    var detailEta = document.getElementById("detailEta");
    var detailDistance = document.getElementById("detailDistance");
    var detailEtaInline = document.getElementById("detailEtaInline");
    var detailStatus = document.getElementById("detailStatus");
    var detailStatusBadge = document.getElementById("detailStatusBadge");
    var distanceText = "Waiting for signal";
    var etaCardText = "ETA pending";
    var etaInlineText = "Waiting for active tracking";

    currentBusResultStates[busNo] = resultState;

    // ----------------------------
    // Mode selection: Live → Scheduled → No Service
    // ----------------------------
    if (sessionActive) {
      // Preserve existing live ETA system.
      eta = getRealtimeEta(busNo, liveLocation, health);
      resultState.etaSource = "live";
      // Ensure a default live label even when stop-aware/hybrid hasn't populated yet.
      if (!resultState.etaMode) {
        resultState.etaMode = "Live ETA";
      }
      if (!eta || !eta.available) {
        eta = getUnavailableEta();
      }
      if (eta.available && typeof eta.distanceKm === "number") {
        distanceText =
          eta.distanceKm <= 0.05
            ? "Route completed"
            : formatDistance(eta.distanceKm) + " remaining";
      } else {
        distanceText = "Waiting for signal";
      }
      etaCardText = getEtaCardText(eta);
      etaInlineText = getEtaInlineText(eta);
      resultState.eta = eta.available ? eta.minutes : "ETA pending";
      resultState.etaText = etaCardText;
      // In live mode, schedule timing hints are less relevant.
      resultState.scheduleTimesByStopKey = null;
    } else {
      // Schedule-backed fallback (no realtime driver session).
      var stopIndex =
        snapshot && typeof snapshot.targetStopIndex === "number"
          ? snapshot.targetStopIndex
          : 0;
      var scheduled = getScheduledEta(busNo, stopIndex);

      if (scheduled && scheduled.available) {
        resultState.etaSource = "scheduled";
        resultState.etaMode = "Scheduled ETA";
        resultState.etaConfidence = "Scheduled";
        resultState.eta = typeof scheduled.minutes === "number" ? scheduled.minutes : "ETA pending";
        resultState.etaText = scheduled.label || "ETA pending";
        etaCardText = resultState.etaText;
        etaInlineText =
          typeof scheduled.minutes === "number"
            ? (scheduled.minutes <= 1 ? "Arriving Soon" : scheduled.minutes + " minutes")
            : "Scheduled service";
        (function computeScheduledDistance() {
          var routeDistanceKm = getRouteDistanceKm(busNo, snapshot);
          distanceText = typeof routeDistanceKm === "number" && routeDistanceKm > 0
            ? (formatDistance(routeDistanceKm) + " route distance")
            : "Route distance unavailable";
        })();

        // Provide expected stop timings (additive, no UI redesign).
        (function attachScheduleTimes() {
          var tripService = getTripIntelligenceService();
          var network = getPilotNetwork();
          if (!tripService || !network || typeof tripService.identifyActiveTrip !== "function") {
            return;
          }
          var identified = tripService.identifyActiveTrip({
            network: network,
            busNo: busNo,
            routeId: snapshot && snapshot.routeId ? snapshot.routeId : getRouteIdForBus(busNo),
            now: new Date()
          });
          if (identified && identified.available && identified.route) {
            resultState.scheduleTimesByStopKey = buildScheduleTimesByStopName(network, identified.route);
          }
        })();

        // Schedule-first UX: still compute trip intelligence + operational state so
        // the app feels operational without live telemetry.
        (function refreshScheduledTripIntelligence() {
          var fallbackHealth = getSignalHealthFallback("offline");
          computePassengerTripIntelligence(busNo, null, fallbackHealth);
          renderPassengerTripIntelligence(busNo);
        })();
      } else {
        resultState.etaSource = "none";
        resultState.etaMode = "";
        resultState.etaConfidence = "";
        resultState.eta = "No active service";
        resultState.etaText = "No active service";
        resultState.scheduleTimesByStopKey = null;
        resultState.status = "No active service";
        resultState.statusText = "NO SERVICE";
        resultState.statusClass = "delay";
        etaCardText = "No active service";
        etaInlineText = "No active service";
        distanceText = "No active service";
      }

      // Live indicator should reflect Scheduled ETA suffix.
      updateLiveIndicator(busNo, health || getSignalHealthFallback("offline"));
    }

    resultState.distance = distanceText;

    if (cardEta) {
      cardEta.innerText = etaCardText;
    }

    reorderSearchResults();

    if (activeDetailBusNo === busNo) {
      setText(detailEta, etaCardText);
      setText(detailDistance, distanceText);
      setText(detailEtaInline, etaInlineText);

      if (detailStatus) {
        if (!sessionActive && resultState.etaSource === "scheduled") {
          setText(detailStatus, "Scheduled Service");
        } else if (!sessionActive && resultState.etaSource === "none") {
          setText(detailStatus, "No active service");
        } else if (health && health.state === "offline") {
          setText(detailStatus, "Waiting for Driver Signal");
        } else if (health && health.state === "paused") {
          setText(detailStatus, "Live Session Paused");
        } else if (health && health.state === "delayed") {
          setText(detailStatus, "Recently Updated");
        } else if (eta.available && eta.arrivingSoon) {
          setText(detailStatus, "Arriving Soon");
        } else {
          setText(detailStatus, resultState.status || "On Time");
        }
      }

      if (detailStatusBadge && health) {
        if (!sessionActive && resultState.etaSource === "none") {
          detailStatusBadge.innerText = "NO SERVICE";
          detailStatusBadge.className = "tag delay";
        } else if (health.state === "offline") {
          detailStatusBadge.innerText = "OFFLINE";
          detailStatusBadge.className = "tag delay";
        } else if (health.state === "paused") {
          detailStatusBadge.innerText = "PAUSED";
          detailStatusBadge.className = "tag delay";
        } else if (health.state === "delayed") {
          detailStatusBadge.innerText = "DELAYED";
          detailStatusBadge.className = "tag delay";
        } else if (eta.available && eta.arrivingSoon) {
          detailStatusBadge.innerText = "ARRIVING";
          detailStatusBadge.className = "tag ok";
        } else {
          detailStatusBadge.innerText = resultState.statusText || "ON TIME";
          detailStatusBadge.className = "tag " + (resultState.statusClass || "ok");
        }
      }
    }

    return eta;
  }

  function normalizePassengerProgress(liveLocation) {
    return {
      currentStopIndex:
        liveLocation && typeof liveLocation.currentStopIndex === "number"
          ? liveLocation.currentStopIndex
          : null,
      nextStopIndex:
        liveLocation && typeof liveLocation.nextStopIndex === "number"
          ? liveLocation.nextStopIndex
          : null,
      atStop: !!(liveLocation && liveLocation.atStop),
      approaching: !!(liveLocation && liveLocation.approachingStop)
    };
  }

  function detectPassengerOperationalEvents(busNo, liveLocation, health) {
    var eventService = getOperationalEventService();
    var tracker = getPassengerOperationalTracker(busNo);
    var snapshot = currentLiveTrips[busNo] || {};
    var resultState = currentBusResultStates[busNo] || {};
    var result;

    if (!eventService || !tracker || typeof eventService.detectOperationalEvents !== "function") {
      currentOperationalEvents[busNo] = [];
      return [];
    }

    result = eventService.detectOperationalEvents(
      {
        busId: busNo,
        location: liveLocation,
        routePoints: snapshot.routePoints || busRoutes[busNo] || [],
        progress: normalizePassengerProgress(liveLocation),
        trackingStatus: liveLocation && liveLocation.trackingStatus,
        signalHealth: health,
        etaConfidence: resultState.etaConfidence || ""
      },
      tracker
    );

    passengerOperationalTrackers[busNo] = result.tracker;
    currentOperationalEvents[busNo] = result.events || [];

    if (isDebugEnabled()) {
      obsTrace("events.detected", {
        bus: busNo,
        primary: result.primaryEvent ? {
          type: result.primaryEvent.type || result.primaryEvent.event_type,
          severity: result.primaryEvent.severity,
          title: result.primaryEvent.title,
          meta: result.primaryEvent
        } : null,
        count: (result.events || []).length
      }, { throttleMs: 1500 });
    }

    return currentOperationalEvents[busNo];
  }

  function ensureDetailOperationalEventNode() {
    var list = document.querySelector(".bus-detail-side .live-status-list");
    var node = document.getElementById("detailOperationalEvent");

    if (node || !list) {
      return node;
    }

    node = document.createElement("p");
    node.id = "detailOperationalEvent";
    node.className = "operational-event-note normal";
    node.innerHTML = "<span class='green-dot'></span> Operational conditions normal";
    list.appendChild(node);
    return node;
  }

  function ensureCardOperationalEventNode(busNo) {
    var card = document.querySelector(".bus-card[data-bus-route='" + busNo + "'] .bus-card-center");
    var node = document.querySelector(".bus-card[data-bus-route='" + busNo + "'] .operational-event-card-note");

    if (node || !card) {
      return node;
    }

    node = document.createElement("p");
    node.className = "bus-delay-note operational-event-card-note";
    node.hidden = true;
    card.appendChild(node);
    return node;
  }

  function getEventDotClass(event) {
    if (!event) {
      return "green-dot";
    }

    if (event.severity === "critical") {
      return "red-dot";
    }

    if (event.severity === "warning") {
      return "orange-dot";
    }

    return "blue-dot";
  }

  function renderPassengerOperationalEvents(busNo) {
    var primaryEvent = getPrimaryPassengerOperationalEvent(busNo);
    var detailNode = activeDetailBusNo === busNo ? ensureDetailOperationalEventNode() : null;
    var cardNode = ensureCardOperationalEventNode(busNo);

    if (detailNode) {
      detailNode.classList.remove("normal", "warning", "danger");
      detailNode.classList.add(
        primaryEvent
          ? primaryEvent.tone === "danger"
            ? "danger"
            : primaryEvent.tone === "warning"
              ? "warning"
              : "normal"
          : "normal"
      );
      detailNode.innerHTML =
        "<span class='" +
        getEventDotClass(primaryEvent) +
        "'></span> " +
        escapeHtml(primaryEvent ? primaryEvent.title + " - " + primaryEvent.message : "Operational conditions normal");
    }

    if (cardNode) {
      cardNode.hidden = !primaryEvent;
      if (primaryEvent) {
        cardNode.classList.toggle("danger", primaryEvent.tone === "danger");
        cardNode.innerText = primaryEvent.title + ": " + primaryEvent.message;
      }
    }
  }

  function computePassengerTripIntelligence(busNo, liveLocation, health) {
    var tripService = getTripIntelligenceService();
    var context = getRouteContext(busNo);
    var resultState = currentBusResultStates[busNo] || {};
    var remoteProgress =
      liveLocation && typeof liveLocation.tripProgressPercent === "number"
        ? liveLocation.tripProgressPercent
        : null;
    var tripResult;

    if (!tripService || typeof tripService.computeTripIntelligence !== "function" || !context) {
      return null;
    }

    tripResult = tripService.computeTripIntelligence({
      network: getPilotNetwork(),
      busNo: busNo,
      routeId: context.routeId,
      progress: normalizePassengerProgress(liveLocation),
      currentStopIndex:
        liveLocation && typeof liveLocation.currentStopIndex === "number"
          ? liveLocation.currentStopIndex
          : 0,
      signalHealth: health,
      etaConfidence: resultState.etaConfidence || "",
      events: getCombinedOperationalEvents(busNo),
      delayMinutes:
        liveLocation && typeof liveLocation.tripDelayMinutes === "number"
          ? liveLocation.tripDelayMinutes
          : null
    });

    if (liveLocation && liveLocation.tripId) {
      tripResult.tripId = liveLocation.tripId;
    }

    if (liveLocation && liveLocation.tripLifecycle) {
      tripResult.lifecycle = liveLocation.tripLifecycle;
    }

    if (liveLocation && liveLocation.tripScheduleLabel) {
      tripResult.adherence.label = liveLocation.tripScheduleLabel;
    }

    if (liveLocation && liveLocation.tripOperationalHealth) {
      tripResult.health.label = liveLocation.tripOperationalHealth;
    }

    if (remoteProgress !== null) {
      tripResult.progress.percent = remoteProgress;
      tripResult.progress.nearingCompletion = !!liveLocation.tripNearingCompletion;
    }

    currentTripIntelligence[busNo] = tripResult;

    // Lightweight operational-state consolidation (stable passenger-facing status).
    var opService = getOperationalStateService();
    var opTracker = getPassengerOperationalStateTracker(busNo);
    if (opService && opTracker && typeof opService.consolidateOperationalState === "function") {
      var operational = opService.consolidateOperationalState(
        {
          signalHealth: health,
          trackingStatus: liveLocation && liveLocation.trackingStatus,
          etaConfidence: resultState.etaConfidence || "",
          tripIntelligence: tripResult,
          events: getCombinedOperationalEvents(busNo)
        },
        opTracker
      );

      passengerOperationalStateTrackers[busNo] = operational.tracker;
      resultState.operationalState = operational.operationalState;
      currentBusResultStates[busNo] = resultState;

      if (isDebugEnabled()) {
        obsTrace("operational_state.passenger", {
          bus: busNo,
          label: operational.operationalState.label,
          confidence: operational.operationalState.confidence,
          reasons: operational.operationalState.reasons,
          pending: operational.operationalState.changePending || false
        }, { throttleMs: 2000 });
      }

      // Apply trust-weighting to operational-state confidence when possible.
      (function applyTrustToOpState() {
        var trustService = getTrustFusionService();
        var tracker = getPassengerTrustTracker();
        if (!trustService || !tracker || typeof trustService.computeTrustFusion !== "function") {
          return;
        }

        var trustResult = trustService.computeTrustFusion(
          {
            nowMs: Date.now(),
            busId: busNo,
            signalHealth: health,
            trackingStatus: liveLocation && liveLocation.trackingStatus,
            crowdAggregate: currentCrowdAggregates[busNo] || null,
            learnedData: resultState.learnedDataForTrust || null,
            operationalState: resultState.operationalState
          },
          tracker
        );

        passengerTrustFusionTracker = trustResult.tracker;
        resultState.trust = trustResult.trust;

        if (
          resultState.operationalState &&
          typeof resultState.operationalState.confidence === "number" &&
          trustResult.trust &&
          typeof trustService.applyTrustToConfidence === "function"
        ) {
          resultState.operationalState.confidence = trustService.applyTrustToConfidence(
            resultState.operationalState.confidence,
            trustResult.trust.score
          );
        }

        currentBusResultStates[busNo] = resultState;
      })();
    }

    return tripResult;
  }

  function ensureDetailTripIntelligenceNode() {
    var list = document.querySelector(".bus-detail-side .live-status-list");
    var node = document.getElementById("detailTripIntelligence");

    if (node || !list) {
      return node;
    }

    node = document.createElement("p");
    node.id = "detailTripIntelligence";
    node.className = "trip-intelligence-note";
    node.innerHTML = "<span class='blue-dot'></span> Trip schedule status loading";
    list.insertBefore(node, list.firstChild);
    return node;
  }

  function renderPassengerTripIntelligence(busNo) {
    var trip = currentTripIntelligence[busNo];
    var detailNode = activeDetailBusNo === busNo ? ensureDetailTripIntelligenceNode() : null;
    var resultState = currentBusResultStates[busNo] || {};
    var statusBadge = document.getElementById("detailStatusBadge");
    var statusText = document.getElementById("detailStatus");
    var toneClass;
    var summary;
    var opState = resultState.operationalState || null;
    var passengerLabel = opState && opState.label ? opState.label : (trip && trip.health ? trip.health.label : "Stable Operation");

    if (!trip) {
      return;
    }

    resultState.tripIntelligence = trip;
    resultState.status = passengerLabel;
    resultState.statusText =
      passengerLabel === "Stable Operation"
        ? "ON TIME"
        : passengerLabel === "Scheduled Service"
          ? "SCHEDULED"
          : passengerLabel === "Operational Disruption"
            ? "DISRUPTION"
            : passengerLabel === "No Live Signal"
              ? "NO SIGNAL"
              : "WATCH";
    resultState.statusClass =
      passengerLabel === "Stable Operation" || passengerLabel === "Scheduled Service" ? "ok" : "delay";
    currentBusResultStates[busNo] = resultState;

    toneClass =
      passengerLabel === "Operational Disruption"
        ? "danger"
        : passengerLabel !== "Stable Operation"
          ? "warning"
          : "normal";

    summary =
      trip.lifecycle +
      " - " +
      trip.adherence.label +
      " - " +
      trip.progress.percent +
      "% complete";

    if (detailNode) {
      detailNode.classList.remove("normal", "warning", "danger");
      detailNode.classList.add(toneClass);
      detailNode.innerHTML =
        "<span class='" +
        (toneClass === "danger" ? "red-dot" : toneClass === "warning" ? "orange-dot" : "blue-dot") +
        "'></span> " +
        escapeHtml(summary);
    }

    if (activeDetailBusNo === busNo && statusText) {
      statusText.innerText = passengerLabel;
    }

    if (activeDetailBusNo === busNo && statusBadge) {
      statusBadge.innerText = resultState.statusText;
      statusBadge.className = "tag " + resultState.statusClass;
    }
  }

  function updatePassengerMapsFromLiveLocation(busNo, liveLocation) {
    var status = getOperationalStatus(liveLocation);
    var health = liveLocation
      ? getFreshSignalHealth(liveLocation)
      : getSignalHealthFallback(status);
    var eta;
    var nextPoint;

    if (health.state !== status) {
      health = {
        state: status,
        label: getOperationalStatusLabel(status),
        freshnessText: health.freshnessText
      };
    }

    updateLiveIndicator(busNo, health);
    eta = updateRealtimeEta(busNo, liveLocation, health);
    updateStopAwareDetail(busNo, liveLocation, health);
    detectPassengerOperationalEvents(busNo, liveLocation, health);
    renderPassengerOperationalEvents(busNo);
    computePassengerTripIntelligence(busNo, liveLocation, health);
    renderPassengerTripIntelligence(busNo);

    if (status !== "live" && status !== "delayed") {
      return;
    }

    nextPoint = [liveLocation.latitude, liveLocation.longitude];

    if (busMarker) {
      animateMarker("preview", busMarker, nextPoint);
      busMarker.bindPopup(
        "Bus " +
          busNo +
          "<br>Live driver location<br>Status: " +
          getOperationalStatusLabel(status) +
          "<br>" +
          health.freshnessText +
          "<br>" +
          (eta && eta.available ? eta.label : "ETA pending")
      );
    }

    if (detailBusMarker && activeDetailBusNo === busNo) {
      animateMarker("detail", detailBusMarker, nextPoint);
      detailBusMarker.bindPopup(
        "Bus " +
          busNo +
          "<br>Live driver location<br>Status: " +
          getOperationalStatusLabel(status) +
          "<br>" +
          health.freshnessText +
          "<br>" +
          (eta && eta.available ? eta.label : "ETA pending")
      );
    }
  }

  function stopPassengerLiveSubscription() {
    if (typeof activePassengerLiveUnsubscribe === "function") {
      activePassengerLiveUnsubscribe();
    }

    if (typeof activePassengerOperationalEventsUnsubscribe === "function") {
      activePassengerOperationalEventsUnsubscribe();
    }

    if (passengerLiveRefreshId) {
      window.clearInterval(passengerLiveRefreshId);
    }

    activePassengerLiveUnsubscribe = null;
    activePassengerOperationalEventsUnsubscribe = null;
    activePassengerLiveBusId = "";
    activePassengerLiveLocation = null;
    passengerLiveRefreshId = null;
  }

  function startActivePassengerOperationalEventsSubscription(busNo) {
    var liveBusService = getLiveBusService();
    var realtimeBusId = getRealtimeBusId(busNo);

    if (!busNo || !liveBusService || typeof liveBusService.subscribeToOperationalEvents !== "function") {
      if (!liveBusService) {
        window.addEventListener(
          "busTrackFirebaseReady",
          function () {
            startActivePassengerOperationalEventsSubscription(busNo);
          },
          { once: true }
        );
      }
      return;
    }

    liveBusService
      .subscribeToOperationalEvents(
        realtimeBusId,
        function (events) {
          currentRemoteOperationalEvents[busNo] = events || null;
          renderPassengerOperationalEvents(busNo);
        },
        function () {}
      )
      .then(function (unsubscribe) {
        activePassengerOperationalEventsUnsubscribe = unsubscribe;
      })
      .catch(function () {});
  }

  function refreshPassengerLiveHealth() {
    if (activePassengerLiveBusId && activePassengerLiveLocation) {
      updatePassengerMapsFromLiveLocation(
        activePassengerLiveBusId,
        activePassengerLiveLocation
      );
    }
  }

  function startPassengerLiveSubscription(busNo) {
    var trackingService = getPassengerTrackingService();
    var realtimeBusId = getRealtimeBusId(busNo);

    if (!busNo) {
      return;
    }

    if (activePassengerLiveBusId === busNo && activePassengerLiveUnsubscribe) {
      return;
    }

    stopPassengerLiveSubscription();
    activePassengerLiveBusId = busNo;
    startActivePassengerOperationalEventsSubscription(busNo);

    if (!trackingService) {
      window.addEventListener(
        "busTrackPassengerTrackingReady",
        function () {
          startPassengerLiveSubscription(busNo);
        },
        { once: true }
      );
      updateLiveIndicator(busNo, "offline");
      updateRealtimeEta(busNo, null, getSignalHealthFallback("offline"));
      return;
    }

    updateLiveIndicator(busNo, "offline");
    updateRealtimeEta(busNo, null, getSignalHealthFallback("offline"));

    trackingService
      .subscribeToBusLocation(realtimeBusId, {
        onLocation: function (liveLocation) {
          activePassengerLiveLocation = liveLocation;
          updatePassengerMapsFromLiveLocation(busNo, liveLocation);
        },
        onError: function () {
          updateLiveIndicator(busNo, "offline");
          updateRealtimeEta(busNo, null, getSignalHealthFallback("offline"));
        }
      })
      .then(function (unsubscribe) {
        activePassengerLiveUnsubscribe = unsubscribe;
        passengerLiveRefreshId = window.setInterval(refreshPassengerLiveHealth, 5000);
      })
      .catch(function () {
        updateLiveIndicator(busNo, "offline");
        updateRealtimeEta(busNo, null, getSignalHealthFallback("offline"));
      });
  }

  function stopSearchResultRealtimeSubscriptions() {
    Object.keys(searchResultRealtimeSubscriptions).forEach(function (key) {
      var subscriptionGroup = searchResultRealtimeSubscriptions[key] || {};
      var unsubscribes = Array.isArray(subscriptionGroup)
        ? subscriptionGroup
        : subscriptionGroup.unsubscribes || [];

      unsubscribes.forEach(function (unsubscribe) {
        if (typeof unsubscribe === "function") {
          unsubscribe();
        }
      });
    });

    Object.keys(searchResultRefreshTimers).forEach(function (key) {
      window.clearInterval(searchResultRefreshTimers[key]);
    });

    searchResultRealtimeSubscriptions = {};
    searchResultRefreshTimers = {};
  }

  function getVisibleSearchResultBusIds() {
    return Array.prototype.slice
      .call(resultsBox.querySelectorAll(".bus-card[data-bus-route]"))
      .map(function (card, index) {
        var busNo = card.getAttribute("data-bus-route");

        if (searchResultOriginalOrder[busNo] === undefined) {
          searchResultOriginalOrder[busNo] = Number(card.getAttribute("data-result-order")) || index;
        }

        return busNo;
      });
  }

  function getSearchHealthRank(state) {
    var rank = {
      live: 0,
      delayed: 1,
      paused: 2,
      offline: 3
    };

    return rank[state && state.signalState] === undefined
      ? rank.offline
      : rank[state.signalState];
  }

  function getSearchEtaRank(state) {
    return typeof (state && state.eta) === "number" ? state.eta : 999;
  }

  function isSearchResultActive(busNo) {
    var state = currentBusResultStates[busNo] || {};
    var signalState = state.signalState || "offline";

    return !!state.activeDriverSession && (signalState === "live" || signalState === "delayed");
  }

  function reorderSearchResults() {
    var cards = Array.prototype.slice.call(resultsBox.querySelectorAll(".bus-card[data-bus-route]"));

    if (!cards.length || resultsBox.querySelector(".bus-line")) {
      return;
    }

    cards.sort(function (a, b) {
      var busA = a.getAttribute("data-bus-route");
      var busB = b.getAttribute("data-bus-route");
      var stateA = currentBusResultStates[busA] || {};
      var stateB = currentBusResultStates[busB] || {};
      var activeRankA = isSearchResultActive(busA) ? 0 : 1;
      var activeRankB = isSearchResultActive(busB) ? 0 : 1;
      var healthRankA = getSearchHealthRank(stateA);
      var healthRankB = getSearchHealthRank(stateB);
      var etaRankA = getSearchEtaRank(stateA);
      var etaRankB = getSearchEtaRank(stateB);
      var originalA = searchResultOriginalOrder[busA] || 0;
      var originalB = searchResultOriginalOrder[busB] || 0;

      if (activeRankA !== activeRankB) {
        return activeRankA - activeRankB;
      }

      if (healthRankA !== healthRankB) {
        return healthRankA - healthRankB;
      }

      if (etaRankA !== etaRankB) {
        return etaRankA - etaRankB;
      }

      return originalA - originalB;
    });

    cards.forEach(function (card) {
      resultsBox.appendChild(card);
    });
  }

  function updateSearchResultActiveSession(busNo, session) {
    var resultState = currentBusResultStates[busNo] || {};
    var healthService = window.BusTrackSignalHealth;
    var health = healthService && typeof healthService.getSignalHealth === "function"
      ? healthService.getSignalHealth(
          session && (session.last_heartbeat || session.session_started_at),
          session && session.tracking_status
        )
      : getSignalHealthFallback("offline");

    resultState.activeDriverSession =
      !!session &&
      !!session.session_active &&
      (health.state === "live" || health.state === "delayed" || health.state === "paused");
    currentBusResultStates[busNo] = resultState;

    Array.prototype.slice
      .call(document.querySelectorAll(".bus-card[data-bus-route='" + busNo + "']"))
      .forEach(function (card) {
        card.classList.toggle("is-active-live", isSearchResultActive(busNo));
      });

    reorderSearchResults();
  }

  function applySubscribedEta(busNo, etaValue) {
    var resultState = currentBusResultStates[busNo] || {};
    var cardEta = document.querySelector(
      ".bus-card[data-bus-route='" + busNo + "'] .bus-card-eta-value"
    );
    var etaText = "";
    var minutes = null;

    // Do not let stale/ambient RTDB ETA overwrite schedule-backed fallback.
    // Realtime ETAs only make sense when an active driver session is present.
    if (!resultState.activeDriverSession) {
      return;
    }

    if (!etaValue) {
      return;
    }

    if (typeof etaValue === "number") {
      minutes = etaValue;
      etaText = etaValue + " min";
    } else if (typeof etaValue === "object") {
      minutes =
        typeof etaValue.minutes === "number"
          ? etaValue.minutes
          : typeof etaValue.eta_minutes === "number"
            ? etaValue.eta_minutes
            : null;
      etaText = etaValue.label || etaValue.etaText || etaValue.eta_text || "";

      if (!etaText && minutes !== null) {
        etaText = minutes + " min";
      }
    }

    if (!etaText) {
      return;
    }

    resultState.eta = minutes !== null ? minutes : resultState.eta;
    resultState.etaText = etaText;
    currentBusResultStates[busNo] = resultState;

    if (cardEta) {
      cardEta.innerText = etaText;
    }

    reorderSearchResults();
  }

  function refreshSearchResultHealth(busNo, liveLocation) {
    if (!liveLocation) {
      updateLiveIndicator(busNo, "offline");
      updateRealtimeEta(busNo, null, getSignalHealthFallback("offline"));
      return;
    }

    updatePassengerMapsFromLiveLocation(busNo, liveLocation);
  }

  function startSearchResultRealtimeSubscriptions() {
    var busIds = getVisibleSearchResultBusIds();
    var trackingService = getPassengerTrackingService();
    var journeyService = getPassengerJourneyService();
    var liveBusService = getLiveBusService();

    if (!busIds.length) {
      return;
    }

    if (!trackingService) {
      window.addEventListener(
        "busTrackPassengerTrackingReady",
        startSearchResultRealtimeSubscriptions,
        { once: true }
      );
    }

    if (!journeyService) {
      window.addEventListener(
        "busTrackPassengerJourneyReady",
        startSearchResultRealtimeSubscriptions,
        { once: true }
      );
    }

    if (!liveBusService) {
      window.addEventListener(
        "busTrackFirebaseReady",
        startSearchResultRealtimeSubscriptions,
        { once: true }
      );
    }

    busIds.forEach(function (busNo) {
      var subscriptionState = searchResultRealtimeSubscriptions[busNo] || {
        unsubscribes: [],
        tracking: false,
        crowd: false,
        activeSession: false,
        eta: false,
        operationalEvents: false
      };
      var lastLiveLocation = null;
      var realtimeBusId = getRealtimeBusId(busNo);

      searchResultRealtimeSubscriptions[busNo] = subscriptionState;
      updateLiveIndicator(busNo, "offline");
      updateRealtimeEta(busNo, null, getSignalHealthFallback("offline"));
      renderCrowdAggregate(busNo, currentCrowdAggregates[busNo]);

      if (trackingService && !subscriptionState.tracking) {
        subscriptionState.tracking = true;
        trackingService
          .subscribeToBusLocation(realtimeBusId, {
            onLocation: function (liveLocation) {
              lastLiveLocation = liveLocation;
              refreshSearchResultHealth(busNo, liveLocation);
            },
            onError: function () {
              lastLiveLocation = null;
              refreshSearchResultHealth(busNo, null);
            }
          })
          .then(function (unsubscribe) {
            subscriptionState.unsubscribes.push(unsubscribe);
          })
          .catch(function () {
            subscriptionState.tracking = false;
            refreshSearchResultHealth(busNo, null);
          });

        if (!searchResultRefreshTimers[busNo]) {
          searchResultRefreshTimers[busNo] = window.setInterval(function () {
            refreshSearchResultHealth(busNo, lastLiveLocation);
          }, 5000);
        }
      }

      if (
        journeyService &&
        typeof journeyService.subscribeToJourneyUpdates === "function" &&
        !subscriptionState.crowd
      ) {
        subscriptionState.crowd = true;
        journeyService
          .subscribeToJourneyUpdates(
            realtimeBusId,
            function (updates) {
              if (typeof journeyService.aggregateCrowdUpdates === "function") {
                var trustService = getTrustFusionService();
                var tracker = getPassengerTrustTracker();
                if (trustService && tracker && typeof trustService.updateCrowdConsistency === "function") {
                  var updated = trustService.updateCrowdConsistency(tracker, realtimeBusId, updates, { nowMs: Date.now() });
                  passengerTrustFusionTracker = updated.tracker;
                }
                renderCrowdAggregate(busNo, journeyService.aggregateCrowdUpdates(updates));
              }
            },
            function () {}
          )
          .then(function (unsubscribe) {
            subscriptionState.unsubscribes.push(unsubscribe);
          })
          .catch(function () {
            subscriptionState.crowd = false;
            renderCrowdAggregate(busNo, null);
          });
      }

      if (
        liveBusService &&
        typeof liveBusService.subscribeToActiveDriverSession === "function" &&
        !subscriptionState.activeSession
      ) {
        subscriptionState.activeSession = true;
        liveBusService
          .subscribeToActiveDriverSession(
            realtimeBusId,
            function (session) {
              updateSearchResultActiveSession(busNo, session);
            },
            function () {}
          )
          .then(function (unsubscribe) {
            subscriptionState.unsubscribes.push(unsubscribe);
          })
          .catch(function () {
            subscriptionState.activeSession = false;
            updateSearchResultActiveSession(busNo, null);
          });
      }

      if (
        liveBusService &&
        typeof liveBusService.subscribeToBusEta === "function" &&
        !subscriptionState.eta
      ) {
        subscriptionState.eta = true;
        liveBusService
          .subscribeToBusEta(
            realtimeBusId,
            currentLiveTrips[busNo] && currentLiveTrips[busNo].targetStop
              ? currentLiveTrips[busNo].targetStop
              : "destination",
            function (etaValue) {
              applySubscribedEta(busNo, etaValue);
            },
            function () {}
          )
          .then(function (unsubscribe) {
            subscriptionState.unsubscribes.push(unsubscribe);
          })
          .catch(function () {
            subscriptionState.eta = false;
          });
      }

      if (
        liveBusService &&
        typeof liveBusService.subscribeToOperationalEvents === "function" &&
        !subscriptionState.operationalEvents
      ) {
        subscriptionState.operationalEvents = true;
        liveBusService
          .subscribeToOperationalEvents(
            realtimeBusId,
            function (events) {
              currentRemoteOperationalEvents[busNo] = events || null;
              renderPassengerOperationalEvents(busNo);
            },
            function () {}
          )
          .then(function (unsubscribe) {
            subscriptionState.unsubscribes.push(unsubscribe);
          })
          .catch(function () {
            subscriptionState.operationalEvents = false;
          });
      }
    });
  }

  function formatDistance(distanceKm) {
    if (distanceKm < 1) {
      return Math.round(distanceKm * 1000) + " m";
    }

    return distanceKm.toFixed(1) + " km";
  }

  function getEtaMarkup(snapshot) {
    return (
      "<div class='bus-line'><b>ETA:</b> " +
      snapshot.etaMinutes +
      " min to your pickup point: " +
      escapeHtml(snapshot.targetStop) +
      "</div>" +
      "<div class='bus-line'><b>Live now:</b> " +
      escapeHtml(snapshot.currentStatus) +
      " (" +
      formatDistance(snapshot.remainingDistanceKm) +
      " away)</div>"
    );
  }

  function getCrowdContributorText(count) {
    var contributors = Number(count) || 0;

    if (!contributors) {
      return "Waiting for live passenger contributors";
    }

    return contributors + " live " + (contributors === 1 ? "contributor" : "contributors");
  }

  function getBusCardMeta(busNo, index) {
    return {
      occupancy: { label: "No crowd reports yet", className: "medium" },
      statusText: "SCHEDULED",
      statusClass: "ok",
      hasDelay: false
    };
  }

  function buildBusResultCard(busKey, title, routeText, snapshot, index) {
    var meta = getBusCardMeta(busKey, index);
    var etaText = snapshot && snapshot.etaText ? snapshot.etaText : "Scheduled ETA";
    var distanceText =
      snapshot && typeof snapshot.remainingDistanceKm === "number"
        ? formatDistance(snapshot.remainingDistanceKm)
        : "Route distance unavailable";
    var displayStatus = "Scheduled Service";

    currentBusResultStates[busKey] = {
      eta: etaText,
      etaText: etaText,
      etaSource: "scheduled",
      etaMode: "Scheduled ETA",
      distance: distanceText,
      occupancy: "No crowd reports yet",
      occupancyClass: "medium",
      crowdContributors: 0,
      signalState: "offline",
      activeDriverSession: false,
      status: displayStatus,
      statusText: meta.statusText,
      statusClass: meta.statusClass,
      hasDelay: meta.hasDelay,
      incidentDelay: meta.hasDelay,
      routeText: routeText
    };

    return (
      "<div class='bus-card" +
      (meta.hasDelay ? " has-delay" : "") +
      "' data-bus-route='" +
      escapeHtml(busKey) +
      "' data-result-order='" +
      index +
      "'>" +
      "<div class='bus-card-left'><div class='bus-card-icon'><i data-lucide='bus-front'></i></div></div>" +
      "<div class='bus-card-center'>" +
      "<div class='bus-card-title-row'><h3>" +
      escapeHtml(title || busKey) +
      "</h3><span class='tag " +
      meta.statusClass +
      "'>" +
      escapeHtml(meta.statusText) +
      "</span><span class='bus-live offline'><span></span><b>SCHEDULED</b><small>Scheduled ETA until driver signal starts</small></span></div>" +
      "<p class='bus-card-route'>" +
      escapeHtml(routeText) +
      "</p>" +
      "<p class='bus-occupancy " +
      "medium" +
      "'>" +
      "No crowd reports yet" +
      "</p>" +
      "<p class='bus-crowd-contributors'>" +
      getCrowdContributorText(0) +
      "</p>" +
      (meta.hasDelay
        ? "<button class='bus-delay-note js-incident-delay' type='button'>? Delay expected due to incident</button>"
        : "") +
      "</div>" +
      "<div class='bus-card-right'><p><i data-lucide='clock-3'></i> ETA</p><strong class='bus-card-eta-value'>" +
      escapeHtml(etaText) +
      "</strong></div>" +
      "</div>"
    );
  }

  function buildDirectResultsHtml(buses, fromStop, destination) {
    var html =
      "<h2 class='card-title'>Results</h2>" +
      "<p class='card-sub'>From <b>" +
      escapeHtml(fromStop) +
      "</b> to destination: <b>" +
      escapeHtml(destination) +
      "</b></p>" +
      "<p class='hint'>Live operational sessions appear first as driver signal updates.</p>";
    var i;
    var bus;
    var targetMatch;
    var snapshot;
    var viaText;

    for (i = 0; i < buses.length; i++) {
      bus = buses[i];
      targetMatch = getBoardingTargetForBus(bus, fromStop);
      snapshot = buildLiveSnapshot(bus, targetMatch);

      registerLiveSnapshot(snapshot);

      var scheduleLabel = "";
      var stopId = bus.stopIds && bus.stopIds[targetMatch.stopIndex];
      if (stopId && bus.schedule && bus.schedule[stopId]) {
        scheduleLabel = " • " + formatScheduleTimeForDisplay(bus.schedule[stopId]);
      }

      html += buildBusResultCard(
        bus.busKey || bus.busNo,
        (bus.busNo || "") + scheduleLabel,
        bus.city + " ? " + bus.to,
        snapshot,
        i
      );
    }

    return html;
  }

  function buildConnectingRouteHtml(connection, destination, fromStop) {
    var firstTarget = getBoardingTargetForBus(connection.firstBus, fromStop);
    var secondTarget = getTargetMatch(
      connection.secondBus,
      normalizeText(destination)
    );
    var firstSnapshot = buildLiveSnapshot(connection.firstBus, firstTarget);
    var secondSnapshot = buildLiveSnapshot(connection.secondBus, secondTarget);
    var secondViaText = connection.secondBus.via.length
      ? connection.secondBus.via.join(", ")
      : "Direct route";

    registerLiveSnapshot(firstSnapshot);
    registerLiveSnapshot(secondSnapshot);

    return (
      "<h2 class='card-title'>Results</h2>" +
      "<p class='card-sub'>No direct bus is active on that exact route. Suggested two-step route for <b>" +
      escapeHtml(destination) +
      "</b>:</p>" +
      "<p class='hint'>Realtime ETA and crowd status will sync when driver signal is available.</p>" +
      buildBusResultCard(
        connection.firstBus.busKey || connection.firstBus.busNo,
        connection.firstBus.busNo,
        connection.firstBus.city + " ? " + connection.firstBus.to,
        firstSnapshot,
        0
      ) +
      "<div class='bus-line'><b>Transfer at:</b> " +
      escapeHtml(connection.firstBus.to) +
      "</div>" +
      buildBusResultCard(
        connection.secondBus.busKey || connection.secondBus.busNo,
        connection.secondBus.busNo,
        connection.secondBus.city + " ? " + connection.secondBus.to,
        secondSnapshot,
        1
      )
    );
  }

  function buildNoResultHtml(fromStop, destination) {
    return (
      "<h2 class='card-title'>Results</h2>" +
      "<p class='card-sub'>No launch-ready route match found from <b>" +
      escapeHtml(fromStop) +
      "</b> to <b>" +
      escapeHtml(destination) +
      "</b>.</p>" +
      "<p class='hint'>Try another city, a nearby stop, or a broader landmark name. Realtime buses appear once an operational session is active.</p>"
    );
  }

  function setDirectBusStatus(message, isError) {
    if (!directBusStatus) {
      return;
    }

    directBusStatus.innerText = message || "";
    directBusStatus.classList.toggle("error", !!isError);
  }

  function renderDirectBusSuggestions(value) {
    var normalized = String(value || "").trim().toUpperCase();
    var matches = directLiveBuses.filter(function (bus) {
      return !normalized || bus.busNo.indexOf(normalized) !== -1;
    });

    if (!directBusSuggestions) {
      return;
    }

    if (!normalized || !matches.length) {
      directBusSuggestions.innerHTML = "";
      return;
    }

    directBusSuggestions.innerHTML = matches
      .map(function (bus) {
        return (
          "<button type='button' data-direct-bus='" +
          escapeHtml(bus.busNo) +
          "'><strong>" +
          escapeHtml(bus.busNo) +
          "</strong><span>" +
          escapeHtml(bus.routeName) +
          "</span></button>"
        );
      })
      .join("");
  }

  function openDirectLiveBus(busNo) {
    var operationalMatch = findOperationalTripForBus(busNo);
    var bus = operationalMatch && operationalMatch.bus ? operationalMatch.bus : null;
    var targetStopIndex = operationalMatch ? operationalMatch.firstUpcomingStopIndex : -1;
    var targetMatch;
    var snapshot;

    if (!bus) {
      setDirectBusStatus("No active service found for that bus number.", true);
      return;
    }

    if (targetStopIndex < 0) {
      setDirectBusStatus("No active service found for that bus number.", true);
      return;
    }

    targetMatch = {
      label: getBusStops(bus)[targetStopIndex],
      stopIndex: targetStopIndex
    };
    snapshot = buildLiveSnapshot(bus, targetMatch);
    registerLiveSnapshot(snapshot);
    currentBusResultStates[snapshot.busNo] = {
      eta: snapshot.etaText,
      etaText: snapshot.etaText,
      etaSource: "scheduled",
      etaMode: "Scheduled ETA",
      distance: typeof snapshot.remainingDistanceKm === "number"
        ? formatDistance(snapshot.remainingDistanceKm)
        : "Route distance unavailable",
      occupancy: "No crowd reports yet",
      occupancyClass: "medium",
      crowdContributors: 0,
      status: "Scheduled Service",
      statusText: "SCHEDULED",
      statusClass: "ok",
      hasDelay: false,
      incidentDelay: false,
      routeText: bus.city + " ? " + bus.to,
      scheduleTimesByStopKey: getScheduleTimesByStopKeyForBus(bus)
    };

    setDirectBusStatus("Opening scheduled operational trip for " + bus.busNo + ".", false);
    openBusDetail(snapshot.busNo);
  }

  function showRouteForBus(busNo) {
    var snapshot = currentLiveTrips[busNo];
    var routePoints;

    if (!snapshot) {
      alert("Live route preview is not available for this search result.");
      return;
    }

    routePoints = snapshot.routePoints;
    mapSection.style.display = "block";

    setTimeout(function () {
      if (!map) {
        map = L.map("map").setView(snapshot.currentPoint || snapshot.targetPoint || routePoints[0], 10);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap"
        }).addTo(map);
      } else {
        map.invalidateSize();
      }

      if (routeLine) {
        map.removeLayer(routeLine);
      }

      if (busMarker) {
        map.removeLayer(busMarker);
      }

      if (destMarker) {
        map.removeLayer(destMarker);
      }

      stopMarkers.forEach(function (marker) {
        map.removeLayer(marker);
      });
      stopMarkers = [];

      routeLine = L.polyline(routePoints, {
        color: "#1177d9",
        weight: 5
      }).addTo(map);

      if (snapshot.currentPoint) {
        busMarker = L.marker(snapshot.currentPoint)
          .addTo(map)
          .bindPopup(
            "Bus " +
              busNo +
              "<br>Now " +
              snapshot.currentStatus
          )
          .openPopup();
      }

      destMarker = L.marker(snapshot.targetPoint)
        .addTo(map)
        .bindPopup("Scheduled stop: " + snapshot.targetStop);

      stopMarkers = renderRouteStopMarkers(map, busNo);

      map.fitBounds(L.latLngBounds(routePoints).pad(0.18));

      startPassengerLiveSubscription(busNo);
    }, 100);

    if (
      window.busTrackEmergencyAlert &&
      typeof window.busTrackEmergencyAlert.maybeShowRouteAlert === "function"
    ) {
      window.busTrackEmergencyAlert.maybeShowRouteAlert(busNo);
    }
  }

  function clearDetailMapLayers() {
    if (!detailMap) {
      return;
    }

    detailMapLayers.forEach(function (layer) {
      detailMap.removeLayer(layer);
    });
    detailMapLayers = [];
    detailBusMarker = null;
  }

  function renderDetailLiveMap(busNo) {
    var snapshot = currentLiveTrips[busNo];
    var routePoints = snapshot ? snapshot.routePoints : busRoutes[busNo];
    var currentPoint;
    var targetPoint;
    var mapEl = document.getElementById("detailLiveMap");

    if (!mapEl || !window.L || !routePoints || !routePoints.length) {
      return;
    }

    currentPoint = snapshot ? snapshot.currentPoint : null;
    targetPoint = snapshot ? snapshot.targetPoint : routePoints[routePoints.length - 1];

    setTimeout(function () {
      if (!detailMap) {
        detailMap = L.map("detailLiveMap").setView(currentPoint || targetPoint || routePoints[0], 10);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap"
        }).addTo(detailMap);
      } else {
        detailMap.invalidateSize();
      }

      clearDetailMapLayers();

      detailMapLayers.push(
        L.polyline(routePoints, {
          color: "#1177d9",
          weight: 5
        }).addTo(detailMap)
      );

      if (currentPoint) {
        detailBusMarker = L.marker(currentPoint)
          .addTo(detailMap)
          .bindPopup("Bus " + busNo);

        detailMapLayers.push(detailBusMarker);
      }

      if (targetPoint) {
        detailMapLayers.push(
          L.marker(targetPoint)
            .addTo(detailMap)
            .bindPopup("Scheduled stop")
        );
      }

      renderRouteStopMarkers(detailMap, busNo).forEach(function (marker) {
        detailMapLayers.push(marker);
      });

      detailMap.fitBounds(L.latLngBounds(routePoints).pad(0.18));
      detailMap.invalidateSize();
    }, 120);
  }

  function getScheduleTimesByStopKeyForBus(bus) {
    var map = {};
    var stopsList;
    var i;
    var stopId;

    if (!bus || !bus.schedule) {
      return map;
    }

    stopsList = [bus.city].concat(bus.via || [], [bus.to]);
    for (i = 0; i < stopsList.length; i++) {
      stopId = bus.stopIds && bus.stopIds[i];
      if (stopId && bus.schedule[stopId]) {
        map[normalizeTextValue(stopsList[i])] = bus.schedule[stopId];
      }
    }

    return map;
  }

  function getBusDetailData(busNo) {
    var bus = findBusDataByKey(busNo);
    var snapshot = currentLiveTrips[busNo];
    var resultState = currentBusResultStates[busNo] || {};
    var stopsList;
    var scheduleTimesByStopKey;

    if (!bus) {
      var directBus = findDirectLiveBus(busNo);

      if (directBus) {
        bus = {
          busNo: directBus.busNo,
          state: "Operations",
          city: directBus.from,
          to: directBus.to,
          via: directBus.stops.slice(1, -1)
        };
      } else {
        bus = {
          busNo: busNo || "Unknown bus",
          state: "GSRTC Pilot",
          city: "No active service",
          to: "No scheduled trip",
          via: []
        };
      }
    }

    stopsList = [bus.city].concat(bus.via || [], [bus.to]);
    scheduleTimesByStopKey =
      resultState.scheduleTimesByStopKey ||
      getScheduleTimesByStopKeyForBus(bus);

    return {
      id: getBusSearchKey(bus) || bus.busNo,
      number: bus.displayBusNo || bus.physicalBusNo || bus.busNo,
      from: bus.city,
      to: bus.to,
      state: bus.state || "GSRTC Pilot",
      eta: resultState.eta || (snapshot && snapshot.etaMinutes ? snapshot.etaMinutes : "No active service"),
      etaText: resultState.etaText || "",
      distance: resultState.distance || (snapshot && typeof snapshot.remainingDistanceKm === "number" ? formatDistance(snapshot.remainingDistanceKm) : "No active service"),
      occupancy: resultState.occupancy || "No crowd reports yet",
      occupancyClass: resultState.occupancyClass || "medium",
      crowdContributors: resultState.crowdContributors || 0,
      status: resultState.status || "No active service",
      statusText: resultState.statusText || "NO_SERVICE",
      statusClass: resultState.statusClass || "delay",
      hasDelay: !!resultState.hasDelay,
      incidentDelay: !!resultState.incidentDelay,
      stops: stopsList,
      scheduleTimesByStopKey: scheduleTimesByStopKey
    };
  }

  function renderBusDetail(busNo) {
    var bus = getBusDetailData(busNo);
    var detailBusNumber = document.getElementById("detailBusNumber");
    var detailBusRoute = document.getElementById("detailBusRoute");
    var detailStatusBadge = document.getElementById("detailStatusBadge");
    var detailEta = document.getElementById("detailEta");
    var detailDistance = document.getElementById("detailDistance");
    var detailOccupancy = document.getElementById("detailOccupancy");
    var detailCrowdContributors = document.getElementById("detailCrowdContributors");
    var detailStatus = document.getElementById("detailStatus");
    var detailEtaInline = document.getElementById("detailEtaInline");
    var detailStopCount = document.getElementById("detailStopCount");
    var detailRouteSummary = document.getElementById("detailRouteSummary");
    var detailStopsList = document.getElementById("detailStopsList");
    var detailInfoNumber = document.getElementById("detailInfoNumber");
    var detailInfoFrom = document.getElementById("detailInfoFrom");
    var detailInfoTo = document.getElementById("detailInfoTo");
    var detailInfoState = document.getElementById("detailInfoState");
    var detailDelayNote = document.getElementById("detailDelayNote");
    var routeText = bus.from + " ? " + bus.to;

    if (!detailBusNumber || !detailStopsList) {
      return;
    }

    detailBusNumber.innerText = bus.number;
    detailBusRoute.innerText = routeText;
    detailStatusBadge.innerText = bus.statusText || bus.status.toUpperCase();
    detailStatusBadge.className = "tag " + (bus.statusClass || "ok");
    detailEta.innerText = formatStoredEta(bus.etaText || bus.eta, false);
    detailDistance.innerText = formatStoredDistance(bus.distance);
    detailOccupancy.innerText = bus.occupancy;
    if (detailCrowdContributors) {
      detailCrowdContributors.innerText = getCrowdContributorText(bus.crowdContributors);
    }
    detailStatus.innerText = bus.status;
    detailEtaInline.innerText = formatStoredEta(bus.etaText || bus.eta, true);
    detailStopCount.innerText = bus.stops.length + " stops";
    detailRouteSummary.innerText = bus.stops.join(" → ");
    detailInfoNumber.innerText = bus.number;
    detailInfoFrom.innerText = bus.from;
    detailInfoTo.innerText = bus.to;
    detailInfoState.innerText = bus.state;

    if (detailDelayNote) {
      detailDelayNote.hidden = !bus.incidentDelay;
    }

    renderDetailStops(busNo, bus.stops, bus.scheduleTimesByStopKey);
  }

  function getPassengerJourneyService() {
    return window.BusTrackPassengerJourney || null;
  }

  function persistActivePassengerJourney(journey) {
    var journeyService = getPassengerJourneyService();

    if (journeyService && typeof journeyService.saveActiveJourney === "function") {
      return journeyService.saveActiveJourney(journey);
    }

    return journey;
  }

  function clearPersistedPassengerJourney() {
    var journeyService = getPassengerJourneyService();

    if (journeyService && typeof journeyService.clearActiveJourney === "function") {
      journeyService.clearActiveJourney();
    }
  }

  function restorePersistedPassengerJourney() {
    var journeyService = getPassengerJourneyService();
    var savedJourney;

    if (!journeyService) {
      window.addEventListener(
        "busTrackPassengerJourneyReady",
        restorePersistedPassengerJourney,
        { once: true }
      );
      return;
    }

    if (typeof journeyService.readActiveJourney !== "function") {
      return;
    }

    savedJourney = journeyService.readActiveJourney();

    if (!savedJourney || !savedJourney.sessionActive || !savedJourney.busId) {
      return;
    }

    openBusDetail(savedJourney.busId);
    activePassengerJourney = savedJourney;
    setJourneyTracking(true, activePassengerJourney);
  }

  function getJourneyCrowdClass(crowdLevel) {
    if (crowdLevel === "Not Crowded") {
      return "low";
    }

    if (crowdLevel === "Very Crowded") {
      return "high";
    }

    return "medium";
  }

  function renderCrowdAggregate(busNo, aggregate) {
    var resultState = currentBusResultStates[busNo] || {};
    var detailOccupancy = document.getElementById("detailOccupancy");
    var detailCrowdContributors = document.getElementById("detailCrowdContributors");
    var cardOccupancy = document.querySelector(
      ".bus-card[data-bus-route='" + busNo + "'] .bus-occupancy"
    );
    var cardContributors = document.querySelector(
      ".bus-card[data-bus-route='" + busNo + "'] .bus-crowd-contributors"
    );
    var crowdLabel = aggregate && aggregate.available ? aggregate.label : "No crowd reports yet";
    var contributors = aggregate && aggregate.activeContributors ? aggregate.activeContributors : 0;
    var crowdClass = getJourneyCrowdClass(crowdLabel);

    currentCrowdAggregates[busNo] = aggregate || null;
    resultState.occupancy = crowdLabel;
    resultState.crowdContributors = contributors;
    resultState.occupancyClass = crowdClass;
    currentBusResultStates[busNo] = resultState;

    if (cardOccupancy) {
      cardOccupancy.innerText = crowdLabel;
      cardOccupancy.className = "bus-occupancy " + crowdClass;
    }

    if (cardContributors) {
      cardContributors.innerText = getCrowdContributorText(contributors);
    }

    reorderSearchResults();

    if (activeDetailBusNo !== busNo) {
      return;
    }

    if (detailOccupancy) {
      detailOccupancy.innerText = crowdLabel;
    }

    if (detailCrowdContributors) {
      detailCrowdContributors.innerText = getCrowdContributorText(contributors);
    }
  }

  function stopPassengerJourneySubscription() {
    if (typeof activePassengerJourneyUnsubscribe === "function") {
      activePassengerJourneyUnsubscribe();
    }

    activePassengerJourneyUnsubscribe = null;
  }

  function startPassengerJourneySubscription(busNo) {
    var journeyService = getPassengerJourneyService();

    stopPassengerJourneySubscription();

    if (!busNo) {
      return;
    }

    if (!journeyService) {
      window.addEventListener(
        "busTrackPassengerJourneyReady",
        function () {
          startPassengerJourneySubscription(busNo);
        },
        { once: true }
      );
      return;
    }

    journeyService
      .subscribeToJourneyUpdates(
        busNo,
        function (updates) {
          if (journeyService && typeof journeyService.aggregateCrowdUpdates === "function") {
            renderCrowdAggregate(busNo, journeyService.aggregateCrowdUpdates(updates));
          }
        },
        function () {}
      )
      .then(function (unsubscribe) {
        activePassengerJourneyUnsubscribe = unsubscribe;
      })
      .catch(function () {
        activePassengerJourneyUnsubscribe = null;
      });
  }

  function getJourneyStops(busNo) {
    var bus = getBusDetailData(busNo);
    var stopsList = bus && Array.isArray(bus.stops) ? bus.stops.slice() : [];

    if (stopsList.length > 1) {
      return stopsList.slice(1);
    }

    return stopsList;
  }

  function populateJourneyDestinationOptions(busNo) {
    var select = document.getElementById("journeyDestinationSelect");
    var stopsList = getJourneyStops(busNo);

    if (!select) {
      return;
    }

    select.innerHTML = stopsList
      .map(function (stop) {
        return "<option value='" + escapeHtml(stop) + "'>" + escapeHtml(stop) + "</option>";
      })
      .join("");
  }

  function updateJourneyJoinButton() {
    var select = document.getElementById("journeyDestinationSelect");
    var confirmBtn = document.getElementById("journeyJoinConfirm");
    var hasDestination = !!(select && select.value);

    if (confirmBtn) {
      confirmBtn.disabled = !(hasDestination && selectedJourneyCrowdLevel);
    }
  }

  function setJourneyStatus(message, isError) {
    var status = document.getElementById("journeyJoinStatus");

    if (!status) {
      return;
    }

    status.innerText = message || "";
    status.classList.toggle("error", !!isError);
  }

  function resetJourneyModalState() {
    var crowdButtons = Array.prototype.slice.call(
      document.querySelectorAll("[data-journey-crowd]")
    );
    var confirmBtn = document.getElementById("journeyJoinConfirm");

    selectedJourneyCrowdLevel = "";
    crowdButtons.forEach(function (button) {
      button.classList.remove("selected");
    });
    if (confirmBtn) {
      confirmBtn.innerText = activePassengerJourney ? "Update Crowd" : "Join Journey";
    }
    setJourneyStatus("", false);
    updateJourneyJoinButton();
  }

  function prefillJourneyModalFromActiveSession() {
    var select = document.getElementById("journeyDestinationSelect");
    var crowdButtons = Array.prototype.slice.call(
      document.querySelectorAll("[data-journey-crowd]")
    );

    if (!activePassengerJourney) {
      return;
    }

    if (select && activePassengerJourney.destinationStop) {
      select.value = activePassengerJourney.destinationStop;
    }

    selectedJourneyCrowdLevel = activePassengerJourney.crowdLevel || "";
    crowdButtons.forEach(function (button) {
      button.classList.toggle(
        "selected",
        button.getAttribute("data-journey-crowd") === selectedJourneyCrowdLevel
      );
    });

    updateJourneyJoinButton();
  }

  function openJourneyModal() {
    var modal = document.getElementById("journeyJoinModal");
    var select = document.getElementById("journeyDestinationSelect");

    if (!modal || !activeDetailBusNo) {
      return;
    }

    populateJourneyDestinationOptions(activeDetailBusNo);
    resetJourneyModalState();
    prefillJourneyModalFromActiveSession();
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");

    if (select) {
      select.focus();
    }

    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  function closeJourneyModal() {
    var modal = document.getElementById("journeyJoinModal");

    if (modal) {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
    }
  }

  function setJourneyTracking(active, journey) {
    var actions = document.getElementById("journeyActions");
    var trackingBadge = document.getElementById("detailTrackingBadge");
    var startBtn = document.getElementById("journeyStartBtn");
    var joinedCard = document.getElementById("journeyJoinedCard");
    var joinedDestination = document.getElementById("journeyJoinedDestination");
    var joinedCrowd = document.getElementById("journeyChangeCrowdBtn");

    isTracking = !!active;

    if (actions) {
      actions.classList.toggle("tracking", isTracking);
      actions.classList.toggle("joined", isTracking);
    }

    if (trackingBadge) {
      trackingBadge.classList.toggle("show", isTracking);
    }

    if (startBtn) {
      startBtn.hidden = isTracking;
    }

    if (joinedCard) {
      joinedCard.hidden = !isTracking;
    }

    if (journey && joinedDestination) {
      joinedDestination.innerText = journey.destinationStop;
    }

    if (journey && joinedCrowd) {
      joinedCrowd.innerText = journey.crowdLevel;
      joinedCrowd.className = "journey-crowd-badge " + getJourneyCrowdClass(journey.crowdLevel);
    }

    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  function joinPassengerJourney() {
    var journeyService = getPassengerJourneyService();
    var select = document.getElementById("journeyDestinationSelect");
    var confirmBtn = document.getElementById("journeyJoinConfirm");
    var destinationStop = select ? select.value : "";
    var journey;

    if (!activeDetailBusNo || !destinationStop || !selectedJourneyCrowdLevel) {
      updateJourneyJoinButton();
      return;
    }

    if (!journeyService) {
      setJourneyStatus("Journey service is still loading. Try again in a moment.", true);
      return;
    }

    journey = {
      busId: activeDetailBusNo,
      joinedAt: activePassengerJourney && activePassengerJourney.joinedAt
        ? activePassengerJourney.joinedAt
        : Date.now(),
      destinationStop: destinationStop,
      crowdLevel: selectedJourneyCrowdLevel,
      sessionActive: true
    };

    if (confirmBtn) {
      confirmBtn.disabled = true;
    }

    setJourneyStatus(activePassengerJourney ? "Updating crowd level..." : "Joining journey...", false);

    journeyService
      .joinJourney(activeDetailBusNo, journey)
      .then(function (result) {
        if (!result || !result.ok) {
          setJourneyStatus(
            result && result.reason ? result.reason : "Could not join this journey right now.",
            true
          );
          updateJourneyJoinButton();
          return;
        }

        activePassengerJourney = persistActivePassengerJourney(journey) || journey;
        closeJourneyModal();
        setJourneyTracking(true, activePassengerJourney);
      })
      .catch(function () {
        setJourneyStatus("Could not join this journey right now.", true);
        updateJourneyJoinButton();
      });
  }

  function leavePassengerJourney() {
    var journeyService = getPassengerJourneyService();
    var journey = activePassengerJourney;

    clearPersistedPassengerJourney();

    if (!journey || !journey.busId) {
      activePassengerJourney = null;
      setJourneyTracking(false);
      return;
    }

    activePassengerJourney = null;
    setJourneyTracking(false);

    if (journeyService) {
      journeyService.leaveJourney(journey.busId, journey);
    }
  }

  function openBusDetail(busNo) {
    activeDetailBusNo = busNo;
    activePassengerJourney = null;
    renderBusDetail(busNo);
    setJourneyTracking(false);
    renderDetailLiveMap(busNo);
    startPassengerLiveSubscription(busNo);
    startPassengerJourneySubscription(busNo);
    if (window.busTrackNavigate) {
      window.busTrackNavigate("busDetailPage");
    }
  }

  function setupDirectLiveBusSearch() {
    if (!directLiveBusForm || !directBusSearch) {
      return;
    }

    directLiveBusForm.addEventListener("submit", function (event) {
      event.preventDefault();
      setDirectBusStatus("Checking live operational session...", false);
      openDirectLiveBus(directBusSearch.value);
    });

    directBusSearch.addEventListener("input", function () {
      setDirectBusStatus("", false);
      renderDirectBusSuggestions(directBusSearch.value);
    });

    if (directBusSuggestions) {
      directBusSuggestions.addEventListener("click", function (event) {
        var button = event.target.closest("[data-direct-bus]");

        if (!button) {
          return;
        }

        directBusSearch.value = button.getAttribute("data-direct-bus");
        directBusSuggestions.innerHTML = "";
        setDirectBusStatus("Checking live operational session...", false);
        openDirectLiveBus(directBusSearch.value);
      });
    }

    Array.prototype.slice
      .call(document.querySelectorAll("[data-direct-live-bus]"))
      .forEach(function (button) {
        button.addEventListener("click", function () {
          directBusSearch.value = button.getAttribute("data-direct-live-bus");
          renderDirectBusSuggestions("");
          setDirectBusStatus("Checking live operational session...", false);
          openDirectLiveBus(directBusSearch.value);
        });
      });
  }

  function getSearchCandidates(value) {
    var normalizedValue = normalizeText(value);
    var candidates = [];
    var resolvedStop = resolveStopIdentity(value);
    var cityKey;
    var i;

    if (!value) {
      return candidates;
    }

    candidates.push(value);
    if (resolvedStop) {
      candidates.push(resolvedStop.stop_id);
      candidates.push(resolvedStop.stop_name);
      (resolvedStop.aliases || []).forEach(function (alias) {
        if (candidates.indexOf(alias) === -1) {
          candidates.push(alias);
        }
      });
    }

    for (cityKey in stops) {
      if (!Object.prototype.hasOwnProperty.call(stops, cityKey)) {
        continue;
      }

      if (normalizeText(cityKey) === normalizedValue) {
        for (i = 0; i < stops[cityKey].length; i++) {
          if (candidates.indexOf(stops[cityKey][i]) === -1) {
            candidates.push(stops[cityKey][i]);
          }
        }
      }
    }

    return candidates;
  }

  function routeContainsAnyStop(routeStops, searchCandidates) {
    var i;
    var j;

    for (i = 0; i < routeStops.length; i++) {
      for (j = 0; j < searchCandidates.length; j++) {
        if (stopsMatch(routeStops[i], searchCandidates[j])) {
          return true;
        }
      }
    }

    return false;
  }

  function findBusesPassingThrough(startPoint, destination) {
    var matchingBuses = [];
    var startCandidates = getSearchCandidates(startPoint);
    var destinationCandidates = getSearchCandidates(destination);
    var i;
    var bus;
    var fullRoute;

    for (i = 0; i < busData.length; i++) {
      bus = busData[i];
      fullRoute = [bus.city].concat(bus.via, [bus.to]);

      if (
        routeContainsAnyStop(fullRoute, startCandidates) &&
        routeContainsAnyStop(fullRoute, destinationCandidates)
      ) {
        matchingBuses.push(bus);
      }
    }

    return matchingBuses;
  }

  if (hasBusTrackingUi) {
    stateSelect.onchange = function () {
      populateCities(stateSelect.value);
      populateStops("");
      resetLocationChoice();
      endLocation.value = "";
      resetResults();
      hideMap();
    };

    // City selection is intentionally bypassed (stop-centric UX).
    citySelect.onchange = function () {};

    startStop.onchange = function () {
      if (startStop.value) {
        isLocationSelected = false;
        locationBtn.classList.remove("selected");
        locationStatus.classList.remove("success");
        locationStatus.innerText = "Using selected stop: " + startStop.value;
      } else {
        locationStatus.innerText = "";
        locationStatus.classList.remove("success");
      }
    };

    locationBtn.onclick = function () {
      if (!stateSelect.value) {
        locationStatus.innerText = "Please select your network first.";
        return;
      }

      startStop.value = "";
      // Lightweight location fallback: pick a reasonable "nearby" stop from the schedule dataset.
      var network = getPilotNetwork();
      var firstStop = network && Array.isArray(network.stops) && network.stops[0] ? network.stops[0].stop_name : "";
      setLocationSelected(firstStop || "Current Location");
    };

    findBusBtn.onclick = function () {
      var selectedState = stateSelect.value;
      var fromStop = startStop.value;
      var destination = endLocation.value.trim();
      var normalizedDestination = normalizeText(destination);
      var matchedBuses;
      var directBuses = [];
      var connection;
      var i;
      var nowMinutes = getSelectedSearchMinutes();
      var relaxedSearchMode = false;

      // Allow network → from → to OR directly from → to when only one network exists.
      if (!selectedState && stateSelect.options.length === 2) {
        selectedState = stateSelect.options[1].value;
        stateSelect.value = selectedState;
      }

      if (!selectedState) {
        alert("Please select your network.");
        return;
      }

      if (!destination) {
        alert("Please enter destination location.");
        return;
      }

      if (!fromStop && !isLocationSelected) {
        locationStatus.innerText =
          "Please select a nearby stop or use current location.";
        locationStatus.classList.remove("success");
        return;
      }

      if (!fromStop && isLocationSelected) {
        fromStop = startStop.value;
      }

      locationStatus.innerText = "Checking route and realtime signals...";
      locationStatus.classList.add("success");

      matchedBuses = getBusesServingStop(selectedState, fromStop, nowMinutes);

      if (!matchedBuses.length) {
        searchDebugLog("strict lookup returned no trips; trying relaxed corridor match", {
          from: fromStop,
          destination: destination,
          searchMinutes: nowMinutes
        });
        matchedBuses = findBusesPassingThrough(fromStop, destination).filter(function (bus) {
          return bus.state === selectedState;
        });
        relaxedSearchMode = true;
      }

      if (!matchedBuses.length) {
        setResultsHtml(buildNoResultHtml(fromStop, destination));
        hideMap();
        return;
      }

      currentLiveTrips = {};

      for (i = 0; i < matchedBuses.length; i++) {
        var fromIndex = getStopIndexForBus(matchedBuses[i], fromStop);
        var destMatch = getTargetMatch(matchedBuses[i], normalizedDestination);

        if (fromIndex === -1 || !destMatch) {
          continue;
        }

        // Direction-aware: destination must be after FROM stop.
        if (destMatch.stopIndex <= fromIndex) {
          continue;
        }

        if (!shouldKeepBusForSearchTime(matchedBuses[i], fromIndex, nowMinutes)) {
          searchDebugLog("reject: route match already passed from stop", {
            bus: getBusSearchKey(matchedBuses[i]),
            from: fromStop,
            stopIndex: fromIndex,
            searchMinutes: nowMinutes,
            scheduledMinutes: getTripScheduleMinutes(matchedBuses[i], fromIndex)
          });
          continue;
        }

        directBuses.push(matchedBuses[i]);
      }

      if (!directBuses.length && !relaxedSearchMode) {
        searchDebugLog("no direct trips after strict filtering; trying route-visible fallback", {
          from: fromStop,
          destination: destination
        });
        findBusesPassingThrough(fromStop, destination)
          .filter(function (bus) {
            return bus.state === selectedState;
          })
          .forEach(function (bus) {
            var fromIndex = getStopIndexForBus(bus, fromStop);
            var destMatch = getTargetMatch(bus, normalizedDestination);
            if (
              fromIndex !== -1 &&
              destMatch &&
              destMatch.stopIndex > fromIndex &&
              shouldKeepBusForSearchTime(bus, fromIndex, nowMinutes)
            ) {
              directBuses.push(bus);
            }
          });
      }

      if (directBuses.length) {
        directBuses.sort(function (a, b) {
          var aPriority = getSearchTripPriority(a);
          var bPriority = getSearchTripPriority(b);
          var aIndex = getStopIndexForBus(a, fromStop);
          var bIndex = getStopIndexForBus(b, fromStop);
          var aTime = getTripScheduleMinutes(a, aIndex);
          var bTime = getTripScheduleMinutes(b, bIndex);
          if (aPriority !== bPriority) return aPriority - bPriority;
          if (aTime === null && bTime === null) return 0;
          if (aTime === null) return 1;
          if (bTime === null) return -1;
          return aTime - bTime;
        });

        setResultsHtml(
          buildDirectResultsHtml(directBuses, fromStop, destination)
        );
        hideMap();
        return;
      }

      connection = findConnectingRoute(
        selectedState,
        fromStop,
        normalizedDestination,
        nowMinutes
      );

      if (connection) {
        setResultsHtml(
          buildConnectingRouteHtml(connection, destination, fromStop)
        );
        hideMap();
        return;
      }

      setResultsHtml(buildNoResultHtml(fromStop, destination));
      hideMap();
    };

    resultsBox.addEventListener("click", function (event) {
      if (event.target.closest(".js-incident-delay")) {
        return;
      }

      var routeButton = event.target.closest("[data-bus-route]");

      if (!routeButton) {
        return;
      }

      openBusDetail(routeButton.getAttribute("data-bus-route"));
    });

    document.addEventListener("click", function (event) {
      var delayNote = event.target.closest(".js-incident-delay");

      if (!delayNote) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (
        window.busTrackEmergencyAlert &&
        typeof window.busTrackEmergencyAlert.openRouteAlert === "function"
      ) {
        window.busTrackEmergencyAlert.openRouteAlert();
      }
    });

    if (document.getElementById("journeyStartBtn")) {
      document.getElementById("journeyStartBtn").addEventListener("click", function () {
        openJourneyModal();
      });
    }

    if (document.getElementById("journeyLeaveBtn")) {
      document.getElementById("journeyLeaveBtn").addEventListener("click", function () {
        leavePassengerJourney();
      });
    }

    if (document.getElementById("journeyChangeCrowdBtn")) {
      document.getElementById("journeyChangeCrowdBtn").addEventListener("click", function () {
        openJourneyModal();
      });
    }

    if (document.getElementById("journeyModalClose")) {
      document.getElementById("journeyModalClose").addEventListener("click", closeJourneyModal);
    }

    if (document.getElementById("journeyModalCancel")) {
      document.getElementById("journeyModalCancel").addEventListener("click", closeJourneyModal);
    }

    if (document.getElementById("journeyDestinationSelect")) {
      document.getElementById("journeyDestinationSelect").addEventListener("change", updateJourneyJoinButton);
    }

    if (document.getElementById("journeyCrowdOptions")) {
      document.getElementById("journeyCrowdOptions").addEventListener("click", function (event) {
        var button = event.target.closest("[data-journey-crowd]");

        if (!button) {
          return;
        }

        Array.prototype.slice
          .call(document.querySelectorAll("[data-journey-crowd]"))
          .forEach(function (item) {
            item.classList.toggle("selected", item === button);
          });

        selectedJourneyCrowdLevel = button.getAttribute("data-journey-crowd") || "";
        updateJourneyJoinButton();
      });
    }

    if (document.getElementById("journeyJoinConfirm")) {
      document.getElementById("journeyJoinConfirm").addEventListener("click", joinPassengerJourney);
    }

    if (document.getElementById("journeyJoinModal")) {
      document.getElementById("journeyJoinModal").addEventListener("click", function (event) {
        if (event.target === document.getElementById("journeyJoinModal")) {
          closeJourneyModal();
        }
      });
    }

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeJourneyModal();
      }
    });

    populateStates();
    resetResults();
    hideMap();

    window.busTrackResetSearchState = function () {
      resetResults();
      resetLocationChoice();
      hideMap();
    };

    var originalFindBusClick = findBusBtn.onclick;
    findBusBtn.onclick = function () {
      var selectedState = stateSelect.value;
      var fromStop = startStop.value;
      var destination = endLocation.value.trim();
      var passThroughBuses;
      var normalizedDestination = normalizeText(destination);
      var nowMinutes = getSelectedSearchMinutes();

      if (selectedState && destination && (fromStop || isLocationSelected)) {
        locationStatus.innerText = "Checking route and realtime signals...";
        locationStatus.classList.add("success");
      }

      if (fromStop) {
        passThroughBuses = findBusesPassingThrough(fromStop, destination);
        passThroughBuses = passThroughBuses.filter(function (bus) {
          if (bus.state !== selectedState) {
            return false;
          }

          // Apply the same direction + time-aware filtering as primary search.
          var fromIndex = getStopIndexForBus(bus, fromStop);
          var destMatch = getTargetMatch(bus, normalizedDestination);
          if (fromIndex === -1 || !destMatch) return false;
          if (destMatch.stopIndex <= fromIndex) return false;

          if (!shouldKeepBusForSearchTime(bus, fromIndex, nowMinutes)) {
            return false;
          }

          return true;
        });

        if (passThroughBuses.length) {
          currentLiveTrips = {};
          setResultsHtml(
            buildDirectResultsHtml(
              passThroughBuses,
              fromStop,
              destination
            )
          );
          hideMap();
          return;
        }
      }

      originalFindBusClick();
    };

    setupDirectLiveBusSearch();
    window.setTimeout(restorePersistedPassengerJourney, 0);
  }

  function formatBusLabel(busNo) {
    var parts = String(busNo || "").split("-");
    var numberPart;

    if (parts.length !== 2) {
      return String(busNo || "");
    }

    numberPart = parseInt(parts[1], 10);

    if (isNaN(numberPart)) {
      return String(busNo || "");
    }

    if (numberPart < 10) {
      return parts[0] + "-0" + numberPart;
    }

    return parts[0] + "-" + numberPart;
  }

  function initializeOnBusFeature() {
    var onBusFlow = document.getElementById("onBusFlow");
    var scanQrBtn = document.getElementById("scanQrBtn");
    var selectBusBtn = document.getElementById("selectBusBtn");
    var bannerOnBusBtn = document.getElementById("bannerOnBusBtn");
    var checkInAnotherBtn = document.getElementById("checkInAnotherBtn");
    var suggestedBusList = document.getElementById("suggestedBusList");
    var onBusResult = document.getElementById("onBusResult");
    var pointsFeedback = document.getElementById("pointsFeedback");
    var confirmBusBtn = document.getElementById("confirmBusBtn");
    var nearbyBusItems = Array.prototype.slice.call(
      document.querySelectorAll(".onbus-v3-bus-choice")
    );
    var onBusPanels = Array.prototype.slice.call(
      document.querySelectorAll("[data-onbus-step]")
    );
    var onBusDots = Array.prototype.slice.call(
      document.querySelectorAll("[data-flow-dot]")
    );
    var onBusLines = Array.prototype.slice.call(
      document.querySelectorAll("[data-flow-line]")
    );
    var onBusStepLabel = document.getElementById("onBusStepLabel");
    var crowdOptions = Array.prototype.slice.call(
      document.querySelectorAll(".onbus-v3-crowd-option")
    );
    var onBusSelectedTitle = document.getElementById("onBusSelectedTitle");
    var onBusSelectedRoute = document.getElementById("onBusSelectedRoute");
    var onBusSuccessBus = document.getElementById("onBusSuccessBus");
    var onBusBackToPick = document.getElementById("onBusBackToPick");
    var onBusViewProfileBtn = document.getElementById("onBusViewProfileBtn");
    var crowdConfidenceBox = document.getElementById("crowdConfidenceBox");
    var crowdConfidenceCopy = document.getElementById("crowdConfidenceCopy");
    var crowdConfidenceFill = crowdConfidenceBox
      ? crowdConfidenceBox.querySelector(".crowd-confidence-track span")
      : null;
    var crowdConfidenceLabel = crowdConfidenceBox
      ? crowdConfidenceBox.querySelector(".crowd-confidence-head p")
      : null;
    var profileUserId = document.getElementById("profileUserId");
    var profilePoints = document.getElementById("profilePoints");
    var profileVotes = document.getElementById("profileVotes");
    var profileScans = document.getElementById("profileScans");
    var profileConfirms = document.getElementById("profileConfirms");
    var leaderboardList = document.getElementById("leaderboardList");
    var USER_STORAGE_KEY = "busTrackBharatUserV1";
    var activeBusId = "";
    var selectedBusTitle = "MH 12 AB 1234";
    var selectedBusRoute = "Shivajinagar ? Kothrud";
    var selectedCrowd = "";
    var currentOnBusStep = 1;
    var user;
    var mockUsers = [
      { id: "ANON-AX17", points: 42 },
      { id: "ANON-BR88", points: 31 },
      { id: "ANON-CZ29", points: 27 },
      { id: "ANON-DM45", points: 20 }
    ];

    if (
      !onBusFlow ||
      !scanQrBtn ||
      !suggestedBusList ||
      !onBusResult ||
      !pointsFeedback ||
      !confirmBusBtn ||
      !nearbyBusItems.length ||
      !onBusPanels.length ||
      !onBusDots.length ||
      !onBusStepLabel ||
      !crowdOptions.length ||
      !onBusSelectedTitle ||
      !onBusSelectedRoute ||
      !onBusSuccessBus ||
      !onBusBackToPick ||
      !onBusViewProfileBtn ||
      !profileUserId ||
      !profilePoints ||
      !profileVotes ||
      !profileScans ||
      !profileConfirms ||
      !leaderboardList
    ) {
      return;
    }

    function setOnBusStep(step) {
      var labels = {
        1: "Pick bus",
        2: "Crowd level",
        3: "Done"
      };

      currentOnBusStep = step;
      onBusPanels.forEach(function (panel) {
        panel.classList.toggle(
          "active",
          Number(panel.getAttribute("data-onbus-step")) === currentOnBusStep
        );
      });
      onBusDots.forEach(function (dot) {
        var dotStep = Number(dot.getAttribute("data-flow-dot"));
        dot.classList.remove("active");
        dot.classList.remove("complete");
        dot.innerText = String(dotStep);

        if (dotStep < currentOnBusStep) {
          dot.classList.add("complete");
          dot.innerText = "?";
        } else if (dotStep === currentOnBusStep) {
          dot.classList.add("active");
        }
      });
      onBusLines.forEach(function (line) {
        line.classList.toggle(
          "complete",
          Number(line.getAttribute("data-flow-line")) < currentOnBusStep
        );
      });
      onBusStepLabel.innerText = labels[currentOnBusStep];
    }

    function updateCrowdSubmitState() {
      confirmBusBtn.disabled = !selectedCrowd;
      confirmBusBtn.classList.toggle("enabled", !!selectedCrowd);
      confirmBusBtn.classList.remove("crowd-green");
      confirmBusBtn.classList.remove("crowd-yellow");
      confirmBusBtn.classList.remove("crowd-red");

      if (selectedCrowd === "Not Crowded") {
        confirmBusBtn.classList.add("crowd-green");
      } else if (selectedCrowd === "Moderate") {
        confirmBusBtn.classList.add("crowd-yellow");
      } else if (selectedCrowd === "Very Crowded") {
        confirmBusBtn.classList.add("crowd-red");
      }
    }

    function readUser() {
      var saved = localStorage.getItem(USER_STORAGE_KEY);
      var parsed;

      if (saved) {
        try {
          parsed = JSON.parse(saved);
        } catch (error) {
          parsed = null;
        }
      }

      if (!parsed || !parsed.id) {
        parsed = {
          id: "ANON-" + Math.floor(Math.random() * 90000 + 10000),
          displayName: "",
          authProvider: "anonymous",
          googleSub: "",
          points: 0,
          votes: 0,
          scans: 0,
          confirms: 0
        };
      }

      return parsed;
    }

    function saveUser() {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    }

    function awardPoints(amount, activityKey) {
      user.points += amount;

      if (activityKey === "votes") {
        user.votes += 1;
      }

      if (activityKey === "scans") {
        user.scans += 1;
      }

      if (activityKey === "confirms") {
        user.confirms += 1;
      }

      pointsFeedback.innerText = "+" + amount + " points earned";
      saveUser();
      renderProfile();
      renderLeaderboard();
    }

    function renderProfile() {
      profileUserId.innerText = user.id + " (" + user.authProvider + ")";
      profilePoints.innerText = String(user.points);
      profileVotes.innerText = String(user.votes);
      profileScans.innerText = String(user.scans);
      profileConfirms.innerText = String(user.confirms);
    }

    function renderLeaderboard() {
      var allUsers = mockUsers
        .concat([{ id: user.id, points: user.points, isCurrent: true }])
        .sort(function (a, b) {
          return b.points - a.points;
        });
      var html = "<ol>";
      var i;
      var row;

      for (i = 0; i < allUsers.length; i++) {
        row = allUsers[i];
        html +=
          "<li><b>" +
          escapeHtml(row.id) +
          "</b> - " +
          row.points +
          " pts" +
          (row.isCurrent ? " (You)" : "") +
          "</li>";
      }

      html += "</ol>";
      leaderboardList.innerHTML = html;
    }

    function resetOnBusSelection() {
      var defaultCopy = "Choose a nearby bus to continue.";

      activeBusId = "";
      selectedBusTitle = "MH 12 AB 1234";
      selectedBusRoute = "Shivajinagar ? Kothrud";
      selectedCrowd = "";
      nearbyBusItems.forEach(function (item) {
        item.classList.remove("selected");
      });
      crowdOptions.forEach(function (item) {
        item.classList.remove("selected");
      });
      if (crowdConfidenceBox) {
        crowdConfidenceBox.classList.add("hidden");
      }
      if (crowdConfidenceFill) {
        crowdConfidenceFill.style.width = "0%";
      }
      if (crowdConfidenceLabel) {
        crowdConfidenceLabel.innerText = "Low";
      }
      if (crowdConfidenceCopy) {
        crowdConfidenceCopy.innerText = "";
      }

      onBusResult.innerText = defaultCopy;
      onBusResult.classList.add("hidden");
      suggestedBusList.innerHTML = "";
      confirmBusBtn.disabled = true;
      confirmBusBtn.classList.remove("enabled");
      pointsFeedback.innerText = "";
      onBusSelectedTitle.innerText = selectedBusTitle;
      onBusSelectedRoute.innerText = selectedBusRoute;
      onBusSuccessBus.innerText = selectedBusTitle;
      updateCrowdSubmitState();
      setOnBusStep(1);
    }

    function updateCrowdConfidence(confidence) {
      var ridersConfirmed = Math.max(4, Math.round(confidence / 11));

      if (crowdConfidenceFill) {
        crowdConfidenceFill.style.width = confidence + "%";
      }
      if (crowdConfidenceLabel) {
        crowdConfidenceLabel.innerText = confidence >= 75 ? "High" : "Medium";
      }
      if (crowdConfidenceCopy) {
        crowdConfidenceCopy.innerText =
          ridersConfirmed + " other riders confirmed this bus in the last 5 min.";
      }
    }

    function selectNearbyBus(item, source) {
      var busId = item.getAttribute("data-nearby-bus") || "";
      var confidence = parseInt(item.getAttribute("data-confidence"), 10);

      if (isNaN(confidence)) {
        confidence = 70;
      }

      nearbyBusItems.forEach(function (row) {
        row.classList.remove("selected");
      });
      item.classList.add("selected");

      activeBusId = busId;
      selectedBusTitle = item.getAttribute("data-bus-title") || selectedBusTitle;
      selectedBusRoute = item.getAttribute("data-bus-route") || selectedBusRoute;
      selectedCrowd = "";
      crowdOptions.forEach(function (option) {
        option.classList.remove("selected");
      });
      updateCrowdConfidence(confidence);
      if (crowdConfidenceBox) {
        crowdConfidenceBox.classList.remove("hidden");
      }

      onBusResult.classList.add("hidden");
      onBusResult.innerText =
        source === "scan"
          ? "QR detected: Bus " + busId + " (" + confidence + "% confidence)"
          : "Bus " + busId + " (" + confidence + "% confidence)";

      onBusSelectedTitle.innerText = selectedBusTitle;
      onBusSelectedRoute.innerText = selectedBusRoute;
      onBusSuccessBus.innerText = selectedBusTitle;
      updateCrowdSubmitState();
      setOnBusStep(2);
    }

    function pickBestNearbyBus() {
      if (!nearbyBusItems.length) {
        return null;
      }

      return nearbyBusItems[0];
    }

    user = readUser();
    saveUser();
    renderProfile();
    renderLeaderboard();
    resetOnBusSelection();

    if (selectBusBtn) {
      selectBusBtn.addEventListener("click", function () {
        resetOnBusSelection();
      });
    }

    if (bannerOnBusBtn) {
      bannerOnBusBtn.addEventListener("click", function () {
        resetOnBusSelection();
      });
    }

    if (checkInAnotherBtn) {
      checkInAnotherBtn.addEventListener("click", function () {
        resetOnBusSelection();
      });
    }

    onBusBackToPick.addEventListener("click", function () {
      setOnBusStep(1);
    });

    nearbyBusItems.forEach(function (item) {
      item.addEventListener("click", function () {
        selectNearbyBus(item, "tap");
      });
    });

    crowdOptions.forEach(function (option) {
      option.addEventListener("click", function () {
        crowdOptions.forEach(function (item) {
          item.classList.remove("selected");
        });
        option.classList.add("selected");
        selectedCrowd = option.getAttribute("data-crowd-level") || "";
        updateCrowdSubmitState();
      });
    });

    scanQrBtn.addEventListener("click", function () {
      var scannedBus = pickBestNearbyBus();
      if (!scannedBus) {
        return;
      }

      selectNearbyBus(scannedBus, "scan");
    });

    confirmBusBtn.addEventListener("click", function () {
      if (!activeBusId || !selectedCrowd) {
        return;
      }

      awardPoints(10, "confirms");
      setOnBusStep(3);
    });

    onBusViewProfileBtn.addEventListener("click", function () {
      if (window.busTrackNavigate) {
        window.busTrackNavigate("profilePage");
      }
    });

    // Future-ready auth hook for Phase 2 (Google login integration).
    window.busTrackAuth = {
      loginWithGoogle: function () {
        return Promise.resolve({
          provider: "google",
          status: "not_implemented"
        });
      }
    };
  }

  function initializeProfileTrackingDemo() {
    var modal = document.getElementById("profileTrackModal");
    var closeBtn = document.getElementById("profileTrackClose");
    var mapEl = document.getElementById("profileTrackMap");
    var busLabel = document.getElementById("profileTrackBus");
    var etaLabel = document.getElementById("profileTrackEta");
    var trackButtons = Array.prototype.slice.call(
      document.querySelectorAll(".profile-v2-track-btn")
    );
    var profileMap = null;
    var mapLayers = [];
    var demoBuses = (window.BusTrackData && window.BusTrackData.profileDemoBuses) || {};

    if (!modal || !closeBtn || !mapEl || !busLabel || !etaLabel || !trackButtons.length) {
      return;
    }

    function clearDemoLayers() {
      if (!profileMap) {
        return;
      }

      mapLayers.forEach(function (layer) {
        profileMap.removeLayer(layer);
      });
      mapLayers = [];
    }

    function ensureMap() {
      if (profileMap || !window.L) {
        return;
      }

      profileMap = window.L.map(mapEl, {
        zoomControl: true,
        attributionControl: false
      });
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19
      }).addTo(profileMap);
    }

    function drawRoute(bus) {
      var data = demoBuses[bus];
      var route;
      var busPoint;
      var busIcon;

      if (!data || !window.L) {
        return;
      }

      ensureMap();
      if (!profileMap) {
        return;
      }

      clearDemoLayers();
      route = data.route;
      busPoint = route[data.busIndex];
      busIcon = window.L.divIcon({
        className: "profile-v2-map-bus-icon",
        html: "BUS",
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      mapLayers.push(
        window.L.polyline(route, {
          color: "#3369e8",
          weight: 5,
          opacity: 0.85
        }).addTo(profileMap)
      );
      mapLayers.push(window.L.marker(route[0]).addTo(profileMap).bindPopup("Start point"));
      mapLayers.push(window.L.marker(route[route.length - 1]).addTo(profileMap).bindPopup("End point"));
      mapLayers.push(
        window.L.marker(busPoint, { icon: busIcon })
          .addTo(profileMap)
          .bindPopup(bus + " is live")
      );

      profileMap.fitBounds(window.L.latLngBounds(route), { padding: [36, 36] });
      setTimeout(function () {
        profileMap.invalidateSize();
      }, 80);
    }

    function openModal(bus) {
      var data = demoBuses[bus];

      if (!data) {
        return;
      }

      busLabel.innerText = bus;
      etaLabel.innerText = data.eta;
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
      drawRoute(bus);

      if (
        window.busTrackEmergencyAlert &&
        typeof window.busTrackEmergencyAlert.maybeShowRouteAlert === "function"
      ) {
        window.busTrackEmergencyAlert.maybeShowRouteAlert(bus);
      }
    }

    function closeModal() {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
    }

    trackButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        openModal(button.getAttribute("data-demo-bus"));
      });
    });

    closeBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", function (event) {
      if (event.target === modal) {
        closeModal();
      }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && modal.classList.contains("open")) {
        closeModal();
      }
    });
  }

  function initializeEmergencyAlertSystem() {
    var navBtn = document.getElementById("emergencyNavBtn");
    var floatBtn = document.getElementById("emergencyFloatBtn");
    var modal = document.getElementById("emergencyModal");
    var confirmModal = document.getElementById("emergencyConfirmModal");
    var routeAlert = document.getElementById("emergencyRouteAlert");
    var closeBtn = document.getElementById("emergencyCloseBtn");
    var locationBtn = document.getElementById("emergencyLocationBtn");
    var detectedLocation = document.getElementById("emergencyDetectedLocation");
    var continueBtn = document.getElementById("emergencyContinueBtn");
    var backBtn = document.getElementById("emergencyBackBtn");
    var cancelSendBtn = document.getElementById("emergencyCancelSendBtn");
    var confirmSendBtn = document.getElementById("emergencySendConfirmBtn");
    var routeCloseBtn = document.getElementById("emergencyRouteCloseBtn");
    var routeGotItBtn = document.getElementById("emergencyRouteGotItBtn");
    var detailsInput = document.getElementById("emergencyDetails");
    var steps = Array.prototype.slice.call(
      document.querySelectorAll(".emergency-step")
    );
    var progressBars = Array.prototype.slice.call(
      document.querySelectorAll(".emergency-progress span")
    );
    var typeCards = Array.prototype.slice.call(
      document.querySelectorAll(".emergency-type-card")
    );
    var currentStep = 1;
    var emergencyState = {
      active: false,
      location: "",
      type: "",
      details: "",
      affectedBus: "MH12 AB 1234"
    };

    if (
      !navBtn ||
      !floatBtn ||
      !modal ||
      !confirmModal ||
      !routeAlert ||
      !closeBtn ||
      !locationBtn ||
      !detectedLocation ||
      !continueBtn ||
      !backBtn ||
      !cancelSendBtn ||
      !confirmSendBtn ||
      !routeCloseBtn ||
      !routeGotItBtn ||
      !detailsInput ||
      !steps.length ||
      !progressBars.length
    ) {
      return;
    }

    function normalizeBus(value) {
      return String(value || "").replace(/[^a-z0-9]/gi, "").toUpperCase();
    }

    function setStep(step) {
      currentStep = step;
      steps.forEach(function (stepEl) {
        stepEl.classList.toggle(
          "active",
          Number(stepEl.getAttribute("data-emergency-step")) === currentStep
        );
      });
      progressBars.forEach(function (bar, index) {
        bar.classList.toggle("active", index < currentStep);
      });
      backBtn.disabled = currentStep === 1;
      continueBtn.innerText =
        currentStep === 3 ? "Send Emergency Alert" : "Continue";
      updateContinueState();
    }

    function updateContinueState() {
      if (currentStep === 1) {
        continueBtn.disabled = !emergencyState.location;
      } else if (currentStep === 2) {
        continueBtn.disabled = !emergencyState.type;
      } else {
        continueBtn.disabled = false;
      }
    }

    function resetFlow() {
      currentStep = 1;
      emergencyState.location = "";
      emergencyState.type = "";
      emergencyState.details = "";
      detailsInput.value = "";
      detectedLocation.classList.add("hidden");
      locationBtn.classList.remove("hidden");
      typeCards.forEach(function (card) {
        card.classList.remove("active");
      });
      setStep(1);
    }

    function openFlow() {
      resetFlow();
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
    }

    function closeFlow() {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
    }

    function openConfirm() {
      emergencyState.details = detailsInput.value.trim();
      confirmModal.classList.add("open");
      confirmModal.setAttribute("aria-hidden", "false");
    }

    function closeConfirm() {
      confirmModal.classList.remove("open");
      confirmModal.setAttribute("aria-hidden", "true");
    }

    function openRouteAlert() {
      routeAlert.classList.add("open");
      routeAlert.setAttribute("aria-hidden", "false");
    }

    function closeRouteAlert() {
      routeAlert.classList.remove("open");
      routeAlert.setAttribute("aria-hidden", "true");
    }

    function addWarningLabel(card) {
      var label;
      var existingLabel = card ? card.querySelector(".emergency-warning-label") : null;

      if (!card) {
        return;
      }

      if (existingLabel) {
        bindWarningLabel(existingLabel);
        return;
      }

      card.classList.add("emergency-card-affected");
      label = document.createElement("span");
      label.className = "emergency-warning-label";
      label.innerText = "? Delay expected";
      label.setAttribute("role", "button");
      label.setAttribute("tabindex", "0");
      bindWarningLabel(label);
      card.appendChild(label);
    }

    function bindWarningLabel(label) {
      if (!label || label.getAttribute("data-emergency-bound") === "true") {
        return;
      }

      label.setAttribute("data-emergency-bound", "true");
      label.addEventListener("click", openRouteAlert);
      label.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openRouteAlert();
        }
      });
    }

    function highlightAffectedCards() {
      var frequentCard = document.querySelector(
        ".profile-v2-bus-card[data-demo-bus='MH12 AB 1234']"
      );

      addWarningLabel(frequentCard);
    }

    function sendAlert() {
      emergencyState.active = true;
      emergencyState.location = emergencyState.location || "Near MG Road, Bengaluru";
      emergencyState.type = emergencyState.type || "Accident";
      closeConfirm();
      closeFlow();
      highlightAffectedCards();
    }

    function maybeShowRouteAlert(busNo) {
      return;
    }

    navBtn.addEventListener("click", openFlow);
    floatBtn.addEventListener("click", openFlow);
    closeBtn.addEventListener("click", closeFlow);
    routeCloseBtn.addEventListener("click", closeRouteAlert);
    routeGotItBtn.addEventListener("click", closeRouteAlert);
    Array.prototype.slice
      .call(document.querySelectorAll(".emergency-warning-label"))
      .forEach(bindWarningLabel);

    locationBtn.addEventListener("click", function () {
      emergencyState.location = "Near MG Road, Bengaluru";
      locationBtn.classList.add("hidden");
      detectedLocation.classList.remove("hidden");
      updateContinueState();
    });

    typeCards.forEach(function (card) {
      card.addEventListener("click", function () {
        typeCards.forEach(function (item) {
          item.classList.remove("active");
        });
        card.classList.add("active");
        emergencyState.type = card.getAttribute("data-emergency-type") || "";
        updateContinueState();
      });
    });

    continueBtn.addEventListener("click", function () {
      if (continueBtn.disabled) {
        return;
      }

      if (currentStep < 3) {
        setStep(currentStep + 1);
        return;
      }

      openConfirm();
    });

    backBtn.addEventListener("click", function () {
      if (currentStep > 1) {
        setStep(currentStep - 1);
      }
    });

    cancelSendBtn.addEventListener("click", closeConfirm);
    confirmSendBtn.addEventListener("click", sendAlert);

    modal.addEventListener("click", function (event) {
      if (event.target === modal) {
        closeFlow();
      }
    });
    confirmModal.addEventListener("click", function (event) {
      if (event.target === confirmModal) {
        closeConfirm();
      }
    });
    routeAlert.addEventListener("click", function (event) {
      if (event.target === routeAlert) {
        closeRouteAlert();
      }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") {
        return;
      }
      closeConfirm();
      closeRouteAlert();
      closeFlow();
    });

    window.busTrackEmergencyAlert = {
      maybeShowRouteAlert: maybeShowRouteAlert,
      openRouteAlert: openRouteAlert,
      highlightAffectedCards: highlightAffectedCards
    };
  }

  function cleanupPassengerRealtimeRuntime() {
    stopPassengerLiveSubscription();
    stopPassengerJourneySubscription();
    stopSearchResultRealtimeSubscriptions();

    Object.keys(markerAnimationFrames).forEach(function (key) {
      window.cancelAnimationFrame(markerAnimationFrames[key]);
    });
    markerAnimationFrames = {};
  }

  function resumePassengerRealtimeRuntime() {
    if (activeDetailBusNo) {
      startPassengerLiveSubscription(activeDetailBusNo);
      startPassengerJourneySubscription(activeDetailBusNo);
    }

    if (showResults) {
      startSearchResultRealtimeSubscriptions();
    }
  }

  function setPassengerRealtimeMessage(message) {
    if (directBusStatus && activeDetailBusNo) {
      directBusStatus.innerText = message;
    }

    if (locationStatus && isTracking) {
      locationStatus.innerText = message;
    }
  }

  window.addEventListener("online", function () {
    setPassengerRealtimeMessage("Syncing realtime updates...");
    resumePassengerRealtimeRuntime();
  });

  window.addEventListener("offline", function () {
    setPassengerRealtimeMessage("Network offline. Realtime updates will reconnect automatically.");
  });

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
      setPassengerRealtimeMessage("Restoring live updates...");
      resumePassengerRealtimeRuntime();
    }
  });

  window.addEventListener("pagehide", cleanupPassengerRealtimeRuntime);

  initializeOnBusFeature();
  initializeProfileTrackingDemo();
  initializeEmergencyAlertSystem();
});

