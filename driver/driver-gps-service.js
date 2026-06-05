import { liveBusService } from "../firebase/live-bus-service.js";

const UPDATE_INTERVAL_MS = 4000;

function createUnsupportedResult() {
  return {
    ok: false,
    message: "Browser GPS is not available."
  };
}

function normalizeCoordinate(value) {
  return typeof value === "number" && !Number.isNaN(value) ? value : null;
}

export function createDriverGpsService() {
  let watchId = null;
  let activeBusId = "";
  let lastSentAt = 0;

  function isTracking() {
    return watchId !== null;
  }

  async function publishPosition(position, handlers) {
    const now = Date.now();

    if (now - lastSentAt < UPDATE_INTERVAL_MS) {
      return;
    }

    lastSentAt = now;

    const coords = position.coords || {};
    const payload = {
      latitude: normalizeCoordinate(coords.latitude),
      longitude: normalizeCoordinate(coords.longitude),
      speed: normalizeCoordinate(coords.speed),
      heading: normalizeCoordinate(coords.heading)
    };

    const result = await liveBusService.publishDriverLocation(activeBusId, payload);

    if (handlers && handlers.onLocation) {
      handlers.onLocation({
        busId: activeBusId,
        payload: payload,
        firebaseResult: result,
        sentAt: now
      });
    }
  }

  async function start(busId, handlers) {
    if (!navigator.geolocation) {
      if (handlers && handlers.onError) {
        handlers.onError(createUnsupportedResult());
      }
      return createUnsupportedResult();
    }

    if (isTracking()) {
      stop();
    }

    activeBusId = busId;
    lastSentAt = 0;

    await liveBusService.setJourneyActive(activeBusId, true);

    watchId = navigator.geolocation.watchPosition(
      function (position) {
        publishPosition(position, handlers).catch(function (error) {
          if (handlers && handlers.onError) {
            handlers.onError(error);
          }
        });
      },
      function (error) {
        if (handlers && handlers.onError) {
          handlers.onError(error);
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2500,
        timeout: 12000
      }
    );

    if (handlers && handlers.onStart) {
      handlers.onStart({
        busId: activeBusId
      });
    }

    return {
      ok: true,
      busId: activeBusId
    };
  }

  async function stop() {
    const busId = activeBusId;

    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }

    activeBusId = "";
    lastSentAt = 0;

    if (busId) {
      await liveBusService.setJourneyActive(busId, false);
    }

    return {
      ok: true,
      busId: busId
    };
  }

  return {
    start: start,
    stop: stop,
    isTracking: isTracking
  };
}
