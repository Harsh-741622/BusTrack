/*
 * BusTrack offline road geometry generator.
 *
 * This is a build-time utility only. It does not add runtime API calls,
 * backend infrastructure, Firebase writes, or UI behavior.
 *
 * Input:
 *   data/pilot-stops.js
 *   data/segments.js
 *   data/pilot-segment-coordinates.js (optional fallback preservation)
 *
 * Output:
 *   data/pilot-segment-coordinates.generated.js
 *
 * Usage:
 *   node tools/generate-road-geometry.js
 *   node tools/generate-road-geometry.js --segments SEG_A,SEG_B
 *   node tools/generate-road-geometry.js --out data/custom-generated.js
 */
/* eslint-disable no-console */

const fs = require("fs");
const https = require("https");
const path = require("path");
const vm = require("vm");

const DEFAULT_OSRM_BASE_URL = "https://router.project-osrm.org";
const DEFAULT_OUTPUT = path.join("data", "pilot-segment-coordinates.generated.js");
const REQUEST_TIMEOUT_MS = 15000;
const RATE_LIMIT_MS = 1000;
const RETRY_COUNT = 3;
const RETRY_DELAY_MS = 1500;
const ENDPOINT_TOLERANCE_KM = 1.5;
const MAX_STEP_KM = 2;

function parseArgs(argv) {
  const args = {
    baseUrl: DEFAULT_OSRM_BASE_URL,
    out: DEFAULT_OUTPUT,
    segments: "",
    retries: RETRY_COUNT,
    timeoutMs: REQUEST_TIMEOUT_MS
  };

  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];

    if (token === "--baseUrl" && argv[i + 1]) {
      args.baseUrl = argv[++i];
    } else if (token === "--out" && argv[i + 1]) {
      args.out = argv[++i];
    } else if (token === "--segments" && argv[i + 1]) {
      args.segments = argv[++i];
    } else if (token === "--retries" && argv[i + 1]) {
      args.retries = Math.max(0, Number(argv[++i]) || 0);
    } else if (token === "--timeoutMs" && argv[i + 1]) {
      args.timeoutMs = Math.max(1000, Number(argv[++i]) || REQUEST_TIMEOUT_MS);
    } else if (token === "--help" || token === "-h") {
      args.help = true;
    }
  }

  return args;
}

function printHelp() {
  console.log([
    "BusTrack offline OSRM road geometry generator",
    "",
    "Usage:",
    "  node tools/generate-road-geometry.js",
    "  node tools/generate-road-geometry.js --segments SEG_BARDOLI_TO_BARDOLI_LINEAR",
    "  node tools/generate-road-geometry.js --out data/pilot-segment-coordinates.generated.js",
    "",
    "Options:",
    "  --baseUrl <url>      OSRM base URL. Default: https://router.project-osrm.org",
    "  --out <file>         Output JS file. Default: data/pilot-segment-coordinates.generated.js",
    "  --segments <ids>     Optional comma-separated canonical segment IDs",
    "  --retries <count>    Retry count per segment. Default: 3",
    "  --timeoutMs <ms>     Request timeout. Default: 15000"
  ].join("\n"));
}

function loadDataFile(context, filePath, required) {
  if (!fs.existsSync(filePath)) {
    if (required) {
      throw new Error("Required data file not found: " + filePath);
    }
    return;
  }

  const source = fs.readFileSync(filePath, "utf8");
  vm.runInNewContext(source, context, {
    filename: filePath,
    displayErrors: true
  });
}

