// Centralized database paths. Keeping paths here makes future React/Next.js
// migration easier because components/services can share the same contract.
export const realtimePaths = {
  busLocation: function (busId) {
    return "liveBuses/" + encodeURIComponent(busId) + "/location";
  },

  busEta: function (busId, stopId) {
    return (
      "liveBuses/" +
      encodeURIComponent(busId) +
      "/etas/" +
      encodeURIComponent(stopId)
    );
  },

  busStatus: function (busId) {
    return "liveBuses/" + encodeURIComponent(busId) + "/status";
  },

  activeDriverSession: function (busId) {
    return "liveBuses/" + encodeURIComponent(busId) + "/active_driver_session";
  },

  routeBuses: function (routeId) {
    return "routes/" + encodeURIComponent(routeId) + "/activeBuses";
  },

  crowdUpdates: function (busId) {
    return "crowdUpdates/" + encodeURIComponent(busId);
  },

  crowdUpdateItem: function (busId, updateId) {
    return (
      "crowdUpdates/" +
      encodeURIComponent(busId) +
      "/" +
      encodeURIComponent(updateId)
    );
  },

  operationalJourneyEvents: function (busId, dateKey) {
    return (
      "operationalJourneyLogs/" +
      encodeURIComponent(busId) +
      "/" +
      encodeURIComponent(dateKey || "undated")
    );
  },

  userPresence: function (userId) {
    return "presence/" + encodeURIComponent(userId);
  },

  socialRoom: function (roomId) {
    return "socialRooms/" + encodeURIComponent(roomId);
  },

  socialMessages: function (roomId) {
    return "socialRooms/" + encodeURIComponent(roomId) + "/messages";
  },

  /**
   * Adaptive segment timing learning buckets.
   *
   * Schema:
   * learning/segmentTimings/{routeId}/{segmentId}/{dayType}/{bucketKey}
   *
   * Example:
   * learning/segmentTimings/ROUTE_BARDOLI_NAVSARI_V1/SEG_LINEAR_TO_SARBHON/weekday/13:30
   */
  segmentTimingBucket: function (routeId, segmentId, dayType, bucketKey) {
    return (
      "learning/segmentTimings/" +
      encodeURIComponent(routeId) +
      "/" +
      encodeURIComponent(segmentId) +
      "/" +
      encodeURIComponent(dayType || "all") +
      "/" +
      encodeURIComponent(bucketKey || "all")
    );
  },

  /**
   * Lightweight operational intelligence (active events) for a bus.
   *
   * Schema:
   * liveBuses/{busId}/events/active/{eventType}
   */
  busEventsActive: function (busId) {
    return "liveBuses/" + encodeURIComponent(busId) + "/events/active";
  },

  busEvent: function (busId, eventType) {
    return (
      "liveBuses/" +
      encodeURIComponent(busId) +
      "/events/active/" +
      encodeURIComponent(eventType)
    );
  }
};
