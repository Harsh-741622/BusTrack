(function () {
  window.BusTrackData = window.BusTrackData || {};

  function byId(list, key) {
    return list.reduce(function (map, item) {
      map[item[key]] = item;
      return map;
    }, {});
  }

  function buildSegmentMap(segments, aliases) {
    var map = byId(segments, "segment_id");
    Object.keys(aliases || {}).forEach(function (segmentId) {
      var alias = aliases[segmentId];
      var canonical = alias && alias.canonical_segment_id ? map[alias.canonical_segment_id] : null;
      if (canonical) {
        map[segmentId] = canonical;
      }
    });
    return map;
  }

  function cloneRoute(route) {
    return {
      route_id: route.route_id,
      route_name: route.route_name,
      direction: route.direction,
      ordered_stops: route.ordered_stops.slice(),
      segments: route.segments.slice(),
      stop_timings: route.stop_timings.map(function (timing) {
        return {
          stop_id: timing.stop_id,
          arrival_time: timing.arrival_time
        };
      }),
      // Route geometry is assembled below from reusable segment geometry so
      // reverse routes and continuity checks use one normalized path source.
      path_coordinates: []
    };
  }

  function buildSegmentCoordinatePath(route, segmentMap, stopMap) {
    var segmentIds = route && Array.isArray(route.segments) ? route.segments : [];
    var points = [];
    var geometryMap = window.BusTrackData && window.BusTrackData.pilotSegmentCoordinates
      ? window.BusTrackData.pilotSegmentCoordinates
      : {};

    // ----------------------------
    // Geometry hardening controls
    // ----------------------------
    // Endpoint tolerance: how far a segment geometry endpoint may drift from stop coordinates.
    var ENDPOINT_TOLERANCE_KM = 0.25; // 250m
    // Join tolerance: how far consecutive segment chains may drift at the join point.
    var JOIN_TOLERANCE_KM = 0.35; // 350m
    // Reject geometries with suspicious internal jumps (usually indicates broken/snapped-to-wrong-road).
    var MAX_INTERNAL_STEP_KM = 6; // 6km
    // Sanity-check stop coordinates (guards against bad/placeholder stop lat/lng creating giant triangles).
    var MAX_SPEED_SANITY_KM_PER_MIN = 2.0; // 120 km/h
    var SANITY_BUFFER = 1.6; // generous buffer

    function normalizePoint(point) {
      if (!Array.isArray(point) || point.length < 2) return null;
      var lat = Number(point[0]);
      var lng = Number(point[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return [lat, lng];
    }

    function haversineKm(a, b) {
      if (!a || !b) return Infinity;
      var lat1 = a[0] * Math.PI / 180;
      var lon1 = a[1] * Math.PI / 180;
      var lat2 = b[0] * Math.PI / 180;
      var lon2 = b[1] * Math.PI / 180;
      var dLat = lat2 - lat1;
      var dLon = lon2 - lon1;
      var sinLat = Math.sin(dLat / 2);
      var sinLon = Math.sin(dLon / 2);
      var h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
      return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
    }

    function samePoint(a, b) {
      if (!a || !b) return false;
      return Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;
    }

    function reverseCopy(list) {
      return (list || []).slice().reverse();
    }

    function isGeometryInternallyContinuous(segPoints) {
      if (!segPoints || segPoints.length < 2) return true;
      var i;
      for (i = 0; i < segPoints.length - 1; i++) {
        var stepKm = haversineKm(segPoints[i], segPoints[i + 1]);
        if (stepKm > MAX_INTERNAL_STEP_KM) {
          return false;
        }
      }
      return true;
    }

    function isStopPairSane(seg, fromStop, toStop) {
      if (!fromStop || !toStop) return { ok: true, km: null };
      var fromLL = [fromStop.latitude, fromStop.longitude];
      var toLL = [toStop.latitude, toStop.longitude];
      var km = haversineKm(fromLL, toLL);

      // If we have explicit segment distance, trust it and sanity check gross mismatches.
      if (seg && typeof seg.distance_km === "number" && seg.distance_km > 0) {
        // If stop-to-stop is wildly larger than known segment length, likely a bad stop coordinate.
        return { ok: km <= seg.distance_km * 3 + 5, km: km };
      }

      // Otherwise, use avg_time_min as a weak sanity limit.
      if (seg && typeof seg.avg_time_min === "number" && seg.avg_time_min > 0) {
        var maxKm = seg.avg_time_min * MAX_SPEED_SANITY_KM_PER_MIN * SANITY_BUFFER;
        return { ok: km <= maxKm, km: km };
      }

      // No metadata -> accept (we can only validate continuity later).
      return { ok: true, km: km };
    }

    function orientAndValidateSegmentGeometry(segmentId, seg, segPoints, fromStop, toStop) {
      if (!segPoints || !segPoints.length) return [];

      // Remove invalid points early.
      segPoints = segPoints.map(normalizePoint).filter(Boolean);
      if (segPoints.length < 2) {
        return [];
      }

      // Sanity check stop coordinate pairs before trusting any geometry.
      var sanity = isStopPairSane(seg, fromStop, toStop);
      if (sanity && sanity.ok === false) {
        if (typeof console !== "undefined" && console.warn) {
          console.warn("[route-geometry] rejecting segment due to insane stop distance:", segmentId, "km=", sanity.km && sanity.km.toFixed ? sanity.km.toFixed(1) : sanity.km);
        }
        return [];
      }

      // Reject geometries with internal "teleport" jumps.
      if (!isGeometryInternallyContinuous(segPoints)) {
        if (typeof console !== "undefined" && console.warn) {
          console.warn("[route-geometry] rejecting segment with internal jumps:", segmentId);
        }
        return [];
      }

      // If stop endpoints exist, ensure direction is correct (reverse when needed).
      if (fromStop && toStop) {
        var fromLL = [fromStop.latitude, fromStop.longitude];
        var toLL = [toStop.latitude, toStop.longitude];
        var forwardScore = haversineKm(segPoints[0], fromLL) + haversineKm(segPoints[segPoints.length - 1], toLL);
        var reverseScore = haversineKm(segPoints[0], toLL) + haversineKm(segPoints[segPoints.length - 1], fromLL);
        if (reverseScore + 0.01 < forwardScore) {
          segPoints = reverseCopy(segPoints);
        }

        // Validate endpoints are close enough to the expected stops; otherwise discard geometry.
        if (haversineKm(segPoints[0], fromLL) > ENDPOINT_TOLERANCE_KM || haversineKm(segPoints[segPoints.length - 1], toLL) > ENDPOINT_TOLERANCE_KM) {
          if (typeof console !== "undefined" && console.warn) {
            console.warn("[route-geometry] rejecting segment with bad endpoints:", segmentId);
          }
          return [];
        }

        // Pin endpoints exactly to stop coordinates for stable stop-aware mapping.
        segPoints[0] = fromLL;
        segPoints[segPoints.length - 1] = toLL;
      }

      return segPoints;
    }

    segmentIds.forEach(function (segmentId, index) {
      var seg = segmentMap && segmentMap[segmentId] ? segmentMap[segmentId] : null;
      var routeFromStopId = route.ordered_stops && route.ordered_stops[index];
      var routeToStopId = route.ordered_stops && route.ordered_stops[index + 1];
      var canonicalSegmentId = seg && seg.segment_id ? seg.segment_id : segmentId;
      var fromStop = routeFromStopId && stopMap[routeFromStopId]
        ? stopMap[routeFromStopId]
        : (seg && seg.from_stop ? stopMap[seg.from_stop] : null);
      var toStop = routeToStopId && stopMap[routeToStopId]
        ? stopMap[routeToStopId]
        : (seg && seg.to_stop ? stopMap[seg.to_stop] : null);
      var segPoints = geometryMap && Array.isArray(geometryMap[canonicalSegmentId])
        ? geometryMap[canonicalSegmentId].map(normalizePoint).filter(Boolean)
        : [];

      // Orientation, endpoint validation, and internal continuity checks.
      segPoints = orientAndValidateSegmentGeometry(segmentId, seg, segPoints, fromStop, toStop);

      if (!segPoints.length) {
        if (typeof console !== "undefined" && console.warn) {
          console.warn("[route-geometry] missing reusable segment geometry:", segmentId);
        }
      }

      if (!segPoints.length) {
        return;
      }

      if (!points.length) {
        points = segPoints.slice();
        return;
      }

      // Avoid duplicating the join point.
      if (samePoint(points[points.length - 1], segPoints[0])) {
        points = points.concat(segPoints.slice(1));
      } else {
        // Hard continuity guard: if the join is wildly disconnected, don't corrupt the whole route.
        var joinGapKm = haversineKm(points[points.length - 1], segPoints[0]);
        if (joinGapKm > JOIN_TOLERANCE_KM) {
          // Attempt a last-chance reverse (covers cases where the route traverses B→A but only A→B geometry exists).
          var reversed = reverseCopy(segPoints);
          var reversedGapKm = haversineKm(points[points.length - 1], reversed[0]);
          if (reversedGapKm + 0.01 < joinGapKm && reversedGapKm <= JOIN_TOLERANCE_KM) {
            segPoints = reversed;
            points = points.concat(segPoints.slice(1));
            return;
          }

          if (typeof console !== "undefined" && console.warn) {
            console.warn(
              "[route-geometry] discontinuity at join, skipping segment:",
              segmentId,
              "gapKm=",
              joinGapKm.toFixed(2)
            );
          }

          // Do not append a straight stop-to-stop repair line. A disconnected
          // segment should be visible in validation rather than hidden on the map.
        } else {
          points = points.concat(segPoints);
        }
      }
    });

    return points;
  }

  function getStopNames(route, stopMap) {
    return route.ordered_stops
      .map(function (stopId) {
        return stopMap[stopId];
      })
      .filter(Boolean)
      .map(function (stop) {
        return stop.stop_name;
      });
  }

  function getRouteSchedule(route) {
    var timings = route && Array.isArray(route.stop_timings) ? route.stop_timings : [];
    return timings.reduce(function (schedule, timing) {
      if (timing && timing.stop_id) {
        schedule[timing.stop_id] = timing.arrival_time;
      }
      return schedule;
    }, {});
  }

  function getTripSchedule(trip, route) {
    var timings = trip && Array.isArray(trip.stop_times) && trip.stop_times.length
      ? trip.stop_times
      : (route && Array.isArray(route.stop_timings) ? route.stop_timings : []);

    return timings.reduce(function (schedule, timing) {
      if (timing && timing.stop_id) {
        schedule[timing.stop_id] = timing.arrival_time;
      }
      return schedule;
    }, {});
  }

  function getActiveTripForBus(busId, trips) {
    return trips.find(function (trip) {
      return trip.bus_id === busId && trip.live_status === "RUNNING";
    }) || null;
  }

  function buildLegacyData(network) {
    var stopMap = byId(network.stops, "stop_id");
    var routeMap = byId(network.routes, "route_id");
    var busMap = byId(network.buses, "bus_id");
    var cities = {};
    var legacyStops = {};
    var legacyBuses = [];
    var legacyRoutes = {};
    var directLiveBuses = [];
    var driverBuses = [];

    // ------------------------------------------------------------
    // Passenger search dataset: trip-indexed (operational schedule)
    // ------------------------------------------------------------
    (Array.isArray(network.trips) ? network.trips : []).forEach(function (trip) {
      var bus = trip && trip.bus_id ? busMap[trip.bus_id] : null;
      var route = trip && trip.route_id ? routeMap[trip.route_id] : null;
      var stopNames;
      var routePoints;
      var key;
      var schedule;

      if (!bus || !route) {
        return;
      }

      stopNames = getStopNames(route, stopMap);
      routePoints = route.path_coordinates && route.path_coordinates.length
        ? route.path_coordinates.slice()
        : [];

      if (!stopNames.length) {
        return;
      }

      key = bus.bus_number + "::" + trip.trip_id;
      schedule = getTripSchedule(trip, route);

      if (!cities[network.service_area]) {
        cities[network.service_area] = [];
      }
      if (cities[network.service_area].indexOf(stopNames[0]) === -1) {
        cities[network.service_area].push(stopNames[0]);
      }

      legacyStops[stopNames[0]] = stopNames;
      legacyRoutes[key] = routePoints;
      if (!legacyRoutes[bus.bus_number]) {
        legacyRoutes[bus.bus_number] = routePoints;
      }

      legacyBuses.push({
        // Unique key for this operational trip (required to show repeated corridor loops).
        key: key,
        busKey: key,

        // Display + realtime identifiers.
        busNo: bus.bus_number,
        displayBusNo: bus.bus_number,
        physicalBusNo: bus.bus_number,
        realtimeBusId: bus.bus_number,
        busId: bus.bus_number,
        internalBusId: bus.bus_id,

        tripId: trip.trip_id,
        routeId: route.route_id,
        assignedRoute: bus.assigned_route,
        direction: route.direction,
        liveStatus: trip.live_status,
        delayMinutes: trip.delay_minutes || 0,
        serviceDate: trip.service_date || "",
        lifecycleState: trip.lifecycle_state || "",
        scheduledDeparture: trip.scheduled_departure || "",

        state: network.service_area,
        city: stopNames[0],
        to: stopNames[stopNames.length - 1],
        via: stopNames.slice(1, -1),

        // Operational geometry + schedule (per-trip stop_times override route timings).
        routePoints: routePoints,
        stops: stopNames,
        stopIds: route.ordered_stops ? route.ordered_stops.slice() : [],
        segmentIds: route.segments ? route.segments.slice() : [],
        schedule: schedule
      });
    });

    // ------------------------------------------------------------
    // Direct-live list + driver portal list: bus-indexed (unchanged)
    // ------------------------------------------------------------
    (Array.isArray(network.buses) ? network.buses : []).forEach(function (bus) {
      var route = routeMap[bus.assigned_route];
      var trip = getActiveTripForBus(bus.bus_id, network.trips);
      var stopNames;
      var routePoints;
      var metadata = bus.route_metadata || {};
      var delayStatus = trip && trip.delay_minutes
        ? trip.delay_minutes + " min delay"
        : "On schedule";

      if (!route) {
        return;
      }

      stopNames = getStopNames(route, stopMap);
      routePoints = route.path_coordinates.slice();

      if (!stopNames.length || !routePoints.length) {
        return;
      }

      directLiveBuses.push({
        busNo: bus.bus_number,
        busId: bus.bus_id,
        routeId: route.route_id,
        assignedRoute: bus.assigned_route,
        routeName: route.route_name,
        from: stopNames[0],
        to: stopNames[stopNames.length - 1],
        stops: stopNames,
        routePoints: routePoints
      });

      driverBuses.push({
        busNo: bus.bus_number,
        busId: bus.bus_id,
        routeId: route.route_id,
        routeCode: route.route_id,
        assignedRoute: bus.assigned_route,
        routeName: route.route_name,
        driverName: "GSRTC Pilot Driver",
        shiftTime: metadata.service_window || "Pilot shift",
        currentStop: stopNames[0],
        nextStop: stopNames[1] || stopNames[0],
        etaStatus: "Realtime ETA ready",
        occupancy: metadata.default_occupancy || "Medium",
        gpsAccuracy: "3m",
        liveStatus: trip ? trip.live_status : "Ready",
        battery: "82%",
        passengerLoad: metadata.default_load || "Pilot load",
        delayStatus: delayStatus,
        routePoints: routePoints,
        stops: stopNames,
        // Learning-ready metadata (safe additive fields; UI ignores them).
        stopIds: route.ordered_stops.slice(),
        segmentIds: route.segments.slice(),
        stopSequence: route.ordered_stops
          .map(function (stopId) {
            var stop = stopMap[stopId];
            if (!stop) {
              return null;
            }
            return {
              stop_id: stop.stop_id,
              stop_name: stop.stop_name,
              latitude: stop.latitude,
              longitude: stop.longitude
            };
          })
          .filter(Boolean),
        activeTripId: trip ? trip.trip_id : "",
        schedule: getRouteSchedule(route)
      });
    });

    return {
      cities: cities,
      stops: legacyStops,
      buses: legacyBuses,
      routes: legacyRoutes,
      directLiveBuses: directLiveBuses,
      driverBuses: driverBuses
    };
  }

  var routeCoordinates = window.BusTrackData.pilotRouteCoordinates || {};
  var pilotNetwork = {
    network_id: "gsrtc-bardoli-operational-corridor",
    network_name: "GSRTC Bardoli Operational Corridor",
    service_area: "GSRTC Pilot",
    city_name: "Bardoli Navsari Corridor",
    stops: (window.BusTrackData.pilotStops || []).slice(),
    segments: (window.BusTrackData.segments || []).slice(),
    routes: (window.BusTrackData.pilotRoutes || []).map(cloneRoute),
    buses: (window.BusTrackData.pilotBuses || []).slice(),
    trips: (window.BusTrackData.trips || []).slice(),
    route_coordinates: routeCoordinates
  };

  pilotNetwork.stopMap = byId(pilotNetwork.stops, "stop_id");
  pilotNetwork.segmentAliasMap = window.BusTrackData.segmentAliases || {};
  pilotNetwork.segmentMap = buildSegmentMap(pilotNetwork.segments, pilotNetwork.segmentAliasMap);
  pilotNetwork.routeMap = byId(pilotNetwork.routes, "route_id");
  pilotNetwork.busMap = byId(pilotNetwork.buses, "bus_id");
  pilotNetwork.tripMap = byId(pilotNetwork.trips, "trip_id");

  pilotNetwork.routes.forEach(function (route) {
    if (!route.path_coordinates.length) {
      route.path_coordinates =
        buildSegmentCoordinatePath(route, pilotNetwork.segmentMap, pilotNetwork.stopMap) ||
        [];

      if (!route.path_coordinates.length) {
        if (typeof console !== "undefined" && console.warn) {
          console.warn("[route-geometry] route has no assembled segment geometry:", route.route_id);
        }
      }
    }
  });

  pilotNetwork.legacy = buildLegacyData(pilotNetwork);

  window.BusTrackData.pilotNetwork = pilotNetwork;
})();