function loadBusTrackData(repoRoot) {
  const context = {
    window: {},
    console
  };

  context.window.BusTrackData = {};

  loadDataFile(context, path.join(repoRoot, "data", "pilot-stops.js"), true);
  loadDataFile(context, path.join(repoRoot, "data", "segments.js"), true);
  loadDataFile(context, path.join(repoRoot, "data", "pilot-segment-coordinates.js"), false);

  const data = context.window.BusTrackData || {};
  const stops = Array.isArray(data.pilotStops) ? data.pilotStops : [];
  const segments = Array.isArray(data.segments) ? data.segments : [];
  const existingGeometry = data.pilotSegmentCoordinates || {};

  const stopMap = stops.reduce((map, stop) => {
    if (stop && stop.stop_id) {
      map[stop.stop_id] = stop;
    }
    return map;
  }, {});

  return {
    stopMap,
    segments,
    existingGeometry
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toRadians(value) {
  return value * Math.PI / 180;
}

function distanceKm(pointA, pointB) {
  if (!pointA || !pointB) return Infinity;

  const lat1 = Number(pointA[0]);
  const lon1 = Number(pointA[1]);
  const lat2 = Number(pointB[0]);
  const lon2 = Number(pointB[1]);

  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return Infinity;
  }

  const deltaLat = toRadians(lat2 - lat1);
  const deltaLon = toRadians(lon2 - lon1);
  const rLat1 = toRadians(lat1);
  const rLat2 = toRadians(lat2);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(rLat1) *
      Math.cos(rLat2) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizePoint(point) {
  if (!Array.isArray(point) || point.length < 2) return null;

  const lat = Number(point[0]);
  const lng = Number(point[1]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lat, lng];
}

function dedupeConsecutive(points) {
  const output = [];

  for (const point of points || []) {
    const normalized = normalizePoint(point);
    const previous = output[output.length - 1];

    if (!normalized) continue;

    if (
      previous &&
      Math.abs(previous[0] - normalized[0]) < 1e-7 &&
      Math.abs(previous[1] - normalized[1]) < 1e-7
    ) {
      continue;
    }

    output.push(normalized);
  }

  return output;
}

function roundCoordinate(value) {
  return Math.round(Number(value) * 1000000) / 1000000;
}

function roundPoint(point) {
  return [roundCoordinate(point[0]), roundCoordinate(point[1])];
}

function validateGeometry(segmentId, points, fromStop, toStop) {
  const clean = dedupeConsecutive(points);
  const fromPoint = [fromStop.latitude, fromStop.longitude];
  const toPoint = [toStop.latitude, toStop.longitude];
  let maxStep = 0;

  if (clean.length < 2) {
    return {
      ok: false,
      reason: "empty geometry"
    };
  }

  if (distanceKm(clean[0], fromPoint) > ENDPOINT_TOLERANCE_KM) {
    return {
      ok: false,
      reason: "first point is not near from_stop"
    };
  }

  if (distanceKm(clean[clean.length - 1], toPoint) > ENDPOINT_TOLERANCE_KM) {
    return {
      ok: false,
      reason: "last point is not near to_stop"
    };
  }

  for (let i = 1; i < clean.length; i++) {
    maxStep = Math.max(maxStep, distanceKm(clean[i - 1], clean[i]));
  }

  if (maxStep > MAX_STEP_KM) {
    return {
      ok: false,
      reason: "geometry contains jump > " + MAX_STEP_KM + "km",
      maxStep
    };
  }

  clean[0] = fromPoint;
  clean[clean.length - 1] = toPoint;

  return {
    ok: true,
    points: clean.map(roundPoint),
    maxStep
  };
}

function requestJson(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent": "BusTrack-offline-road-geometry-generator"
        },
        timeout: timeoutMs
      },
      (res) => {
        let body = "";

        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error("OSRM HTTP " + res.statusCode + ": " + body.slice(0, 200)));
            return;
          }

          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(err);
          }
        });
      }
    );

    req.on("timeout", () => {
      req.destroy(new Error("OSRM request timed out after " + timeoutMs + "ms"));
    });
    req.on("error", reject);
  });
}

async function fetchOsrmGeometry(baseUrl, fromStop, toStop, timeoutMs) {
  const lonLatA = encodeURIComponent(fromStop.longitude + "," + fromStop.latitude);
  const lonLatB = encodeURIComponent(toStop.longitude + "," + toStop.latitude);
  const url =
    baseUrl.replace(/\/$/, "") +
    "/route/v1/driving/" +
    lonLatA +
    ";" +
    lonLatB +
    "?overview=full&geometries=geojson&steps=false&alternatives=false";

  const json = await requestJson(url, timeoutMs);
  const coordinates =
    json &&
    Array.isArray(json.routes) &&
    json.routes[0] &&
    json.routes[0].geometry &&
    Array.isArray(json.routes[0].geometry.coordinates)
      ? json.routes[0].geometry.coordinates
      : null;

  if (!coordinates || !coordinates.length) {
    throw new Error("OSRM returned no route geometry");
  }

  return coordinates.map((point) => [point[1], point[0]]);
}

