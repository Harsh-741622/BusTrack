import { getFirebaseRuntime } from "./firebase-app.js";

function noopUnsubscribe() {}

function makeDisabledResult(action, path, reason) {
  return Promise.resolve({
    ok: false,
    disabled: true,
    action: action,
    path: path,
    reason: reason || "Firebase Realtime Database is not configured yet."
  });
}

async function getDatabaseTools() {
  let runtime;

  try {
    runtime = await getFirebaseRuntime();
  } catch (error) {
    return {
      enabled: false,
      runtime: {
        reason: error && error.message
          ? error.message
          : "Firebase Realtime Database could not initialize."
      }
    };
  }

  if (!runtime.enabled) {
    return {
      enabled: false,
      runtime: runtime
    };
  }

  return {
    enabled: true,
    runtime: runtime,
    ref: runtime.databaseSdk.ref,
    onValue: runtime.databaseSdk.onValue,
    off: runtime.databaseSdk.off,
    get: runtime.databaseSdk.get,
    set: runtime.databaseSdk.set,
    update: runtime.databaseSdk.update,
    push: runtime.databaseSdk.push,
    serverTimestamp: runtime.databaseSdk.serverTimestamp
  };
}

export const realtimeService = {
  async subscribe(path, onData, onError) {
    const tools = await getDatabaseTools();

    if (!tools.enabled) {
      if (onError) {
        onError({
          disabled: true,
          message:
            tools.runtime && tools.runtime.reason
              ? tools.runtime.reason
              : "Firebase Realtime Database is not available."
        });
      }
      return noopUnsubscribe;
    }

    const databaseRef = tools.ref(tools.runtime.database, path);
    const unsubscribe = tools.onValue(
      databaseRef,
      function (snapshot) {
        onData(snapshot.val(), snapshot);
      },
      function (error) {
        if (onError) {
          onError(error);
        }
      }
    );

    return unsubscribe;
  },

  async subscribeConnectionState(onState, onError) {
    const tools = await getDatabaseTools();

    if (!tools.enabled) {
      if (onState) {
        onState({
          connected: false,
          disabled: true,
          status: "disabled",
          message:
            tools.runtime && tools.runtime.reason
              ? tools.runtime.reason
              : "Firebase Realtime Database is not available.",
          updatedAt: Date.now()
        });
      }

      return noopUnsubscribe;
    }

    const databaseRef = tools.ref(tools.runtime.database, ".info/connected");
    return tools.onValue(
      databaseRef,
      function (snapshot) {
        const connected = snapshot.val() === true;

        if (onState) {
          onState({
            connected: connected,
            status: connected ? "connected" : "reconnecting",
            message: connected
              ? "Realtime updates connected."
              : "Reconnecting to live tracking...",
            updatedAt: Date.now()
          });
        }
      },
      function (error) {
        if (onError) {
          onError(error);
        }
      }
    );
  },

  async read(path) {
    const tools = await getDatabaseTools();

    if (!tools.enabled) {
      return makeDisabledResult("read", path, tools.runtime && tools.runtime.reason);
    }

    const snapshot = await tools.get(tools.ref(tools.runtime.database, path));
    return {
      ok: true,
      path: path,
      value: snapshot.val()
    };
  },

  async write(path, value) {
    const tools = await getDatabaseTools();

    if (!tools.enabled) {
      return makeDisabledResult("write", path, tools.runtime && tools.runtime.reason);
    }

    await tools.set(tools.ref(tools.runtime.database, path), value);
    return {
      ok: true,
      path: path
    };
  },

  async patch(path, value) {
    const tools = await getDatabaseTools();

    if (!tools.enabled) {
      return makeDisabledResult("patch", path, tools.runtime && tools.runtime.reason);
    }

    await tools.update(tools.ref(tools.runtime.database, path), value);
    return {
      ok: true,
      path: path
    };
  },

  async add(path, value) {
    const tools = await getDatabaseTools();

    if (!tools.enabled) {
      return makeDisabledResult("add", path, tools.runtime && tools.runtime.reason);
    }

    const listRef = tools.ref(tools.runtime.database, path);
    const itemRef = tools.push(listRef);
    await tools.set(itemRef, value);

    return {
      ok: true,
      path: path,
      key: itemRef.key
    };
  },

  async timestamp() {
    const tools = await getDatabaseTools();
    return tools.enabled ? tools.serverTimestamp() : Date.now();
  }
};
