/** A correction can be withdrawn for four hours after it is raised. */
export const REVERSAL_WINDOW_MS = 4 * 60 * 60 * 1000;

/**
 * Whether a raised correction can still be withdrawn.
 *
 * Only a correction qualifies: a restock or a dismissal never proposed a change
 * to the stock ledger, so there is nothing to withdraw. Past the window the
 * adjustment stands and has to be changed by a counted correction instead.
 */
export function canWithdraw(
  entry: { state: string; resolvedTs?: number },
  currentTs: number
): boolean {
  if (entry.state !== "resolved_not_found") return false;
  if (typeof entry.resolvedTs !== "number") return false;
  const elapsed = currentTs - entry.resolvedTs;
  return elapsed >= 0 && elapsed <= REVERSAL_WINDOW_MS;
}
