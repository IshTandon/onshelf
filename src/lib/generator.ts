import { createRng } from "./seed";
import { hourToTs, getDayStartTs, getDayEndTs } from "./time";
import {
  CHECK_INTERVAL_MS,
  LOW_CONFIDENCE_ZONES,
  sampleConfidence,
  sampleBackgroundGapRatio,
  buildCameraSchedule,
  sampleDropRate,
} from "./signal-noise";
import type {
  ShelfZone,
  ShelfGapSignal,
  CameraHeartbeat,
  StaffPresent,
  InventoryRow,
  StoreData,
} from "@/types";

interface ScriptedGap {
  zoneId: string;
  skuCode: string;
  startTs: number;
  endTs: number;
  gapRatio: number;
}

interface ScriptedSale {
  zoneId: string;
  skuCode: string;
  ts: number;
}

interface ScriptedCamera {
  cameraId: string;
  events: { ts: number; status: "ok" | "degraded" | "offline" }[];
}

function buildZones(): ShelfZone[] {
  return [
    {
      id: "A1-L1",
      aisle: "Aisle 1",
      section: "Dairy & Eggs",
      cameraId: "cam-1",
      covered: true,
      skus: [
        { code: "DAI-001", name: "Amul Taaza 1L", mrp: 58, unitsPerFacing: 6 },
        { code: "DAI-002", name: "Britannia Cheese 200g", mrp: 120, unitsPerFacing: 4 },
      ],
    },
    {
      id: "A2-L1",
      aisle: "Aisle 2",
      section: "Snacks & Biscuits",
      cameraId: "cam-2",
      covered: true,
      skus: [
        { code: "SNK-001", name: "Parle-G 800g", mrp: 70, unitsPerFacing: 8 },
        { code: "SNK-002", name: "Lays Magic Masala", mrp: 20, unitsPerFacing: 12 },
      ],
    },
    {
      id: "A3-L1",
      aisle: "Aisle 3",
      section: "Atta & Flours",
      cameraId: "cam-3",
      covered: true,
      skus: [
        { code: "ATT-001", name: "Aashirvaad Atta 5kg", mrp: 285, unitsPerFacing: 4 },
        { code: "ATT-002", name: "Pillsbury Chakki 5kg", mrp: 260, unitsPerFacing: 4 },
      ],
    },
    {
      id: "A3-L2",
      aisle: "Aisle 3",
      section: "Atta & Flours",
      cameraId: "cam-4",
      covered: true,
      skus: [
        { code: "ATT-003", name: "Fortune Chakki Atta 10kg", mrp: 420, unitsPerFacing: 3 },
        { code: "ATT-004", name: "Nature Fresh 5kg", mrp: 240, unitsPerFacing: 5 },
      ],
    },
    {
      id: "A4-L1",
      aisle: "Aisle 4",
      section: "Rice & Pulses",
      cameraId: "cam-4",
      covered: true,
      skus: [
        { code: "RIC-001", name: "India Gate Basmati 5kg", mrp: 650, unitsPerFacing: 3 },
        { code: "RIC-002", name: "Tata Sampann Toor Dal 1kg", mrp: 165, unitsPerFacing: 6 },
      ],
    },
    {
      id: "A5-L1",
      aisle: "Aisle 5",
      section: "Beverages",
      cameraId: "cam-5",
      covered: true,
      skus: [
        { code: "BEV-001", name: "Coca-Cola 2.25L", mrp: 95, unitsPerFacing: 8 },
        { code: "BEV-002", name: "Real Juice Orange 1L", mrp: 110, unitsPerFacing: 6 },
      ],
    },
    {
      id: "A6-L1",
      aisle: "Aisle 6",
      section: "Personal Care",
      cameraId: "cam-6",
      covered: true,
      skus: [
        { code: "PC-001", name: "Dove Soap 125g", mrp: 65, unitsPerFacing: 10 },
        { code: "PC-002", name: "Colgate 200g", mrp: 115, unitsPerFacing: 8 },
      ],
    },
    {
      id: "A7-L1",
      aisle: "Aisle 7",
      section: "Household",
      cameraId: "cam-7",
      covered: true,
      skus: [
        { code: "HH-001", name: "Surf Excel 2kg", mrp: 380, unitsPerFacing: 4 },
        { code: "HH-002", name: "Harpic 1L", mrp: 210, unitsPerFacing: 5 },
      ],
    },
    {
      id: "A8-L1",
      aisle: "Aisle 8",
      section: "Frozen Foods",
      cameraId: "cam-8",
      covered: true,
      skus: [
        { code: "FRZ-001", name: "McCain Fries 420g", mrp: 145, unitsPerFacing: 6 },
        { code: "FRZ-002", name: "Amul Ice Cream 1L", mrp: 195, unitsPerFacing: 4 },
      ],
    },
    {
      id: "A6-L2",
      aisle: "Aisle 6",
      section: "Hair Care",
      cameraId: "cam-6",
      covered: true,
      skus: [
        { code: "HC-001", name: "Head & Shoulders 340ml", mrp: 340, unitsPerFacing: 4 },
      ],
    },
    {
      id: "A7-L2",
      aisle: "Aisle 7",
      section: "Cleaning Supplies",
      cameraId: "cam-7",
      covered: true,
      skus: [
        { code: "CL-001", name: "Lizol 1L", mrp: 185, unitsPerFacing: 5 },
      ],
    },
    {
      id: "A9-L1",
      aisle: "Aisle 9",
      section: "Seasonal",
      cameraId: "",
      covered: false,
      skus: [
        { code: "SEA-001", name: "Diya Set 12pc", mrp: 120, unitsPerFacing: 8 },
      ],
    },
    {
      id: "A10-L1",
      aisle: "Aisle 10",
      section: "Bulk Storage",
      cameraId: "",
      covered: false,
      skus: [
        { code: "BLK-001", name: "Rice Sack 25kg", mrp: 1800, unitsPerFacing: 2 },
      ],
    },
  ];
}

