(function () {
  window.BusTrackDriver = window.BusTrackDriver || {};

  var transitData = window.BusTrackData || {};
  var pilotNetwork = transitData.pilotNetwork;

  window.BusTrackDriver.demoBuses =
    (pilotNetwork && pilotNetwork.legacy.driverBuses) ||
    [];

  window.BusTrackDriver.findBus = function (busNo) {
    var normalized = String(busNo || "").trim().toUpperCase();

    return window.BusTrackDriver.demoBuses.find(function (bus) {
      return bus.busNo.toUpperCase() === normalized;
    });
  };
})();
