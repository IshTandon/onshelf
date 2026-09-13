/**
 * Before/after sample-day report for signal generator quality.
 * Run: npm run sample-day
 */
import { createRng } from "./seed";
import { hourToTs, getDayStartTs, getDayEndTs, tsToClock } from "./time";
import {
  generateStoreData,
  analyzeSignalDay,
  getScriptedGaps,
  getSignalGenerationMeta,
} from "./generator";
import { CHECK_INTERVAL_MS } from "./signal-noise";
import { classifyTasks, collapseFacingTasks, getOpenTasks } from "./classification";
import { hourToTs as ht } from "./time";
import type { ShelfGapSignal, CameraHeartbeat, ShelfZone } from "@/types";

const SEED = 42;

/** Original clean generator — shared grid, tight jitter, no real drops */
function generateCleanSignals(zones: ShelfZone[], seed: number) {
  const rng = createRng(seed);
  const signals: ShelfGapSignal[] = [];
  const heartbeats: CameraHeartbeat[] = [];
  const scriptedGaps = getScriptedGaps();
  const dropRate = 0.08 + rng.float(-0.03, 0.04);
  const dayStart = getDayStartTs();
  const dayEnd = getDayEndTs();

  const checkTimes: number[] = [];
  let t = dayStart;
  while (t < dayEnd) {
    checkTimes.push(t + rng.int(-45, 45) * 1000);
    t += CHECK_INTERVAL_MS;
  }

  const cameraIds = [
    "cam-1", "cam-2", "cam-3", "cam-4",
    "cam-5", "cam-6", "cam-7", "cam-8",
  ];

  let expected = 0;
  let dropped = 0;

  for (const camId of cameraIds) {
    for (const checkTs of checkTimes) {
      heartbeats.push({ cameraId: camId, ts: checkTs, status: "ok" });
      const camZones = zones.filter((z) => z.cameraId === camId && z.covered);
      for (const zone of camZones) {
        const scripted = scriptedGaps.find(
          (g) =>
            g.zoneId === zone.id &&
            checkTs >= g.startTs &&
            checkTs < g.endTs
        );
        expected++;
        const wouldDrop = rng.chance(dropRate);
        if (!scripted && wouldDrop) {
          dropped++;
          continue;
        }
        const gapRatio = scripted
          ? scripted.gapRatio + rng.float(-0.05, 0.05)
          : rng.chance(0.08)
            ? rng.float(0.65, 0.9)
            : rng.float(0, 0.3);
        const confidence = Math.max(
          0.3,
          Math.min(0.95, rng.gaussian(0.72, 0.15))
        );
        signals.push({
          zoneId: zone.id,
          ts: checkTs,
          gapRatio,
          confidence,
        });
      }
    }
  }

  return { signals, heartbeats, dropRate, expected, dropped };
}

function fmt(n: number, d = 2) {
  return n.toFixed(d);
}

function pct(n: number, total: number) {
  return total === 0 ? "0%" : `${Math.round((n / total) * 100)}%`;
}

function reportBlock(
  label: string,
  signals: ShelfGapSignal[],
  heartbeats: CameraHeartbeat[],
  dropRate: number,
  expected: number,
  dropped: number,
  zoneId: string,
  from: number,
  to: number
): string {
  const allConfs = signals.map((s) => s.confidence);
  const lowTail = allConfs.filter((c) => c < 0.55).length;
  const highCluster = allConfs.filter((c) => c > 0.85).length;
  const zone = analyzeSignalDay(signals, heartbeats, zoneId, from, to);

  return [
    `  ${label}`,
    `  Signals (day total)     : ${signals.length}`,
    `  Drop rate (configured)  : ${fmt(dropRate * 100, 1)}%`,
    `  Signals dropped         : ${dropped} of ${expected} expected (${pct(dropped, expected)})`,
    `  Confidence mean         : ${fmt(allConfs.reduce((a, b) => a + b, 0) / (allConfs.length || 1))}`,
    `  Confidence range        : ${fmt(Math.min(...allConfs, 1))} – ${fmt(Math.max(...allConfs, 0))}`,
    `  Readings below 0.55     : ${lowTail} (${pct(lowTail, allConfs.length)} of all)`,
    `  Readings above 0.85     : ${highCluster} (${pct(highCluster, allConfs.length)} of all)`,
    ``,
    `  Zone ${zoneId} (${tsToClock(from)}–${tsToClock(to)}):`,
    `    Samples               : ${zone.count}  (heartbeats on cam: ${zone.heartbeats})`,
    `    Gap sightings (>0.6)  : ${zone.gaps}`,
    `    Confidence            : ${fmt(zone.avgConf)} avg, ${fmt(zone.minConf)}–${fmt(zone.maxConf)} range`,
    `    Low-confidence count  : ${zone.lowTail}`,
    `    Timestamps (* = off grid): ${zone.timestamps.join("  ") || "(none)"}`,
  ].join("\n");
}