function buildInventory(zones: ShelfZone[]): InventoryRow[] {
  const rows: InventoryRow[] = [];
  for (const zone of zones) {
    for (const sku of zone.skus) {
      let systemStock = 20;
      let hourlyVelocity = 3;
      let lastSaleTs: number | null = hourToTs(8, 45);

      if (zone.id === "A3-L2" && sku.code === "ATT-003") {
        systemStock = 40;
        hourlyVelocity = 8;
        lastSaleTs = hourToTs(8, 30);
      }
      if (zone.id === "A3-L2" && sku.code === "ATT-004") {
        systemStock = 15;
        hourlyVelocity = 2;
        lastSaleTs = hourToTs(8, 20);
      }
      if (zone.id === "A4-L1" && sku.code === "RIC-001") {
        systemStock = 12;
        hourlyVelocity = 5;
        lastSaleTs = hourToTs(9, 0);
      }
      if (zone.id === "A5-L1" && sku.code === "BEV-001") {
        systemStock = 30;
        hourlyVelocity = 12;
        lastSaleTs = hourToTs(8, 50);
      }
      if (zone.id === "A2-L1" && sku.code === "SNK-002") {
        systemStock = 0;
        hourlyVelocity = 6;
        lastSaleTs = hourToTs(7, 30);
      }
      if (zone.id === "A1-L1" && sku.code === "DAI-001") {
        systemStock = 0;
        hourlyVelocity = 15;
        lastSaleTs = hourToTs(8, 0);
      }
      if (zone.id === "A8-L1" && sku.code === "FRZ-001") {
        systemStock = 8;
        hourlyVelocity = 4;
        lastSaleTs = hourToTs(9, 5);
      }
      if (zone.id === "A7-L1" && sku.code === "HH-001") {
        systemStock = 6;
        hourlyVelocity = 3;
        lastSaleTs = hourToTs(8, 30);
      }

      rows.push({
        zoneId: zone.id,
        skuCode: sku.code,
        systemStock,
        hourlyVelocity,
        lastSaleTs,
      });
    }
  }
  return rows;
}

