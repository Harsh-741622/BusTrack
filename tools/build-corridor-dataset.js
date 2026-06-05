const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");

const SERVICE_AREA = "GSRTC Pilot";
const NETWORK_ID = "gsrtc-bardoli-operational-corridor";
const NETWORK_NAME = "GSRTC Bardoli Operational Corridor";

const stops = [
  ["STOP_BARDOLI", "Bardoli GSRTC Bus Station", 21.13333187170484, 73.10663164532181, ["Bardoli Station", "Bardoli station", "Bardoli GSRTC", "Bardoli St"]],
  ["STOP_BARDOLI_LINEAR", "Bardoli Linear", 21.116313287380198, 73.10791212744404, ["Bardoli linir", "Bardoli Linir", "Bardoli Link Road"]],
  ["STOP_SARBHON", "Sarbhon", 21.050898935695436, 73.0816827628349, ["sarbhon"]],
  ["STOP_NAVSARI", "Navsari GSRTC Bus Station", 20.949655016370855, 72.9362614916834, ["Navsari", "Nvarsari"]],
  ["STOP_KADODARA", "Kadodara", 21.17206925297597, 72.9602150890263, []],
  ["STOP_UDHANA", "Udhana (Surat)", 21.16642315220455, 72.84163624254015, ["Udhana", "Udhana(Surat)", "Udhna"]],
  ["STOP_SURAT", "Surat Central GSRTC Bus Station", 21.203824559184255, 72.83990831117355, ["Surat Central", "Surat"]],
  ["STOP_SELAMBA", "Selamba", 21.519636734364234, 73.8182058169101, []],
  ["STOP_MANDVI_SURAT", "Mandvi (Surat)", 21.25653746534474, 73.30113398061586, ["Mandvi(Surat)", "Mandvi"]],
  ["STOP_GANGTHA", "Gangtha", 21.513160379510527, 74.00940359846682, []],
  ["STOP_MASAD", "Masad", 21.21419301474283, 73.24336037401189, []],
  ["STOP_VALOD", "Valod", 21.04880463342982, 73.26381837349197, []],
  ["STOP_NETRANG", "Netrang", 21.640003498493094, 73.360539043541, []],
  ["STOP_VANKAL_MANDVI", "Vankal (Mandvi)", 21.257076561041938, 73.30302699492958, ["vankal(Mandvi)", "Vankal Mandvi"]],
  ["STOP_KHAREL", "Kharel", 20.861726485684112, 73.06264639332674, []],
  ["STOP_CHIKHALI", "Chikhali", 20.760274719275362, 73.05986891905765, ["Chikhli"]],
  ["STOP_DUNGRI_CROSS", "Dungri Cross Road", 20.682636336075944, 72.96132582181698, ["Dungri cross road"]],
  ["STOP_VALSAD", "Valsad", 20.610309786421535, 72.93231421281405, ["Valsad GSRTC Bus Station"]],
  ["STOP_ZANKHVAV", "Zankhvav", 21.44991352876512, 73.32063179944858, ["Zankhvat", "Zankhvav"]],
  ["STOP_TARSADA", "Tarsada", 21.244279162916982, 73.29791219082438, []],
  ["STOP_MAHUVA_BARDOLI", "Mahuva (Bardoli)", 21.01820447129955, 73.1414232495055, ["Mahuva", "Mahuva(Bardoli)"]],
  ["STOP_DEDIAPADA", "Dediapada", 21.625377466593918, 73.58936970856949, []],
  ["STOP_BUHARI", "Buhari", 20.967564026560193, 73.30819522953601, []],
  ["STOP_RAJPIPLA", "Rajpipla", 21.865414379143004, 73.50167866713934, ["Rajpipala", "Rajpipla"]],
  ["STOP_UMARPADA", "Umarpada", 21.45509125415676, 73.47693239154664, []],
  ["STOP_BILIMORA", "Bilimora Depot", 20.76842576819721, 72.97038555436025, ["Bilimora Bus Depot"]],
  ["STOP_GANDEVI", "Gandevi", 20.809117845490434, 73.00017448391728, []],
  ["STOP_AKKALKUVA", "Akkalkuva - Maharashtra", 21.55278912120962, 74.0135503190748, ["Akkalkuva", "Akkalkuwa"]],
  ["STOP_DUNGRI", "Dungri", 21.40476606637032, 73.12254741292607, []],
  ["STOP_VYARA", "Vyara", 21.11392207431844, 73.3866575895093, []],
  ["STOP_SONGADH", "Songadh", 21.171380581334017, 73.56481939236855, []],
  ["STOP_KADOD", "Kadod", 21.21493948738988, 73.21992085432267, []],
  ["STOP_SAGBARA", "Sagbara", 21.5097, 73.7741, []]
];

