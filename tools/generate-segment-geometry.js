/**
 * Offline segment geometry generator (static / no backend).
 *
 * Goal:
 *   Fetch road-following polylines (OSRM by default) for segment endpoints,
 *   then paste the resulting coordinate arrays into:
 *     data/pilot-segment-coordinates.js
 *
 * Why:
 *   - Keeps existing stop/segment/route/ETA architecture intact.
 *   - Adds reusable segment-level intermediate coordinates so routes render
 *     realistically (curves, highways) instead of straight stop-to-stop lines.
 *
 * Usage examples:
 *   node tools/generate-segment-geometry.js
 *   node tools/generate-segment-geometry.js --segments SEG_BARDOLI_TO_LINEAR,SEG_LINEAR_TO_SARBHON
 *   node tools/generate-segment-geometry.js --baseUrl https://router.project-osrm.org
 *   node tools/generate-segment-geometry.js --out segment-coordinates.json
 *
 * Output:
 *   JSON on stdout by default: { "SEG_ID": [[lat,lng], ...], ... }
 */
/* eslint-disable no-console */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const https = require("https");

function parseArgs(argv) {
  const args = {
    segments: "",
    baseUrl: "https://router.project-osrm.org",
    out: "",
    simplify: "0.00015", // ~15m at the equator; keeps polylines lightweight for Leaflet
    round: "6"
  };

  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--segments" && argv[i + 1]) {
      args.segments = argv[i + 1];
      i++;
      continue;
    }
    if (token === "--baseUrl" && argv[i + 1]) {
      args.baseUrl = argv[i + 1];
      i++;
      continue;
    }
    if (token === "--out" && argv[i + 1]) {
      args.out = argv[i + 1];
      i++;
      continue;
    }
    if (token === "--simplify" && argv[i + 1]) {
      args.simplify = argv[i + 1];
      i++;
      continue;
    }
    if (token === "--round" && argv[i + 1]) {
      args.round = argv[i + 1];
      i++;
      continue;
    }
    if (token === "--help" || token === "-h") {
      args.help = true;
    }
  }

  return args;
}

