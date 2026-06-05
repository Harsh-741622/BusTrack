import { liveBusService } from "../firebase/live-bus-service.js";
import { realtimeService } from "../firebase/realtime-service.js";

function getSyncTime() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function normalizeSyncResult(result) {
  const disabled =
    result &&
    (result.disabled ||
      (result.busResult && result.busResult.disabled) ||
      (result.statusResult && result.statusResult.disabled) ||
      (result.locationResult && result.locationResult.disabled));

  if (disabled) {
    return {
      ok: false,
      disabled: true,
      status: "Firebase disabled",
      syncedAt: getSyncTime(),
      message:
        result.reason ||
        (result.busResult && result.busResult.reason) ||
        (result.statusResult && result.statusResult.reason) ||
        (result.locationResult && result.locationResult.reason) ||
        "Firebase Realtime Database is not configured."
    };
  }

  if (result && result.ok) {
    return {
      ok: true,
      disabled: false,
      status: "Synced",
      syncedAt: getSyncTime(),
      message: "Firebase Realtime Database updated."
    };
  }

  return {
    ok: false,
    disabled: false,
    status: "Sync failed",
    syncedAt: getSyncTime(),
    message: "Firebase write did not complete."
  };
}

function normalizeLockResult(result) {
  if (result && result.disabled) {
    return {
      ok: false,
      locked: false,
      disabled: true,
      status: "Firebase disabled",
      syncedAt: getSyncTime(),
      message: result.reason || "Firebase Realtime Database is not configured."
    };
  }

  if (result && result.locked) {
    return {
      ok: false,
      locked: true,
      disabled: false,
      status: "Bus locked",
      syncedAt: getSyncTime(),
      message: result.reason || "This bus already has an active live session.",
      session: result.value || null
    };
  }

  if (result && result.ok) {
    return {
      ok: true,
      locked: false,
      disabled: false,
      status: "Lock active",
      syncedAt: getSyncTime(),
      message: "Driver session lock active.",
      session: result.value || null
    };
  }

  return {
    ok: false,
    locked: false,
    disabled: false,
    status: "Lock failed",
    syncedAt: getSyncTime(),
    message: "Driver session lock did not complete."
  };
}

export const driverFirebaseSync = {
  subscribeToConnectionState: function (onState, onError) {
    return realtimeService.subscribeConnectionState(onState, onError);
  },

  subscribeToDriverSessionLock: function (busId, onSession, onError) {
    return liveBusService.subscribeToActiveDriverSession(busId, onSession, onError);
  },

  readDriverSessionLock: async function (busId) {
    try {
      const result = await liveBusService.readActiveDriverSession(busId);
      return normalizeLockResult(
        result && result.ok
          ? {
              ok: true,
              value: result.value
            }
          : result
      );
    } catch (error) {
      return {
        ok: false,
        locked: false,
        disabled: false,
        status: "Lock read error",
        syncedAt: getSyncTime(),
        message: error && error.message ? error.message : "Driver session lock read failed."
      };
    }
  },

  acquireDriverSessionLock: async function (busId, session) {
    try {
      const result = await liveBusService.acquireDriverSessionLock(busId, session);
      return normalizeLockResult(result);
    } catch (error) {
      return {
        ok: false,
        locked: false,
        disabled: false,
        status: "Lock error",
        syncedAt: getSyncTime(),
        message: error && error.message ? error.message : "Driver session lock failed."
      };
    }
  },

  heartbeatDriverSessionLock: async function (busId, session) {
    try {
      const result = await liveBusService.heartbeatDriverSessionLock(busId, session);
      return normalizeLockResult(result);
    } catch (error) {
      return {
        ok: false,
        locked: false,
        disabled: false,
        status: "Lock error",
        syncedAt: getSyncTime(),
        message: error && error.message ? error.message : "Driver session heartbeat failed."
      };
    }
  },

  releaseDriverSessionLock: async function (busId, session) {
    try {
      const result = await liveBusService.releaseDriverSessionLock(busId, session);
      const normalized = normalizeLockResult(result);

      if (normalized.ok) {
        normalized.status = "Lock released";
        normalized.message = "Driver session lock released.";
      }

      return normalized;
    } catch (error) {
      return {
        ok: false,
        locked: false,
        disabled: false,
        status: "Release error",
        syncedAt: getSyncTime(),
        message: error && error.message ? error.message : "Driver session release failed."
      };
    }
  },

  publishBusLocation: async function (busId, location, session) {
    try {
      if (session && session.sessionId) {
        const heartbeatResult = await liveBusService.heartbeatDriverSessionLock(busId, session);

        if (heartbeatResult && heartbeatResult.locked) {
          return normalizeLockResult(heartbeatResult);
        }
      }

      const result = await liveBusService.publishBusLocation(busId, location, session);
      return normalizeSyncResult(result);
    } catch (error) {
      return {
        ok: false,
        disabled: false,
        status: "Sync error",
        syncedAt: getSyncTime(),
        message: error && error.message ? error.message : "Firebase location sync failed."
      };
    }
  },

  updateTrackingStatus: async function (busId, session) {
    try {
      if (session && session.sessionId && session.sessionActive) {
        const heartbeatResult = await liveBusService.heartbeatDriverSessionLock(busId, session);

        if (heartbeatResult && heartbeatResult.locked) {
          return normalizeLockResult(heartbeatResult);
        }
      }

      const result = await liveBusService.updateTrackingStatus(busId, session);
      return normalizeSyncResult(result);
    } catch (error) {
      return {
        ok: false,
        disabled: false,
        status: "Sync error",
        syncedAt: getSyncTime(),
        message: error && error.message ? error.message : "Firebase status sync failed."
      };
    }
  }
};