const stopAlias = {
  bardoli: "STOP_BARDOLI",
  "bardoli station": "STOP_BARDOLI",
  "bardoli gsrtc bus station": "STOP_BARDOLI",
  "bardoli linir": "STOP_BARDOLI_LINEAR",
  "bardoli linear": "STOP_BARDOLI_LINEAR",
  sarbhon: "STOP_SARBHON",
  navsari: "STOP_NAVSARI",
  "navsari gsrtc bus station": "STOP_NAVSARI",
  kadodara: "STOP_KADODARA",
  udhana: "STOP_UDHANA",
  "udhana(surat)": "STOP_UDHANA",
  surat: "STOP_SURAT",
  selamba: "STOP_SELAMBA",
  "mandvi(surat)": "STOP_MANDVI_SURAT",
  "mandvi (surat)": "STOP_MANDVI_SURAT",
  kadod: "STOP_KADOD",
  gangtha: "STOP_GANGTHA",
  masad: "STOP_MASAD",
  valod: "STOP_VALOD",
  netrang: "STOP_NETRANG",
  "vankal(mandvi)": "STOP_VANKAL_MANDVI",
  "vankal (mandvi)": "STOP_VANKAL_MANDVI",
  kharel: "STOP_KHAREL",
  chikhali: "STOP_CHIKHALI",
  "dungri cross road": "STOP_DUNGRI_CROSS",
  valsad: "STOP_VALSAD",
  zankhvav: "STOP_ZANKHVAV",
  zankhvat: "STOP_ZANKHVAV",
  tarsada: "STOP_TARSADA",
  "mahuva(bardoli)": "STOP_MAHUVA_BARDOLI",
  "mahuva (bardoli)": "STOP_MAHUVA_BARDOLI",
  mahuva: "STOP_MAHUVA_BARDOLI",
  dediapada: "STOP_DEDIAPADA",
  buhari: "STOP_BUHARI",
  rajpipala: "STOP_RAJPIPLA",
  rajpipla: "STOP_RAJPIPLA",
  umarpada: "STOP_UMARPADA",
  "bilimora depot": "STOP_BILIMORA",
  gandevi: "STOP_GANDEVI",
  "akkalkuva - maharashtra": "STOP_AKKALKUVA",
  akkalkuva: "STOP_AKKALKUVA",
  sagbara: "STOP_SAGBARA"
};

