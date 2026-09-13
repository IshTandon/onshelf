import { describe, it, expect } from "vitest";
import { canWithdraw, REVERSAL_WINDOW_MS } from "./reversal";
import { hourToTs } from "./time";

const raisedAt = hourToTs(17, 45);
// resolvedTs is applied only when given, so "never resolved" is genuinely absent
const entry = (state: string, resolvedTs?: number) =>
  resolvedTs === undefined ? { state } : { state, resolvedTs };

describe("canWithdraw", () => {
  it("allows withdrawal inside the four-hour window, including the boundary", () => {
    const e = entry("resolved_not_found", raisedAt);
    expect(canWithdraw(e, raisedAt)).toBe(true);
    expect(canWithdraw(e, raisedAt + REVERSAL_WINDOW_MS - 1000)).toBe(true);
    expect(canWithdraw(e, raisedAt + REVERSAL_WINDOW_MS)).toBe(true);
  });

  it("closes the window once four hours have passed", () => {
    expect(
      canWithdraw(entry("resolved_not_found", raisedAt), raisedAt + REVERSAL_WINDOW_MS + 1000)
    ).toBe(false);
  });

  it("never offers withdrawal for a restock or a dismissal", () => {
    expect(canWithdraw(entry("resolved_restocked", raisedAt), raisedAt)).toBe(false);
    expect(canWithdraw(entry("dismissed_wrong_call", raisedAt), raisedAt)).toBe(false);
    expect(canWithdraw(entry("open", raisedAt), raisedAt)).toBe(false);
  });

  it("does not offer withdrawal before it was raised, or with no resolve time", () => {
    expect(canWithdraw(entry("resolved_not_found", raisedAt), raisedAt - 60_000)).toBe(false);
    expect(canWithdraw(entry("resolved_not_found"), raisedAt)).toBe(false);
  });
});
