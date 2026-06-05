(function () {
  window.BusTrackDriver = window.BusTrackDriver || {};

  var UPDATE_INTERVAL_MS = 3000;
  var STEPS_PER_SEGMENT = 4;
  var SIMULATED_SPEED_MPS = 8;

  function createGpsSimulationService() {
    var intervalId = null;
    var routePoints = [];
    var segmentIndex = 0;
    var stepIndex = 0;

    function isWatching() {
      return intervalId !== null;
    }

    function formatTime() {
      return new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    }

    function interpolatePoint(start, end, ratio) {
      return {
        latitude: start[0] + (end[0] - start[0]) * ratio,
        longitude: start[1] + (end[1] - start[1]) * ratio
      };
    }

    function getHeading(start, end) {
      var deltaLat = end[0] - start[0];
      var deltaLng = end[1] - start[1];
      var angle = Math.atan2(deltaLng, deltaLat) * 180 / Math.PI;

      return Math.round((angle + 360) % 360);
    }

    function buildLocationPayload() {
      var start = routePoints[segmentIndex];
      var end = routePoints[(segmentIndex + 1) % routePoints.length];
      var ratio = stepIndex / STEPS_PER_SEGMENT;
      var point = interpolatePoint(start, end, ratio);
      var payload = {
        latitude: point.latitude,
        longitude: point.longitude,
        accuracy: 5,
        speed: SIMULATED_SPEED_MPS,
        heading: getHeading(start, end),
        updatedAt: formatTime(),
        simulated: true
      };

      stepIndex += 1;

      if (stepIndex > STEPS_PER_SEGMENT) {
        stepIndex = 0;
        segmentIndex = (segmentIndex + 1) % routePoints.length;
      }

      return payload;
    }

    function start(options, handlers) {
      routePoints = options && Array.isArray(options.routePoints)
        ? options.routePoints.slice()
        : [];

      if (routePoints.length < 2) {
        if (handlers && handlers.onError) {
          handlers.onError({
            code: "simulation_route_missing",
            message: "Simulation route coordinates are not available for this bus."
          });
        }

        return {
          ok: false,
          reason: "simulation_route_missing"
        };
      }

      stop();
      segmentIndex = 0;
      stepIndex = 0;

      if (handlers && handlers.onStart) {
        handlers.onStart({
          status: "simulation_active"
        });
      }

      function emitLocation() {
        if (handlers && handlers.onLocation) {
          handlers.onLocation(buildLocationPayload());
        }
      }

      emitLocation();
      intervalId = window.setInterval(emitLocation, UPDATE_INTERVAL_MS);

      return {
        ok: true,
        simulated: true
      };
    }

    function stop() {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }

      intervalId = null;

      return {
        ok: true
      };
    }

    return {
      start: start,
      stop: stop,
      isWatching: isWatching,
      isSupported: function () {
        return true;
      }
    };
  }

  window.BusTrackDriver.gpsSimulationService = createGpsSimulationService();
})();
