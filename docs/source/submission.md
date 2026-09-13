---
doctitle: OnShelf
subtitle: "Turning existing store cameras into shelf availability action"
byline: "Product Growth Manager take-home · Ishaan Tandon · September 2026"
---

::: epigraph
A camera that says a shelf is empty is a commodity. A camera that says a shelf is empty while the inventory system insists it holds forty units is something else, and acting on that disagreement is the product.
:::

# 1. Strategy note

## The problem worked on

Grocery shoppers arrive for specific items, and the failure that matters is the item not being on the shelf when they reach it. Gruen and Corsten's worldwide out-of-stock studies for GMA and FMI put average retail out-of-stock rates near eight percent, with roughly half of those incidents ending as a lost sale rather than a substitution. <span class="assume">Assumption: older, global figures, used here as an order of magnitude and to be replaced with Reliance Retail's own shelf audit data.</span> The version worth pointing a camera at is narrower than "is the shelf empty". It is **phantom inventory**: stock that exists on paper, sits at zero on the floor, blocks automatic reordering because the system believes it is there, and gets promised to online and quick-commerce customers who then receive a cancellation. No system the store already runs can see it, because they all read the same wrong number.

## Why grocery, and why first

**The loop closes in weeks.** Shoppers return several times a week, so an experiment reads quickly. Single-store fashion conversion is too low-volume to detect a change without a long panel. **The loss can be estimated.** Lost sales are hourly velocity times hours unavailable times price, and Fynd holds all three terms. Fashion's path from browse to purchase has too many steps in between to attribute to a camera. **Grocery shelves hold still.** They are planogrammed and stay put, so a fixed camera maps to a fixed shelf zone. Fashion fixtures move weekly and break that mapping. **The value reaches beyond the shelf.** A correction on aisle three can stop a store-pickup cancellation an hour later.

## Who opens it

**Store manager**, primary. On a phone, on the floor, between other jobs. Needs to know which aisle to walk to next and why. **Regional lead**, secondary. Once a day, deciding which stores need attention and which are quietly ignoring the tool. **The availability service**, which is not a person. A confirmed phantom suspends the online promise before anybody walks anywhere.

## What the video actually provides

A camera produces signals, not insight. The design depends on exactly three, and deliberately no more. `shelf_gap`: a shelf zone reading as empty, with a gap ratio and a confidence score. `camera_heartbeat`: whether that camera is healthy, degraded, or silent. `staff_present`: a person-shaped blob at a shelf, held sixty seconds and discarded, used only to avoid sending someone where someone already is. Nobody is identified, tracked, or counted. The shortness of that list is a design decision, covered in section 4.

## How it works end to end

A small box in the store samples one frame per camera every three minutes during trading hours. A lightweight detector runs on that box, and frames never leave the building. What leaves is a few hundred bytes per event. In the cloud each gap event is joined to planogram, stock, price and velocity for that shelf, then classified as a recorded stockout, a suspected phantom, a reverse phantom, or an untidy facing. Only above a value floor and a three-sighting threshold does a task reach the store app, ranked by rupees at risk per hour. The manager taps <span class="ui">Restocked</span>, or taps <span class="ui">Not in backroom</span>, which raises a stock correction and suspends the online promise. That last tap is the whole product.

## What the correction actually does

This is the riskiest interaction in the system, because it writes to the record of truth from a phone on a shop floor. **It proposes rather than overwrites.** The tap raises a cycle-count adjustment for that SKU and zone. Ledger stock moves only once that adjustment is accepted on the same approval path a manual count already uses. **Online suppression is immediate and expires.** Available-to-promise is suspended the moment the tap lands, because a cancelled order costs more than a lost one. It auto-expires after four hours unless the adjustment is accepted, so a mistaken tap cannot quietly delist an item for a week. **Authorisation is scoped.** The manager role can raise an adjustment and trigger suspension, but cannot post to the ledger or set an arbitrary figure. The only writable value is zero on hand for that shelf position. **Reversal is one tap, for four hours.** Withdrawing a correction from the task history restores the promise and cancels the adjustment. **Failed writes stay visible.** If the inventory service rejects or times out, the task returns to the list flagged as unsent rather than closing silently.

## Why Fynd, when camera software can be bought anywhere