async function fetchWithRetry(segment, fromStop, toStop, args) {
  let lastError = null;

  for (let attempt = 1; attempt <= args.retries + 1; attempt++) {
    try {
      return await fetchOsrmGeometry(args.baseUrl, fromStop, toStop, args.timeoutMs);
    } catch (err) {
      lastError = err;
      if (attempt <= args.retries) {
        console.warn(
          "[retry]",
          segment.segment_id,
          "attempt",
          attempt,
          "failed:",
          err.message || String(err)
        );
        await sleep(RETRY_DELAY_MS);
      }
    }
  }

  throw lastError || new Error("OSRM request failed");
}

function formatGeometryObject(geometryBySegmentId) {
  const lines = [
    "(function () {",
    "  window.BusTrackData = window.BusTrackData || {};",
    "",
    "  // Generated offline by tools/generate-road-geometry.js.",
    "  // Canonical segment geometry only. Reverse traversal is handled dynamically during route assembly.",
    "",
    "  window.BusTrackData.pilotSegmentCoordinates = {"
  ];

  const ids = Object.keys(geometryBySegmentId);
  ids.forEach((segmentId, index) => {
    const points = geometryBySegmentId[segmentId] || [];
    const suffix = index === ids.length - 1 ? "" : ",";

    lines.push("    " + segmentId + ": [");
    points.forEach((point, pointIndex) => {
      const pointSuffix = pointIndex === points.length - 1 ? "" : ",";
      lines.push("      [" + point[0] + ", " + point[1] + "]" + pointSuffix);
    });
    lines.push("    ]" + suffix);
  });

  lines.push("  };");
  lines.push("})();");
  lines.push("");

  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    printHelp();
    return;
  }

  const repoRoot = path.resolve(__dirname, "..");
  const { stopMap, segments, existingGeometry } = loadBusTrackData(repoRoot);
  const requestedSegments = args.segments
    ? args.segments.split(",").map((id) => id.trim()).filter(Boolean)
    : null;
  const requestedSet = requestedSegments ? new Set(requestedSegments) : null;
  const canonicalSegments = segments.filter((segment) => {
    return segment &&
      segment.segment_id &&
      segment.canonical !== false &&
      (!requestedSet || requestedSet.has(segment.segment_id));
  });
  const output = {};
  const summary = {
    generated: 0,
    failed: 0,
    reused: 0
  };
  const failures = [];

  for (let i = 0; i < canonicalSegments.length; i++) {
    const segment = canonicalSegments[i];
    const fromStop = stopMap[segment.from_stop];
    const toStop = stopMap[segment.to_stop];
    const existing = existingGeometry[segment.segment_id];

    if (!fromStop || !toStop) {
      summary.failed++;
      failures.push({
        segment_id: segment.segment_id,
        reason: "missing stop endpoint"
      });

      if (Array.isArray(existing) && existing.length) {
        output[segment.segment_id] = existing;
        summary.reused++;
      }
      continue;
    }

    if (i > 0) {
      await sleep(RATE_LIMIT_MS);
    }

    try {
      console.error("[osrm]", segment.segment_id, segment.from_stop + " -> " + segment.to_stop);
      const rawPoints = await fetchWithRetry(segment, fromStop, toStop, args);
      const validation = validateGeometry(segment.segment_id, rawPoints, fromStop, toStop);

      if (!validation.ok) {
        throw new Error(validation.reason);
      }

      output[segment.segment_id] = validation.points;
      summary.generated++;
    } catch (err) {
      summary.failed++;
      failures.push({
        segment_id: segment.segment_id,
        reason: err && err.message ? err.message : String(err)
      });

      if (Array.isArray(existing) && existing.length) {
        output[segment.segment_id] = existing;
        summary.reused++;
      }
    }
  }

  const outPath = path.resolve(repoRoot, args.out);
  fs.writeFileSync(outPath, formatGeometryObject(output), "utf8");

  console.log("Generated geometry file: " + path.relative(repoRoot, outPath));
  console.log("generated count: " + summary.generated);
  console.log("failed count: " + summary.failed);
  console.log("reused count: " + summary.reused);

  if (failures.length) {
    console.log("failures:");
    failures.forEach((failure) => {
      console.log("  - " + failure.segment_id + ": " + failure.reason);
    });
  }
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : String(err));
  process.exitCode = 1;
});
