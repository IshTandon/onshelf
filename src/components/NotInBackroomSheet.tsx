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
        <p className="text-base font-medium">Raise stock correction</p>
        <p className="text-xs text-neutral-400 mt-0.5 mb-4">
          {zone?.aisle} · {sku?.name}
        </p>

        <div className="border border-neutral-200 p-3 mb-4 text-sm text-neutral-600 leading-snug">
          <p>
            Raises a cycle-count adjustment for this shelf position, proposing
            system stock{" "}
            <strong className="tabular-nums">
              {task.evidence.systemStock} &rarr; 0
            </strong>
            . Zero on hand is the only value this role can propose.
          </p>
          <p className="mt-2 text-neutral-900">
            Store pickup stops promising this item immediately. The suspension
            auto-expires after four hours unless the adjustment is accepted.
          </p>
          <p className="mt-2 text-[11px] text-neutral-400">
            Prototype: the adjustment is auto-accepted here so the effect is
            visible. In production the ledger moves only once it is approved on
            the path a manual count already uses. Withdrawable for four hours
            from Task history.
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
            Raise adjustment
          </button>
        </div>
      </div>
    </div>
  );
}
