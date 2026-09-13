"use client";

import { useState } from "react";
import { useSimulation } from "@/hooks/useSimulation";
import { tsToClock } from "@/lib/time";

const LABEL: Record<string, string> = {
  resolved_restocked: "Restocked",
  resolved_not_found: "Correction raised",
  dismissed_wrong_call: "Dismissed",
};

export function TaskHistory() {
  const { history, withdrawCorrection, storeData } = useSimulation();
  const [expanded, setExpanded] = useState(false);

  if (history.length === 0) return null;

  const reversible = history.filter((h) => h.reversible).length;
  const nameOf = (zoneId: string, skuCode: string) =>
    storeData.zones
      .find((z) => z.id === zoneId)
      ?.skus.find((s) => s.code === skuCode)?.name ?? skuCode;

  return (
    <div className="border-t border-neutral-200">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2 text-left text-[11px] text-neutral-400"
      >
        Task history · {history.length} closed today
        {reversible > 0 ? ` · ${reversible} reversible` : ""}
        <span className="ml-1">{expanded ? "▾" : "▸"}</span>
      </button>

      {expanded && (
        <ul className="px-4 pb-3">
          {history.map((h) => (
            <li key={h.key} className="border-t border-neutral-100 py-2 first:border-0">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[13px] text-neutral-900">
                  {nameOf(h.zoneId, h.skuCode)}
                </p>
                <p className="shrink-0 text-[11px] tabular-nums text-neutral-400">
                  {tsToClock(h.resolvedTs)}
                </p>
              </div>
              <p className="mt-0.5 text-[11px] text-neutral-500">
                {LABEL[h.state] ?? h.state}
                {h.state === "resolved_not_found" &&
                typeof h.priorStock === "number"
                  ? ` · stock ${h.priorStock} → 0`
                  : ""}
              </p>

              {h.state === "resolved_not_found" &&
                (h.reversible ? (
                  <button
                    onClick={() => withdrawCorrection(h.key)}
                    className="mt-1.5 min-h-[44px] w-full border border-neutral-900 text-[13px] font-medium"
                  >
                    Withdraw correction
                  </button>
                ) : (
                  <p className="mt-1 text-[11px] text-neutral-400">
                    Reversal window closed. The adjustment stands and can only be
                    changed by a counted correction.
                  </p>
                ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
