"use client";

import { useState } from "react";
import Link from "next/link";
import type { Task } from "@/types";
import {
  getConfidenceLabel,
  getDisagreementSentence,
  getTaskAction,
  formatRupee,
} from "@/lib/classification";
import { getSku, getZone } from "@/lib/generator";
import { minutesOpen } from "@/lib/time";
import { useSimulation } from "@/hooks/useSimulation";
import { NotInBackroomSheet } from "./NotInBackroomSheet";

interface Props {
  task: Task;
  exiting?: boolean;
}

export function TaskRow({ task, exiting }: Props) {
  const { storeData, currentTs, resolveRestocked, dismissWrongCall } =
    useSimulation();
  const [showSheet, setShowSheet] = useState(false);

  const zone = getZone(storeData.zones, task.zoneId);
  const sku = getSku(storeData.zones, task.zoneId, task.skuCode);
  const label = getConfidenceLabel(task.confidence, task.mode);
  const isPhantom = task.kind === "phantom_suspected";
  const isPredicted = task.mode === "predicted" || label === "Predicted";
  const mins = minutesOpen(task.openedTs, currentTs);

  const borderColor = isPredicted
    ? "border-l-predicted"
    : isPhantom
      ? "border-l-urgent"
      : "border-l-transparent";

  const bgColor = isPredicted
    ? "bg-neutral-50"
    : isPhantom
      ? "bg-red-50/50"
      : "";

  return (
    <>
      <div
        className={`border-b border-neutral-200 border-l-4 ${borderColor} ${bgColor} ${
          exiting
            ? "animate-row-exit motion-reduce:animate-none opacity-0"
            : ""
        }`}
      >
        <Link
          href={`/evidence?id=${encodeURIComponent(task.id)}&zone=${task.zoneId}&sku=${task.skuCode}`}
          className="block px-4 pt-4 pb-2"
        >
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-lg font-medium leading-tight">
                {zone?.aisle}
              </p>
              <p className="text-sm text-neutral-500">{zone?.section}</p>
            </div>
            <p className="text-lg font-medium tabular-nums shrink-0">
              {formatRupee(task.valueAtRiskPerHour)}
              <span className="text-xs text-neutral-400 font-normal">/hr</span>
            </p>
          </div>

          <p className="text-sm mt-2 text-neutral-800">
            {sku?.name ?? task.skuCode}
          </p>
          <p className="text-sm text-neutral-600 mt-1">
            {getDisagreementSentence(task, storeData.zones)}
          </p>

          <div className="flex items-center gap-3 mt-2 text-xs text-neutral-400">
            <span>{mins}m open</span>
            <span
              className={
                label === "Confirmed"
                  ? "text-neutral-700"
                  : label === "Likely"
                    ? "text-muted"
                    : "text-predicted"
              }
            >
              {task.mode === "predicted" && label !== "Predicted"
                ? "Predicted, camera offline"
                : label}
            </span>
            {isPhantom && (
              <span className="text-urgent font-medium ml-auto">
                {getTaskAction(task.kind)}
              </span>
            )}
            {!isPhantom && (
              <span className="text-neutral-500 ml-auto">
                {getTaskAction(task.kind)}
              </span>
            )}
          </div>
        </Link>

        <div className="flex gap-2 px-4 pb-4 pt-1">
          <button
            onClick={() => resolveRestocked(task.id)}
            className="flex-1 py-2.5 text-sm font-medium bg-neutral-900 text-white rounded"
          >
            Restocked
          </button>
          <button
            onClick={() => setShowSheet(true)}
            className="flex-1 py-2.5 text-sm font-medium border border-neutral-300 rounded"
          >
            Not in backroom
          </button>
          <button
            onClick={() => dismissWrongCall(task.id)}
            className="flex-1 py-2.5 text-sm font-medium border border-neutral-200 text-neutral-500 rounded"
          >
            Wrong call
          </button>
        </div>
      </div>

      {showSheet && (
        <NotInBackroomSheet task={task} onClose={() => setShowSheet(false)} />
      )}
    </>
  );
}
