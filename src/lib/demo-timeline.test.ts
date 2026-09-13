import { describe, it, expect } from "vitest";
import { generateStoreData, getCameraStatusAtTs } from "./generator";
import {
  classifyTasks,
  collapseFacingTasks,
  getOpenTasks,
  getConfidenceLabel,
} from "./classification";
import { hourToTs } from "./time";

const SEED = 42;

function openAt(ts: number) {
  const storeData = generateStoreData(SEED);
  const tasks = collapseFacingTasks(
    classifyTasks({ storeData, currentTs: ts, existingTasks: [] })
  );
  return { storeData, open: getOpenTasks(tasks, ts) };
}

describe("scripted demo timeline (seed 42)", () => {
  it("09:20 — headline phantom opens in Aisle 3 Atta", () => {
    const { open } = openAt(hourToTs(9, 20));
    const phantom = open.find(
      (t) => t.zoneId === "A3-L2" && t.skuCode === "ATT-003"
    );
    expect(phantom).toBeDefined();
    expect(phantom!.kind).toBe("phantom_suspected");
    expect(phantom!.mode).toBe("observed");
    expect(phantom!.evidence.systemStock).toBe(40);
    expect(phantom!.valueAtRiskPerHour).toBe(3360);
  });

  it("11:05 — camera 4 degrades, A3-L2 confidence drops to Likely", () => {
    const ts = hourToTs(11, 5);
    const { storeData, open } = openAt(ts);
    expect(getCameraStatusAtTs(storeData.heartbeats, "cam-4", ts)).toBe(
      "degraded"
    );
    const task = open.find(
      (t) => t.zoneId === "A3-L2" && t.skuCode === "ATT-003"
    );
    expect(task).toBeDefined();
    expect(task!.mode).toBe("observed");
    expect(getConfidenceLabel(task!.confidence, task!.mode)).toBe("Likely");
  });

  it("13:30 — camera 4 offline, A3-L2 stays on list as Predicted", () => {
    const ts = hourToTs(13, 30);
    const { storeData, open } = openAt(ts);
    expect(getCameraStatusAtTs(storeData.heartbeats, "cam-4", ts)).toBe(
      "offline"
    );
    const task = open.find(
      (t) => t.zoneId === "A3-L2" && t.skuCode === "ATT-003"
    );
    expect(task).toBeDefined();
    expect(task!.mode).toBe("predicted");
    expect(task!.confidence).toBeLessThanOrEqual(0.5);
    expect(open.length).toBeGreaterThan(0);
  });

  it("15:10 — facing false positive on BEV-001, not phantom", () => {
    const { open } = openAt(hourToTs(15, 10));
    const facing = open.find(
      (t) => t.zoneId === "A5-L1" && t.skuCode === "BEV-001"
    );
    expect(facing).toBeDefined();
    expect(facing!.kind).toBe("facing");
  });

  it("17:45 — peak: three shelf tasks plus rupee ranking", () => {
    const { open } = openAt(hourToTs(17, 45));
    const peakSkus = ["RIC-001", "HH-001", "FRZ-001"];
    for (const sku of peakSkus) {
      const zone =
        sku === "RIC-001" ? "A4-L1" : sku === "HH-001" ? "A7-L1" : "A8-L1";
      expect(open.some((t) => t.zoneId === zone && t.skuCode === sku)).toBe(
        true
      );
    }
    const values = open.map((t) => t.valueAtRiskPerHour);
    const sorted = [...values].sort((a, b) => b - a);
    expect(values).toEqual(sorted);
    expect(open[0].valueAtRiskPerHour).toBeGreaterThan(open[1].valueAtRiskPerHour);
  });

  it("19:00 — camera 4 returns, A3-L2 back to observed Confirmed", () => {
    const ts = hourToTs(19, 0);
    const { storeData, open } = openAt(ts);
    expect(getCameraStatusAtTs(storeData.heartbeats, "cam-4", ts)).toBe("ok");
    const task = open.find(
      (t) => t.zoneId === "A3-L2" && t.skuCode === "ATT-003"
    );
    expect(task).toBeDefined();
    expect(task!.mode).toBe("observed");
    expect(getConfidenceLabel(task!.confidence, task!.mode)).toBe("Confirmed");
  });
});
