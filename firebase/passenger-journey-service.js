import { liveBusService } from "./live-bus-service.js";
import { operationalJourneyLogService } from "./operational-journey-log-service.js";

const CROWD_LEVELS = ["Not Crowded", "Moderate", "Very Crowded"];
const CROWD_SCORES = {
  "Not Crowded": 1,
  Moderate: 2,
  "Very Crowded": 3
};
const CROWD_THRESHOLDS = {
  notCrowdedMax: 1.49,
  moderateMax: 2.49
};
const ACTIVE_JOURNEY_STORAGE_KEY = "bustrack-active-passenger-journey";

function normalizeCrowdLevel(value) {
  return CROWD_LEVELS.indexOf(value) !== -1 ? value : "";
}

function normalizeJourney(journey) {
  const busId = String(journey && (journey.busId || journey.bus_id) || "").trim();
  const destinationStop = String(journey && (journey.destinationStop || journey.destination_stop) || "").trim();
  const crowdLevel = normalizeCrowdLevel(journey && (journey.crowdLevel || journey.crowd_level));
  const joinedAt = getTimestamp(journey && (journey.joinedAt || journey.joined_at)) || Date.now();
  const sessionActive =
    typeof (journey && journey.sessionActive) === "boolean"
      ? journey.sessionActive
      : !!(journey && journey.session_active);

  if (!busId || !destinationStop || !crowdLevel) {
    return null;
  }

  return {
    busId: busId,
    bus_id: busId,
    destinationStop: destinationStop,
    destination_stop: destinationStop,
    crowdLevel: crowdLevel,
    crowd_level: crowdLevel,
    joinedAt: joinedAt,
    joined_at: joinedAt,
    sessionActive: sessionActive,
    session_active: sessionActive
  };
}

function makeUserId() {
  const storageKey = "bustrack-passenger-id";
  let savedId = "";

  try {
    savedId = window.localStorage.getItem(storageKey) || "";

    if (!savedId) {
      savedId = "PASSENGER-" + Math.floor(Math.random() * 90000 + 10000);
      window.localStorage.setItem(storageKey, savedId);
    }
  } catch (error) {
    savedId = "anonymous";
  }

  return savedId;
}

