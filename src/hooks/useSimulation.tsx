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
import type { Task, StoreData, ToastMessage } from "@/types";

type LifecycleEntry = {
  state: Task["state"];
  openedTs: number;
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
          if (entry && entry.state !== "open") return null;
          return { ...t, openedTs: entry?.openedTs ?? t.openedTs };
        }

        const key = taskKey(t.zoneId, t.skuCode);
        const entry = lifecycle.get(key);
        if (entry && entry.state !== "open") return null;

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
    (task: Task, state: Task["state"]) => {
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
    []
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

      applyOverride(task, "resolved_not_found");

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
