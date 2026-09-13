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
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
        <div className="bg-white w-full max-w-lg rounded-t-2xl p-6 pb-8">
          <p className="text-lg font-medium mb-2">Stock updated</p>
          <p className="text-neutral-600 mb-6">
            {sku?.name} set to 0 units.{" "}
            {formatRupee(task.valueAtRiskPerHour)}/hr at risk cleared.
            Store pickup will stop promising this item.
          </p>
          <button
            onClick={onClose}
            className="w-full py-3 bg-neutral-900 text-white font-medium rounded"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="bg-white w-full max-w-lg rounded-t-2xl p-6 pb-8">
        <h2 className="text-lg font-medium mb-1">Not in backroom</h2>
        <p className="text-sm text-neutral-500 mb-4">
          {zone?.aisle} · {sku?.name}
        </p>

        <div className="bg-neutral-50 rounded-lg p-4 mb-4">
          <p className="text-sm text-neutral-600 mb-3">
            System stock will be set to <strong>0</strong> (currently{" "}
            {task.evidence.systemStock}).
          </p>
          <p className="text-sm text-neutral-800 font-medium">
            Store pickup will stop promising this item.
          </p>
        </div>

        <p className="text-sm text-neutral-500 mb-6">
          This unblocks {formatRupee(task.valueAtRiskPerHour)}/hr in phantom
          alerts for this SKU.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-neutral-300 rounded font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              resolveNotFound(task.id);
              setConfirmed(true);
            }}
            className="flex-1 py-3 bg-neutral-900 text-white font-medium rounded"
          >
            Confirm — set stock to 0
          </button>
        </div>
      </div>
    </div>
  );
}