const rawTrips = [
  trip("GJ-18-Z-7932", ">", ["Bardoli Station", "Bardoli linir", "Sarbhon", "Navsari"], ["5:40 AM", "5:45 AM", "6:00 AM", "6:20 AM"]),
  trip("GJ-18-Z-7932", ">", ["Selamba", "Dediapada", "Mandvi(Surat)", "Kadod", "Bardoli Station", "Bardoli Linir", "Mahuva(Bardoli)", "Navsari"], ["1:15 PM", "2:05 PM", "4:05 PM", "4:35 PM", "5:05 PM", "5:12 PM", "5:25 PM", "6:10 PM"]),
  trip("GJ-18-Z-7808", ">", ["Bardoli Station", "Bardoli linir", "Sarbhon", "Navsari"], ["5:50 AM", "5:55 AM", "6:10 AM", "6:35 AM"]),
  trip("GJ-18-Z-7808", ">", ["Navsari", "Sarbhon", "Bardoli linir", "Kadod", "Mandvi(Surat)", "Netrang", "Rajpipala"], ["7:00 AM", "7:30 AM", "7:50 AM", "8:15 AM", "8:40 AM", "10:00 AM", "11:00 AM"]),
  trip("GJ-18-Z-7808", ">", ["Rajpipala", "Netrang", "Mandvi(Surat)", "Kadod", "Bardoli linir", "Sarbhon", "Navsari"], ["12:10 PM", "1:10 PM", "2:40 PM", "3:00 PM", "3:30 PM", "3:50 PM", "4:10 PM"]),
  trip("GJ-18-Z-4875", ">", ["Bardoli Station", "Bardoli linir", "Sarbhon", "Navsari"], ["6:40 AM", "6:45 AM", "7:00 AM", "7:25 AM"]),
  trip("GJ-18-Z-4875", ">", ["Navsari", "Sarbhon", "Bardoli linir", "Bardoli Station"], ["8:00 AM", "8:20 AM", "8:40 AM", "8:50 AM"]),
  trip("GJ-18-Z-4875", ">", ["Bardoli Station", "Bardoli linir", "Sarbhon", "Navsari"], ["8:55 AM", "9:00 AM", "9:15 AM", "9:40 AM"]),
  trip("GJ-18-Z-4875", ">", ["Navsari", "Sarbhon", "Bardoli linir", "Bardoli Station"], ["10:10 AM", "10:30 AM", "11:00 AM", "11:05 AM"]),
  trip("GJ-18-Z-9648", ">", ["Mandvi(Surat)", "Tarsada", "Kadod", "Bardoli linir", "Navsari"], ["6:00 AM", "6:15 AM", "6:20 AM", "6:50 AM", "7:40 AM"]),
  trip("GJ-18-ZT-0883", ">", ["Vankal(Mandvi)", "Zankhvav", "Mandvi(Surat)", "Kadod", "Bardoli linir", "Sarbhon", "Navsari", "Kharel", "Chikhali", "Dungri Cross Road", "Valsad"], ["5:32 AM", "5:51 AM", "6:20 AM", "6:35 AM", "6:58 AM", "7:09 AM", "7:36 AM", "7:59 AM", "8:18 AM", "8:37 AM", "8:53 AM"]),
  trip("GJ-18-Z-8531", ">", ["Bardoli Station", "Bardoli linir", "Sarbhon", "Navsari"], ["7:15 AM", "7:20 AM", "7:35 AM", "7:55 AM"]),
  trip("GJ-18-Z-8317", ">", ["Rajpipala", "Netrang", "Mandvi(Surat)", "Kadod", "Bardoli linir", "Sarbhon", "Navsari"], ["5:17 AM", "6:38 AM", "7:55 AM", "8:12 AM", "8:46 AM", "9:12 AM", "9:55 AM"]),
  trip("GJ-18-Z-8317", ">", ["Bardoli Station", "Bardoli linir", "Sarbhon", "Navsari"], ["12:00 PM", "12:08 PM", "12:20 PM", "12:40 PM"]),
  trip("GJ-18-Z-8317", ">", ["Navsari", "Sarbhon", "Bardoli linir", "Bardoli Station", "Kadod", "Mandvi(Surat)", "Netrang", "Rajpipala"], ["1:20 PM", "1:50 PM", "2:10 PM", "2:15 PM", "2:35 PM", "3:00 PM", "4:20 PM", "5:20 PM"]),
  trip("GJ-18-Z-7986", ">", ["Buhari", "Valod", "Bardoli Station", "Bardoli linir", "Sarbhon", "Navsari"], ["8:10 AM", "8:30 AM", "8:50 AM", "9:00 AM", "9:15 AM", "9:45 AM"]),
  trip("GJ-18-Z-7800", ">", ["Masad", "Bardoli Station", "Bardoli linir", "Sarbhon", "Navsari"], ["9:10 AM", "9:30 AM", "9:40 AM", "10:00 AM", "10:20 AM"]),
  trip("GJ-18-Z-7800", ">", ["Bardoli Station", "Bardoli linir", "Sarbhon", "Navsari"], ["5:00 PM", "5:08 PM", "5:20 PM", "5:40 PM"]),
  trip("GJ-18-Z-7800", ">", ["Navsari", "Sarbhon", "Bardoli linir", "Bardoli Station"], ["6:05 PM", "6:25 PM", "6:55 PM", "7:05 PM"]),
  trip("GJ-18-Z-9651", ">", ["Gangtha", "Selamba", "Umarpada", "Mandvi(Surat)", "Kadod", "Bardoli Station", "Bardoli linir", "Sarbhon", "Navsari"], ["6:10 AM", "7:10 AM", "8:25 AM", "9:30 AM", "9:50 AM", "10:20 AM", "10:28 AM", "10:41 AM", "12:00 PM"]),
  trip("GJ-18-Z-9651", "<", ["Navsari", "Sarbhon", "Bardoli linir", "Bardoli Station", "Kadod", "Mandvi(Surat)", "Umarpada", "Selamba"], ["2:00 PM", "2:38 PM", "2:51 PM", "3:00 PM", "3:30 PM", "3:49 PM", "4:54 PM", "7:50 PM"]),
  trip("GJ-18-Z-8355", ">", ["Bardoli Station", "Bardoli linir", "Navsari", "Gandevi", "Bilimora Depot"], ["9:10 AM", "9:30 AM", "9:40 AM", "10:00 AM", "10:20 AM"]),
  trip("GJ-18-Z-8355", ">", ["Bardoli Station", "Bardoli linir", "Navsari", "Gandevi", "Bilimora Depot"], ["3:45 PM", "3:55 PM", "4:35 PM", "5:00 PM", "5:25 PM"]),
  trip("GJ-18-Z-9710", ">", ["Akkalkuva - Maharashtra", "Selamba", "Umarpada", "Mandvi(Surat)", "Kadod", "Bardoli Station", "Bardoli linir", "Kadodara", "Surat", "Udhana(Surat)", "Navsari"], ["5:31 AM", "6:21 AM", "8:47 AM", "9:45 AM", "10:13 AM", "10:55 AM", "11:01 AM", "12:05 PM", "12:21 PM", "12:32 PM", "1:00 PM"]),
  trip("GJ-18-Z-9710", "<", ["Navsari", "Udhana(Surat)", "Surat", "Kadodara", "Bardoli linir", "Bardoli Station", "Kadod", "Mandvi(Surat)", "Umarpada", "Sagbara", "Selamba", "Gangtha", "Akkalkuva - Maharashtra"], ["1:15 PM", "1:55 PM", "2:15 PM", "2:50 PM", "3:05 PM", "3:10 PM", "3:25 PM", "4:15 PM", "4:55 PM", "5:15 PM", "5:50 PM", "6:50 PM", "7:00 PM"]),
  trip("GJ-18-Z-9001", ">", ["Bardoli Station", "Bardoli linir", "Sarbhon", "Navsari"], ["11:30 AM", "11:38 AM", "11:50 AM", "12:10 PM"]),
  trip("GJ-18-Z-9001", ">", ["Navsari", "Sarbhon", "Bardoli linir", "Bardoli Station"], ["12:30 PM", "1:00 PM", "1:20 PM", "1:30 PM"]),
  trip("GJ-18-Z-7738", ">", ["Bardoli Station", "Bardoli linir", "Sarbhon", "Navsari"], ["2:00 PM", "2:08 PM", "2:20 PM", "2:45 PM"]),
  trip("GJ-18-Z-7738", ">", ["Navsari", "Sarbhon", "Bardoli linir", "Bardoli Station", "Masad"], ["3:10 PM", "3:45 PM", "4:00 PM", "4:10 PM", "4:40 PM"]),
  trip("GJ-18-Z-3665", ">", ["Bardoli Station", "Bardoli linir", "Sarbhon", "Navsari"], ["2:30 PM", "2:35 PM", "2:50 PM", "3:10 PM"]),
  trip("GJ-18-Z-3665", ">", ["Navsari", "Sarbhon", "Bardoli Station", "Bardoli linir"], ["3:40 PM", "4:10 PM", "4:30 PM", "4:40 PM"]),
  trip("GJ-18-Z-9648", ">", ["Selamba", "Dediapada", "Netrang", "Mandvi(Surat)", "Kadod", "Bardoli Station", "Bardoli Linir", "Navsari"], ["1:00 PM", "1:35 PM", "2:15 PM", "3:15 PM", "3:35 PM", "3:55 PM", "4:01 PM", "4:50 PM"]),
  trip("GJ-18-Z-9648", "<", ["Navsari", "Bardoli linir", "Bardoli Station", "Kadod", "Mandvi(Surat)", "Netrang", "Dediapada", "Selamba"], ["8:10 AM", "8:55 AM", "9:02 AM", "9:30 AM", "9:50 AM", "11:00 AM", "11:20 AM", "12:05 PM"]),
  trip("GJ-18-Z-4884", ">", ["Bardoli Station", "Bardoli linir", "Sarbhon", "Navsari"], ["4:20 PM", "4:25 PM", "4:40 PM", "5:00 PM"]),
  trip("GJ-18-Z-4884", ">", ["Navsari", "Sarbhon", "Bardoli Linir", "Bardoli Station"], ["5:10 PM", "5:40 PM", "6:00 PM", "6:10 PM"]),
  trip("GJ-18-Z-8585", ">", ["Bardoli Station", "Bardoli linir", "Sarbhon", "Navsari"], ["5:40 PM", "5:45 PM", "6:00 PM", "6:20 PM"]),
  trip("GJ-18-Z-8585", ">", ["Navsari", "Sarbhon", "Bardoli Linir", "Bardoli Station"], ["6:50 PM", "7:20 PM", "7:45 PM", "8:00 PM"]),
  trip("GJ-18-Z-9027", ">", ["Bardoli Station", "Bardoli linir", "Sarbhon", "Navsari"], ["8:10 PM", "8:15 PM", "8:30 PM", "8:50 PM"])
];

