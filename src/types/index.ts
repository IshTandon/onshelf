export type ShelfZone = {
  id: string;
  aisle: string;
  section: string;
  cameraId: string;
  skus: {
    code: string;
    name: string;
    mrp: number;
    unitsPerFacing: number;
  }[];
  covered: boolean;
};

export type ShelfGapSignal = {
  zoneId: string;
  ts: number;
  gapRatio: number;
  confidence: number;
};

export type CameraHeartbeat = {
  cameraId: string;
  ts: number;
  status: "ok" | "degraded" | "offline";
};

export type StaffPresent = {
  zoneId: string;
  ts: number;
};

export type InventoryRow = {
  zoneId: string;
  skuCode: string;
  systemStock: number;
  hourlyVelocity: number;
  lastSaleTs: number | null;
};

export type SaleEvent = {
  zoneId: string;
  skuCode: string;
  ts: number;
};

export type TaskKind =
  | "true_oos"
  | "phantom_suspected"
  | "reverse_phantom"
  | "facing";

export type Task = {
  id: string;
  zoneId: string;
  skuCode: string;
  kind: TaskKind;
  valueAtRiskPerHour: number;
  confidence: number;
  mode: "observed" | "predicted";
  openedTs: number;
  sightings: { seen: number; checks: number };
  evidence: {
    signals: ShelfGapSignal[];
    cameraStatus: string;
    systemStock: number;
    lastSaleTs: number | null;
  };
  state:
    | "open"
    | "resolved_restocked"
    | "resolved_not_found"
    | "dismissed_wrong_call";
};

export type ConfidenceLabel = "Confirmed" | "Likely" | "Predicted";

export type StoreData = {
  zones: ShelfZone[];
  signals: ShelfGapSignal[];
  heartbeats: CameraHeartbeat[];
  staffEvents: StaffPresent[];
  inventory: InventoryRow[];
  sales: SaleEvent[];
  lowConfidenceZones: string[];
};

export type RegionalStore = {
  id: string;
  name: string;
  openTasks: number;
  rupeesAtRiskPerHour: number;
  completionRate7d: number;
  phantomRate: number;
  cameraCoverage: number;
};

export type SimulationState = {
  currentTs: number;
  isPlaying: boolean;
  seed: number;
};

export type ToastMessage = {
  id: string;
  text: string;
};