Detection is a commodity and keeps getting cheaper, so the advantage cannot rest there. A vendor can read a planogram API and a stock API. The rest is harder. **The write path, not the read path.** Reading inventory is an integration. Raising an approved adjustment, suspending available-to-promise, and having both expire correctly is a transaction inside the system of record. A vendor would have to be granted write access to stock and to the promise engine, across every chain it sells to, and carry the liability when a bad correction cancels real orders. **Ranking needs commercial data continuously.** Price and velocity per SKU per store, refreshed daily, is what separates a ranked list from an undifferentiated alert feed. A live dependency, not a one-time API call. **Distribution.** These stores already run on the platform: no new contract, integration or login. The honest limit: this is a distribution and trust advantage measured in a couple of years, not a permanent moat. If a vendor secured deep write access to a chain's inventory and promise engine, it could build something similar. The bet is that Fynd can be inside every store on the platform before that integration is worth anyone's while.

## Deliberately left out

**SKU-level pack identification.** Version one works at shelf-zone level from the planogram. Reading a specific pack off a poor-angle camera is where cost and error rate both rise. **Billing queue prediction**, and all customer traffic, dwell and demographic analytics. **Fashion and Lifestyle**, until the grocery loop is proven. **Any new or repositioned hardware. Continuous detection.** Three-minute sampling assumes grocery shelves deplete over tens of minutes. <span class="assume">Assumption: the pilot measures actual depletion-to-detection lag on fast movers and shortens the interval if it proves too coarse.</span>

## What could cause this to fail

**Planogram drift.** A stale zone-to-SKU map makes every task wrong. The first store survey measures drift and sets an accuracy floor below which a store is not onboarded. **Precision collapse.** A handful of false tasks in week one and the manager stops opening the screen. Hence the three-sighting threshold, the value floor, and a cap on tasks per day at launch. **Labour, not information, may be the binding constraint.** If the manager already knows and has nobody free, the tool is a ranked list of things that will not happen. The experiment separates knowing from acting. **The coverage tail.** Stores with too few usable angles run in prediction-only mode and are reported as uncovered rather than healthy. **Being read as surveillance.** A store team that feels measured will find ways to defeat the signal, which destroys the shelf data the product runs on.

# 2. Metrics

## The metric to move

**Value-weighted on-shelf availability.** The share of sales-weighted SKU-hours, during trading hours, where the item was on the shelf. A gap on the fastest-moving atta line is not a gap on a slow niche SKU, and an unweighted percentage lets a store look healthy while losing money.

A stock correction fixes a number; it does not put product on a shelf. Conflating the two is the easiest way to claim credit that is not there. **Correction path:** tap → adjustment accepted → replenishment unblocked and the online promise stops being wrong; measured by phantom correction count and store-pickup cancellation rate. Fast and cleanly attributable. **Restock path:** task → someone walks to the backroom → product reaches the shelf; measured by time-to-resolve and value-weighted availability. Dependent on labour, and the harder claim.

| Layer | Metric | Why it sits here |
| --- | --- | --- |
| Output | Value-weighted on-shelf availability | The revenue-linked outcome, restock path |
| Output | Phantom inventory rate, per store | Confirmed corrections over SKUs monitored, correction path |
| Output | Store-pickup and quick-commerce cancellation rate | Where the money shows up first |
| Input | Time to resolve, task open to closed | Separates knowing from acting |
| Input | Task precision | One minus the wrong-call rate. The trust budget |
| Input | Task completion rate | Whether the tool is used at all |
| Guardrail | Tasks surfaced per shift | Rising tasks with falling completion is the failure signature |
| Guardrail | Withdrawn corrections | Catches over-correction and mistaken taps |
| Guardrail | Camera coverage and uptime | Stops a blind store reading as a healthy store |
| Guardrail | Store staff sentiment, quarterly | Surveillance perception, caught early |

## From ignoring it to using it daily

**Week one, earn the first tap.** Cap the list at three tasks a day, highest value and confidence only. **Put it where they already are:** inside the store app they open every morning, not a new dashboard with a new password. **Close the loop visibly:** "Not in backroom" shows what it unblocked, in rupees, in the moment. **Make the regional lead the forcing function:** a weekly digest ranking stores by completion, not task count. **Raise the cap only on earned trust:** the limit lifts when precision holds above the floor for two weeks.

## The first experiment

