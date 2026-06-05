export const etaDefaults = {
  defaultSpeedKmph: 28,
  arrivingSoonDistanceKm: 0.35,
  arrivingSoonMinutes: 1
};

function normalizePoint(point) {
  if (Array.isArray(point) && point.length >= 2) {
    return {
      latitude: Number(point[0]),
      longitude: Number(point[1])
    };
  }

  if (point && typeof point === "object") {
    return {
      latitude: Number(point.latitude),
      longitude: Number(point.longitude)
    };
  }

  return null;
}

function isValidPoint(point) {
  return (
    point &&
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude)
  );
}

function normalizeSpeedKmph(speed, fallbackSpeedKmph) {
  if (typeof speed === "number" && Number.isFinite(speed) && speed > 0) {
    return speed * 3.6;
  }

  return Number(fallbackSpeedKmph) || etaDefaults.defaultSpeedKmph;
}

function toRadians(value) {
  return value * Math.PI / 180;
}

function projectPointOnSegment(point, segmentStart, segmentEnd) {
  const x = point.longitude;
  const y = point.latitude;
  const x1 = segmentStart.longitude;
  const y1 = segmentStart.latitude;
  const x2 = segmentEnd.longitude;
  const y2 = segmentEnd.latitude;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  const ratio = lengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lengthSquared));

  return {
    point: {
      latitude: y1 + dy * ratio,
      longitude: x1 + dx * ratio
    },
    ratio: ratio
  };
}

export function calculateDistance(pointA, pointB) {
  const start = normalizePoint(pointA);
  const end = normalizePoint(pointB);

  if (!isValidPoint(start) || !isValidPoint(end)) {
    return null;
  }

  const lat1 = toRadians(start.latitude);
  const lat2 = toRadians(end.latitude);
  const deltaLat = toRadians(end.latitude - start.latitude);
  const deltaLng = toRadians(end.longitude - start.longitude);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return 6371 * c;
}

export function calculateRouteDistance(routePoints, livePoint, targetIndex) {
  const route = Array.isArray(routePoints)
    ? routePoints.map(normalizePoint).filter(isValidPoint)
    : [];
  const busPoint = normalizePoint(livePoint);
  const finalIndex = Math.min(
    route.length - 1,
    Math.max(0, Number.isFinite(targetIndex) ? targetIndex : route.length - 1)
  );
  let bestProjection = null;
  let bestSegmentIndex = 0;
  let bestDistance = Infinity;
  let distanceKm = 0;
  let i;

  if (!route.length || !isValidPoint(busPoint)) {
    return null;
  }

  if (route.length === 1 || finalIndex === 0) {
    return calculateDistance(busPoint, route[finalIndex]);
  }

  for (i = 0; i < finalIndex; i++) {
    const projection = projectPointOnSegment(busPoint, route[i], route[i + 1]);
    const projectionDistance = calculateDistance(busPoint, projection.point);

    if (projectionDistance !== null && projectionDistance < bestDistance) {
      bestDistance = projectionDistance;
      bestProjection = projection;
      bestSegmentIndex = i;
    }
  }

  if (!bestProjection) {
    return calculateDistance(busPoint, route[finalIndex]);
  }

  distanceKm += calculateDistance(bestProjection.point, route[bestSegmentIndex + 1]) || 0;

  for (i = bestSegmentIndex + 1; i < finalIndex; i++) {
    distanceKm += calculateDistance(route[i], route[i + 1]) || 0;
  }

  return Math.max(0, distanceKm);
}

export function calculateETA(options) {
  options = options || {};

  const distanceKm =
    typeof options.distanceKm === "number" && Number.isFinite(options.distanceKm)
      ? options.distanceKm
      : calculateRouteDistance(
          options.routePoints,
          options.livePoint,
          options.targetIndex
        );
  const speedKmph = normalizeSpeedKmph(
    options.speed,
    options.defaultSpeedKmph || etaDefaults.defaultSpeedKmph
  );

  if (distanceKm === null || !Number.isFinite(distanceKm) || distanceKm < 0) {
    return {
      available: false,
      label: "ETA unavailable",
      minutes: null,
      distanceKm: null,
      speedKmph: speedKmph,
      arrivingSoon: false
    };
  }

  const minutes = Math.max(1, Math.round((distanceKm / speedKmph) * 60));
  const arrivingSoon =
    distanceKm <= (options.arrivingSoonDistanceKm || etaDefaults.arrivingSoonDistanceKm) ||
    minutes <= (options.arrivingSoonMinutes || etaDefaults.arrivingSoonMinutes);

  return {
    available: true,
    label: arrivingSoon ? "Arriving Soon" : "Arriving in " + minutes + " min",
    minutes: minutes,
    distanceKm: distanceKm,
    speedKmph: speedKmph,
    arrivingSoon: arrivingSoon
  };
}

export function formatETA(eta) {
  if (!eta || !eta.available) {
    return "ETA unavailable";
  }

  return eta.arrivingSoon ? "Arriving Soon" : "Arriving in " + eta.minutes + " min";
}

export function formatETAMinutes(eta) {
  if (!eta || !eta.available) {
    return "ETA unavailable";
  }

  return eta.arrivingSoon ? "Soon" : eta.minutes + " min";
}

if (typeof window !== "undefined") {
  window.BusTrackETA = {
    defaults: etaDefaults,
    calculateDistance: calculateDistance,
    calculateRouteDistance: calculateRouteDistance,
    calculateETA: calculateETA,
    formatETA: formatETA,
    formatETAMinutes: formatETAMinutes
  };
}
