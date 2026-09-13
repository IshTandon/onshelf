"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from "react";
import { generateStoreData } from "@/lib/generator";
import {
  classifyTasks,
  collapseFacingTasks,
  getOpenTasks,
} from "@/lib/classification";
import { parseSeedFromUrl } from "@/lib/seed";
import { getDefaultStartTs, getDayEndTs } from "@/lib/time";
import { canWithdraw } from "@/lib/reversal";
import type { Task, StoreData, ToastMessage } from "@/types";

/** A resolution applies only from the moment it was made, not before it. */
function resolvedBy(
  entry: { resolvedTs?: number; openedTs: number },
  currentTs: number
): boolean {
  return (entry.resolvedTs ?? entry.openedTs) <= currentTs;
}

type LifecycleEntry = {
  state: Task["state"];
  openedTs: number;
  /** When the task was closed — a resolution must not apply before it happened. */
  resolvedTs?: number;
  /** System stock a correction replaced, so a withdrawal can restore it. */
  priorStock?: number;
};

interface SimulationContextValue {
  currentTs: number;
  isPlaying: boolean;
  seed: number;
  storeData: StoreData;
  tasks: Task[];
  openTasks: Task[];
  totalAtRisk: number;
  exitingIds: Set<string>;
  play: () => void;
  pause: () => void;
  setTime: (ts: number) => void;
  resolveRestocked: (taskId: string) => void;
  resolveNotFound: (taskId: string) => void;
  withdrawCorrection: (key: string) => void;
  history: {
    key: string;
    zoneId: string;
    skuCode: string;
    state: Task["state"];
    resolvedTs: number;
    priorStock?: number;
    reversible: boolean;
  }[];
  dismissWrongCall: (taskId: string) => void;
  toasts: ToastMessage[];
  dismissToast: (id: string) => void;
}

const SimulationContext = createContext<SimulationContextValue | null>(null);

const PLAY_SPEED = 60;