function trip(bus, direction, stops, times) {
  return { bus, direction, stops, times };
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function stopId(name) {
  const id = stopAlias[normalizeName(name)];
  if (!id) {
    throw new Error(`Unknown stop alias: ${name}`);
  }
  return id;
}

function parseTime(value) {
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (!match) {
    throw new Error(`Invalid time: ${value}`);
  }
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridian = match[3].toUpperCase();
  if (meridian === "PM" && hour !== 12) hour += 12;
  if (meridian === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function routeSlug(stopIds) {
  return stopIds
    .map((id) => id.replace(/^STOP_/, "").replace(/_GSRTC|_BUS|_STATION/g, ""))
    .filter(Boolean)
    .join("_")
    .replace(/_+/g, "_")
    .slice(0, 90);
}

function segmentId(from, to) {
  return `SEG_${from.replace(/^STOP_/, "")}_TO_${to.replace(/^STOP_/, "")}`;
}

function busId(number) {
  return `BUS_${number.replace(/[^A-Z0-9]/gi, "_").replace(/_+/g, "_").replace(/^_|_$/g, "")}`;
}

function haversineKm(a, b) {
  const toRad = (v) => v * Math.PI / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function bearingMidpoint(a, b) {
  return [
    Number(((a.latitude + b.latitude) / 2 + (b.longitude - a.longitude) * 0.015).toFixed(6)),
    Number(((a.longitude + b.longitude) / 2 - (b.latitude - a.latitude) * 0.015).toFixed(6))
  ];
}

function buildSegmentGeometry(from, to) {
  const distance = haversineKm(from, to);
  const steps = Math.max(2, Math.ceil(distance / 4.5));
  const control = bearingMidpoint(from, to);
  const points = [];

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const oneMinus = 1 - t;
    const lat =
      oneMinus * oneMinus * from.latitude +
      2 * oneMinus * t * control[0] +
      t * t * to.latitude;
    const lng =
      oneMinus * oneMinus * from.longitude +
      2 * oneMinus * t * control[1] +
      t * t * to.longitude;
    points.push([Number(lat.toFixed(6)), Number(lng.toFixed(6))]);
  }

  points[0] = [from.latitude, from.longitude];
  points[points.length - 1] = [to.latitude, to.longitude];
  return points;
}

function directionLabel(symbol, firstStop, lastStop) {
  if (symbol === "<") return "reverse";
  if (firstStop === "STOP_BARDOLI" || firstStop === "STOP_MASAD" || firstStop === "STOP_BUHARI") return "southbound";
  if (lastStop === "STOP_NAVSARI" || lastStop === "STOP_VALSAD" || lastStop === "STOP_BILIMORA") return "southbound";
  return "onward";
}

function validateStopCoordinates(stopObjects) {
  const rejected = [];
  const valid = stopObjects.filter((stop) => {
    const inRegion = stop.latitude >= 20 && stop.latitude <= 22.2 && stop.longitude >= 72.5 && stop.longitude <= 74.3;
    if (!inRegion) rejected.push(stop.stop_id);
    return inRegion;
  });
  if (rejected.length) {
    console.warn(`Rejected impossible stop coordinates: ${rejected.join(", ")}`);
  }
  return valid;
}

const stopObjects = validateStopCoordinates(stops.map(([stop_id, stop_name, latitude, longitude, aliases]) => ({
  stop_id,
  stop_name,
  latitude,
  longitude,
  aliases
})));

const stopMap = Object.fromEntries(stopObjects.map((stop) => [stop.stop_id, stop]));
const segmentMap = new Map();
const routeMap = new Map();
const routeIdCounts = new Map();
const busMap = new Map();
const generatedTrips = [];

function getRouteIdForStops(stopIds) {
  const key = stopIds.join(">");
  if (routeMap.has(key)) return routeMap.get(key).route_id;
  const base = `ROUTE_${routeSlug([stopIds[0], stopIds[stopIds.length - 1]])}`;
  const count = (routeIdCounts.get(base) || 0) + 1;
  routeIdCounts.set(base, count);
  const routeId = count === 1 ? base : `${base}_${count}`;
  routeMap.set(key, { route_id: routeId, key });
  return routeId;
}

rawTrips.forEach((raw, index) => {
  const ids = raw.stops.map(stopId);
  const times = raw.times.map(parseTime);
  const routeId = getRouteIdForStops(ids);

  ids.slice(0, -1).forEach((from, i) => {
    const to = ids[i + 1];
    const id = segmentId(from, to);
    if (!segmentMap.has(id)) {
      const fromStop = stopMap[from];
      const toStop = stopMap[to];
      const distance = haversineKm(fromStop, toStop);
      const minutes = Math.max(4, parseTimeToMinutes(times[i + 1]) - parseTimeToMinutes(times[i]));
      segmentMap.set(id, {
        segment_id: id,
        from_stop: from,
        to_stop: to,
        avg_time_min: minutes,
        distance_km: Number(distance.toFixed(1))
      });
    }
  });

  const bId = busId(raw.bus);
  if (!busMap.has(bId)) {
    busMap.set(bId, {
      bus_id: bId,
      bus_number: raw.bus,
      assigned_route: routeId,
      type: raw.bus.includes("ZT") ? "Express" : "GSRTC",
      display_label: `${raw.bus} Pilot Service`,
      route_metadata: {
        service_window: `${times[0]} - ${times[times.length - 1]}`,
        default_occupancy: "Medium",
        default_load: "Operational"
      }
    });
  }

  generatedTrips.push({
    trip_id: `TRIP_${String(index + 1).padStart(3, "0")}_${bId.replace(/^BUS_/, "")}`,
    bus_id: bId,
    route_id: routeId,
    service_date: "",
    service_pattern: "DAILY",
    direction_symbol: raw.direction,
    current_segment: segmentId(ids[0], ids[1]),
    progress_percent: 0,
    delay_minutes: 0,
    live_status: "SCHEDULED",
    lifecycle_state: "SCHEDULED",
    scheduled_departure: times[0],
    scheduled_arrival: times[times.length - 1],
    stop_times: ids.map((id, i) => ({ stop_id: id, arrival_time: times[i] })),
    last_updated: 0
  });
});

const routes = Array.from(routeMap.values()).map((entry) => {
  const trip = generatedTrips.find((item) => item.route_id === entry.route_id);
  const ids = trip.stop_times.map((timing) => timing.stop_id);
  const segments = ids.slice(0, -1).map((from, i) => segmentId(from, ids[i + 1]));
  const firstStop = stopMap[ids[0]].stop_name;
  const lastStop = stopMap[ids[ids.length - 1]].stop_name;
  return {
    route_id: entry.route_id,
    route_name: `${firstStop} to ${lastStop}`,
    direction: directionLabel(trip.direction_symbol, ids[0], ids[ids.length - 1]),
    direction_symbol: trip.direction_symbol,
    ordered_stops: ids,
    segments,
    stop_timings: trip.stop_times.map((timing) => ({ ...timing })),
    path_coordinates: []
  };
});

const segmentCoordinates = {};
Array.from(segmentMap.values()).forEach((segment) => {
  const from = stopMap[segment.from_stop];
  const to = stopMap[segment.to_stop];
  const reverseId = segmentId(segment.to_stop, segment.from_stop);
  if (segmentCoordinates[reverseId]) {
    segmentCoordinates[segment.segment_id] = segmentCoordinates[reverseId].slice().reverse();
  } else {
    segmentCoordinates[segment.segment_id] = buildSegmentGeometry(from, to);
  }
});

const routeCoordinates = {};
routes.forEach((route) => {
  const points = [];
  route.segments.forEach((id) => {
    const geometry = segmentCoordinates[id] || [];
    if (!points.length) {
      points.push(...geometry);
    } else {
      points.push(...geometry.slice(1));
    }
  });
  routeCoordinates[route.route_id] = points;
});

function parseTimeToMinutes(value) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function writeDataFile(fileName, propertyName, value, prelude = "") {
  const body = JSON.stringify(value, null, 2).replace(/"([^"]+)":/g, "$1:");
  fs.writeFileSync(
    path.join(DATA_DIR, fileName),
    `(function () {\n  window.BusTrackData = window.BusTrackData || {};\n${prelude ? `\n${prelude}\n` : ""}\n  window.BusTrackData.${propertyName} = ${indent(body, 2)};\n})();\n`
  );
}

function indent(text, spaces) {
  const pad = " ".repeat(spaces);
  return text.split("\n").map((line, index) => (index === 0 ? line : pad + line)).join("\n");
}

writeDataFile("pilot-stops.js", "pilotStops", stopObjects, "  // Normalized GSRTC-style pilot stops. Impossible out-of-region coordinates are excluded.");
writeDataFile("segments.js", "segments", Array.from(segmentMap.values()), "  // Reusable corridor segments shared by many routes and trips.");
writeDataFile("pilot-segment-coordinates.js", "pilotSegmentCoordinates", segmentCoordinates, "  // Lightweight road-following-safe segment geometry generated from validated stops.");
writeDataFile("pilot-route-coordinates.js", "pilotRouteCoordinates", routeCoordinates, "  // Route geometry is composed from reusable segment geometry.");
writeDataFile("pilot-routes.js", "pilotRoutes", routes, "  // Routes reference reusable stops and segments. Trip-level stop_times carry exact schedule runs.");
writeDataFile("pilot-buses.js", "pilotBuses", Array.from(busMap.values()), "  // Physical buses reference assigned routes; repeated runs are stored in trips.js.");
writeDataFile("trips.js", "trips", generatedTrips, "  // Daily operational trip runs. Empty service_date means the pilot schedule recurs daily.");

console.log(`Generated ${stopObjects.length} stops, ${segmentMap.size} segments, ${routes.length} routes, ${busMap.size} buses, ${generatedTrips.length} trips.`);
