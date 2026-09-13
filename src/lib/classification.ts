import type {
  ShelfZone,
  ShelfGapSignal,
  CameraHeartbeat,
  StaffPresent,
  InventoryRow,
  Task,
  TaskKind,
  ConfidenceLabel,
  StoreData,
} from "@/types";
import { isReplenishmentWindow } from "./time";
import { getSku, getZone, getInventoryRow, getCameraStatusAtTs } from "./generator";

const WINDOW_MS = 15 * 60 * 1000;
const GAP_THRESHOLD = 0.6;
const MIN_SIGHTINGS = 3;
const SIGHTING_WINDOW = 5;
const VALUE_FLOOR = 40;
const STAFF_TTL_MS = 60 * 1000;
const REVERSE_PHANTOM_NO_GAP_MS = 2 * 60 * 60 * 1000;
const REVERSE_PHANTOM_SALE_MS = 2 * 60 * 60 * 1000;
const FACING_SALE_MS = 30 * 60 * 1000;

export function getConfidenceLabel(
  confidence: number,
  mode: "observed" | "predicted"
): ConfidenceLabel {
  if (mode === "predicted" || confidence < 0.5) return "Predicted";
  if (confidence > 0.75) return "Confirmed";
  return "Likely";
}

function cameraHealthMultiplier(status: string): number {
  if (status === "ok") return 1.0;
  if (status === "degraded") return 0.7;
  return 0.5;
}

function getSignalsInWindow(
  signals: ShelfGapSignal[],
  zoneId: string,
  currentTs: number
): ShelfGapSignal[] {
  const windowStart = currentTs - WINDOW_MS;
  return signals
    .filter((s) => s.zoneId === zoneId && s.ts >= windowStart && s.ts <= currentTs)
    .sort((a, b) => a.ts - b.ts);
}

function getRecentChecks(
  signals: ShelfGapSignal[],
  zoneId: string,
  currentTs: number
): ShelfGapSignal[] {
  const byTs = new Map<number, ShelfGapSignal>();
  for (const s of signals) {
    if (s.zoneId !== zoneId || s.ts > currentTs) continue;
    const existing = byTs.get(s.ts);
    if (!existing || s.gapRatio > existing.gapRatio) {
      byTs.set(s.ts, s);
    }
  }
  return Array.from(byTs.values())
    .sort((a, b) => b.ts - a.ts)
    .slice(0, SIGHTING_WINDOW);
}

export function countSightings(
  signals: ShelfGapSignal[],
  zoneId: string,
  currentTs: number
): { seen: number; checks: number } {
  const recent = getRecentChecks(signals, zoneId, currentTs);
  const seen = recent.filter((s) => s.gapRatio > GAP_THRESHOLD).length;
  return { seen, checks: recent.length };
}

function hasSustainedGap(
  signals: ShelfGapSignal[],
  zoneId: string,
  currentTs: number
): { sustained: boolean; sightings: { seen: number; checks: number } } {
  const sightings = countSightings(signals, zoneId, currentTs);
  const sustained =
    sightings.checks >= MIN_SIGHTINGS && sightings.seen >= MIN_SIGHTINGS;
  return { sustained, sightings };
}

function hasNoGapForDuration(
  signals: ShelfGapSignal[],
  zoneId: string,
  currentTs: number,
  durationMs: number
): boolean {
  const windowStart = currentTs - durationMs;
  const inWindow = signals.filter(
    (s) => s.zoneId === zoneId && s.ts >= windowStart && s.ts <= currentTs
  );
  if (inWindow.length === 0) return true;
  return inWindow.every((s) => s.gapRatio <= GAP_THRESHOLD);
}

function hasRecentSale(
  inv: InventoryRow | undefined,
  currentTs: number,
  windowMs: number
): boolean {
  if (!inv?.lastSaleTs) return false;
  return currentTs - inv.lastSaleTs <= windowMs;
}

function isStaffPresent(
  staffEvents: StaffPresent[],
  zoneId: string,
  currentTs: number
): boolean {
  return staffEvents.some(
    (e) => e.zoneId === zoneId && currentTs - e.ts < STAFF_TTL_MS
  );
}

function classifyKind(
  sustained: boolean,
  systemStock: number,
  inv: InventoryRow | undefined,
  signals: ShelfGapSignal[],
  zoneId: string,
  currentTs: number
): TaskKind | null {
  if (!sustained) {
    // reverse_phantom
    if (
      systemStock === 0 &&
      hasNoGapForDuration(signals, zoneId, currentTs, REVERSE_PHANTOM_NO_GAP_MS) &&
      hasRecentSale(inv, currentTs, REVERSE_PHANTOM_SALE_MS)
    ) {
      return "reverse_phantom";
    }
    return null;
  }

  if (systemStock === 0) return "true_oos";

  if (hasRecentSale(inv, currentTs, FACING_SALE_MS)) {
    return "facing";
  }

  return "phantom_suspected";
}

