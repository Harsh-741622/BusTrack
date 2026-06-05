import {
  firebaseConfig,
  firebaseFeatureFlags,
  hasFirebaseConfig
} from "./firebase-config.js";

const FIREBASE_APP_CDN =
  "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
const FIREBASE_DATABASE_CDN =
  "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

let firebaseRuntime = null;
let firebaseRuntimePromise = null;
let firebaseWarningShown = false;

function warnFirebaseRuntime(message, error) {
  if (firebaseWarningShown || typeof console === "undefined" || !console.warn) {
    return;
  }

  firebaseWarningShown = true;
  console.warn("[BusTrack] " + message, error || "");
}

function makeDisabledRuntime(reason, error) {
  warnFirebaseRuntime(reason, error);

  return {
    enabled: false,
    app: null,
    database: null,
    databaseSdk: null,
    reason: reason
  };
}

async function loadFirebaseSdk() {
  const appSdk = await import(FIREBASE_APP_CDN);
  const databaseSdk = await import(FIREBASE_DATABASE_CDN);

  return {
    initializeApp: appSdk.initializeApp,
    getApps: appSdk.getApps,
    getDatabase: databaseSdk.getDatabase,
    databaseSdk
  };
}

export function isFirebaseReady() {
  return Boolean(
    firebaseRuntime &&
      firebaseRuntime.app &&
      firebaseRuntime.database &&
      firebaseRuntime.enabled
  );
}

export async function getFirebaseRuntime() {
  if (firebaseRuntime) {
    return firebaseRuntime;
  }

  if (firebaseRuntimePromise) {
    return firebaseRuntimePromise;
  }

  firebaseRuntimePromise = (async function () {
    if (!hasFirebaseConfig() || !firebaseFeatureFlags.realtimeDatabaseEnabled) {
      firebaseRuntime = makeDisabledRuntime(
        "Firebase config or realtimeDatabaseEnabled flag is missing."
      );
      return firebaseRuntime;
    }

    try {
      const sdk = await loadFirebaseSdk();
      const app = sdk.getApps().length
        ? sdk.getApps()[0]
        : sdk.initializeApp(firebaseConfig);
      const database = sdk.getDatabase(app);

      firebaseRuntime = {
        enabled: true,
        app: app,
        database: database,
        databaseSdk: sdk.databaseSdk,
        reason: ""
      };
    } catch (error) {
      firebaseRuntime = makeDisabledRuntime(
        "Firebase SDK could not be loaded. Realtime features will retry after refresh.",
        error
      );
    }

    return firebaseRuntime;
  })();

  return firebaseRuntimePromise;
}