| | |
| --- | --- |
| **Belief tested** | A shelf gap contradicting system stock, surfaced as a ranked task, gets acted on and shortens out-of-stock duration. Not that cameras can see gaps, which is known. |
| **Primary measure** | Value-weighted on-shelf availability, measured independently of the tool by twice-daily manual audit on a fixed 60-SKU basket, both arms. |
| **Secondary** | Out-of-stock duration, confirmed phantom corrections, store-pickup cancellation rate. |
| **Design** | Matched-pair by format, footfall band and region. 20 treatment, 20 control. Six weeks, week one excluded as settling. |
| **Sizing** | <span class="assume">Assumption:</span> 100 store-weeks per arm detects a 3 point absolute change at 80 percent power, on an assumed baseline coefficient of variation of 0.30. That variance is a placeholder; arms are not locked until sizing is re-run on two weeks of real audit data. |
| **Called off if** | Precision below 70 percent at week two; completion below 40 percent at week four; at week six, a 95 percent interval containing zero and excluding the 3 point minimum detectable effect. Any clustered staff complaint about individual monitoring stops it the same day. |

# 3. Cost

## The volume being handled

| Quantity | Per store per month | Basis |
| --- | --- | --- |
| Cameras | 8 | <span class="assume">Assumption: midpoint of the brief's 6 to 10</span> |
| Trading hours covered | 480 h | 16 hours a day, 30 days |
| Camera-hours available | 3,840 h | 8 × 480 |
| Frames processed | 76,800 | 1 frame per camera per 3 minutes, trading hours only |
| Frames sent to cloud | 0 | Inference runs in store |
| Event payload uploaded | ~40 MB | Events and heartbeats at roughly 200 bytes each |

## Why the work sits at the edge, honestly

Continuous video to the cloud is impossible — 3,840 camera-hours at 1 Mbps is about 1.7 TB per store per month — but nobody proposed that. The real alternative, uploading the 76,800 sampled frames at roughly 12 GB a month, a store line carries comfortably. So bandwidth does not decide it, and neither does cost: at published rates for the cheapest vision-capable model, cloud classification runs about INR 610 per store per month — less than the amortised edge box. On unit economics, cloud wins. The edge is chosen for three other reasons. **Privacy decides it:** frames contain customers and staff, and uploading them makes the commitment in section 4 a policy promise rather than a physical property of the system. **Resilience:** detection that stops when an unreliable line drops fails during exactly the busy periods worth watching. **Fleet arithmetic:** cloud inference is a recurring bill scaling with every store added; the edge box is capital that does not, and across 20,000 stores the two cross over.

## Cost per store per month

| Line | INR | Basis |
| --- | --- | --- |
| Edge compute box, amortised | 833 | <span class="src">Sourced.</span> NVIDIA Jetson Orin Nano Super at USD 249, about INR 25,000 in Indian retail listings; INR 30,000 landed with enclosure, over 36 months |
| Power, mounting, field maintenance | 150 | <span class="assume">Assumption.</span> Needs a facilities estimate |
| Selective vision-model escalation | 40 | <span class="src">Sourced.</span> Google Flash-Lite at USD 0.10 and 0.40 per million input and output tokens; 6 percent of frames escalate at ~700 input and 50 output tokens, INR 88 to the dollar |
| Cloud join, task service, event store | 400 | <span class="assume">Assumption.</span> Amortised across a fleet, events only, no video storage |
| Network egress | 50 | ~40 MB of events |
| **Total** | **1,473** | **Plan against INR 1,500** |

## Sensitivity, and what each store has to be worth

Two lines dominate. If escalation runs at 20 percent of frames rather than 6 and needs a mid-tier model, that line goes from INR 40 to about INR 1,930 and the total reaches INR 3,400; if it escalates almost nothing, the total falls to about INR 1,450. **Budget against a band of INR 1,500 to 3,400 per store per month, not a point estimate** — the escalation rate being the first thing to measure in the pilot, and the only line with a factor-of-fifty range.

Break-even needs INR 1,473 to 3,400 of monthly gross profit per store. <span class="assume">Assumption:</span> at a 20 percent grocery gross margin, INR 7,400 to 17,000 of recovered monthly revenue, or INR 245 to 570 a day — on a store turning over INR 60 lakh a month, 0.12 to 0.28 percent of revenue. Replace that band with the real figure before this is a business case. Unestimated on both sides: labour, installation and wrong corrections, against cancelled orders avoided and working capital released.

# 4. Privacy

