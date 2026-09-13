---
doctitle: OnShelf — Appendix
subtitle: "Record of how the work was done · Companion to section 5"
byline: "Ishaan Tandon · September 2026"
---

# A. How AI was used

AI tools were used throughout, in three roles that stayed separate on purpose. Claude was used to pressure-test the problem choice and to draft and redraft the written deliverables. Cursor generated the prototype from a specification I fixed before any code was written. ChatGPT was used adversarially at the end, prompted to attack the submission rather than improve it, because a model asked to help will agree with you. The division of labour was deliberate. The problem selection, the rejected alternatives, the architecture and the things left unbuilt are mine and are defended in section 5 of the main document. The code is generated and then corrected by me against behaviour I specified in advance. The most useful thing AI did on this assignment was not writing; it was letting me price my own cost argument against published rates fast enough to discover it was wrong and rebuild it.

# B. Prompt log, in order

::: wordcount
P1–P3 and P9–P14 are reconstructed from saved session records and are close to verbatim. P4–P8 summarise the Cursor build iteration: the exact wording of those short prompts was not preserved, so they are not quoted — each entry names the behaviour it produced, every one of which is in the code and covered by the tests.
:::

::: card
### P1 — Claude

<span class="lab">Goal</span> Decide between fashion and grocery; find a framing a camera vendor could not copy.

<span class="lab">Prompt</span> Assignment PDF uploaded. "Now I have received the assignment."

<span class="lab">Returned</span> A recommendation for grocery on-shelf availability with phantom inventory reconciliation, the counter-case for fitting-room conversion and queue management, and the observation that the vendor-differentiation question was the one being scored.

<span class="lab">What I changed, and why</span> Accepted the direction. The argument that a camera signal is worthless alone and valuable only when joined to inventory was the only one that survived the brief's own question about buying camera software elsewhere.
:::

::: card
### P2 — Claude

<span class="lab">Goal</span> Lock the direction before any build.

<span class="lab">Prompt</span> "Lets do this: Grocery, on-shelf availability, with phantom inventory reconciliation"

<span class="lab">Returned</span> The signal model, the four-way classification, and a prototype specification.

<span class="lab">What I changed, and why</span> Nothing at this stage. The rejections came later, under review.
:::

::: card
### P3 — Cursor

<span class="lab">Goal</span> The whole app in one pass, from a spec tight enough that the model had no room to invent product decisions.

<span class="lab">Prompt</span> The OnShelf build spec: data model, five classification rules, suppression rules, three-of-five sighting threshold, degradation behaviour, four screens, scripted trading day, dummy-data realism requirements. Drafted in Claude, pasted into Cursor unchanged. Full text preserved at `prompt-record/prompt-01-initial-build.md` in the repository.

<span class="lab">Returned</span> All four routes built in the requested order, with the seeded generator, classification as pure functions, and the Not-in-backroom flow end to end.

<span class="lab">What I changed, and why</span> The facing rule ships collapsed to one tidy-aisle row per aisle rather than one task per facing, so a list of cheap gaps never crowds out the real phantoms. Ranking is by rupees at risk per hour, and the screen makes that order impossible to miss.
:::

::: card
### P4–P8 — Cursor

<span class="lab">Goal</span> Build iteration: five short correction prompts fixing the first build.

<span class="lab">Prompt</span> Summarised — the exact wording of these five short prompts was not preserved when the session closed, so they are not quoted. Each produced a behaviour that is verifiable in the code and covered by the tests.

<span class="lab">Returned</span> **Classification order:** a sustained gap with stock on hand and a sale in the last 30 minutes classifies as facing, never phantom — the facing branch is evaluated first, which is what makes the 15:10 false positive correctly dismissible. **Signal realism:** jittered timestamps, a 5–12 percent drop rate, confidence with a long low tail, two bad-angle zones capped at 0.55. **Camera-offline fallback:** prediction mode with confidence capped at 0.5 — the list never goes blank, because a blank list reads as a healthy store. **Visual direction:** no rounded-card grid, no cream-and-terracotta default, one typeface, tabular figures, colour carrying state only. **Deploy:** static Next.js export via `output: "export"` and `vercel.json`.

<span class="lab">What I changed, and why</span> Recorded as summaries naming the behaviour and the file it lives in, rather than inventing verbatim quotes. The log states which entries are session-sourced and which are summaries.
:::

::: card
### P9 — ChatGPT

<span class="lab">Goal</span> Find what would lose the round, before the panel did.

<span class="lab">Prompt</span> A review prompt instructing the model to read as the three people who would actually assess this, skip anything that worked, audit every number as sourced / tagged assumption / unmarked, recheck the arithmetic, and flag machine-written prose patterns with exact quotes.

<span class="lab">Returned</span> Five findings accepted, roughly the same number rejected. Accepted: the Fynd advantage was asserted rather than argued; the inventory write-back mechanics were absent; one claim about pilot failure rates was unsupportable; the metrics conflated a stock correction with a restock; the cost total was falsely precise. Rejected: most of the prose rewrites, which were flatter and longer than what they replaced.

<span class="lab">What I changed, and why</span> The five accepted findings became the revision list.
:::

::: card
### P10 — Claude

<span class="lab">Goal</span> Replace assumed pricing with published rates on the two lines where that was possible.

<span class="lab">Prompt</span> "price the edge box and the vision model from published rates, not my estimates"