function getTimestamp(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

function getUpdateTime(update) {
  return Math.max(
    getTimestamp(update && update.createdAt),
    getTimestamp(update && update.created_at),
    getTimestamp(update && update.joinedAt),
    getTimestamp(update && update.joined_at)
  );
}

function normalizeThresholds(thresholds) {
  return {
    notCrowdedMax: Number(thresholds && thresholds.notCrowdedMax) || CROWD_THRESHOLDS.notCrowdedMax,
    moderateMax: Number(thresholds && thresholds.moderateMax) || CROWD_THRESHOLDS.moderateMax
  };
}

function getCrowdLabel(score, thresholds) {
  const activeThresholds = normalizeThresholds(thresholds);

  if (score <= activeThresholds.notCrowdedMax) {
    return "Not Crowded";
  }

  if (score <= activeThresholds.moderateMax) {
    return "Moderate";
  }

  return "Very Crowded";
}

function getUpdateKey(update, fallbackKey) {
  return update.userId || update.user_id || update.sessionId || update.session_id || fallbackKey;
}

function logCrowdJourneyEvent(busId, update) {
  if (!operationalJourneyLogService || !operationalJourneyLogService.logEvent) {
    return;
  }

  operationalJourneyLogService
    .logEvent("crowd_update", {
      bus_id: busId,
      crowd_status: update && (update.crowdLevel || update.crowd_level),
      tracking_status: "passenger_journey",
      session_active:
        typeof (update && update.sessionActive) === "boolean"
          ? update.sessionActive
          : !!(update && update.session_active)
    })
    .catch(function () {});
}

function normalizeUpdate(update, fallbackKey) {
  const crowdLevel = normalizeCrowdLevel(update && (update.crowdLevel || update.crowd_level));

  return {
    key: getUpdateKey(update || {}, fallbackKey),
    crowdLevel: crowdLevel,
    score: CROWD_SCORES[crowdLevel] || 0,
    sessionActive: !!(update && (update.sessionActive || update.session_active)),
    updatedAt: getUpdateTime(update)
  };
}

export function aggregateCrowdUpdates(updates, options) {
  const latestByPassenger = {};
  let activeCount = 0;
  let totalScore = 0;

  Object.keys(updates || {}).forEach(function (key) {
    const update = normalizeUpdate(updates[key], key);
    const existing = latestByPassenger[update.key];

    if (!update.key || !update.crowdLevel) {
      return;
    }

    if (!existing || update.updatedAt >= existing.updatedAt) {
      latestByPassenger[update.key] = update;
    }
  });

  Object.keys(latestByPassenger).forEach(function (key) {
    const update = latestByPassenger[key];

    if (!update.sessionActive || !update.score) {
      return;
    }

    activeCount += 1;
    totalScore += update.score;
  });

  if (!activeCount) {
    return {
      available: false,
      label: "Awaiting crowd",
      averageScore: null,
      activeContributors: 0,
      thresholds: normalizeThresholds(options && options.thresholds)
    };
  }

  const averageScore = totalScore / activeCount;

  return {
    available: true,
    label: getCrowdLabel(averageScore, options && options.thresholds),
    averageScore: averageScore,
    activeContributors: activeCount,
    thresholds: normalizeThresholds(options && options.thresholds)
  };
}

export const passengerJourneyService = {
  crowdLevels: CROWD_LEVELS.slice(),
  crowdThresholds: Object.assign({}, CROWD_THRESHOLDS),
  aggregateCrowdUpdates: aggregateCrowdUpdates,
  storageKey: ACTIVE_JOURNEY_STORAGE_KEY,

  readActiveJourney: function () {
    let parsed = null;

    try {
      parsed = JSON.parse(window.localStorage.getItem(ACTIVE_JOURNEY_STORAGE_KEY) || "null");
    } catch (error) {
      parsed = null;
    }

    const journey = normalizeJourney(parsed);

    if (!journey || !journey.sessionActive) {
      return null;
    }

    return journey;
  },

  saveActiveJourney: function (journey) {
    const normalized = normalizeJourney(journey);

    if (!normalized || !normalized.sessionActive) {
      return null;
    }

    try {
      window.localStorage.setItem(
        ACTIVE_JOURNEY_STORAGE_KEY,
        JSON.stringify({
          bus_id: normalized.bus_id,
          destination_stop: normalized.destination_stop,
          crowd_level: normalized.crowd_level,
          joined_at: normalized.joined_at,
          session_active: normalized.session_active
        })
      );
    } catch (error) {
      return normalized;
    }

    return normalized;
  },

  clearActiveJourney: function () {
    try {
      window.localStorage.removeItem(ACTIVE_JOURNEY_STORAGE_KEY);
    } catch (error) {
      return false;
    }

    return true;
  },

  subscribeToJourneyUpdates: function (busId, onUpdates, onError) {
    return liveBusService.subscribeToCrowdUpdates(busId, onUpdates, onError);
  },

  joinJourney: function (busId, journey) {
    const crowdLevel = normalizeCrowdLevel(journey && journey.crowdLevel);
    const destinationStop = String(journey && journey.destinationStop || "").trim();
    const joinedAt = journey && journey.joinedAt ? journey.joinedAt : Date.now();

    if (!busId || !destinationStop || !crowdLevel) {
      return Promise.resolve({
        ok: false,
        reason: "Destination stop and crowd level are required."
      });
    }

    const updatePayload = {
      type: "journey_participation",
      userId: makeUserId(),
      busId: busId,
      bus_id: busId,
      joinedAt: joinedAt,
      joined_at: joinedAt,
      destinationStop: destinationStop,
      destination_stop: destinationStop,
      crowdLevel: crowdLevel,
      crowd_level: crowdLevel,
      sessionActive: true,
      session_active: true
    };

    return liveBusService.publishCrowdUpdate(busId, updatePayload).then(function (result) {
      if (result && result.ok) {
        logCrowdJourneyEvent(busId, updatePayload);
      }

      return result;
    });
  },

  leaveJourney: function (busId, journey) {
    const joinedAt = journey && journey.joinedAt ? journey.joinedAt : Date.now();

    const updatePayload = {
      type: "journey_participation",
      userId: makeUserId(),
      busId: busId,
      bus_id: busId,
      joinedAt: joinedAt,
      joined_at: joinedAt,
      destinationStop: journey && journey.destinationStop || "",
      destination_stop: journey && journey.destinationStop || "",
      crowdLevel: journey && journey.crowdLevel || "",
      crowd_level: journey && journey.crowdLevel || "",
      sessionActive: false,
      session_active: false
    };

    return liveBusService.publishCrowdUpdate(busId, updatePayload).then(function (result) {
      if (result && result.ok) {
        logCrowdJourneyEvent(busId, updatePayload);
      }

      return result;
    });
  },

  updateCrowdLevel: function (busId, journey, crowdLevel) {
    return passengerJourneyService.joinJourney(busId, {
      destinationStop: journey && journey.destinationStop || "",
      crowdLevel: crowdLevel,
      joinedAt: journey && journey.joinedAt || Date.now(),
      sessionActive: true
    });
  }
};

window.BusTrackPassengerJourney = passengerJourneyService;
window.dispatchEvent(new CustomEvent("busTrackPassengerJourneyReady"));
