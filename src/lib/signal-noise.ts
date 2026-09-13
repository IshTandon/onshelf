type Rng = ReturnType<typeof import("./seed").createRng>;

export const LOW_CONFIDENCE_ZONES = ["A6-L2", "A7-L2"];

/** Confidence centred ~0.72 with a long low tail — not a flat 0.95 ceiling */
export function sampleConfidence(
  rng: Rng,
  zoneId: string,
  degraded: boolean
): number {
  if (LOW_CONFIDENCE_ZONES.includes(zoneId)) {
    // Bad angle: capped at 0.55, rarely clears detection thresholds
    const raw = rng.gaussian(0.44, 0.09);
    return Math.max(0.22, Math.min(0.55, raw));
  }

  // ~22% of readings fall into the low tail (glare, partial occlusion, motion blur)
  if (rng.chance(0.22)) {
    return rng.float(0.28, 0.52);
  }
  // ~6% are very bad
  if (rng.chance(0.06)) {
    return rng.float(0.2, 0.38);
  }

  const base = rng.gaussian(0.72, 0.13);
  let conf = Math.max(0.3, Math.min(0.86, base));
  if (degraded) conf *= 0.85;
  return Math.max(0.2, conf);
}

/** Background gap readings — mostly low, occasional false alarm */
export function sampleBackgroundGapRatio(rng: Rng): number {
  if (rng.chance(0.07)) {
    return rng.float(0.62, 0.88);
  }
  if (rng.chance(0.04)) {
    return rng.float(0.35, 0.58);
  }
  return rng.float(0, 0.28);
}

/** Per-camera sample schedule — staggered, jittered, occasionally skips a cycle */
export function buildCameraSchedule(
  rng: Rng,
  dayStart: number,
  dayEnd: number
): number[] {
  const times: number[] = [];
  const stagger = rng.int(15, 180) * 1000;
  let t = dayStart + stagger;

  while (t < dayEnd) {
    const jitterSec = rng.int(-95, 130);
    const sampleTs = t + jitterSec * 1000;
    if (sampleTs >= dayStart && sampleTs < dayEnd) {
      times.push(sampleTs);
    }

    let interval = CHECK_INTERVAL_MS;
    if (rng.chance(0.07)) {
      interval = CHECK_INTERVAL_MS * 2;
    } else if (rng.chance(0.05)) {
      interval = Math.round(CHECK_INTERVAL_MS * rng.float(1.4, 2.2));
    } else {
      interval += rng.int(-40, 55) * 1000;
    }
    t += interval;
  }

  return times;
}

export const CHECK_INTERVAL_MS = 3 * 60 * 1000;

export function sampleDropRate(rng: Rng): number {
  return 0.08 + rng.float(-0.03, 0.04);
}
