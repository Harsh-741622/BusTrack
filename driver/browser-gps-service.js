(function () {
  window.BusTrackDriver = window.BusTrackDriver || {};

  var UPDATE_INTERVAL_MS = 3000;

  function createBrowserGpsService() {
    var watchId = null;
    var lastEmitAt = 0;
    var permissionStatus = null;
    var startToken = 0;
    var warnedIssues = {};

    function warnGpsIssue(code, message) {
      if (
        warnedIssues[code] ||
        typeof console === "undefined" ||
        !console.warn
      ) {
        return;
      }

      warnedIssues[code] = true;
      console.warn("[BusTrack] GPS issue: " + message);
    }

    function isSupported() {
      return Boolean(navigator.geolocation);
    }

    function isWatching() {
      return watchId !== null;
    }

    function getPermissionState() {
      if (!navigator.permissions || typeof navigator.permissions.query !== "function") {
        return Promise.resolve("unknown");
      }

      return navigator.permissions
        .query({ name: "geolocation" })
        .then(function (status) {
          permissionStatus = status;
          return status.state || "unknown";
        })
        .catch(function () {
          return "unknown";
        });
    }

    function getPermissionDeniedMessage() {
      return "Location permission is blocked. Enable location access for this site, then tap Resume Tracking.";
    }

    function getErrorMessage(error) {
      if (!error) {
        return "Unable to read browser GPS.";
      }

      if (error.code === 1 || error.code === "permission_denied") {
        return getPermissionDeniedMessage();
      }

      if (error.code === 2 || error.code === "position_unavailable") {
        return "GPS signal unavailable. Check device location services or move near a clear signal area.";
      }

      if (error.code === 3 || error.code === "timeout") {
        return "Waiting for GPS signal. Keep this page open and try again.";
      }

      return error.message || "Unable to read browser GPS.";
    }

    function getErrorCode(error) {
      if (!error) {
        return "unknown";
      }

      if (error.code === 1) {
        return "permission_denied";
      }

      if (error.code === 2) {
        return "position_unavailable";
      }

      if (error.code === 3) {
        return "timeout";
      }

      return error.code || "unknown";
    }

    function normalizeCoordinate(value) {
      return typeof value === "number" && !Number.isNaN(value) ? value : null;
    }

    function buildLocationPayload(position) {
      var coords = position.coords || {};

      return {
        latitude: normalizeCoordinate(coords.latitude),
        longitude: normalizeCoordinate(coords.longitude),
        accuracy: normalizeCoordinate(coords.accuracy),
        speed: normalizeCoordinate(coords.speed),
        heading: normalizeCoordinate(coords.heading),
        updatedAt: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        })
      };
    }

    function start(handlers) {
      if (!isSupported()) {
        if (handlers && handlers.onError) {
          handlers.onError({
            code: "unsupported",
            message: "Browser GPS is not available on this device or browser."
          });
        }

        return {
          ok: false,
          reason: "unsupported"
        };
      }

      if (isWatching()) {
        stop();
      }

      lastEmitAt = 0;
      startToken += 1;

      var currentStartToken = startToken;

      if (handlers && handlers.onStart) {
        handlers.onStart({
          status: "checking_permission"
        });
      }

      getPermissionState().then(function (permissionState) {
        if (currentStartToken !== startToken) {
          return;
        }

        if (permissionState === "denied") {
          if (handlers && handlers.onError) {
            warnGpsIssue("permission_denied", getPermissionDeniedMessage());
            handlers.onError({
              code: "permission_denied",
              permissionState: permissionState,
              message: getPermissionDeniedMessage()
            });
          }
          return;
        }

        if (handlers && handlers.onStart) {
          handlers.onStart({
            status: permissionState === "granted" ? "waiting_for_gps" : "requesting_permission",
            permissionState: permissionState
          });
        }

        watchId = navigator.geolocation.watchPosition(
          function (position) {
            var now = Date.now();

            if (lastEmitAt && now - lastEmitAt < UPDATE_INTERVAL_MS) {
              return;
            }

            lastEmitAt = now;

            if (handlers && handlers.onLocation) {
              handlers.onLocation(buildLocationPayload(position));
            }
          },
          function (error) {
            if (handlers && handlers.onError) {
              warnGpsIssue(getErrorCode(error), getErrorMessage(error));
              handlers.onError({
                code: getErrorCode(error),
                permissionState: permissionStatus && permissionStatus.state,
                message: getErrorMessage(error)
              });
            }
          },
          {
            enableHighAccuracy: true,
            maximumAge: 2000,
            timeout: 12000
          }
        );
      });

      return {
        ok: true,
        watchId: watchId
      };
    }

    function stop() {
      if (watchId !== null && isSupported()) {
        navigator.geolocation.clearWatch(watchId);
      }

      watchId = null;
      lastEmitAt = 0;
      startToken += 1;

      return {
        ok: true
      };
    }

    return {
      start: start,
      stop: stop,
      isWatching: isWatching,
      isSupported: isSupported,
      getPermissionState: getPermissionState
    };
  }

  window.BusTrackDriver.browserGpsService = createBrowserGpsService();
})();
