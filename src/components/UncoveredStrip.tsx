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
    <div className="border-b border-neutral-200">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2 text-left text-[11px] text-neutral-400"
      >
        No camera sees {aisles.join(", ")}
        <span className="ml-1">{expanded ? "▾" : "▸"}</span>
      </button>
      {expanded && (
        <div className="px-4 pb-2 text-[11px] text-neutral-400">
          {uncovered.map((z) => (
            <p key={z.id}>{z.aisle} · {z.section}</p>
          ))}
        </div>
      )}
    </div>
  );
}
