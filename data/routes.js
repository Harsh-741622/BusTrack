(function () {
  window.BusTrackData = window.BusTrackData || {};

  window.BusTrackData.routes =
    (window.BusTrackData.pilotNetwork &&
      window.BusTrackData.pilotNetwork.routes) ||
    [];

  window.BusTrackData.legacyRoutes =
    (window.BusTrackData.pilotNetwork &&
      window.BusTrackData.pilotNetwork.legacy.routes) ||
    {};
})();