<span class="lab">Returned</span> NVIDIA's listed price for the edge device and Google's published token rates for the cheapest vision-capable tier. The hardware assumption held; the model pricing did not.

<span class="lab">What I changed, and why</span> The cost section was rewritten around the sourced figures. The edge rationale was rebuilt on privacy and fleet scale rather than cost, because cloud turned out cheaper per store.
:::

::: card
### P11 — Claude

<span class="lab">Goal</span> A submission PDF reflecting the revision.

<span class="lab">Prompt</span> "Create a PDF of the solution to be submitted"

<span class="lab">Returned</span> The full document rebuilt with the corrected cost section, the write-path argument, and the trimmed capped sections.

<span class="lab">What I changed, and why</span> Both capped sections cut back under their word limits, and both remain under them after a later trim: the strategy note measures 1,182 words against a 1,200 cap and the privacy section 374 against 400.
:::

::: card
### P12 — Claude

<span class="lab">Goal</span> A name that did not contradict the privacy argument.

<span class="lab">Prompt</span> "rename it, shelfwatch makes it sound like we're watching people"

<span class="lab">Returned</span> OnShelf. Renamed before the prototype was built, so the name never appeared in the code.

<span class="lab">What I changed, and why</span> Accepted.
:::

::: card
### P13 — Claude

<span class="lab">Goal</span> An answer to the obvious competitor objection.

<span class="lab">Prompt</span> "the vendor objection is that they can integrate the same APIs — answer it"

<span class="lab">Returned</span> The write-path argument: reading inventory is an integration; raising an approved adjustment and suspending available-to-promise is a transaction inside the system of record.

<span class="lab">What I changed, and why</span> Rewrote the Fynd advantage around the write path, the continuous commercial data dependency, and distribution. Added an explicit statement that this is a two-year advantage, not a permanent moat.
:::

::: card
### P14 — Claude

<span class="lab">Goal</span> The document down to claims that survive a follow-up call.

<span class="lab">Prompt</span> "remove anything I can't defend if asked"

<span class="lab">Returned</span> The unsupported pilot-failure-rate claim cut entirely.

<span class="lab">What I changed, and why</span> Cut rather than softened. Anything I cannot defend in a follow-up call should not be in a document I will be asked about.
:::

# C. What did not work

| What I tried | What went wrong | What I did instead |
| --- | --- | --- |
| Built the cost model on estimated per-call model pricing | The edge-cheaper-than-cloud argument collapsed when priced against published rates. At the cheapest vision-capable tier, classifying every sampled frame in the cloud costs about INR 610 per store per month, less than the amortised edge box. The central architectural justification was wrong, and the total was 44 percent too high. | Rebuilt the edge rationale on privacy, resilience and fleet-scale arithmetic, and stated plainly in the document that cloud is cheaper per store. Conceding it is stronger than the number I had invented to avoid conceding it. |
| Named the product Shelfwatch | The privacy section argues that store teams must not feel watched. The name contradicted the argument on the cover page. | Renamed to OnShelf before the prototype was built, so the name never appeared in the code. |
| Answered the vendor-differentiation question with an assertion | The first draft said the data join was not for sale. A competitor's response is that they can integrate with the same APIs, and the draft had no answer to that. | Rewrote it around the write path rather than the read path, the continuous commercial data dependency, and distribution. Added an explicit statement that this is a two-year advantage, not a permanent moat. |
| Included a claim that most shelf-camera pilots fail in their third month | Rhetorically useful and completely unsupportable. I could not have sourced it if asked. | Cut it rather than softening it. |
| Wrote the strategy note and privacy section to length by feel | They came in at 1,333 and 465 words against caps of 1,200 and 400. Over the stated limit on a brief that states limits. | Cut about 240 words across both, mostly compressed rhetorical contrasts that were carrying style rather than meaning. |

# D. What I did not delegate

- **The problem choice.** Grocery over fashion, and phantom inventory over billing queues or conversion, on the reasoning set out in section 1 of the main document.
- **Shelf-zone granularity over SKU-level identification**, accepting a weaker signal in exchange for robustness to poor camera angles and a far lower error rate.
- **Rejecting my own cost argument** after pricing it against published rates, and rewriting the edge rationale around privacy and fleet scale. This is the decision I would most want to be asked about.
- **Corrections propose rather than overwrite**, with an expiring promise suspension, because a phone on a shop floor should not post to the inventory ledger.
- **Three sightings before a task opens**, choosing precision over recall at launch because the trust budget is spent in week one.
- **Not building staff productivity analytics**, and designing the schema so it cannot be added quietly.
- **Which review findings to reject.** I took five and declined most of the prose rewrites, because they replaced short specific sentences with longer generic ones.

# E. Artefacts

| Item | Location |
| --- | --- |
| Live prototype | <https://onshelf-omega.vercel.app/> |
| Code repository | <https://github.com/IshTandon/onshelf> |
| Prompt record | `prompt-record/` in the repository (this appendix, sections B and C) |
| Build specification used at P3 | `prompt-record/prompt-01-initial-build.md` in the repository |

::: wordcount
The prototype opens at 09:00 on seed 42 and can be scrubbed across a simulated trading day running 06:00 to 22:00. Camera 4 degrades at 11:05 and goes silent at 13:30, at which point its zones continue in prediction mode rather than disappearing from the list. Aisles 9 and 10 are covered by no camera and are shown as unknown rather than healthy. A correction can be withdrawn from Task history for four hours. Built mobile-first; best reviewed on a phone.
:::
