(function () {
  window.BusTrackData = window.BusTrackData || {};
  window.BusTrackData.cities =
    (window.BusTrackData.pilotNetwork &&
      window.BusTrackData.pilotNetwork.legacy.cities) ||
    {};
})();
