(function () {
  window.BusTrackData = window.BusTrackData || {};

  window.BusTrackData.stops =
    (window.BusTrackData.pilotNetwork &&
      window.BusTrackData.pilotNetwork.stops) ||
    [];

  window.BusTrackData.legacyStops =
    (window.BusTrackData.pilotNetwork &&
      window.BusTrackData.pilotNetwork.legacy.stops) ||
    {};
})();
