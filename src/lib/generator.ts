import { createRng } from "./seed";
import { hourToTs, getDayStartTs, getDayEndTs } from "./time";
import type {
  ShelfZone,
  ShelfGapSignal,
  CameraHeartbeat,
  StaffPresent,
  InventoryRow,
  StoreData,
} from "@/types";

const CHECK_INTERVAL_MS = 3 * 60 * 1000;
const SIGNAL_DROP_RATE = 0.08; // 5-12% range, seeded variation

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
    // Low-confidence blind spots (bad camera angles)
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
    // Uncovered zones
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

const LOW_CONFIDENCE_ZONES = ["A6-L2", "A7-L2"];

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
        lastSaleTs = hourToTs(9, 10);
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
      // reverse_phantom candidate: system says 0 but item is on shelf
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

function getScriptedGaps(): ScriptedGap[] {
  return [
    // 09:20 phantom in Aisle 3 Atta
    {
      zoneId: "A3-L2",
      skuCode: "ATT-003",
      startTs: hourToTs(9, 14),
      endTs: hourToTs(22, 0),
      gapRatio: 0.85,
    },
    // 15:10 facing false positive — gap but sales ticking
    {
      zoneId: "A5-L1",
      skuCode: "BEV-001",
      startTs: hourToTs(14, 58),
      endTs: hourToTs(16, 0),
      gapRatio: 0.72,
    },
    // 17:45 peak tasks
    {
      zoneId: "A4-L1",
      skuCode: "RIC-001",
      startTs: hourToTs(17, 36),
      endTs: hourToTs(22, 0),
      gapRatio: 0.78,
    },
    {
      zoneId: "A7-L1",
      skuCode: "HH-001",
      startTs: hourToTs(17, 39),
      endTs: hourToTs(22, 0),
      gapRatio: 0.68,
    },
    {
      zoneId: "A8-L1",
      skuCode: "FRZ-001",
      startTs: hourToTs(17, 42),
      endTs: hourToTs(22, 0),
      gapRatio: 0.81,
    },
    // true_oos — dairy with zero stock
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
    // Sales for facing task at 15:10
    { zoneId: "A5-L1", skuCode: "BEV-001", ts: hourToTs(15, 5) },
    { zoneId: "A5-L1", skuCode: "BEV-001", ts: hourToTs(15, 18) },
    { zoneId: "A5-L1", skuCode: "BEV-001", ts: hourToTs(15, 25) },
    // reverse_phantom sales — item selling but system says 0
    { zoneId: "A2-L1", skuCode: "SNK-002", ts: hourToTs(7, 45) },
    { zoneId: "A2-L1", skuCode: "SNK-002", ts: hourToTs(8, 20) },
    { zoneId: "A2-L1", skuCode: "SNK-002", ts: hourToTs(9, 15) },
    { zoneId: "A2-L1", skuCode: "SNK-002", ts: hourToTs(10, 30) },
    { zoneId: "A2-L1", skuCode: "SNK-002", ts: hourToTs(11, 45) },
    { zoneId: "A2-L1", skuCode: "SNK-002", ts: hourToTs(13, 0) },
    { zoneId: "A2-L1", skuCode: "SNK-002", ts: hourToTs(14, 30) },
    { zoneId: "A2-L1", skuCode: "SNK-002", ts: hourToTs(15, 50) },
    { zoneId: "A2-L1", skuCode: "SNK-002", ts: hourToTs(17, 0) },
    // Peak hour sales
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

function generateSignals(
  zones: ShelfZone[],
  seed: number
): { signals: ShelfGapSignal[]; heartbeats: CameraHeartbeat[] } {
  const rng = createRng(seed);
  const signals: ShelfGapSignal[] = [];
  const heartbeats: CameraHeartbeat[] = [];
  const scriptedGaps = getScriptedGaps();
  const scriptedCameras = getScriptedCameras();

  const dayStart = getDayStartTs();
  const dayEnd = getDayEndTs();
  const dropRate = SIGNAL_DROP_RATE + rng.float(-0.03, 0.04);

  const cameraIds = [
    "cam-1",
    "cam-2",
    "cam-3",
    "cam-4",
    "cam-5",
    "cam-6",
    "cam-7",
    "cam-8",
  ];

  // Generate check times with jitter
  const checkTimes: number[] = [];
  let t = dayStart;
  while (t < dayEnd) {
    const jitter = rng.int(-45, 45) * 1000;
    checkTimes.push(t + jitter);
    t += CHECK_INTERVAL_MS;
  }

  for (const camId of cameraIds) {
    for (const checkTs of checkTimes) {
      if (checkTs < dayStart || checkTs >= dayEnd) continue;

      const status = getCameraStatusAt(camId, checkTs, scriptedCameras);
      heartbeats.push({ cameraId: camId, ts: checkTs, status });

      const camZones = zones.filter((z) => z.cameraId === camId && z.covered);

      for (const zone of camZones) {
        // Random signal drop
        if (rng.chance(dropRate)) continue;
        if (status === "offline") continue;

        const scripted = scriptedGaps.find(
          (g) =>
            g.zoneId === zone.id &&
            checkTs >= g.startTs &&
            checkTs < g.endTs
        );

        let gapRatio: number;
        if (scripted) {
          gapRatio = scripted.gapRatio + rng.float(-0.05, 0.05);
        } else {
          gapRatio = rng.chance(0.08)
            ? rng.float(0.65, 0.9)
            : rng.float(0, 0.3);
        }

        let confidence: number;
        if (LOW_CONFIDENCE_ZONES.includes(zone.id)) {
          confidence = Math.min(0.55, rng.gaussian(0.45, 0.08));
        } else {
          confidence = Math.max(
            0.3,
            Math.min(0.95, rng.gaussian(0.72, 0.15))
          );
        }

        if (status === "degraded") {
          confidence *= 0.85;
        }

        signals.push({
          zoneId: zone.id,
          ts: checkTs,
          gapRatio: Math.max(0, Math.min(1, gapRatio)),
          confidence: Math.max(0.2, Math.min(1, confidence)),
        });
      }
    }
  }

  return { signals, heartbeats };
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

export function generateStoreData(seed: number): StoreData {
  const zones = buildZones();
  const inventory = applyScriptedSales(buildInventory(zones));
  const { signals, heartbeats } = generateSignals(zones, seed);

  return {
    zones,
    signals,
    heartbeats,
    staffEvents: [],
    inventory,
    lowConfidenceZones: LOW_CONFIDENCE_ZONES,
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
  const relevant = heartbeats
    .filter((h) => h.cameraId === cameraId && h.ts <= ts)
    .sort((a, b) => b.ts - a.ts);
  return relevant[0]?.status ?? "ok";
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
