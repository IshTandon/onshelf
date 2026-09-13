"use client";

import { useSimulation } from "@/hooks/useSimulation";
import { tsToClock, getDayStartTs, getDayEndTs } from "@/lib/time";

export function ClockScrubber() {
  const { currentTs, isPlaying, play, pause, setTime, seed } = useSimulation();
  const dayStart = getDayStartTs();
  const dayEnd = getDayEndTs();
  const progress = ((currentTs - dayStart) / (dayEnd - dayStart)) * 100;

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-neutral-200 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl font-medium tabular-nums tracking-tight">
          {tsToClock(currentTs)}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400">seed {seed}</span>
          <button
            onClick={isPlaying ? pause : play}
            className="px-3 py-1.5 text-sm font-medium bg-neutral-900 text-white rounded"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
        </div>
      </div>
      <input
        type="range"
        min={dayStart}
        max={dayEnd}
        value={currentTs}
        onChange={(e) => setTime(Number(e.target.value))}
        className="w-full h-1.5 appearance-none bg-neutral-200 rounded-full cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-neutral-900"
        aria-label="Time scrubber"
      />
      <div className="flex justify-between text-xs text-neutral-400 mt-1">
        <span>06:00</span>
        <span>22:00</span>
      </div>
      <div
        className="absolute bottom-0 left-0 h-0.5 bg-neutral-900 transition-[width] duration-300 motion-reduce:transition-none"
        style={{ width: `${progress}%` }}
        aria-hidden
      />
    </div>
  );
}
