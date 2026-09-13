"use client";

import { useSimulation } from "@/hooks/useSimulation";
import { tsToClock, getDayStartTs, getDayEndTs } from "@/lib/time";

export function ClockScrubber() {
  const { currentTs, isPlaying, play, pause, setTime, seed } = useSimulation();
  const dayStart = getDayStartTs();
  const dayEnd = getDayEndTs();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-neutral-200 px-4 py-2.5">
      <div className="flex items-baseline justify-between mb-2">
        <time className="text-xl font-medium tabular-nums">
          {tsToClock(currentTs)}
        </time>
        <div className="flex items-baseline gap-3 text-xs text-neutral-400">
          <span>seed {seed}</span>
          <button
            onClick={isPlaying ? pause : play}
            className="text-neutral-900 font-medium"
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
        className="w-full h-px appearance-none bg-neutral-300 cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-3
          [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:bg-neutral-900
          [&::-moz-range-thumb]:w-3
          [&::-moz-range-thumb]:h-3
          [&::-moz-range-thumb]:border-0
          [&::-moz-range-thumb]:bg-neutral-900"
        aria-label="Time scrubber"
      />
      <div className="flex justify-between text-[10px] text-neutral-400 mt-1 tabular-nums">
        <span>06:00</span>
        <span>22:00</span>
      </div>
    </header>
  );
}
