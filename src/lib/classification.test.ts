import { describe, it, expect } from "vitest";
import { generateStoreData, getCameraStatusAtTs } from "./generator";
import {
  classifyTasks,
  collapseFacingTasks,
  getOpenTasks,
  countSightings,
} from "./classification";
import { hourToTs } from "./time";

const SEED = 42;

function openTaskAt(ts: number, zoneId: string, skuCode: string) {
  const storeData = generateStoreData(SEED);
  const classified = classifyTasks({
    storeData,
    currentTs: ts,
    existingTasks: [],
  });
  const tasks = collapseFacingTasks(classified);
  const open = getOpenTasks(tasks, ts);
  return open.find((t) => t.zoneId === zoneId && t.skuCode === skuCode);
}

describe("scripted classification", () => {
  it("09:26 ATT-003 in A3-L2 is phantom_suspected, not facing", () => {
    const task = openTaskAt(hourToTs(9, 26), "A3-L2", "ATT-003");
    expect(task).toBeDefined();
    expect(task!.kind).toBe("phantom_suspected");
    expect(task!.evidence.systemStock).toBe(40);
  });

  it("15:10 BEV-001 in A5-L1 is facing, not phantom", () => {
    const ts = hourToTs(15, 10);
    const storeData = generateStoreData(SEED);
    const sightings = countSightings(storeData.signals, "A5-L1", ts);
    expect(sightings.seen).toBeGreaterThanOrEqual(3);
    expect(sightings.checks).toBeGreaterThanOrEqual(3);

    const task = openTaskAt(ts, "A5-L1", "BEV-001");
    expect(task).toBeDefined();
    expect(task!.kind).toBe("facing");
  });

  it("14:00 cam-4 offline keeps A3-L2 on list in predicted mode", () => {
    const ts = hourToTs(14, 0);
    const storeData = generateStoreData(SEED);
    expect(getCameraStatusAtTs(storeData.heartbeats, "cam-4", ts)).toBe(
      "offline"
    );

    const task = openTaskAt(ts, "A3-L2", "ATT-003");
    expect(task).toBeDefined();
    expect(task!.mode).toBe("predicted");
    expect(task!.confidence).toBeLessThanOrEqual(0.5);
    expect(task!.evidence.cameraStatus).toBe("offline");
  });

  it("09:26 does not open a facing task in Aisle 3", () => {
    const storeData = generateStoreData(SEED);
    const ts = hourToTs(9, 26);
    const classified = classifyTasks({
      storeData,
      currentTs: ts,
      existingTasks: [],
    });
    const tasks = collapseFacingTasks(classified);
    const open = getOpenTasks(tasks, ts);
    const facingInAisle3 = open.filter(
      (t) => t.kind === "facing" && t.zoneId.startsWith("A3")
    );
    expect(facingInAisle3).toHaveLength(0);
  });
});