function computeValueAtRisk(
  hourlyVelocity: number,
  mrp: number
): number {
  return hourlyVelocity * mrp;
}

function computeTaskConfidence(
  windowSignals: ShelfGapSignal[],
  cameraStatus: string,
  mode: "observed" | "predicted"
): number {
  if (windowSignals.length === 0) return mode === "predicted" ? 0.4 : 0.3;
  const meanConf =
    windowSignals.reduce((s, sig) => s + sig.confidence, 0) /
    windowSignals.length;
  let conf = meanConf * cameraHealthMultiplier(cameraStatus);
  if (mode === "predicted") conf = Math.min(conf, 0.5);
  return conf;
}

function buildPredictedSignals(
  inv: InventoryRow,
  zoneId: string,
  currentTs: number,
  lastSignalTs: number
): ShelfGapSignal[] {
  if (!inv.hourlyVelocity || inv.systemStock <= 0) return [];
  const hoursSince = (currentTs - lastSignalTs) / (60 * 60 * 1000);
  const estimatedRemaining = inv.systemStock - inv.hourlyVelocity * hoursSince;
  if (estimatedRemaining > inv.systemStock * 0.3) return [];

  const gapRatio = Math.min(0.9, 1 - estimatedRemaining / (inv.systemStock || 1));
  return [
    {
      zoneId,
      ts: currentTs,
      gapRatio: Math.max(0.65, gapRatio),
      confidence: 0.4,
    },
  ];
}

export interface ClassifyInput {
  storeData: StoreData;
  currentTs: number;
  existingTasks: Task[];
}

export function classifyTasks(input: ClassifyInput): Task[] {
  const { storeData, currentTs, existingTasks } = input;
  const { zones, signals, heartbeats, staffEvents, inventory } = storeData;

  const resolvedKeys = new Set(
    existingTasks
      .filter((t) => t.state !== "open")
      .map((t) => `${t.zoneId}::${t.skuCode}`)
  );

  if (isReplenishmentWindow(currentTs)) {
    return existingTasks.filter((t) => t.state === "open");
  }

  const openTasks = existingTasks.filter((t) => t.state === "open");
  const updatedOpen: Task[] = [];
  const handledKeys = new Set<string>();

  const candidates: {
    zoneId: string;
    skuCode: string;
    kind: TaskKind;
    valueAtRisk: number;
    confidence: number;
    mode: "observed" | "predicted";
    sightings: { seen: number; checks: number };
    evidence: Task["evidence"];
  }[] = [];

  for (const zone of zones) {
    if (!zone.covered) continue;
    if (isStaffPresent(staffEvents, zone.id, currentTs)) continue;

    const cameraStatus = getCameraStatusAtTs(
      heartbeats,
      zone.cameraId,
      currentTs
    );
    const isOffline = cameraStatus === "offline";

    for (const sku of zone.skus) {
      const inv = getInventoryRow(inventory, zone.id, sku.code);
      if (!inv) continue;

      const key = `${zone.id}::${sku.code}`;
      if (resolvedKeys.has(key)) continue;

      const existing = openTasks.find(
        (t) => t.zoneId === zone.id && t.skuCode === sku.code
      );

      let zoneSignals = getSignalsInWindow(signals, zone.id, currentTs);
      let mode: "observed" | "predicted" = "observed";

      if (isOffline) {
        mode = "predicted";
        const lastReal = signals
          .filter((s) => s.zoneId === zone.id && s.ts <= currentTs)
          .sort((a, b) => b.ts - a.ts)[0];
        const predicted = buildPredictedSignals(
          inv,
          zone.id,
          currentTs,
          lastReal?.ts ?? currentTs - WINDOW_MS
        );
        if (predicted.length > 0) {
          zoneSignals = predicted;
        }
      }

      const checkSignals = isOffline ? zoneSignals : signals;
      const { sustained, sightings } = hasSustainedGap(
        checkSignals,
        zone.id,
        currentTs
      );

      const offlinePredicted =
        isOffline &&
        zoneSignals.length > 0 &&
        zoneSignals.some((s) => s.gapRatio > GAP_THRESHOLD);

      const kind = classifyKind(
        sustained || offlinePredicted,
        inv.systemStock,
        inv,
        signals,
        zone.id,
        currentTs
      );

      if (!kind) continue;

      const valueAtRisk = computeValueAtRisk(inv.hourlyVelocity, sku.mrp);
      if (valueAtRisk < VALUE_FLOOR && !existing) continue;

      const confidence = computeTaskConfidence(
        zoneSignals,
        cameraStatus,
        mode
      );

      const evidence: Task["evidence"] = {
        signals: zoneSignals,
        cameraStatus,
        systemStock: inv.systemStock,
        lastSaleTs: inv.lastSaleTs,
      };

      handledKeys.add(key);

      if (existing) {
        updatedOpen.push({
          ...existing,
          kind,
          valueAtRiskPerHour: valueAtRisk,
          confidence,
          mode,
          sightings,
          evidence,
        });
      } else {
        candidates.push({
          zoneId: zone.id,
          skuCode: sku.code,
          kind,
          valueAtRisk,
          confidence,
          mode,
          sightings,
          evidence,
        });
      }
    }
  }

  for (const c of candidates) {
    const id = `task-${c.zoneId}-${c.skuCode}`;
    updatedOpen.push({
      id,
      zoneId: c.zoneId,
      skuCode: c.skuCode,
      kind: c.kind,
      valueAtRiskPerHour: c.valueAtRisk,
      confidence: c.confidence,
      mode: c.mode,
      openedTs: currentTs,
      sightings: c.sightings,
      evidence: c.evidence,
      state: "open",
    });
  }

  return updatedOpen;
}

