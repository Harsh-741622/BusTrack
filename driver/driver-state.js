(function () {
  window.BusTrackDriver = window.BusTrackDriver || {};

  var state = {
    selectedBus: null,
    journeyStatus: "inactive",
    gpsStatus: "Standby",
    connectionStatus: "Offline demo",
    lastUpdate: "Not started"
  };

  function markUpdated() {
    state.lastUpdate = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }

  window.BusTrackDriver.state = {
    get: function () {
      return {
        selectedBus: state.selectedBus,
        journeyStatus: state.journeyStatus,
        gpsStatus: state.gpsStatus,
        connectionStatus: state.connectionStatus,
        lastUpdate: state.lastUpdate
      };
    },

    selectBus: function (bus) {
      state.selectedBus = bus;
      markUpdated();
    },

    startJourney: function () {
      state.journeyStatus = "active";
      state.gpsStatus = "Connecting GPS";
      state.connectionStatus = "Connecting";
      markUpdated();
    },

    pauseJourney: function () {
      state.journeyStatus = "paused";
      state.gpsStatus = "Paused";
      markUpdated();
    },

    resumeJourney: function () {
      state.journeyStatus = "active";
      state.gpsStatus = "GPS ready";
      markUpdated();
    },

    endJourney: function () {
      state.journeyStatus = "ended";
      state.gpsStatus = "Standby";
      state.connectionStatus = "Offline demo";
      markUpdated();
    },

    setGpsStatus: function (value) {
      state.gpsStatus = value;
      markUpdated();
    },

    setConnectionStatus: function (value) {
      state.connectionStatus = value;
      markUpdated();
    }
  };
})();
