import { firebaseFeatureFlags, hasFirebaseConfig } from "./firebase-config.js";
import { getFirebaseRuntime, isFirebaseReady } from "./firebase-app.js";
import { realtimePaths } from "./realtime-paths.js";
import { realtimeService } from "./realtime-service.js";
import { liveBusService } from "./live-bus-service.js";
import { socialService } from "./social-service.js";
import { passengerJourneyService } from "./passenger-journey-service.js";
import { operationalJourneyLogService } from "./operational-journey-log-service.js";
import { timeLearningService } from "./time-learning-service.js";
import {
  getLatestTrace,
  getTraces,
  isDebugEnabled,
  setDebugEnabled,
  trace
} from "./observability.js";
import {
  consolidateOperationalState,
  createOperationalStateTracker,
  operationalStateDefaults,
  selfTestOperationalState
} from "./operational-state.js";
import {
  applyStressToTimeline,
  buildReplayTimeline,
  createReplayPlayer,
  summarizeReplay
} from "./replay-engine.js";
import {
  applyTrustToConfidence,
  computeTrustFusion,
  createTrustFusionTracker,
  trustFusionDefaults,
  updateCrowdConsistency
} from "./trust-fusion.js";
import {
  createOperationalEventTracker,
  detectOperationalEvents,
  getPrimaryOperationalEvent,
  operationalEventDefaults
} from "./operational-event-intelligence.js";
import {
  computeScheduledEta,
  computeScheduleAdherence,
  computeTripIntelligence,
  computeTripOperationalHealth,
  computeTripProgress,
  getMinutesOfDayFor,
  getServiceDateKey,
  getTripWindowForRoute,
  identifyActiveTrip,
  isTripWithinServiceWindow,
  tripIntelligenceDefaults
} from "./trip-intelligence.js";

window.BusTrackFirebase = {
  flags: firebaseFeatureFlags,
  hasConfig: hasFirebaseConfig,
  getRuntime: getFirebaseRuntime,
  isReady: isFirebaseReady,
  paths: realtimePaths,
  realtime: realtimeService,
  liveBuses: liveBusService,
  passengerJourneys: passengerJourneyService,
  operationalJourneyLog: operationalJourneyLogService,
  operationalEvents: {
    defaults: operationalEventDefaults,
    createOperationalEventTracker: createOperationalEventTracker,
    detectOperationalEvents: detectOperationalEvents,
    getPrimaryOperationalEvent: getPrimaryOperationalEvent
  },
  tripIntelligence: {
    defaults: tripIntelligenceDefaults,
    getServiceDateKey: getServiceDateKey,
    getMinutesOfDayFor: getMinutesOfDayFor,
    getTripWindowForRoute: getTripWindowForRoute,
    identifyActiveTrip: identifyActiveTrip,
    isTripWithinServiceWindow: isTripWithinServiceWindow,
    computeScheduledEta: computeScheduledEta,
    computeTripProgress: computeTripProgress,
    computeScheduleAdherence: computeScheduleAdherence,
    computeTripOperationalHealth: computeTripOperationalHealth,
    computeTripIntelligence: computeTripIntelligence
  },
  timeLearning: timeLearningService,
  observability: {
    isDebugEnabled: isDebugEnabled,
    setDebugEnabled: setDebugEnabled,
    trace: trace,
    getTraces: getTraces,
    getLatestTrace: getLatestTrace
  },
  operationalState: {
    defaults: operationalStateDefaults,
    createOperationalStateTracker: createOperationalStateTracker,
    consolidateOperationalState: consolidateOperationalState,
    selfTestOperationalState: selfTestOperationalState
  },
  replay: {
    buildReplayTimeline: buildReplayTimeline,
    createReplayPlayer: createReplayPlayer,
    applyStressToTimeline: applyStressToTimeline,
    summarizeReplay: summarizeReplay
  },
  trustFusion: {
    defaults: trustFusionDefaults,
    createTrustFusionTracker: createTrustFusionTracker,
    updateCrowdConsistency: updateCrowdConsistency,
    computeTrustFusion: computeTrustFusion,
    applyTrustToConfidence: applyTrustToConfidence
  },
  social: socialService
};

window.dispatchEvent(
  new CustomEvent("busTrackFirebaseReady", {
    detail: {
      configured: hasFirebaseConfig(),
      flags: firebaseFeatureFlags
    }
  })
);
