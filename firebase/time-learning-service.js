import { realtimePaths } from "./realtime-paths.js";
import { realtimeService } from "./realtime-service.js";

export const timeLearningDefaults = {
  bucketMinutes: 30,
  alpha: 0.2
};

function pad2(value) {
  return String(value).padStart(2, "0");
}

export function getDayType(date) {
  const d = date instanceof Date ? date : new Date();
  const day = d.getDay(); // 0=Sun ... 6=Sat
  return day === 0 || day === 6 ? "weekend" : "weekday";
}

export function getBucketKey(date, bucketMinutes) {
  const d = date instanceof Date ? date : new Date();
  const minutes = Number(bucketMinutes) || timeLearningDefaults.bucketMinutes;
  const bucketStartMinute = Math.floor(d.getMinutes() / minutes) * minutes;
  return pad2(d.getHours()) + ":" + pad2(bucketStartMinute);
}

function normalizeMinutes(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function emaUpdate(oldValue, observed, alpha) {
  const a = typeof alpha === "number" && alpha > 0 && alpha < 1
    ? alpha
    : timeLearningDefaults.alpha;

  if (oldValue === null) {
    return observed;
  }

  return (1 - a) * oldValue + a * observed;
}

export const timeLearningService = {
  defaults: Object.assign({}, timeLearningDefaults),
  getDayType: getDayType,
  getBucketKey: getBucketKey,

  readSegmentTimingBucket: async function (routeId, segmentId, options) {
    const dayType = (options && options.dayType) || getDayType(new Date());
    const bucketKey = (options && options.bucketKey) || getBucketKey(new Date(), options && options.bucketMinutes);
    const path = realtimePaths.segmentTimingBucket(routeId, segmentId, dayType, bucketKey);
    return realtimeService.read(path);
  },

  /**
   * Update a segment timing bucket using EMA.
   *
   * Required: routeId, segmentId, fromStopId, toStopId, observedTimeMinutes
   * Optional: alpha, dayType, bucketKey, seedEmaMinutes
   */
  updateSegmentTimingEMA: async function (payload, options) {
    payload = payload || {};

    const routeId = String(payload.routeId || payload.route_id || "").trim();
    const segmentId = String(payload.segmentId || payload.segment_id || "").trim();
    const fromStopId = String(payload.fromStopId || payload.from_stop_id || "").trim();
    const toStopId = String(payload.toStopId || payload.to_stop_id || "").trim();
    const observed = normalizeMinutes(payload.observedTimeMinutes ?? payload.observed_time_minutes);

    if (!routeId || !segmentId || !fromStopId || !toStopId || observed === null) {
      return Promise.resolve({
        ok: false,
        reason: "routeId, segmentId, fromStopId, toStopId, observedTimeMinutes are required."
      });
    }

    const alpha = typeof payload.alpha === "number" ? payload.alpha : (options && options.alpha);
    const dayType = (payload.dayType || payload.day_type || (options && options.dayType)) || getDayType(new Date());
    const bucketKey =
      (payload.bucketKey || payload.bucket_key || (options && options.bucketKey)) ||
      getBucketKey(new Date(), payload.bucketMinutes || (options && options.bucketMinutes));

    const path = realtimePaths.segmentTimingBucket(routeId, segmentId, dayType, bucketKey);
    const current = await realtimeService.read(path);

    if (current && current.disabled) {
      return current;
    }

    const existing = current && current.ok ? current.value : null;
    const seedEmaMinutes = normalizeMinutes(payload.seedEmaMinutes ?? payload.seed_ema_minutes);
    const oldEma =
      normalizeMinutes(existing && (existing.ema_time_minutes ?? existing.emaTimeMinutes)) ??
      normalizeMinutes(existing && (existing.observed_time_minutes ?? existing.observedTimeMinutes)) ??
      seedEmaMinutes;
    const sampleCount = Math.max(
      0,
      Number(existing && (existing.sample_count ?? existing.sampleCount)) || 0
    );

    const newEma = emaUpdate(oldEma, observed, alpha);
    const timestamp = await realtimeService.timestamp();

    const writePayload = {
      segment_id: segmentId,
      route_id: routeId,
      from_stop_id: fromStopId,
      to_stop_id: toStopId,
      observed_time_minutes: observed,
      ema_time_minutes: newEma,
      sample_count: sampleCount + 1,
      last_updated_at: timestamp
    };

    const result = await realtimeService.write(path, writePayload);
    return Object.assign({}, result, {
      value: writePayload
    });
  }
};

if (typeof window !== "undefined") {
  window.BusTrackTimeLearning = timeLearningService;
  window.dispatchEvent(new CustomEvent("busTrackTimeLearningReady"));
}

