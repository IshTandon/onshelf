"use client";

import { useState } from "react";
import { useSimulation } from "@/hooks/useSimulation";
import { getUncoveredZones } from "@/lib/generator";

export function UncoveredStrip() {
  const { storeData } = useSimulation();
  const uncovered = getUncoveredZones(storeData.zones);
  const [expanded, setExpanded] = useState(false);

  if (uncovered.length === 0) return null;

  const aisles = [...new Set(uncovered.map((z) => z.aisle))];

  return (
    <div className="border-b border-neutral-200 bg-neutral-50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 text-left text-sm text-neutral-600"
      >
        <span className="font-medium">No camera coverage</span>
        <span className="text-neutral-400"> — {aisles.join(", ")}</span>
        <span className="float-right text-neutral-400">{expanded ? "▾" : "▸"}</span>
      </button>
      {expanded && (
        <div className="px-4 pb-3 text-sm text-neutral-500">
          {uncovered.map((z) => (
            <p key={z.id}>
              {z.aisle} · {z.section}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
