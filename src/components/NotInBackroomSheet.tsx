"use client";

import { useState } from "react";
import type { Task } from "@/types";
import { getSku, getZone } from "@/lib/generator";
import { formatRupee } from "@/lib/classification";
import { useSimulation } from "@/hooks/useSimulation";

interface Props {
  task: Task;
  onClose: () => void;
}

export function NotInBackroomSheet({ task, onClose }: Props) {
  const { storeData, resolveNotFound } = useSimulation();
  const [confirmed, setConfirmed] = useState(false);
  const zone = getZone(storeData.zones, task.zoneId);
  const sku = getSku(storeData.zones, task.zoneId, task.skuCode);

  if (confirmed) {
    return (
      <div className="fixed inset-0 z-50 flex items-end bg-black/30">
        <div className="bg-white w-full max-w-lg border-t border-neutral-200 p-5 pb-8">
          <p className="text-base font-medium mb-1">Stock updated</p>
          <p className="text-sm text-neutral-500 mb-5 leading-snug">
            {sku?.name} set to 0 units.{" "}
            <span className="tabular-nums">
              {formatRupee(task.valueAtRiskPerHour)}/hr
            </span>{" "}
            at risk cleared. Store pickup will stop promising this item.
          </p>
          <button
            onClick={onClose}
            className="w-full py-3.5 text-sm font-medium border border-neutral-200 active:bg-neutral-50"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/30">
      <div className="bg-white w-full max-w-lg border-t border-neutral-200 p-5 pb-8">
        <p className="text-base font-medium">Not in backroom</p>
        <p className="text-xs text-neutral-400 mt-0.5 mb-4">
          {zone?.aisle} · {sku?.name}
        </p>

        <div className="border border-neutral-200 p-3 mb-4 text-sm text-neutral-600 leading-snug">
          <p>
            System stock will be set to <strong>0</strong> (currently{" "}
            {task.evidence.systemStock}).
          </p>
          <p className="mt-2 text-neutral-900">
            Store pickup will stop promising this item.
          </p>
        </div>

        <p className="text-xs text-neutral-400 mb-5 tabular-nums">
          Unblocks {formatRupee(task.valueAtRiskPerHour)}/hr in phantom alerts
          for this SKU.
        </p>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 text-sm border border-neutral-200 active:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              resolveNotFound(task.id);
              setConfirmed(true);
            }}
            className="flex-1 py-3.5 text-sm font-medium border border-neutral-900 active:bg-neutral-50"
          >
            Set stock to 0
          </button>
        </div>
      </div>
    </div>
  );
}