**What is collected.** Frames are sampled from existing cameras, one per camera every three minutes, and processed inside the store. They are held in memory for inference and discarded: nothing is written to disk and no frame leaves the building. What leaves is numeric — a shelf zone identifier, gap ratio, confidence score, timestamp and camera health. A person-shaped region near a shelf is reduced immediately to a boolean with a sixty-second life, used only to avoid sending a second person to a shelf somebody is already working.

**Why.** To establish whether a shelf is empty and whether that contradicts the inventory system. Nothing here requires knowing who is in the aisle, how long they stayed, or whether they are staff or shopper.

**How long, and where.** Frames are not retained. Shelf events are held ninety days at zone level, then aggregated to weekly rollups. Staff-presence booleans last sixty seconds and are never written to durable storage or transmitted. Escalated crops are cropped to the shelf face with person regions removed at the edge before upload, retained seven days for model evaluation, then deleted. All person-adjacent processing happens in-store by design rather than by policy, which means it holds even if the policy is rewritten later.

**What stays aggregate.** Anything touching staff. Task completion is attributed to a store and a shift, never to a named individual, and the schema carries no employee identifier. No per-person metric can be derived from this data because the field does not exist. Store-level comparisons in the regional view are about stores.

**Notice.** Existing CCTV signage is extended to state that footage is processed in-store for shelf availability and no individual is identified. Store teams are briefed before deployment, and the same notice is posted back-of-house so it does not rely on anyone remembering.

**What was deliberately left alone.** Staff productivity analytics. The same pipeline could produce picks per hour, time-on-shelf, or compliance flags. It is not built, and the schema makes it hard to add later: the staff-presence signal is a sixty-second boolean that is never stored, so the data to build it does not exist. A store team that feels watched will find ways to defeat the signal, and the product's data quality dies with it.

# 5. Record of how the work was done

| Decision | Weighed against | Reason |
| --- | --- | --- |
| Grocery first | Fashion and Lifestyle fitting-room conversion | Faster measurement loop, estimable loss model, static planogrammed shelves, and value that extends to online promise accuracy. Fashion's attribution chain is too long to prove with a camera in six weeks. |
| On-shelf availability, specifically the disagreement case | Billing queue length; customer conversion analytics | Queue counting needs nothing Fynd owns and any vendor can sell it. The disagreement between shelf and system requires the inventory record. |
| Shelf-zone granularity | SKU-level pack identification | Zone level comes free from the planogram and is robust to poor angles. SKU recognition raises cost and error for a marginal gain in a task the manager can finish anyway once standing at the shelf. |
| Edge inference | Uploading sampled frames to a hosted model | Revised after costing it. Cloud is cheaper per store, around INR 610 against INR 833 for the box, so this is not a cost decision. It is chosen because frames contain people, and keeping them in the building makes the privacy commitment structural rather than contractual, because store internet is unreliable, and because a recurring per-store bill scales worse than capital across 20,000 stores. |
| Three sightings before a task opens | Fire on first detection | Precision buys the trust budget in week one and recall can be recovered later. A single frame can catch a trolley parked in front of the shelf. |
| Corrections propose rather than overwrite | Direct stock write from the app | A phone on a shop floor should not post to the ledger. Proposal plus expiring promise suspension gets the commercial benefit immediately while keeping the mistake reversible. |
| Task inside the existing store app | A standalone OnShelf console | Adoption is the binding risk, not capability. A new login is a new reason not to use it. |
| No staff productivity analytics, and no schema that permits them | Shipping it as an obvious adjacent feature | It destroys the data quality the core product depends on, and makes the primary user the subject of the tool. |

| Artefact | Link |
| --- | --- |
| Live prototype | <https://onshelf-omega.vercel.app/> |
| Code repository | <https://github.com/IshTandon/onshelf> |
| Prompt record | Appendix, attached separately; also in `prompt-record/` in the repository |

**What the prototype deliberately shows.** A simulated trading day that can be scrubbed from 06:00 to 22:00. A high-value phantom opening mid-morning. Camera 4 degrading at 11:05, going silent at 13:30, and the task list continuing in prediction mode rather than emptying. A false positive at 15:10 that a reviewer is right to dismiss. Aisles 9 and 10, which no camera covers, shown as unknown rather than healthy, alongside two chronically low-confidence zones. Signals arrive with gaps, jittered timestamps and a realistic confidence spread, because the version where everything works is not the version that has to survive a store.
