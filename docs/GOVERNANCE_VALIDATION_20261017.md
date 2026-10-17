# Governance validation — 17 October 2026

## Baseline and boundaries

- Handoff review baseline: `9d2512bd8d8445c3d84f81ebcc14fa021b6b0f8b`.
- Actual implementation base and freshly re-fetched origin/master: `28d2f9c3d4f8af2aa0c13eb655404decab9a6b4b`.
- Upstream difference: reset all local review data to the Showcase baseline. Retained, not replaced by frozen evidence files.
- Isolated worktree `a3-governance-validation`, branch `fix/governance-validation-20261017`. Original checkout `ui/final-client-polish` at `8a3b139` left unchanged. No push or merge.
- Existing user origins/storage and credentials were not changed or cleared. Browser test data was created through the UI on separate loopback origins 8790 (no key) and 8791 (existing server-side SAP credential). Reset was not invoked in the browser.
- QA failure controls are injected by an external local harness, not shipped application code. Synthetic network/storage failures are distinguished below from real SAP responses.

## Changes and evidence

| ID | Result | Current-round evidence |
|---|---|---|
| F01 | UTC confirmation-day/future only; legacy reads preserved; Stop strips date | Initial regression failed before fix; 7 focused tests, real past-date rejection and today's date accepted |
| F02 | Valid UUID canonical matching across active/completed/status/Stop; invalid IDs never merge; duplicate active variants fail without overwrite | Initial identity regressions failed before fix; 6 focused tests. Fixed numeric Showcase IDs are compatibility coverage, not alphabetic case coverage |
| U01 | Saved financial summaries/context/source/limitations in Summary and History; verbose notes disclosed | 6 combined financial/context tests; Showcase and real SAP Summary inspected |
| G01 | Manual checkpoint due-today/overdue in Portfolio/Overview; latest record, active/Stop suppression | 3 focused tests; due-today seen after conditional decision; no automatic cycle |
| A01 | New review captures whitelisted context once; older active captures before Summary or Decision; confirmation rejects missing context | Provider-change immutability, unknown values, write failure, direct-confirm rejection and controller bypass/failure tests. Independent review found the bypass; fixed and re-reviewed |
| D01 | README, scope, UI contract, architecture and decisions updated | Removed stale Dashboard chart/count wording; documented upstream reset behavior and additive optional snapshot |
| V01 | Main browser flows verified, with limits below | Five outcomes, five-cycle history/reload, exact prior record selection, Stop guard, save retry, SAP retry, delayed switch, mobile layout and keyboard tabs |
| S01 | Current assignment and Labs reviewed; no scope expansion made | Primary sources below; no teacher waiver inferred |

## Fresh automated checks

- Baseline before changes: 154 Node tests passed.
- Final `node --test tests/*.test.js`: **177 passed, 0 failed**.
- `TZ=America/Los_Angeles node --test tests/next-review-date.test.js tests/follow-up-due.test.js`: **10 passed, 0 failed**.
- `node --check` on all five changed production JS files: passed.
- `python3 scripts/check_frontend_contract.py`: passed, **156 functional IDs**, unique IDs and dependency order preserved.
- `git diff --check`: passed.
- No historical CI or handoff observation result is counted as this round's pass.
- Existing service-level tests now explicitly save context before valid direct confirmations; invalid-date/owner/action assertions remain. Invalid UUID presentation fixtures use deterministic valid test UUIDs where investment grouping is intended.

## Browser acceptance performed

Codex in-app browser, desktop override 1440×900 and narrow 390×844; separate QA origins.

