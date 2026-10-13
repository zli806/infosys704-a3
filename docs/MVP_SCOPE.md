# Playable MVP Scope

## Business Objective

Demonstrate the A2 Stage-Gated Portfolio Continuation Review solution for INFOSYS 704 A3: real SAP Sandbox evidence + explicit human governance input + deterministic system controls, ending in an accountable human decision and retained prototype record. There is one web product, no Demo/Live mode, fabricated SAP data, AI recommendation or SAP write-back.

[PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md) remains the business source of truth, with the first playable baseline decisions appended in [DECISIONS.md](../DECISIONS.md). AI Review Brief/MCP/Purchase Requisition are deliberately deferred from this baseline.

## Current Technical Baseline

The modular plain HTML/CSS/JS app now implements Dashboard → Investments → Investment Details → Assessment → Summary → Decision → Confirmation, plus a Reviews view. Existing Enterprise Project/G/L V2 and PO V4 services retain their endpoints and join semantics. WBS is primary/exact; numeric-only project-ID fallback remains secondary for G/L.

Live browser smoke test for this baseline: 5 SAP projects; TEMP003 with 4 elements, 40 linked G/L rows and 0 exact PO links. The review flow was exercised through a conditional decision, dashboard update and reload/persistence; the isolated test record was then removed. This is a test observation, not a permanent production fact or DPE investment decision. Earlier sample findings remain in [API Integration](API_INTEGRATION.md).

## Minimum Viable Product

| Capability | Status | Scope / remaining gap |
| --- | --- | --- |
| Select an in-scope IT investment | **PARTIAL** | All returned real Sandbox projects can be selected/reviewed; no verified DPE production IT-investment classification/scope filter. |
| Retrieve lifecycle/WBS evidence | **DONE** | Real UUID navigation, elements/WBS/milestone flags and honest empty/error states. No fake marked milestone or automatic gate assignment. |
| Retrieve available financial evidence | **DONE** | Live G/L joins and cautious returned non-commitment amounts by currency; not complete project cost. |
| Retrieve available procurement evidence | **PARTIAL** | Live PO connectivity, exact matching and zero/error handling work. Current tested samples have no project PO joins, so populated procurement amounts remain data-limited. |
| Assemble continuation-review evidence pack | **DONE** | Project context, lifecycle/G/L/PO snapshot summaries, reviewer assessment and timing/readiness are presented together, with raw/debug information secondary. |
| Capture non-SAP governance evidence | **DONE** | Human basis, six assessment categories, comments/dependencies and decision owner; source-labelled as REVIEWER INPUT. No automatic budget variance is invented. |
| Record human continuation decision | **DONE** | Exact five A2 outcomes, no preselection/recommendation; required rationale/owner and conditional action requirements enforced again on save. |
| Retain/show rationale, action/owner, next review | **DONE (prototype)** | Versioned browser-local records include actual timestamps/targets, assessment and concise evidence snapshots. No production database/audit/authentication. |
| Preserve AI/human decision boundary | **DONE for this baseline** | No AI or automated continuation decision exists. Future AI safeguards still require implementation/validation. |

Readiness is a deterministic completeness list, not a weighted score: context exists; lifecycle loaded; G/L and PO attempted; basis selected; each of the six categories has a value other than `Not assessed`; owner entered. Cost Position = `Insufficient information` is a completed reviewer assessment identifying an evidence gap, not an unassessed field. The Summary labels that finding as REVIEWER INPUT; it does not imply missing SAP data or recommend an outcome. Zero joins, failed requests or unavailable identifiers are distinguished explicitly. Attempted does not mean successful or adequate evidence; the human remains accountable for judgement. Pending evidence loads block progression/confirmation.

Review-open time is set once from the actual browser clock. The 14-day decision target and 30-day escalation threshold use UTC calendar days. Dashboard/Reviews show calculated open/overdue/escalated/recorded states; completed records are excluded from open counts. Thresholds are displayed controls, not external notifications. Decisions never modify SAP processing status.

## Remaining MVP Limitations

- Public Sandbox data is not DPE production data. No marked milestones were present in the 26 tested elements; review basis is chosen by the human rather than inferred from SAP gates.
- No PO joins in current tested projects. No fabricated procurement records or unrelated diagnostics may fill the gap.
- Limited returned pages (5 projects / up to 100 G/L or PO rows); no automatic pagination or complete-cost/remaining-liability assurance.
- LocalStorage is browser/origin-local, editable/clearable and not production-grade, multi-user, tamper-proof or backed up. Owner is entered text, not authenticated decision rights. Storage failure is visible and does not count as a recorded decision.
- Saved SAP evidence summaries are explicitly snapshots; fresh API evidence is reloaded on demand. Raw payloads are not persisted.
- Basic desktop presentation awaits UI/UX refinement; no mobile screens. No automatic review queue prioritisation, material-trigger detection, external reminders/escalation or gate configuration.

## Stretch / Later

Purchase Requisition, MCP, AI Review Brief, richer shared persistence/audit, authenticated roles, useful advanced analytics, configured governance gates/triggers, and visual polish beyond the usable MVP. Not every later item must be implemented. This iteration intentionally resolves the earlier AI scope question by deferring AI in the decision log rather than silently changing the human accountability principle.

## Acceptance Principles

Functional end-to-end flow; traceability to A2; no fake SAP evidence; clear SAP/REVIEWER INPUT/SYSTEM CALCULATED labels; an accountable human decision; defensive joins/currencies/empty states; unchanged API interpretation; focused teammate PR/review work. See [CONTRIBUTING.md](../CONTRIBUTING.md) and [UI Contract](UI_CONTRACT.md).
