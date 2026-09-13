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
  const statusLabel =
    task.mode === "predicted" ? "Predicted, camera offline" : label;

  const accent =
    isPhantom && !isPredicted
      ? "border-l-urgent"
      : isPredicted
        ? "border-l-predicted"
        : "border-l-transparent";

  return (
    <>
      <article
        className={`border-b border-neutral-200 border-l-[3px] ${accent} ${
          exiting
            ? "animate-row-exit motion-reduce:animate-none opacity-0"
            : ""
        }`}
      >
        <Link
          href={`/evidence?id=${encodeURIComponent(task.id)}&zone=${task.zoneId}&sku=${task.skuCode}`}
          className="block px-4 pt-3.5 pb-3"
        >
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-xl font-medium leading-none">{zone?.aisle}</h2>
            <p className="text-xl font-medium tabular-nums leading-none shrink-0">
              {formatRupee(task.valueAtRiskPerHour)}
              <span className="text-[11px] font-normal text-neutral-400">
                /hr
              </span>
            </p>
          </div>

          <p className="text-[11px] text-neutral-400 mt-1">{zone?.section}</p>

          <p className="text-xs text-neutral-500 mt-2.5 leading-snug">
            {sku?.name ?? task.skuCode}. {getDisagreementSentence(task, storeData.zones)}
          </p>

          <p className="text-[11px] text-neutral-400 mt-2">
            {mins}m open
            <span className="mx-1.5">·</span>
            <span className={isPredicted ? "text-predicted" : "text-neutral-400"}>
              {statusLabel}
            </span>
            <span className="mx-1.5">·</span>
            <span
              className={
                isPhantom && !isPredicted
                  ? "text-urgent"
                  : "text-neutral-400"
              }
            >
              {getTaskAction(task.kind)}
            </span>
          </p>
        </Link>

        <div className="flex border-t border-neutral-100">
          <button
            onClick={() => resolveRestocked(task.id)}
            className="flex-1 py-3.5 text-sm font-medium border-r border-neutral-100 active:bg-neutral-50"
          >
            Restocked
          </button>
          <button
            onClick={() => setShowSheet(true)}
            className="flex-1 py-3.5 text-sm border-r border-neutral-100 active:bg-neutral-50"
          >
            Not in backroom
          </button>
          <button
            onClick={() => dismissWrongCall(task.id)}
            className="flex-1 py-3.5 text-sm text-neutral-400 active:bg-neutral-50"
          >
            Wrong call
          </button>
        </div>
      </article>

      {showSheet && (
        <NotInBackroomSheet task={task} onClose={() => setShowSheet(false)} />
      )}
    </>
  );
}
