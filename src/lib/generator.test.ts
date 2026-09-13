import { describe, it, expect } from "vitest";
import {
  generateStoreData,
  getSignalGenerationMeta,
  analyzeSignalDay,
  getScriptedGaps,
} from "./generator";
import {
  classifyTasks,
  collapseFacingTasks,
  getOpenTasks,
} from "./classification";
import { buildSampleDayReport } from "./generator-sample";
import { getDayStartTs, getDayEndTs, hourToTs } from "./time";

const SEED = 42;

function isBackgroundSignal(
  s: { zoneId: string; ts: number },
  gaps = getScriptedGaps()
) {
  return !gaps.some(
    (g) => g.zoneId === s.zoneId && s.ts >= g.startTs && s.ts < g.endTs
  );
}

describe("messy signal generator", () => {
  const storeData = generateStoreData(SEED);
  const meta = getSignalGenerationMeta(SEED);
  const background = storeData.signals.filter((s) => isBackgroundSignal(s));
  const confs = background.map((s) => s.confidence);

  it("drops 5–12% of background signals", () => {
    const rate = meta.droppedBackgroundSignals / meta.expectedBackgroundSignals;
    expect(rate).toBeGreaterThanOrEqual(0.04);
    expect(rate).toBeLessThanOrEqual(0.18);
  });

  it("has a long low-confidence tail, not clustered at 0.95", () => {
    expect(confs.length).toBeGreaterThan(0);
    const lowTail = confs.filter((c) => c < 0.55).length;
    const highCluster = confs.filter((c) => c > 0.85).length;
    expect(lowTail / confs.length).toBeGreaterThan(0.08);
    expect(highCluster / confs.length).toBeLessThan(0.15);
    expect(Math.max(...confs)).toBeLessThanOrEqual(0.95);
  });

  it("jitter timestamps off the 3-minute grid", () => {
    const offGrid = storeData.signals.filter((s) => {
      const sec = new Date(s.ts).getSeconds();
      return sec > 5 && sec < 55;
    });
    expect(offGrid.length / storeData.signals.length).toBeGreaterThan(0.5);
  });

  it("keeps blind-spot zones chronically weak", () => {
    for (const zoneId of ["A6-L2", "A7-L2"]) {
      const stats = analyzeSignalDay(
        storeData.signals,
        storeData.heartbeats,
        zoneId,
        getDayStartTs(),
        getDayEndTs()
      );
      expect(stats.maxConf).toBeLessThanOrEqual(0.55);
      expect(stats.lowTail / stats.count).toBeGreaterThan(0.5);
    }
  });

  it("still fires scripted demo events", () => {
    const phantom = getOpenTasks(
      collapseFacingTasks(
        classifyTasks({
          storeData,
          currentTs: hourToTs(9, 26),
          existingTasks: [],
        })
      ),
      hourToTs(9, 26)
    ).find((t) => t.zoneId === "A3-L2" && t.skuCode === "ATT-003");
    expect(phantom?.kind).toBe("phantom_suspected");

    const facing = getOpenTasks(
      collapseFacingTasks(
        classifyTasks({
          storeData,
          currentTs: hourToTs(15, 10),
          existingTasks: [],
        })
      ),
      hourToTs(15, 10)
    ).find((t) => t.zoneId === "A5-L1" && t.skuCode === "BEV-001");
    expect(facing?.kind).toBe("facing");
  });

  it("produces a sample-day report", () => {
    const report = buildSampleDayReport(SEED);
    expect(report).toContain("BEFORE");
    expect(report).toContain("AFTER");
    expect(report).toContain("Scripted events still fire");
  });
});
