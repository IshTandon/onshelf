"use client";

import { ClockScrubber } from "@/components/ClockScrubber";
import { TaskRow } from "@/components/TaskRow";
import { UncoveredStrip } from "@/components/UncoveredStrip";
import { TaskHistory } from "@/components/TaskHistory";
import { useSimulation } from "@/hooks/useSimulation";
import { formatRupee } from "@/lib/classification";
import { nextCheckTs, tsToClock } from "@/lib/time";

export default function GapsPage() {
  const { openTasks, totalAtRisk, currentTs, exitingIds } = useSimulation();
  const nextCheck = nextCheckTs(currentTs);

  return (
    <div className="max-w-lg mx-auto bg-white">
      <ClockScrubber />

      <p className="px-4 py-2.5 text-xs text-neutral-500 border-b border-neutral-200">
        {openTasks.length === 0 ? (
          <>Nothing open. Next check at {tsToClock(nextCheck)}.</>
        ) : (
          <>
            {openTasks.length} open ·{" "}
            <span className="tabular-nums">
              {formatRupee(totalAtRisk)}/hr at risk
            </span>
          </>
        )}
      </p>

      <UncoveredStrip />

      {openTasks.length > 0 && (
        <section aria-label="Open gaps">
          {openTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              exiting={exitingIds.has(task.id)}
            />
          ))}
        </section>
      )}

      <TaskHistory />
    </div>
  );
}
