const fs = require("fs");
const path = require("path");
const vm = require("vm");

const DATA_DIR = path.join(__dirname, "..", "data");

function loadData() {
  const context = { window: { BusTrackData: {} }, console };
  vm.createContext(context);
  [
    "segments.js",
    "pilot-segment-coordinates.js",
    "pilot-routes.js"
  ].forEach((file) => {
    vm.runInContext(fs.readFileSync(path.join(DATA_DIR, file), "utf8"), context, { filename: file });
  });
  return context.window.BusTrackData;
}

function unorderedKey(segment) {
  return [segment.from_stop, segment.to_stop].sort().join("|");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function jsValue(value) {
  return JSON.stringify(value, null, 2).replace(/"([^"]+)":/g, "$1:");
}

function writeDataFile(fileName, body) {
  fs.writeFileSync(path.join(DATA_DIR, fileName), body, "utf8");
}

function buildCanonicalSegments(segments) {
  const canonicalByPair = new Map();
  const aliases = {};
  const canonicalSegments = [];

  segments.forEach((segment) => {
    const key = unorderedKey(segment);
    const existing = canonicalByPair.get(key);

    if (!existing) {
      const canonical = clone(segment);
      canonical.canonical = true;
      canonical.alias_segment_ids = [];
      canonical.directional_metadata = [
        {
          segment_id: segment.segment_id,
          from_stop: segment.from_stop,
          to_stop: segment.to_stop,
          avg_time_min: segment.avg_time_min,
          distance_km: segment.distance_km,
          traversal: "canonical"
        }
      ];
      canonicalByPair.set(key, canonical);
      canonicalSegments.push(canonical);
      aliases[segment.segment_id] = {
        canonical_segment_id: segment.segment_id,
        reversed: false,
        from_stop: segment.from_stop,
        to_stop: segment.to_stop,
        avg_time_min: segment.avg_time_min,
        distance_km: segment.distance_km
      };
      return;
    }

    existing.alias_segment_ids.push(segment.segment_id);
    existing.directional_metadata.push({
      segment_id: segment.segment_id,
      from_stop: segment.from_stop,
      to_stop: segment.to_stop,
      avg_time_min: segment.avg_time_min,
      distance_km: segment.distance_km,
      traversal: existing.from_stop === segment.from_stop && existing.to_stop === segment.to_stop ? "canonical" : "reverse"
    });
    aliases[segment.segment_id] = {
      canonical_segment_id: existing.segment_id,
      reversed: !(existing.from_stop === segment.from_stop && existing.to_stop === segment.to_stop),
      from_stop: segment.from_stop,
      to_stop: segment.to_stop,
      avg_time_min: segment.avg_time_min,
      distance_km: segment.distance_km
    };
  });

  return { canonicalSegments, aliases };
}

function buildCanonicalGeometry(canonicalSegments, aliases, geometryMap) {
  const output = {};

  canonicalSegments.forEach((segment) => {
    let geometry = geometryMap[segment.segment_id];
    if (!Array.isArray(geometry) || geometry.length < 2) {
      const reverseEntry = segment.alias_segment_ids
        .map((id) => ({ id, alias: aliases[id] }))
        .find((entry) => entry.alias && entry.alias.reversed && Array.isArray(geometryMap[entry.id]));
      if (reverseEntry) {
        geometry = geometryMap[reverseEntry.id].slice().reverse();
      }
    }
    output[segment.segment_id] = Array.isArray(geometry) ? geometry : [];
  });

  return output;
}

function normalizeRoutes(routes, aliases) {
  return routes.map((route) => {
    const next = clone(route);
    next.segments = (route.segments || []).map((segmentId) => {
      const alias = aliases[segmentId];
      return alias ? alias.canonical_segment_id : segmentId;
    });
    next.path_coordinates = [];
    return next;
  });
}

function main() {
  const data = loadData();
  const { canonicalSegments, aliases } = buildCanonicalSegments(data.segments || []);
  const canonicalGeometry = buildCanonicalGeometry(
    canonicalSegments,
    aliases,
    data.pilotSegmentCoordinates || {}
  );
  const normalizedRoutes = normalizeRoutes(data.pilotRoutes || [], aliases);

  writeDataFile(
    "segments.js",
    `(function () {\n  window.BusTrackData = window.BusTrackData || {};\n\n  // Canonical reusable corridor segments. Reverse traversal is represented in segmentAliases.\n\n  window.BusTrackData.segments = ${jsValue(canonicalSegments)};\n\n  window.BusTrackData.segmentAliases = ${jsValue(aliases)};\n})();\n`
  );

  writeDataFile(
    "pilot-segment-coordinates.js",
    `(function () {\n  window.BusTrackData = window.BusTrackData || {};\n\n  // Canonical segment geometry only. Reverse traversal is handled dynamically during route assembly.\n\n  window.BusTrackData.pilotSegmentCoordinates = ${jsValue(canonicalGeometry)};\n})();\n`
  );

  writeDataFile(
    "pilot-routes.js",
    `(function () {\n  window.BusTrackData = window.BusTrackData || {};\n\n  // Routes reference canonical reusable segments. Trip-level stop_times carry exact schedule runs.\n\n  window.BusTrackData.pilotRoutes = ${jsValue(normalizedRoutes)};\n})();\n`
  );

  console.log(`Canonical segments: ${canonicalSegments.length}`);
  console.log(`Segment aliases: ${Object.keys(aliases).length}`);
  console.log(`Routes normalized: ${normalizedRoutes.length}`);
}

main();