export function getScriptedGaps(): ScriptedGap[] {
  return [
    {
      zoneId: "A3-L2",
      skuCode: "ATT-003",
      startTs: hourToTs(9, 8),
      endTs: hourToTs(22, 0),
      gapRatio: 0.85,
    },
    {
      zoneId: "A5-L1",
      skuCode: "BEV-001",
      startTs: hourToTs(14, 40),
      endTs: hourToTs(16, 0),
      gapRatio: 0.78,
    },
    {
      zoneId: "A4-L1",
      skuCode: "RIC-001",
      startTs: hourToTs(17, 33),
      endTs: hourToTs(22, 0),
      gapRatio: 0.78,
    },
    {
      zoneId: "A7-L1",
      skuCode: "HH-001",
      startTs: hourToTs(17, 33),
      endTs: hourToTs(22, 0),
      gapRatio: 0.68,
    },
    {
      zoneId: "A8-L1",
      skuCode: "FRZ-001",
      startTs: hourToTs(17, 33),
      endTs: hourToTs(22, 0),
      gapRatio: 0.81,
    },
    {
      zoneId: "A1-L1",
      skuCode: "DAI-001",
      startTs: hourToTs(10, 0),
      endTs: hourToTs(22, 0),
      gapRatio: 0.9,
    },
  ];
}

function getScriptedSales(): ScriptedSale[] {
  return [
    { zoneId: "A5-L1", skuCode: "BEV-001", ts: hourToTs(15, 5) },
    { zoneId: "A5-L1", skuCode: "BEV-001", ts: hourToTs(15, 18) },
    { zoneId: "A5-L1", skuCode: "BEV-001", ts: hourToTs(15, 25) },
    { zoneId: "A2-L1", skuCode: "SNK-002", ts: hourToTs(7, 45) },
    { zoneId: "A2-L1", skuCode: "SNK-002", ts: hourToTs(8, 20) },
    { zoneId: "A2-L1", skuCode: "SNK-002", ts: hourToTs(9, 15) },
    { zoneId: "A2-L1", skuCode: "SNK-002", ts: hourToTs(10, 30) },
    { zoneId: "A2-L1", skuCode: "SNK-002", ts: hourToTs(11, 45) },
    { zoneId: "A2-L1", skuCode: "SNK-002", ts: hourToTs(13, 0) },
    { zoneId: "A2-L1", skuCode: "SNK-002", ts: hourToTs(14, 30) },
    { zoneId: "A2-L1", skuCode: "SNK-002", ts: hourToTs(15, 50) },
    { zoneId: "A2-L1", skuCode: "SNK-002", ts: hourToTs(17, 0) },
    { zoneId: "A4-L1", skuCode: "RIC-001", ts: hourToTs(17, 30) },
    { zoneId: "A7-L1", skuCode: "HH-001", ts: hourToTs(17, 20) },
    { zoneId: "A8-L1", skuCode: "FRZ-001", ts: hourToTs(17, 35) },
  ];
}

function getScriptedCameras(): ScriptedCamera[] {
  return [
    {
      cameraId: "cam-4",
      events: [
        { ts: hourToTs(0, 0), status: "ok" },
        { ts: hourToTs(11, 5), status: "degraded" },
        { ts: hourToTs(13, 30), status: "offline" },
        { ts: hourToTs(19, 0), status: "ok" },
      ],
    },
  ];
}

function getCameraStatusAt(
  cameraId: string,
  ts: number,
  scripted: ScriptedCamera[]
): "ok" | "degraded" | "offline" {
  const script = scripted.find((s) => s.cameraId === cameraId);
  if (!script) return "ok";
  let status: "ok" | "degraded" | "offline" = "ok";
  for (const ev of script.events) {
    if (ev.ts <= ts) status = ev.status;
  }
  return status;
}

function isInScriptedGapWindow(
  zoneId: string,
  ts: number,
  scriptedGaps: ScriptedGap[]
): boolean {
  return scriptedGaps.some(
    (g) => g.zoneId === zoneId && ts >= g.startTs && ts < g.endTs
  );
}