export function buildSampleDayReport(seed = SEED): string {
  const storeData = generateStoreData(seed);
  const zones = storeData.zones;

  const clean = generateCleanSignals(zones, seed);
  const messy = storeData;

  const bgStats = getSignalGenerationMeta(seed);

  const facingStart = hourToTs(14, 30);
  const facingEnd = hourToTs(15, 30);

  const lines = [
    "OnShelf signal generator — sample day comparison (seed=42)",
    "═".repeat(62),
    "",
    "BEFORE (clean scaffold)",
    "─".repeat(62),
    reportBlock(
      "All cameras share one 3-minute grid. Jitter ±45s.",
      clean.signals,
      clean.heartbeats,
      clean.dropRate,
      clean.expected,
      clean.dropped,
      "A5-L1",
      facingStart,
      facingEnd
    ),
    "",
    "AFTER (messy production-like)",
    "─".repeat(62),
    reportBlock(
      "Per-camera schedules, 5–12% drops, quiet cameras, injected scripted events.",
      messy.signals,
      messy.heartbeats,
      bgStats.dropRate,
      bgStats.expectedBackgroundSignals,
      bgStats.droppedBackgroundSignals,
      "A5-L1",
      facingStart,
      facingEnd
    ),
    `  Scripted injections      : ${bgStats.scriptedSignalCount} guaranteed demo signals`,
    "",
    "Blind-spot zones (A6-L2 Hair Care, A7-L2 Cleaning) — full day:",
    "─".repeat(62),
    ...["A6-L2", "A7-L2"].map((zid) => {
      const z = analyzeSignalDay(
        messy.signals,
        messy.heartbeats,
        zid,
        getDayStartTs(),
        getDayEndTs()
      );
      const clearsThreshold = messy.signals
        .filter((s) => s.zoneId === zid)
        .filter((s) => s.confidence > 0.75 && s.gapRatio > 0.6).length;
      return [
        `  ${zid}: ${z.count} samples, conf ${fmt(z.avgConf)} avg (${fmt(z.minConf)}–${fmt(z.maxConf)}),`,
        `         ${z.lowTail} low-confidence readings, ${clearsThreshold} would clear Confirmed+gap threshold`,
      ].join("\n");
    }),
    "",
    "Scripted events still fire:",
    "─".repeat(62),
    ...verifyScriptedEvents(messy),
  ];

  return lines.join("\n");
}

function verifyScriptedEvents(storeData: ReturnType<typeof generateStoreData>): string[] {
  const checks = [
    { label: "09:26 phantom ATT-003", ts: ht(9, 26), zone: "A3-L2", sku: "ATT-003", kind: "phantom_suspected" as const },
    { label: "15:10 facing BEV-001", ts: ht(15, 10), zone: "A5-L1", sku: "BEV-001", kind: "facing" as const },
    { label: "17:45 peak RIC-001", ts: ht(17, 45), zone: "A4-L1", sku: "RIC-001", kind: null },
  ];

  return checks.map(({ label, ts, zone, sku, kind }) => {
    const classified = collapseFacingTasks(
      classifyTasks({ storeData, currentTs: ts, existingTasks: [] })
    );
    const open = getOpenTasks(classified, ts);
    const task = open.find((t) => t.zoneId === zone && t.skuCode === sku);
    const windowStart = ts - 20 * 60 * 1000;
    const gapHits = storeData.signals.filter(
      (s) => s.zoneId === zone && s.ts >= windowStart && s.ts <= ts && s.gapRatio > 0.6
    ).length;
    const kindOk = kind ? task?.kind === kind : !!task;
    return `  ${label}: task ${task ? "open" : "missing"}, kind ${task?.kind ?? "—"} ${kindOk ? "✓" : "✗"} (${gapHits} gap signals)`;
  });
}
