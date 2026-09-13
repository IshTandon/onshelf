# Prompt 01 — initial build spec

The full text of the first Cursor prompt, pasted unchanged as the opening message of
the build session. Referenced as P3 in the submission appendix.

---

Build a mobile-first web app called **OnShelf**. Next.js App Router, TypeScript, Tailwind.
No backend, no database, no auth, no external API calls. All data comes from a seeded
generator running in memory on the client. It must deploy to Vercel as a static build.

Do not write a README-driven scaffold and stop. Build the working screens.

## The product in one paragraph

A grocery store has 8 CCTV cameras already installed. A small model on an in-store box samples
one frame per camera every 3 minutes during trading hours and emits small numeric events, not
video. Those events are joined in the cloud to inventory, price and sales velocity for the same
store, and become a ranked task list for the store manager. This prototype is that task list,
the evidence behind each task, and what the product does when the signal is bad. There is no
real computer vision here. Simulate the signals.

## Data model

```ts
type ShelfZone = {
  id: string            // "A3-L2"
  aisle: string         // "Aisle 3"
  section: string       // "Atta & Flours"
  cameraId: string
  skus: { code: string; name: string; mrp: number; unitsPerFacing: number }[]
  covered: boolean      // false = no camera sees this zone
}

type ShelfGapSignal = {
  zoneId: string
  ts: number
  gapRatio: number      // 0..1, share of facings reading as empty
  confidence: number    // 0..1
}

type CameraHeartbeat = { cameraId: string; ts: number; status: 'ok' | 'degraded' | 'offline' }

type StaffPresent = { zoneId: string; ts: number }   // 60s TTL, suppression only

type InventoryRow = {
  zoneId: string
  skuCode: string
  systemStock: number       // what the platform believes is on hand
  hourlyVelocity: number    // units/hour from sales
  lastSaleTs: number | null
}

type Task = {
  id: string
  zoneId: string
  skuCode: string
  kind: 'true_oos' | 'phantom_suspected' | 'reverse_phantom' | 'facing'
  valueAtRiskPerHour: number
  confidence: number
  mode: 'observed' | 'predicted'
  openedTs: number
  sightings: { seen: number; checks: number }
  evidence: { signals: ShelfGapSignal[]; cameraStatus: string; systemStock: number; lastSaleTs: number | null }
  state: 'open' | 'resolved_restocked' | 'resolved_not_found' | 'dismissed_wrong_call'
}
```

## Classification, implement exactly

Evaluate per zone + SKU over a rolling 15-minute window.

1. A task opens only after **at least 3 of the last 5 checks** show `gapRatio > 0.6`. One frame
   is never enough. Surface this in the UI as "Seen in 4 of 5 checks".
2. `phantom_suspected` — sustained gap AND `systemStock > 0`. Action: **Check backroom**. This
   is the headline case and should be the most visually prominent kind.
3. `true_oos` — sustained gap AND `systemStock === 0`. Action: **Order or substitute**. Low
   priority on the floor, since nobody can fix it by walking there.
4. `reverse_phantom` — no gap for 2 hours AND `systemStock === 0` AND a sale in the last 2 hours.
   Action: **Stock is on the shelf but the system says zero. Recount.**
5. `facing` — sustained gap AND `systemStock > 0` AND sales still occurring in the last 30 min.
   Low priority, collapse all of these into one "tidy aisle" row per aisle.
6. Suppress any task where a `StaffPresent` event for that zone is under 60 seconds old.
7. Suppress entirely during the replenishment window, 06:00 to 08:00.
8. Never open a second task for the same zone + SKU while one is open. Extend the existing one.
9. Apply a value floor: do not open a task below INR 40 per hour at risk.

`valueAtRiskPerHour = hourlyVelocity * mrp`. Rank the open list by this, descending. Priority is
money, not recency, and that has to be obvious from looking at the screen.

## Confidence and degradation, do not hide this

- Task confidence = mean signal confidence in the window, multiplied by camera health
  (ok 1.0, degraded 0.7).
- When a camera goes `offline`, its zones switch to `mode: 'predicted'`. Estimate depletion from
  `systemStock` and `hourlyVelocity` since the last restock, open tasks with a distinct
  "Predicted, camera offline" treatment, and cap confidence at 0.5. **The list must never go blank.**
- Zones with `covered: false` never appear as healthy. They live in a separate collapsed strip
  that says plainly that no camera sees these shelves.
- Never show a raw number like "confidence 0.62". Map to three words: **Confirmed** (>0.75),
  **Likely** (0.5 to 0.75), **Predicted** (below 0.5 or offline mode).

## Screens

### 1. Today's gaps — default route, mobile layout