function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "BusTrack-segment-geometry-generator" } }, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 500)}`));
            return;
          }
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(err);
          }
        });
      })
      .on("error", reject);
  });
}

function loadBusTrackData(repoRoot) {
  const context = {
    window: {},
    console
  };

  const files = [
    path.join(repoRoot, "data", "pilot-stops.js"),
    path.join(repoRoot, "data", "segments.js")
  ];

  for (const file of files) {
    const code = fs.readFileSync(file, "utf8");
    vm.runInNewContext(code, context, { filename: file, displayErrors: true });
  }

  const data = context.window.BusTrackData || {};
  const pilotStops = Array.isArray(data.pilotStops) ? data.pilotStops : [];
  const segments = Array.isArray(data.segments) ? data.segments : [];

  const stopMap = pilotStops.reduce((acc, s) => {
    acc[s.stop_id] = s;
    return acc;
  }, {});

  const segmentMap = segments.reduce((acc, s) => {
    acc[s.segment_id] = s;
    return acc;
  }, {});

  return { stopMap, segmentMap };
}

function normalizePoint(p) {
  if (!Array.isArray(p) || p.length < 2) return null;
  const lat = Number(p[0]);
  const lng = Number(p[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lat, lng];
}

function dedupeConsecutive(points) {
  const out = [];
  for (const p of points) {
    const n = normalizePoint(p);
    if (!n) continue;
    if (!out.length) {
      out.push(n);
      continue;
    }
    const last = out[out.length - 1];
    if (Math.abs(last[0] - n[0]) < 1e-7 && Math.abs(last[1] - n[1]) < 1e-7) continue;
    out.push(n);
  }
  return out;
}

function perpendicularDistance(point, lineStart, lineEnd) {
  const x = point[1];
  const y = point[0];
  const x1 = lineStart[1];
  const y1 = lineStart[0];
  const x2 = lineEnd[1];
  const y2 = lineEnd[0];

  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) {
    const dxp = x - x1;
    const dyp = y - y1;
    return Math.sqrt(dxp * dxp + dyp * dyp);
  }

  const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  const distX = x - projX;
  const distY = y - projY;
  return Math.sqrt(distX * distX + distY * distY);
}

function simplifyRdp(points, epsilon) {
  if (!Array.isArray(points) || points.length < 3) return points || [];
  if (!(epsilon > 0)) return points;

  let maxDist = 0;
  let index = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], start, end);
    if (d > maxDist) {
      index = i;
      maxDist = d;
    }
  }

  if (maxDist > epsilon) {
    const left = simplifyRdp(points.slice(0, index + 1), epsilon);
    const right = simplifyRdp(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  }

  return [start, end];
}

function roundPoints(points, decimals) {
  if (!Array.isArray(points) || !points.length) return [];
  const d = Number.isFinite(decimals) ? decimals : 6;
  const factor = Math.pow(10, d);
  return points.map((p) => [Math.round(p[0] * factor) / factor, Math.round(p[1] * factor) / factor]);
}

async function fetchOsrmGeometry(baseUrl, fromStop, toStop) {
  const lonLatA = `${fromStop.longitude},${fromStop.latitude}`;
  const lonLatB = `${toStop.longitude},${toStop.latitude}`;
  const url =
    `${baseUrl.replace(/\/$/, "")}/route/v1/driving/${lonLatA};${lonLatB}` +
    "?overview=full&geometries=geojson&steps=false&alternatives=false";

  const json = await httpsGetJson(url);
  const coords =
    json && json.routes && json.routes[0] && json.routes[0].geometry && Array.isArray(json.routes[0].geometry.coordinates)
      ? json.routes[0].geometry.coordinates
      : null;

  if (!coords || !coords.length) {
    throw new Error("OSRM returned no geometry.");
  }

  // OSRM returns [lng,lat]. Convert to Leaflet-friendly [lat,lng].
  const latLng = coords.map((c) => [c[1], c[0]]);
  return dedupeConsecutive(latLng);
}

function getDefaultPilotSegments() {
  // Initial scope: Bardoli ↔ Navsari pilot corridor (expand incrementally).
  return [
    "SEG_BARDOLI_TO_LINEAR",
    "SEG_LINEAR_TO_SARBHON",
    "SEG_SARBHON_TO_NAVSARI",
    "SEG_BARDOLI_TO_SARBHON_DIRECT",
    "SEG_SARBHON_TO_NAVSARI_DIRECT",
    "SEG_NAVSARI_SARBHON",
    "SEG_SARBHON_BARDOLI",
    "SEG_BARDOLI_TO_NAVSARI",
    "SEG_NAVSARI_BARDOLI"
  ];
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(fs.readFileSync(__filename, "utf8").split("\n").slice(0, 40).join("\n"));
    process.exit(0);
  }

  const repoRoot = path.resolve(__dirname, "..");
  const { stopMap, segmentMap } = loadBusTrackData(repoRoot);

  const segmentIds = (args.segments ? args.segments.split(",") : getDefaultPilotSegments())
    .map((s) => String(s || "").trim())
    .filter(Boolean);

  const simplifyEpsilon = Number(args.simplify);
  const roundDecimals = Number(args.round);

  const output = {};

  for (const segmentId of segmentIds) {
    const seg = segmentMap[segmentId];
    if (!seg) {
      console.warn(`[skip] Unknown segment_id: ${segmentId}`);
      continue;
    }
    const fromStop = stopMap[seg.from_stop];
    const toStop = stopMap[seg.to_stop];
    if (!fromStop || !toStop) {
      console.warn(`[skip] Missing stop endpoints for ${segmentId}: ${seg.from_stop} → ${seg.to_stop}`);
      continue;
    }

    console.error(`[fetch] ${segmentId}: ${seg.from_stop} → ${seg.to_stop}`);
    let points = await fetchOsrmGeometry(args.baseUrl, fromStop, toStop);

    // Keep the static payload lightweight (better UX, faster rendering).
    points = simplifyRdp(points, simplifyEpsilon);

    // Stable hard endpoints for stop-aware mapping.
    if (points.length) {
      points[0] = [fromStop.latitude, fromStop.longitude];
      points[points.length - 1] = [toStop.latitude, toStop.longitude];
    }

    output[segmentId] = roundPoints(points, roundDecimals);
  }

  const json = JSON.stringify(output, null, 2);
  if (args.out) {
    fs.writeFileSync(path.resolve(process.cwd(), args.out), json, "utf8");
    console.log(`Wrote ${Object.keys(output).length} segments to ${args.out}`);
    return;
  }
  process.stdout.write(json);
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : String(err));
  process.exit(1);
});