/** Guaranteed demo signals — injected on top of messy background */
function buildScriptedSignals(
  rng: ReturnType<typeof createRng>,
  zones: ShelfZone[],
  scriptedGaps: ScriptedGap[],
  scriptedCameras: ScriptedCamera[]
): ShelfGapSignal[] {
  const signals: ShelfGapSignal[] = [];

  for (const gap of scriptedGaps) {
    const zone = zones.find((z) => z.id === gap.zoneId);
    const camId = zone?.cameraId ?? "cam-1";
    let t = gap.startTs;
    while (t < gap.endTs) {
      const jitter = rng.int(-22, 38) * 1000;
      const ts = t + jitter;
      const status = getCameraStatusAt(camId, ts, scriptedCameras);
      if (status === "offline") {
        t += CHECK_INTERVAL_MS + rng.int(-20, 25) * 1000;
        continue;
      }

      const degraded = status === "degraded";
      const sampled = sampleConfidence(rng, gap.zoneId, degraded);
      const confidence = degraded
        ? Math.min(0.74, Math.max(0.55, sampled))
        : Math.max(0.78, sampled);
      signals.push({
        zoneId: gap.zoneId,
        ts,
        gapRatio: Math.max(
          0.62,
          Math.min(0.95, gap.gapRatio + rng.float(-0.03, 0.03))
        ),
        confidence,
      });

      t += CHECK_INTERVAL_MS + rng.int(-35, 45) * 1000;
    }
  }

  return signals;
}

/** First reading after camera recovery so the 19:00 demo has live signals */
function injectRecoverySignals(
  signals: ShelfGapSignal[],
  zones: ShelfZone[],
  scriptedGaps: ScriptedGap[],
  rng: ReturnType<typeof createRng>
) {
  for (const cam of getScriptedCameras()) {
    let prev: "ok" | "degraded" | "offline" = "ok";
    for (const ev of cam.events) {
      if (prev === "offline" && ev.status !== "offline") {
        const zoneIds = new Set(
          zones
            .filter((z) => z.cameraId === cam.cameraId)
            .map((z) => z.id)
        );
        for (const gap of scriptedGaps) {
          if (!zoneIds.has(gap.zoneId)) continue;
          if (ev.ts < gap.startTs || ev.ts >= gap.endTs) continue;
          signals.push({
            zoneId: gap.zoneId,
            ts: ev.ts,
            gapRatio: Math.max(0.65, gap.gapRatio),
            confidence: 0.8,
          });
        }
      }
      prev = ev.status;
    }
  }
}

function mergeSignals(
  background: ShelfGapSignal[],
  scripted: ShelfGapSignal[]
): ShelfGapSignal[] {
  const scriptedZones = new Set(scripted.map((s) => s.zoneId));
  const filtered = background.filter((bg) => {
    if (!scriptedZones.has(bg.zoneId)) return true;
    return !scripted.some(
      (sc) => sc.zoneId === bg.zoneId && Math.abs(sc.ts - bg.ts) < 120_000
    );
  });
  return [...filtered, ...scripted].sort((a, b) => a.ts - b.ts);
}

function generateBackgroundSignals(
  zones: ShelfZone[],
  seed: number
): {
  signals: ShelfGapSignal[];
  heartbeats: CameraHeartbeat[];
  dropRate: number;
  expectedCount: number;
  droppedCount: number;
} {
  const rng = createRng(seed);
  const signals: ShelfGapSignal[] = [];
  const heartbeats: CameraHeartbeat[] = [];
  const scriptedGaps = getScriptedGaps();
  const scriptedCameras = getScriptedCameras();

  const dayStart = getDayStartTs();
  const dayEnd = getDayEndTs();
  const dropRate = sampleDropRate(rng);

  const cameraIds = [
    "cam-1", "cam-2", "cam-3", "cam-4",
    "cam-5", "cam-6", "cam-7", "cam-8",
  ];

  let expectedCount = 0;
  let droppedCount = 0;

  for (const camId of cameraIds) {
    const schedule = buildCameraSchedule(rng, dayStart, dayEnd);
    const camZones = zones.filter((z) => z.cameraId === camId && z.covered);

    for (const sampleTs of schedule) {
      const status = getCameraStatusAt(camId, sampleTs, scriptedCameras);

      // Camera goes quiet ~5% of the time (missed heartbeat + no signal)
      const cameraQuiet =
        camId !== "cam-4" && rng.chance(0.05);
      if (cameraQuiet) continue;

      heartbeats.push({ cameraId: camId, ts: sampleTs, status });

      if (status === "offline") continue;

      for (const zone of camZones) {
        if (isInScriptedGapWindow(zone.id, sampleTs, scriptedGaps)) continue;

        expectedCount++;
        if (rng.chance(dropRate)) {
          droppedCount++;
          continue;
        }

        const degraded = status === "degraded";
        let gapRatio = sampleBackgroundGapRatio(rng);
        // Occasional wrong reading on a healthy shelf
        if (rng.chance(0.03)) {
          gapRatio = rng.float(0.7, 0.92);
        }

        signals.push({
          zoneId: zone.id,
          ts: sampleTs,
          gapRatio: Math.max(0, Math.min(1, gapRatio)),
          confidence: sampleConfidence(rng, zone.id, degraded),
        });
      }
    }
  }

  return { signals, heartbeats, dropRate, expectedCount, droppedCount };
}

