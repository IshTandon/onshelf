"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { useSimulation } from "@/hooks/useSimulation";
import {
  getConfidenceLabel,
  getClassificationExplanation,
  formatRupee,
} from "@/lib/classification";
import {
  getSku,
  getZone,
  getCameraStatusAtTs,
  getLastHeartbeat,
} from "@/lib/generator";
import { tsToClock, tsToFullClock } from "@/lib/time";
import type { ShelfGapSignal } from "@/types";

function SignalTimeline({
  signals,
  currentTs,
  cameraStatus,
}: {
  signals: ShelfGapSignal[];
  currentTs: number;
  cameraStatus: string;
}) {
  const windowStart = currentTs - 2 * 60 * 60 * 1000;
  const windowEnd = currentTs;
  const duration = windowEnd - windowStart;

  // Build check slots every 3 min
  const slots: { ts: number; signal?: ShelfGapSignal }[] = [];
  let t = windowStart;
  while (t <= windowEnd) {
    const match = signals.find(
      (s) => Math.abs(s.ts - t) < 90 * 1000
    );
    slots.push({ ts: t, signal: match });
    t += 3 * 60 * 1000;
  }

  return (
    <div className="mt-4">
      <p className="text-xs text-neutral-400 mb-2">Last 2 hours</p>
      <div className="relative h-12 bg-neutral-100 rounded overflow-hidden">
        {slots.map((slot, i) => {
          const left = ((slot.ts - windowStart) / duration) * 100;
          const width = (3 * 60 * 1000 / duration) * 100;

          if (!slot.signal) {
            return (
              <div
                key={i}
                className="absolute top-0 h-full border-r border-dashed border-neutral-300 bg-neutral-200/50"
                style={{ left: `${left}%`, width: `${width}%` }}
                title={`${tsToClock(slot.ts)} — no signal`}
              />
            );
          }

          const sig = slot.signal;
          const isGap = sig.gapRatio > 0.6;
          const lowConf = sig.confidence < 0.55;

          let color = "bg-green-400";
          if (isGap && lowConf) color = "bg-amber-300";
          else if (isGap) color = "bg-red-500";
          else if (lowConf) color = "bg-amber-200";

          return (
            <div
              key={i}
              className={`absolute top-1 h-10 rounded-sm ${color}`}
              style={{ left: `${left}%`, width: `${Math.max(width - 0.5, 1)}%` }}
              title={`${tsToClock(sig.ts)} — ${isGap ? "gap" : "ok"} (${Math.round(sig.confidence * 100)}%)`}
            />
          );
        })}
        {cameraStatus === "offline" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs bg-neutral-800 text-white px-2 py-0.5 rounded">
              Camera silent
            </span>
          </div>
        )}
      </div>
      <div className="flex justify-between text-xs text-neutral-400 mt-1">
        <span>{tsToClock(windowStart)}</span>
        <span>{tsToClock(windowEnd)}</span>
      </div>
      <div className="flex gap-4 mt-2 text-xs text-neutral-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-red-500 rounded-sm inline-block" /> Gap
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-green-400 rounded-sm inline-block" /> OK
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-neutral-200 border border-dashed border-neutral-400 rounded-sm inline-block" /> Missing
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-amber-300 rounded-sm inline-block" /> Low signal
        </span>
      </div>
    </div>
  );
}

