import { describe, it, expect } from "vitest";
import { hourToTs, tsToClock, getDayStartTs, getDayEndTs, getDefaultStartTs, isTradingHours } from "./time";

// The scripted day is fictional, so it must read identically for every viewer.
// These assertions are absolute: they fail if the clock is ever rebuilt from
// machine-local time, which is what shifted the deployed day by +05:30 in IST.
describe("simulation clock is timezone-independent", () => {
  it("renders the scripted times the script actually calls for", () => {
    expect(tsToClock(getDayStartTs())).toBe("06:00");
    expect(tsToClock(getDayEndTs())).toBe("22:00");
    expect(tsToClock(getDefaultStartTs())).toBe("09:00");
    for (const [h, m] of [[9, 20], [11, 5], [13, 30], [15, 10], [17, 45]] as const) {
      const label = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      expect(tsToClock(hourToTs(h, m))).toBe(label);
    }
  });

  it("keeps the trading day inside 06:00-22:00, never past midnight", () => {
    expect(getDayEndTs() - getDayStartTs()).toBe(16 * 3600000);
    expect(isTradingHours(hourToTs(6, 0))).toBe(true);
    expect(isTradingHours(hourToTs(21, 59))).toBe(true);
    expect(isTradingHours(hourToTs(22, 0))).toBe(false);
    expect(isTradingHours(hourToTs(3, 30))).toBe(false);
  });

  // The real defect was a split: timestamps were built at prerender time on
  // Vercel (UTC) and formatted at runtime in the viewer's zone. A same-process
  // round trip cannot see that, because both halves agree locally. Pinning the
  // absolute epoch does: it only holds if the base is genuinely zone-free.
  it("produces the same absolute instant no matter where it runs", () => {
    expect(hourToTs(0, 0)).toBe(Date.UTC(2026, 8, 13));
    expect(hourToTs(9, 20)).toBe(Date.UTC(2026, 8, 13) + 9 * 3600000 + 20 * 60000);
    expect(getDayStartTs()).toBe(Date.UTC(2026, 8, 13, 6));
    expect(getDayEndTs()).toBe(Date.UTC(2026, 8, 13, 22));
  });

  it("advances exactly one hour per hour, with no DST or offset drift", () => {
    expect(hourToTs(13, 30) - hourToTs(9, 20)).toBe(4 * 3600000 + 10 * 60000);
  });
});