function generateSignals(
  zones: ShelfZone[],
  seed: number
): { signals: ShelfGapSignal[]; heartbeats: CameraHeartbeat[] } {
  const rng = createRng(seed + 999);
  const scriptedGaps = getScriptedGaps();
  const scriptedCameras = getScriptedCameras();

  const bg = generateBackgroundSignals(zones, seed);
  const scripted = buildScriptedSignals(rng, zones, scriptedGaps, scriptedCameras);
  injectRecoverySignals(scripted, zones, scriptedGaps, rng);
  const signals = mergeSignals(bg.signals, scripted);

  return { signals, heartbeats: bg.heartbeats };
}

function applyScriptedSales(inventory: InventoryRow[]): InventoryRow[] {
  const sales = getScriptedSales();
  const inv = inventory.map((r) => ({ ...r }));

  for (const sale of sales) {
    const row = inv.find(
      (r) => r.zoneId === sale.zoneId && r.skuCode === sale.skuCode
    );
    if (row) {
      row.lastSaleTs = sale.ts;
      if (row.systemStock > 0) {
        row.systemStock = Math.max(0, row.systemStock - 1);
      }
    }
  }

  return inv;
}

export function getLastSaleTs(
  sales: { zoneId: string; skuCode: string; ts: number }[],
  zoneId: string,
  skuCode: string,
  currentTs: number,
  fallback: number | null = null
): number | null {
  const past = sales
    .filter(
      (s) =>
        s.zoneId === zoneId && s.skuCode === skuCode && s.ts <= currentTs
    )
    .sort((a, b) => b.ts - a.ts);
  return past[0]?.ts ?? fallback;
}

export type SignalGenerationMeta = {
  dropRate: number;
  expectedBackgroundSignals: number;
  droppedBackgroundSignals: number;
  scriptedSignalCount: number;
  backgroundSignalCount: number;
};

export function getSignalGenerationMeta(seed: number): SignalGenerationMeta {
  const zones = buildZones();
  const rng = createRng(seed + 999);
  const bg = generateBackgroundSignals(zones, seed);
  const scriptedGaps = getScriptedGaps();
  const scripted = buildScriptedSignals(
    rng,
    zones,
    scriptedGaps,
    getScriptedCameras()
  );
  injectRecoverySignals(scripted, zones, scriptedGaps, rng);
  return {
    dropRate: bg.dropRate,
    expectedBackgroundSignals: bg.expectedCount,
    droppedBackgroundSignals: bg.droppedCount,
    scriptedSignalCount: scripted.length,
    backgroundSignalCount: bg.signals.length,
  };
}

export function generateStoreData(seed: number): StoreData {
  const zones = buildZones();
  const sales = getScriptedSales();
  const inventory = applyScriptedSales(buildInventory(zones));
  const { signals, heartbeats } = generateSignals(zones, seed);

  return {
    zones,
    signals,
    heartbeats,
    staffEvents: [],
    inventory,
    sales,
    lowConfidenceZones: LOW_CONFIDENCE_ZONES,
  };
}

