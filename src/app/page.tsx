"use client";

import { ClockScrubber } from "@/components/ClockScrubber";
import { TaskRow } from "@/components/TaskRow";
import { UncoveredStrip } from "@/components/UncoveredStrip";
import { useSimulation } from "@/hooks/useSimulation";
import { formatRupee } from "@/lib/classification";
import { nextCheckTs, tsToClock } from "@/lib/time";

export default function GapsPage() {
  const { openTasks, totalAtRisk, currentTs, exitingIds } = useSimulation();
  const nextCheck = nextCheckTs(currentTs);

  return (
    <div className="max-w-lg mx-auto">
      <ClockScrubber />

      <div className="px-4 py-3 border-b border-neutral-100">
        <p className="text-sm text-neutral-600">
          {openTasks.length === 0 ? (
            <>
              Nothing open. Next check at {tsToClock(nextCheck)}.
            </>
          ) : (
            <>
              <span className="font-medium text-neutral-900">
                {openTasks.length} open
              </span>
              {" · "}
              <span className="tabular-nums">
                {formatRupee(totalAtRisk)}/hr at risk
              </span>
            </>
          )}
        </p>
      </div>

      <UncoveredStrip />

      {openTasks.length > 0 && (
        <div>
          {openTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              exiting={exitingIds.has(task.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
