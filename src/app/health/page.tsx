"use client";

import { useState } from "react";
import { ClockScrubber } from "@/components/ClockScrubber";
import { useSimulation } from "@/hooks/useSimulation";
import {
  getCameraZones,
  getUncoveredZones,
  getCameraStatusAtTs,
  getLastHeartbeat,
} from "@/lib/generator";
import { tsToClock } from "@/lib/time";

const CAMERA_IDS = [
  "cam-1",
  "cam-2",
  "cam-3",
  "cam-4",
  "cam-5",
  "cam-6",
  "cam-7",
  "cam-8",
];

function statusColor(status: string) {
  if (status === "ok") return "bg-green-500";
  if (status === "degraded") return "bg-amber-400";
  return "bg-neutral-300";
}

export default function HealthPage() {
  const { storeData, currentTs } = useSimulation();
  const [expandedCam, setExpandedCam] = useState<string | null>(null);

  const coveredZones = storeData.zones.filter((z) => z.covered);
  const uncovered = getUncoveredZones(storeData.zones);
  const coveragePct = Math.round(
    (coveredZones.length / storeData.zones.length) * 100
  );
  const uncoveredAisles = [...new Set(uncovered.map((z) => z.aisle))];

  const offlineCameras = CAMERA_IDS.filter(
    (id) =>
      getCameraStatusAtTs(storeData.heartbeats, id, currentTs) === "offline"
  );

  const lowConfZones = storeData.lowConfidenceZones
    .map((id) => storeData.zones.find((z) => z.id === id))
    .filter(Boolean);

  return (
    <div className="max-w-lg mx-auto">
      <ClockScrubber />

      <div className="px-4 py-4">
        <h1 className="text-lg font-medium mb-1">Store health</h1>
        <p className="text-sm text-neutral-500 mb-4">
          {coveragePct}% camera coverage
          {uncoveredAisles.length > 0 &&
            ` · ${uncoveredAisles.join(", ")} uncovered`}
        </p>

        <h2 className="text-sm font-medium text-neutral-500 mb-2">Cameras</h2>
        <div className="space-y-2">
          {CAMERA_IDS.map((camId) => {
            const status = getCameraStatusAtTs(
              storeData.heartbeats,
              camId,
              currentTs
            );
            const lastHb = getLastHeartbeat(
              storeData.heartbeats,
              camId,
              currentTs
            );
            const zones = getCameraZones(storeData.zones, camId);
            const isExpanded = expandedCam === camId;

            return (
              <div key={camId} className="border border-neutral-200 rounded">
                <button
                  onClick={() => setExpandedCam(isExpanded ? null : camId)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusColor(status)}`}
                  />
                  <span className="text-sm font-medium flex-1">
                    Camera {camId.replace("cam-", "")}
                  </span>
                  <span className="text-xs text-neutral-400 capitalize">
                    {status}
                  </span>
                  {lastHb && (
                    <span className="text-xs text-neutral-400 tabular-nums">
                      {tsToClock(lastHb.ts)}
                    </span>
                  )}
                </button>
                {isExpanded && (
                  <div className="px-3 pb-2 text-xs text-neutral-500">
                    Covers:{" "}
                    {zones.map((z) => `${z.aisle} ${z.section}`).join(", ")}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 bg-neutral-50 rounded-lg p-4">
          <h2 className="text-sm font-medium mb-3">
            What OnShelf cannot see today
          </h2>
          <ul className="text-sm text-neutral-600 space-y-2">
            {offlineCameras.length > 0 && (
              <li>
                <span className="text-neutral-900 font-medium">
                  Offline cameras:
                </span>{" "}
                {offlineCameras
                  .map((c) => `Camera ${c.replace("cam-", "")}`)
                  .join(", ")}
              </li>
            )}
            {uncoveredAisles.length > 0 && (
              <li>
                <span className="text-neutral-900 font-medium">
                  Uncovered aisles:
                </span>{" "}
                {uncoveredAisles.join(", ")}
              </li>
            )}
            {lowConfZones.length > 0 && (
              <li>
                <span className="text-neutral-900 font-medium">
                  Low-confidence zones:
                </span>{" "}
                {lowConfZones
                  .map((z) => `${z!.aisle} ${z!.section}`)
                  .join(", ")}
              </li>
            )}
            {offlineCameras.length === 0 &&
              uncoveredAisles.length === 0 &&
              lowConfZones.length === 0 && (
                <li>All systems nominal.</li>
              )}
          </ul>
        </div>
      </div>
    </div>
  );
}