/** Stats helper for sample-day report */
export function analyzeSignalDay(
  signals: ShelfGapSignal[],
  heartbeats: CameraHeartbeat[],
  zoneId: string,
  windowStart: number,
  windowEnd: number
) {
  const zoneSignals = signals.filter(
    (s) => s.zoneId === zoneId && s.ts >= windowStart && s.ts <= windowEnd
  );
  const confs = zoneSignals.map((s) => s.confidence);
  const gaps = zoneSignals.filter((s) => s.gapRatio > 0.6).length;
  const avgConf =
    confs.length > 0 ? confs.reduce((a, b) => a + b, 0) / confs.length : 0;
  const minConf = confs.length > 0 ? Math.min(...confs) : 0;
  const maxConf = confs.length > 0 ? Math.max(...confs) : 0;
  const lowTail = confs.filter((c) => c < 0.55).length;

  const camId = zoneId === "A6-L2" ? "cam-6" : zoneId === "A5-L1" ? "cam-5" : "cam-4";
  const hb = heartbeats.filter(
    (h) => h.cameraId === camId && h.ts >= windowStart && h.ts <= windowEnd
  );

  const timestamps = zoneSignals.map((s) => {
    const d = new Date(s.ts);
    const sec = d.getUTCSeconds();
    const onGrid = sec < 5 || sec > 55;
    return `${d.getUTCHours().toString().padStart(2, "0")}:${d.getUTCMinutes().toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}${onGrid ? "" : "*"}`;
  });

  return {
    count: zoneSignals.length,
    gaps,
    avgConf,
    minConf,
    maxConf,
    lowTail,
    heartbeats: hb.length,
    timestamps: timestamps.slice(0, 12),
  };
}

export function getCameraZones(
  zones: ShelfZone[],
  cameraId: string
): ShelfZone[] {
  return zones.filter((z) => z.cameraId === cameraId);
}

export function getUncoveredZones(zones: ShelfZone[]): ShelfZone[] {
  return zones.filter((z) => !z.covered);
}

export function getSku(
  zones: ShelfZone[],
  zoneId: string,
  skuCode: string
) {
  const zone = zones.find((z) => z.id === zoneId);
  return zone?.skus.find((s) => s.code === skuCode);
}

export function getZone(zones: ShelfZone[], zoneId: string) {
  return zones.find((z) => z.id === zoneId);
}

export function getInventoryRow(
  inventory: InventoryRow[],
  zoneId: string,
  skuCode: string
): InventoryRow | undefined {
  return inventory.find(
    (r) => r.zoneId === zoneId && r.skuCode === skuCode
  );
}

export function getCameraStatusAtTs(
  heartbeats: CameraHeartbeat[],
  cameraId: string,
  ts: number
): "ok" | "degraded" | "offline" {
  const scripted = getScriptedCameras();
  if (scripted.some((s) => s.cameraId === cameraId)) {
    return getCameraStatusAt(cameraId, ts, scripted);
  }
  const relevant = heartbeats
    .filter((h) => h.cameraId === cameraId && h.ts <= ts)
    .sort((a, b) => b.ts - a.ts);
  return relevant[0]?.status ?? "ok";
}

/** Most recent offline period that has ended by ts */
export function getCompletedOfflinePeriod(
  cameraId: string,
  ts: number
): { start: number; end: number } | null {
  const script = getScriptedCameras().find((s) => s.cameraId === cameraId);
  if (!script) return null;

  let offlineStart: number | null = null;
  let completed: { start: number; end: number } | null = null;

  for (const ev of script.events) {
    if (ev.ts > ts) break;
    if (ev.status === "offline") {
      if (offlineStart === null) offlineStart = ev.ts;
    } else if (offlineStart !== null) {
      completed = { start: offlineStart, end: ev.ts };
      offlineStart = null;
    }
  }

  return completed;
}

/** When a scripted camera went offline (authoritative for demo transitions) */
export function getOfflineSinceTsForCamera(
  cameraId: string,
  ts: number
): number | null {
  const script = getScriptedCameras().find((s) => s.cameraId === cameraId);
  if (!script) return null;

  let offlineSince: number | null = null;
  for (const ev of script.events) {
    if (ev.ts > ts) break;
    if (ev.status === "offline") {
      if (offlineSince === null) offlineSince = ev.ts;
    } else {
      offlineSince = null;
    }
  }

  return getCameraStatusAt(cameraId, ts, getScriptedCameras()) === "offline"
    ? offlineSince
    : null;
}

export function getLastHeartbeat(
  heartbeats: CameraHeartbeat[],
  cameraId: string,
  ts: number
): CameraHeartbeat | undefined {
  return heartbeats
    .filter((h) => h.cameraId === cameraId && h.ts <= ts)
    .sort((a, b) => b.ts - a.ts)[0];
}
