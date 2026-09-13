# OnShelf

Shelf gap tasks for grocery store managers. A prototype built for a product management
take-home.

The idea: a grocery store already has CCTV. A small model on an in-store box samples one frame
per camera every three minutes and emits small numeric events, not video. Those events are
joined in the cloud to inventory, price and sales velocity for the same store, and become a
ranked task list for the store manager. **The product is the disagreement between what the
camera sees and what the inventory system believes.** A shelf that reads empty while the system
insists it holds forty units is a phantom, and acting on that is the whole point.

There is no computer vision here. Signals come from a seeded generator so the demo reproduces
exactly. What is real is the classification logic, the task lifecycle, the correction and its
reversal, and the degradation behaviour when a camera goes quiet.

**Live:** https://onshelf-omega.vercel.app/

**The written submission** is in [`docs/`](docs) — the strategy note, metrics, cost and privacy
sections, the decision record, and the appendix covering how the work was done. The prompt
record is in [`prompt-record/`](prompt-record).

## The four screens

- **Today's gaps** — the ranked task list, sorted by rupees at risk per hour. Each row states
  the disagreement in a sentence before it names an action. Actions depend on the task kind:
  Restocked / Not in backroom / Wrong call on a suspected phantom, Recount on a reverse
  phantom, Order or substitute on a true out-of-stock, Tidy aisle on a facing.
- **Evidence** — drill into any task: the signal timeline with missing intervals drawn as
  holes rather than zeros, camera status and last heartbeat, the inventory side, and a plain
  sentence saying why this became a task and why it is this kind.
- **Store health** — the eight cameras with status, coverage percentage, and an honesty panel
  listing what the system cannot see: uncovered aisles and chronically low-confidence zones.
- **Regional** — twelve stores sorted by completion rate ascending, because adoption is what a
  regional lead acts on. One store is visibly not using the tool.

## How classification works

Four kinds, evaluated per zone + SKU over a rolling 15-minute window:

1. A task opens only when at least **3 of the last 5** checks show a gap ratio above **0.6**.
2. `phantom_suspected` — sustained gap, system stock above zero. → Check backroom.
3. `true_oos` — sustained gap, system stock at zero. → Order or substitute.
4. `reverse_phantom` — no gap for two hours, system stock zero, and a sale within two hours.
   The count is wrong, not the shelf. → Recount.
5. `facing` — sustained gap, stock above zero, and a sale in the last 30 minutes. Collapsed to
   one tidy-aisle row per aisle.

Order matters: `facing` is tested before `phantom_suspected`, so a shelf that is still selling
is never called a phantom. Tasks are suppressed while staff are present at the zone, during the
06:00–08:00 replenishment window, and never reopen for a zone + SKU already open. A value floor
of ₹40/hr keeps cheap gaps off the list.

When a camera goes offline its zones switch to **prediction mode**: depletion is estimated from
system stock and velocity, confidence is capped, and the rows are labelled "camera offline,
estimate only". The list never goes blank, because a blank list reads as a healthy store.

## The correction, and withdrawing it

This is the riskiest interaction, because it writes to the record of truth from a phone on a
shop floor. So it is deliberately conservative:

- **It proposes rather than overwrites.** "Not in backroom" raises a cycle-count adjustment.
- **Authorisation is scoped.** Zero on hand is the only value the manager role can propose.
- **Online suppression is immediate and expiring.** Store pickup stops promising the item at
  once, and the suspension auto-expires after four hours unless the adjustment is accepted.
- **Reversal is one tap, for four hours.** Every closed task appears under **Task history** at
  the foot of the gaps list. Withdrawing a correction restores the stock and lifts the
  suppression, so the shelf is reassessed and the task reopens if the gap is still there. Past
  four hours the row says the adjustment stands.

The prototype auto-accepts the adjustment so the effect is visible immediately; the sheet says
so rather than implying a production approval step happened.

## The scripted day

Seeded on `?seed=42`, running **06:00 to 22:00**, opening paused at 09:00. The clock is built
on a fixed UTC base so the scripted times read identically for every viewer — a day built from
machine-local time renders differently depending on where the static export was prerendered.

Signals arrive with jittered timestamps, dropped checks and a realistic confidence spread,
because the version where everything works is not the version that has to survive a store.

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
npm run check        # lint, tests, production build
npm test             # vitest
```

`npm run check` is the single entrypoint CI uses. The build is a static export
(`output: "export"`), so there is no server in production.

## Layout

```
src/lib/          generator, classification, reversal, time — all pure, all tested
src/hooks/        useSimulation — clock, task lifecycle, corrections, history
src/components/   scrubber, task row, correction sheet, task history, honesty strips
src/app/          the four routes
docs/             the submitted PDFs and the markdown they are built from
prompt-record/    the prompts this was built from
```
