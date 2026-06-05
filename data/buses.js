(function () {
  window.BusTrackData = window.BusTrackData || {};

  window.BusTrackData.buses =
    (window.BusTrackData.pilotNetwork &&
      window.BusTrackData.pilotNetwork.buses) ||
    [];

  window.BusTrackData.legacyBuses =
    (window.BusTrackData.pilotNetwork &&
      window.BusTrackData.pilotNetwork.legacy.buses) ||
    [];

  window.BusTrackData.directLiveBuses =
    (window.BusTrackData.pilotNetwork &&
      window.BusTrackData.pilotNetwork.legacy.directLiveBuses) ||
    [];
})();