1. No-key Portfolio truthfully says Not connected; Showcase remains usable.
2. Start Review Cancel and Escape leave no active review. A new cycle has blank human assessment/owner/outcome.
3. Incomplete Summary remains viewable, Decision remains gated.
4. Continue with Conditions rejects 2000-01-01; accepts current UTC date with action and owner. Portfolio shows due today.
5. Storage failure blocks tab navigation, retains draft text, and Retry Save succeeds after restoration.
6. One isolated Showcase investment completed Continue with Conditions, Continue, Modify, Pause and Stop in five separate cycles. Continue omits date; Stop has none. Exact earlier History selection shows its earlier rationale. Reload retains all five rows. Stopped Overview has no Start New Review.
7. Long saved rationale and stacked History inspected at 390px; document scrollWidth equals clientWidth (390), no horizontal page overflow.
8. Live SAP Portfolio returned five Sandbox projects. TEMP003: 4 project components, 40 linked accounting entries, zero matching PO records. PO is Limited evidence, explicitly not zero exposure.
9. Simulated network failure shows Project Structure Error and dependent evidence Unavailable. Restore network + Retry returns TEMP003's real 4/40/0 result.
10. Delayed TEMP003 refresh followed by I1000 selection ends on HANA Migration, USD, 10 components/2 accounting entries/zero PO, without stale TEMP003 labels. These are observed Sandbox responses, not production data.
11. I1000 Summary shows saved USD 0.000 accounting activity, zero-match limitations and explicitly unavailable budget/forecast; it does not invent investment figures.
12. Workspace ArrowRight, End and Home selected Current Review, History and Overview respectively.

### Evidence files (local, outside repository)

Sibling directory `../output/governance-validation-20261017/`:

- `final-suite.txt`, `review-guard-suite.txt`, `prebrowser-suite.txt`
- `f01-past-date.png`, `write-failure.png`
- `history-first-cycle.png`, `five-outcomes-history.png`, `history-mobile.png`
- `financial-basis-final.png`, `sap-financial-basis.png`
- `sap-temp003-live.png`, `sap-network-failure.png`, `sap-switch-result.png`

The screenshots labelled QA include an external test-control strip. It is not a product feature.

## Course requirements (S01)

Read after the user completed University login:

- [Canvas A3 Build App](https://canvas.auckland.ac.nz/courses/143335/assignments/510627): OpenCode.ai + SAP APIs, functional app with at least one working feature, follow Labs.
- [A3 V3 document](https://canvas.auckland.ac.nz/courses/143335/files/18972989?wrap=1): two pages, agentic AI development methods/tools and functional-app options. Does not explicitly specify an in-app AI Review Brief or MCP requirement.
- [Week 10 Lab 02](https://canvas.auckland.ac.nz/courses/143335/files/19050744?module_item_id=3087193): six pages; OpenCode, plain HTML/CSS/JS, browser fetch and SAP APIs.
- [Lab 01](https://canvas.auckland.ac.nz/courses/143335/files/18997977?module_item_id=3083931): preview text of 79 pages loaded after dismissing the large-file notice. Describes SAP autonomous enterprise, Business AI, Joule and MCP Gateway product capabilities. Product slides are not themselves an explicit instruction to add MCP to this app.

Conclusion is limited to these reviewed sources: retaining the deferred in-app AI/MCP baseline is consistent with their explicit technical instructions. This is not a teacher-confirmed waiver or proof that no other announcement/oral instruction exists. Original business ambition and implemented MVP remain distinct.

Date conflict remains unresolved: V3 lists ZIP Monday 19 October 11:59 AM and slides Tuesday 20 October 11:59 AM, while the Canvas assignment UI shows Tuesday 23:59. Do not infer one overrides the other; team should confirm the submission deadlines.

## Remaining limits / blocked items

- WhatsApp latest visible Zoe messages were read: feature/workflow lock, testing/presentation priority, final Reset fix and Dashboard-versus-Portfolio count explanation. Native scrolling failed, so the complete requested yesterday/today history and date separators could not be verified.
- No independent Chrome/Edge/Safari matrix, screen-reader session or separate high-zoom/forced-colours run was performed.
- Browser reload during simulated save failure stayed on the form, but the tool exposed no native beforeunload dialog; native dialog wording/accept/dismiss behavior is not claimed verified. Navigation blocking/Retry Save and unit-level protection are verified.
- No real SAP server outage or expired-key case was induced; network failure was simulated locally. Real successful read-only Sandbox responses were verified separately.
- Browser-local snapshots do not provide production audit, authentication, cross-tab concurrency or shared-team persistence guarantees.
- No new PR, remote push or merge was requested for this handoff implementation; branch remains local for review.