function taskKey(zoneId: string, skuCode: string) {
  return `${zoneId}::${skuCode}`;
}

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [seed] = useState(() => parseSeedFromUrl());
  const [storeData, setStoreData] = useState<StoreData>(() =>
    generateStoreData(seed)
  );
  const [currentTs, setCurrentTs] = useState(getDefaultStartTs);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lifecycle, setLifecycle] = useState<Map<string, LifecycleEntry>>(
    new Map()
  );
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const tasks = useMemo(() => {
    const resolvedTasks: Task[] = [];
    for (const [key, entry] of lifecycle) {
      if (entry.state !== "open") {
        if (key.startsWith("facing-")) continue;
        if ((entry.resolvedTs ?? entry.openedTs) > currentTs) continue;
        const [zoneId, skuCode] = key.split("::");
        resolvedTasks.push({
          id: `task-${zoneId}-${skuCode}`,
          zoneId,
          skuCode,
          kind: "phantom_suspected",
          valueAtRiskPerHour: 0,
          confidence: 0,
          mode: "observed",
          openedTs: entry.openedTs,
          sightings: { seen: 0, checks: 0 },
          evidence: {
            signals: [],
            cameraStatus: "ok",
            systemStock: 0,
            lastSaleTs: null,
          },
          state: entry.state,
        });
      }
    }

    const classified = classifyTasks({
      storeData,
      currentTs,
      existingTasks: resolvedTasks,
    });
    const collapsed = collapseFacingTasks(classified);

    return collapsed
      .map((t) => {
        if (t.kind === "facing") {
          const entry = lifecycle.get(t.id);
          if (entry && entry.state !== "open" && resolvedBy(entry, currentTs))
            return null;
          return { ...t, openedTs: entry?.openedTs ?? t.openedTs };
        }

        const key = taskKey(t.zoneId, t.skuCode);
        const entry = lifecycle.get(key);
        if (entry && entry.state !== "open" && resolvedBy(entry, currentTs))
          return null;

        return { ...t, openedTs: entry?.openedTs ?? t.openedTs };
      })
      .filter((t): t is Task => t !== null);
  }, [storeData, currentTs, lifecycle]);

  // Sync new lifecycle entries from classification
  useEffect(() => {
    const classified = classifyTasks({
      storeData,
      currentTs,
      existingTasks: [],
    });
    const collapsed = collapseFacingTasks(classified);

    setLifecycle((prev) => {
      const next = new Map(prev);
      let changed = false;

      for (const t of collapsed) {
        if (t.kind === "facing") {
          if (!next.has(t.id)) {
            next.set(t.id, { state: "open", openedTs: t.openedTs });
            changed = true;
          }
          continue;
        }
        const key = taskKey(t.zoneId, t.skuCode);
        const existing = next.get(key);
        if (existing && existing.state !== "open") continue;
        if (!existing) {
          next.set(key, { state: "open", openedTs: t.openedTs });
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [storeData, currentTs]);

  const openTasks = useMemo(
    () => getOpenTasks(tasks, currentTs),
    [tasks, currentTs]
  );

  const totalAtRisk = useMemo(
    () => openTasks.reduce((s, t) => s + t.valueAtRiskPerHour, 0),
    [openTasks]
  );

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentTs((prev) => {
        const next = prev + PLAY_SPEED * 1000;
        const dayEnd = getDayEndTs();
        if (next >= dayEnd) {
          setIsPlaying(false);
          return dayEnd;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const addToast = useCallback((text: string) => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);
  const setTime = useCallback((ts: number) => setCurrentTs(ts), []);

  const applyOverride = useCallback(
    (task: Task, state: Task["state"], priorStock?: number) => {
      const key =
        task.kind === "facing" ? task.id : taskKey(task.zoneId, task.skuCode);
      setExitingIds((prev) => new Set(prev).add(task.id));
      setTimeout(() => {
        setLifecycle((prev) => {
          const next = new Map(prev);
          const entry = next.get(key);
          next.set(key, {
            state,
            openedTs: entry?.openedTs ?? task.openedTs,
            resolvedTs: currentTs,
            priorStock: priorStock ?? entry?.priorStock,
          });
          return next;
        });
        setExitingIds((prev) => {
          const next = new Set(prev);
          next.delete(task.id);
          return next;
        });
      }, 300);
    },
    [currentTs]
  );

  const resolveRestocked = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (task) applyOverride(task, "resolved_restocked");
    },
    [tasks, applyOverride]
  );

  const resolveNotFound = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const priorStock = storeData.inventory.find(
        (r) => r.zoneId === task.zoneId && r.skuCode === task.skuCode
      )?.systemStock;

      if (task.kind !== "facing") {
        setStoreData((prev) => ({
          ...prev,
          inventory: prev.inventory.map((r) =>
            r.zoneId === task.zoneId && r.skuCode === task.skuCode
              ? { ...r, systemStock: 0 }
              : r
          ),
        }));
      }

      applyOverride(task, "resolved_not_found", priorStock);

      addToast(
        `Stock set to 0. ₹${Math.round(task.valueAtRiskPerHour).toLocaleString("en-IN")}/hr at risk cleared. Store pickup will stop promising this item.`
      );
    },
    [tasks, applyOverride, addToast]
  );

  const dismissWrongCall = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        applyOverride(task, "dismissed_wrong_call");
        addToast("Dismissed. This feedback trains the detector for next time.");
      }
    },
    [tasks, applyOverride, addToast]
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const withdrawCorrection = useCallback(
    (key: string) => {
      const entry = lifecycle.get(key);
      if (!entry || !canWithdraw(entry, currentTs)) return;

      if (typeof entry.priorStock === "number") {
        const [zoneId, skuCode] = key.split("::");
        const restored = entry.priorStock;
        setStoreData((prev) => ({
          ...prev,
          inventory: prev.inventory.map((r) =>
            r.zoneId === zoneId && r.skuCode === skuCode
              ? { ...r, systemStock: restored }
              : r
          ),
        }));
      }
      // dropping the entry lets the shelf be reassessed, so the task reopens
      // if the gap is still there
      setLifecycle((prev) => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
      addToast("Correction withdrawn. Stock restored and the online promise is back on.");
    },
    [lifecycle, currentTs, addToast]
  );

  const history = useMemo(
    () =>
      [...lifecycle.entries()]
        .filter(
          ([k, e]) =>
            e.state !== "open" &&
            !k.startsWith("facing-") &&
            (e.resolvedTs ?? e.openedTs) <= currentTs
        )
        .map(([key, e]) => ({
          key,
          zoneId: key.split("::")[0],
          skuCode: key.split("::")[1],
          state: e.state,
          resolvedTs: e.resolvedTs ?? e.openedTs,
          priorStock: e.priorStock,
          reversible: canWithdraw(e, currentTs),
        }))
        .sort((a, b) => b.resolvedTs - a.resolvedTs),
    [lifecycle, currentTs]
  );

  const value: SimulationContextValue = {
    currentTs,
    isPlaying,
    seed,
    storeData,
    tasks,
    openTasks,
    totalAtRisk,
    exitingIds,
    play,
    pause,
    setTime,
    resolveRestocked,
    resolveNotFound,
    withdrawCorrection,
    history,
    dismissWrongCall,
    toasts,
    dismissToast,
  };

  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const ctx = useContext(SimulationContext);
  if (!ctx)
    throw new Error("useSimulation must be used within SimulationProvider");
  return ctx;
}