export function collapseFacingTasks(tasks: Task[]): Task[] {
  const open = tasks.filter((t) => t.state === "open");
  const closed = tasks.filter((t) => t.state !== "open");

  const facingByAisle = new Map<string, Task[]>();
  const nonFacing: Task[] = [];

  for (const t of open) {
    if (t.kind === "facing") {
      const zone = t.zoneId;
      const aisle = zone.split("-")[0];
      const key = `Aisle ${aisle.replace("A", "")}`;
      const list = facingByAisle.get(key) ?? [];
      list.push(t);
      facingByAisle.set(key, list);
    } else {
      nonFacing.push(t);
    }
  }

  const collapsedFacing: Task[] = [];
  for (const [aisle, facingTasks] of facingByAisle) {
    if (facingTasks.length === 0) continue;
    const totalValue = facingTasks.reduce(
      (s, t) => s + t.valueAtRiskPerHour,
      0
    );
    const lowest = facingTasks.reduce((a, b) =>
      a.confidence < b.confidence ? a : b
    );
    collapsedFacing.push({
      ...lowest,
      id: `facing-${aisle}`,
      valueAtRiskPerHour: totalValue,
      kind: "facing",
    });
  }

  return [
    ...closed,
    ...nonFacing,
    ...collapsedFacing,
  ];
}

export function getOpenTasks(tasks: Task[], currentTs: number): Task[] {
  return tasks
    .filter((t) => t.state === "open")
    .sort((a, b) => b.valueAtRiskPerHour - a.valueAtRiskPerHour);
}

export function getTaskAction(kind: TaskKind): string {
  switch (kind) {
    case "phantom_suspected":
      return "Check backroom";
    case "true_oos":
      return "Order or substitute";
    case "reverse_phantom":
      return "Recount";
    case "facing":
      return "Tidy aisle";
  }
}

export function getDisagreementSentence(
  task: Task,
  zones: ShelfZone[]
): string {
  const zone = getZone(zones, task.zoneId);
  const sku = getSku(zones, task.zoneId, task.skuCode);
  const { seen, checks } = task.sightings;
  const stock = task.evidence.systemStock;

  if (task.kind === "reverse_phantom") {
    return `System shows 0 units but sales are still happening. Shelf looks stocked.`;
  }

  if (task.kind === "facing") {
    return `Shelf looks thin in ${zone?.section ?? "this section"} but sales are still ticking.`;
  }

  if (task.kind === "true_oos") {
    return `System shows 0 units. Shelf has read empty in ${seen} of the last ${checks} checks.`;
  }

  return `System shows ${stock} units. Shelf has read empty in ${seen} of the last ${checks} checks.`;
}

export function getClassificationExplanation(
  task: Task,
  zones: ShelfZone[]
): string {
  const sku = getSku(zones, task.zoneId, task.skuCode);
  const stock = task.evidence.systemStock;
  const { seen, checks } = task.sightings;

  switch (task.kind) {
    case "phantom_suspected":
      return `Shelf read empty in ${seen} of ${checks} recent checks, but the system still shows ${stock} units of ${sku?.name ?? "this item"}. Stock is likely in the backroom.`;
    case "true_oos":
      return `Shelf empty in ${seen} of ${checks} checks and system stock is zero. Nothing on the floor can fix this — order or substitute.`;
    case "reverse_phantom":
      return `No gap detected for 2 hours, but the system shows zero stock while sales continue. The item is probably on the shelf — recount needed.`;
    case "facing":
      return `Shelf looks thin but sales are still happening in the last 30 minutes. This is a facing issue, not a stock-out.`;
  }
}

export function formatRupee(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}
