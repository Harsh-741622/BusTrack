// Firebase project settings live here.
// Keep this placeholder safe for the public prototype. Fill it in later from
// your Firebase console when you are ready to connect the Realtime Database.
export const firebaseConfig = {
 apiKey: "AIzaSyBsu0T0-ng0pKjwxIx3LkhJobS6qf6gDj8",
  authDomain: "bustrack-cf531.firebaseapp.com",
  databaseURL: "https://bustrack-cf531-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "bustrack-cf531",
  storageBucket: "bustrack-cf531.firebasestorage.app",
  messagingSenderId: "814963168150",
  appId: "1:814963168150:web:ce7735ba8c2d0e68c143b7",
  measurementId: "G-X46RZQ2FD4"
};

export const firebaseFeatureFlags = {
  realtimeDatabaseEnabled: true,
  liveBusTrackingEnabled: true,
  etaUpdatesEnabled: false,
  crowdUpdatesEnabled: true,
  socialFeaturesEnabled: false
};

export function hasFirebaseConfig() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.databaseURL &&
      firebaseConfig.projectId &&
      firebaseConfig.appId
  );
}
