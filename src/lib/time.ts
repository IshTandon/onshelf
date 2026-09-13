const DAY_START_HOUR = 6;
const DAY_END_HOUR = 22;
const DEFAULT_START_HOUR = 9;

/** Base date for simulation — fixed so timestamps are reproducible */
const BASE_DATE = new Date(2026, 8, 13); // Sep 13 2026

export function hourToTs(hour: number, minute = 0, second = 0): number {
  const d = new Date(BASE_DATE);
  d.setHours(hour, minute, second, 0);
  return d.getTime();
}

export function tsToClock(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function tsToFullClock(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  const s = d.getSeconds().toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function getDefaultStartTs(): number {
  return hourToTs(DEFAULT_START_HOUR, 0);
}

export function getDayStartTs(): number {
  return hourToTs(DAY_START_HOUR, 0);
}

export function getDayEndTs(): number {
  return hourToTs(DAY_END_HOUR, 0);
}

export function isReplenishmentWindow(ts: number): boolean {
  const d = new Date(ts);
  const h = d.getHours();
  return h >= 6 && h < 8;
}

export function isTradingHours(ts: number): boolean {
  const d = new Date(ts);
  const h = d.getHours();
  return h >= DAY_START_HOUR && h < DAY_END_HOUR;
}

export function minutesOpen(openedTs: number, currentTs: number): number {
  return Math.floor((currentTs - openedTs) / 60000);
}

export function minutesSince(ts: number, currentTs: number): number {
  return Math.floor((currentTs - ts) / 60000);
}

export function nextCheckTs(currentTs: number): number {
  const d = new Date(currentTs);
  const mins = d.getMinutes();
  const nextMins = Math.ceil((mins + 1) / 3) * 3;
  const next = new Date(d);
  if (nextMins >= 60) {
    next.setHours(next.getHours() + 1, 0, 0, 0);
  } else {
    next.setMinutes(nextMins, 0, 0);
  }
  return next.getTime();
}

export { DAY_START_HOUR, DAY_END_HOUR, BASE_DATE };