function EvidenceContent() {
  const searchParams = useSearchParams();
  const taskId = searchParams.get("id") ?? "";
  const zoneId = searchParams.get("zone") ?? "";
  const skuCode = searchParams.get("sku") ?? "";
  const { storeData, currentTs, tasks } = useSimulation();

  const task =
    tasks.find((t) => t.id === taskId) ??
    tasks.find((t) => t.zoneId === zoneId && t.skuCode === skuCode);

  const zone = getZone(storeData.zones, zoneId || task?.zoneId || "");
  const sku = getSku(
    storeData.zones,
    zoneId || task?.zoneId || "",
    skuCode || task?.skuCode || ""
  );
  const inv = storeData.inventory.find(
    (r) =>
      r.zoneId === (zoneId || task?.zoneId) &&
      r.skuCode === (skuCode || task?.skuCode)
  );

  const cameraId = zone?.cameraId ?? "";
  const cameraStatus = getCameraStatusAtTs(
    storeData.heartbeats,
    cameraId,
    currentTs
  );
  const lastHb = getLastHeartbeat(storeData.heartbeats, cameraId, currentTs);

  const zoneSignals = storeData.signals
    .filter((s) => s.zoneId === (zoneId || task?.zoneId))
    .sort((a, b) => a.ts - b.ts);

  if (!task && !zone) {
    return (
      <div className="px-4 py-12 text-center text-neutral-500">
        Task not found.
        <Link href="/" className="block mt-2 text-neutral-900 underline">
          Back to gaps
        </Link>
      </div>
    );
  }

  const label = task
    ? getConfidenceLabel(task.confidence, task.mode)
    : "Likely";

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      <Link href="/" className="text-sm text-neutral-500 mb-4 inline-block">
        ← Back
      </Link>

      <h1 className="text-xl font-medium">{zone?.aisle}</h1>
      <p className="text-neutral-500">{zone?.section}</p>
      <p className="mt-2 font-medium">{sku?.name}</p>

      {task && (
        <div className="mt-3 flex items-center gap-3 text-sm">
          <span
            className={
              label === "Confirmed"
                ? "text-neutral-900 font-medium"
                : label === "Likely"
                  ? "text-muted"
                  : "text-predicted"
            }
          >
            {task.mode === "predicted" ? "Predicted, camera offline" : label}
          </span>
          <span className="text-neutral-400">·</span>
          <span className="tabular-nums">
            {formatRupee(task.valueAtRiskPerHour)}/hr
          </span>
        </div>
      )}

      <SignalTimeline
        signals={zoneSignals}
        currentTs={currentTs}
        cameraStatus={cameraStatus}
      />

      <div className="mt-6 space-y-4">
        <div>
          <h2 className="text-sm font-medium text-neutral-500 mb-1">
            Camera
          </h2>
          <p className="text-sm">
            {cameraId.replace("cam-", "Camera ")} —{" "}
            <span
              className={
                cameraStatus === "ok"
                  ? "text-neutral-900"
                  : cameraStatus === "degraded"
                    ? "text-muted"
                    : "text-predicted"
              }
            >
              {cameraStatus}
            </span>
          </p>
          {lastHb && (
            <p className="text-xs text-neutral-400 mt-0.5">
              Last heartbeat {tsToFullClock(lastHb.ts)}
            </p>
          )}
        </div>

        <div>
          <h2 className="text-sm font-medium text-neutral-500 mb-1">
            Inventory
          </h2>
          <div className="text-sm space-y-1">
            <p>
              System stock:{" "}
              <span className="font-medium tabular-nums">
                {inv?.systemStock ?? task?.evidence.systemStock ?? "—"}
              </span>
            </p>
            <p>
              Hourly velocity:{" "}
              <span className="tabular-nums">
                {inv?.hourlyVelocity ?? "—"} units/hr
              </span>
            </p>
            <p>
              Last sale:{" "}
              {inv?.lastSaleTs
                ? tsToClock(inv.lastSaleTs)
                : task?.evidence.lastSaleTs
                  ? tsToClock(task.evidence.lastSaleTs)
                  : "None today"}
            </p>
          </div>
        </div>

        {task && (
          <div>
            <h2 className="text-sm font-medium text-neutral-500 mb-1">
              Why this task
            </h2>
            <p className="text-sm text-neutral-700">
              {getClassificationExplanation(task, storeData.zones)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EvidencePage() {
  return (
    <Suspense fallback={<div className="px-4 py-12 text-neutral-500">Loading…</div>}>
      <EvidenceContent />
    </Suspense>
  );
}
