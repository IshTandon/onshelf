const DAY_START_HOUR = 6;
const DAY_END_HOUR = 22;
const DEFAULT_START_HOUR = 9;

/**
 * Base date for the simulation — fixed so timestamps are reproducible.
 *
 * This is deliberately UTC. The scripted day is fictional, so 09:20 has to mean
 * 09:20 for everyone who opens the prototype. Building it from local time made
 * the day depend on the machine that evaluated it: Vercel prerenders the static
 * export in UTC, so a viewer in IST saw the trading day shifted by +05:30 and
 * running to 03:30, with the scrubber labels disagreeing with the clock.
 */
const BASE_DATE_UTC = Date.UTC(2026, 8, 13); // Sep 13 2026, 00:00 UTC

export function hourToTs(hour: number, minute = 0, second = 0): number {
  return BASE_DATE_UTC + hour * 3600000 + minute * 60000 + second * 1000;
}

export function tsToClock(ts: number): string {
  const d = new Date(ts);
  const h = d.getUTCHours().toString().padStart(2, "0");
  const m = d.getUTCMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function tsToFullClock(ts: number): string {
  const d = new Date(ts);
  const h = d.getUTCHours().toString().padStart(2, "0");
  const m = d.getUTCMinutes().toString().padStart(2, "0");
  const s = d.getUTCSeconds().toString().padStart(2, "0");
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
  const h = d.getUTCHours();
  return h >= 6 && h < 8;
}

export function isTradingHours(ts: number): boolean {
  const d = new Date(ts);
  const h = d.getUTCHours();
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
  const mins = d.getUTCMinutes();
  const nextMins = Math.ceil((mins + 1) / 3) * 3;
  const next = new Date(d);
  if (nextMins >= 60) {
    next.setUTCHours(next.getUTCHours() + 1, 0, 0, 0);
  } else {
    next.setUTCMinutes(nextMins, 0, 0);
  }
  return next.getTime();
}

export { DAY_START_HOUR, DAY_END_HOUR, BASE_DATE_UTC };
