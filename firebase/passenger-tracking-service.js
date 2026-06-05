import { liveBusService } from "./live-bus-service.js";
import { getSignalHealth } from "./signal-health.js";

function normalizeLiveLocation(value) {
  if (!value || typeof value !== "object") {
    const offlineHealth = getSignalHealth(null, "offline");

    return {
      available: false,
      busId: "",
      latitude: null,
      longitude: null,
      speed: null,
      accuracy: null,
      timestamp: null,
      trackingStatus: "offline",
      sessionActive: false,
      signalHealth: offlineHealth,
      // Stop-aware progression (optional; may be null when driver doesn't publish it).
      currentStopIndex: null,
      nextStopIndex: null,
      currentStopId: "",
      currentStopName: "",
      nextStopId: "",
      nextStopName: "",
      stopsTotal: null,
      stopsRemaining: null,
      atStop: false,
      approachingStop: false,
      tripId: "",
      tripLifecycle: "",
      tripDirection: "",
      tripProgressPercent: null,
      tripNearingCompletion: false,
      tripScheduleAdherence: "",
      tripScheduleLabel: "",
      tripDelayMinutes: null,
      tripOperationalHealth: "",
      operationalStateLabel: "",
      operationalStateState: "",
      operationalStateTone: "",
      operationalStateRank: null,
      operationalStateConfidence: null,
      operationalStateReason: "",
      trustScore: null,
      trustLabel: "",
      trustReason: ""
    };
  }

  const trackingStatus = value.tracking_status || "offline";
  const signalHealth = getSignalHealth(value.timestamp || null, trackingStatus);

  return {
    available: typeof value.latitude === "number" && typeof value.longitude === "number",
    busId: value.bus_id || "",
    latitude: typeof value.latitude === "number" ? value.latitude : null,
    longitude: typeof value.longitude === "number" ? value.longitude : null,
    speed: typeof value.speed === "number" ? value.speed : null,
    accuracy: typeof value.accuracy === "number" ? value.accuracy : null,
    timestamp: value.timestamp || null,
    trackingStatus: trackingStatus,
    sessionActive: !!value.session_active,
    signalHealth: signalHealth,
    currentStopIndex:
      typeof value.current_stop_index === "number" ? value.current_stop_index : null,
    nextStopIndex:
      typeof value.next_stop_index === "number" ? value.next_stop_index : null,
    currentStopId: value.current_stop_id || "",
    currentStopName: value.current_stop_name || "",
    nextStopId: value.next_stop_id || "",
    nextStopName: value.next_stop_name || "",
    stopsTotal: typeof value.stops_total === "number" ? value.stops_total : null,
    stopsRemaining:
      typeof value.stops_remaining === "number" ? value.stops_remaining : null,
    atStop: value.at_stop === true,
    approachingStop: value.approaching_stop === true,
    tripId: value.trip_id || "",
    tripLifecycle: value.trip_lifecycle || "",
    tripDirection: value.trip_direction || "",
    tripProgressPercent:
      typeof value.trip_progress_percent === "number" ? value.trip_progress_percent : null,
    tripNearingCompletion: value.trip_nearing_completion === true,
    tripScheduleAdherence: value.trip_schedule_adherence || "",
    tripScheduleLabel: value.trip_schedule_label || "",
    tripDelayMinutes:
      typeof value.trip_delay_minutes === "number" ? value.trip_delay_minutes : null,
      tripOperationalHealth: value.trip_operational_health || "",
      operationalStateLabel: value.operational_state_label || "",
      operationalStateState: value.operational_state_state || "",
      operationalStateTone: value.operational_state_tone || "",
      operationalStateRank:
        typeof value.operational_state_rank === "number" ? value.operational_state_rank : null,
      operationalStateConfidence:
        typeof value.operational_state_confidence === "number"
          ? value.operational_state_confidence
          : null,
      operationalStateReason: value.operational_state_reason || "",
      trustScore: typeof value.trust_score === "number" ? value.trust_score : null,
      trustLabel: value.trust_label || "",
      trustReason: value.trust_reason || ""
  };
}

export const passengerTrackingService = {
  subscribeToBusLocation: async function (busId, handlers) {
    return liveBusService.subscribeToBusLocation(
      busId,
      function (value) {
        if (handlers && handlers.onLocation) {
          handlers.onLocation(normalizeLiveLocation(value));
        }
      },
      function (error) {
        if (handlers && handlers.onError) {
          handlers.onError(error);
        }
      }
    );
  }
};

window.BusTrackPassengerTracking = passengerTrackingService;
window.dispatchEvent(new CustomEvent("busTrackPassengerTrackingReady"));