- Simulated clock, plus the day scrubber described below
- One line of state: open task count and total rupees at risk per hour
- The ranked task list. Each row shows:
  - Aisle and section, largest text on the row. This is what the manager navigates by
  - SKU name, and the disagreement stated in one plain sentence before any action is named:
    "System shows 40 units. Shelf has read empty in 4 of the last 5 checks."
  - Rupees at risk per hour, right aligned, tabular figures, second-largest thing on the row
  - Minutes open, and the Confirmed / Likely / Predicted state
- Three thumb-sized actions per row:
  - **Restocked** — closes the task
  - **Not in backroom** — opens a one-tap stock correction sheet showing the proposed adjustment
    (system stock to 0) and what it unblocks: "Store pickup will stop promising this item."
    Then a confirmation that states what just changed, in rupees. This is the most important
    interaction in the build. Give it the most care.
  - **Wrong call** — dismisses it, and a one-line toast explains that this trains the detector

### 2. Evidence — drill-down from a task

- Signal timeline for that zone over the last 2 hours, as marks on a time axis: gap seen, no gap,
  low confidence, camera silent. **Missing intervals must render as visible holes**, not as zeros.
- Camera status and last heartbeat
- The inventory side: system stock, hourly velocity, last sale time
- A plain sentence explaining why this became a task, and why it is this kind rather than another

### 3. Store health — tab

- Camera strip: 8 cameras, current status, last heartbeat, zones covered by each
- Coverage percentage, and the named aisles nothing sees
- An honesty panel headed "What OnShelf cannot see today", listing the offline cameras, the
  uncovered aisles, and the two chronically low-confidence zones

### 4. Regional — separate route, desktop layout

- 12 stores: open tasks, rupees at risk per hour, 7-day task completion rate, phantom rate,
  camera coverage
- **Sort by completion rate ascending by default**, not by value. Adoption is what a regional
  lead acts on. One store must be visibly not using it, completion under 20 percent.

## Time simulation

- A compressed trading day, 06:00 to 22:00. Start paused at 09:00.
- A scrubber to jump to any time, plus a Play control.
- Script these events so a reviewer sees the product behave:
  - 09:20 — high-value phantom opens in Aisle 3, Atta. System shows 40 units, shelf empty
  - 11:05 — camera 4 degrades, confidence on its zones visibly drops to Likely
  - 13:30 — camera 4 goes offline, its zones switch to Predicted and the list stays populated
  - 15:10 — a false positive: a gap signal on a zone where sales are still ticking. It must
    classify as `facing`, not `phantom`. A reviewer who taps Wrong call here is correct
  - 17:45 — peak. Three tasks open at once and the rupee ranking visibly matters
  - 19:00 — camera 4 returns, its zones go back to Confirmed

## Dummy data realism, this is graded

The generator must not produce clean data.

- Randomly drop 5 to 12 percent of expected signals. Missing intervals, not zero values.
- Confidence centred near 0.72 with a long low tail. Not 0.95 flat.
- Two zones with chronically bad angles, confidence capped at 0.55, so they rarely clear the
  threshold. Surface both in Store health as known blind spots.
- One SKU wrong in the opposite direction, to trigger a `reverse_phantom`.
- Timestamps jittered, not landing on exact 3-minute boundaries.
- Seed it so the demo reproduces. Expose the seed in the URL as `?seed=`.

## Visual direction

The user is a store manager holding a phone in an aisle under fluorescent light, not a SaaS buyer.
Design for glanceability and thumb reach.

- Do not build a grid of identical rounded cards with soft grey shadows.
- Do not use a cream background with a terracotta accent.
- One typeface, two weights. Tabular figures for the rupee column so amounts align down the list.
- Let the aisle name and the rupee figure be the only large things. Everything else stays quiet.
- Colour carries state and nothing else: one urgent tone for phantom, one muted tone for
  predicted and low confidence, neutral for the rest. No decorative gradients.
- Actions sit at the bottom of each row, in thumb reach.
- Empty state is an instruction, not a celebration: "Nothing open. Next check at 09:23."
- Respect `prefers-reduced-motion`. The only animation is a row leaving the list when resolved,
  because that confirms what changed.

## Copy rules

- Use the words a store manager uses: aisle, shelf, backroom, recount, order.
- Never surface `gapRatio`, `confidence`, or any internal field name.
- Every task states the disagreement in one sentence before it states the action.
- Errors and empty states say what happened and what to do. They do not apologise.

## Build order

1. Zone, inventory and signal generator with the seeded messy day, plus the clock and scrubber
2. Classification and task lifecycle, as pure functions with the rules above
3. Today's gaps screen, including the Not in backroom flow end to end
4. Evidence drill-down
5. Store health
6. Regional

Confirm the build order back to me in one line, then start at step 1.
