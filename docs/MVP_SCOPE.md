# Playable MVP Scope

## Business Objective

Demonstrate the A2 Stage-Gated Portfolio Continuation Review solution for INFOSYS 704 A3: a transparently synthetic five-investment showcase portfolio alongside real SAP Sandbox evidence, explicit human governance judgement and deterministic controls. One product, no Demo/Live mode, falsely represented SAP data, automated recommendation or SAP write-back.

[PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md) remains the business source of truth, with the first playable baseline decisions appended in [DECISIONS.md](../DECISIONS.md). AI Review Brief/MCP/Purchase Requisition are deliberately deferred from this baseline.

## Current Technical Baseline

The plain HTML/CSS/JS app has only Dashboard / Portfolio navigation. Investment entries share one workspace: Overview / Current Review / History. Current Review stages are Assessment → Review Summary → Governance Decision; Record Decision selects the completed record inline in History. Dashboard retains its shared attention/history list. Investments have 0..N completed cycles with at most one active; later human stage gates/triggers may create new non-Stop cycles, never edit history. SAP endpoints/joins remain unchanged: WBS primary/exact; numeric-only project-ID fallback secondary for G/L.

Live browser smoke test for this baseline: 5 SAP projects; TEMP003 with 4 elements, 40 linked G/L rows and 0 exact PO links. The review flow was exercised through a conditional decision, dashboard update and reload/persistence; the isolated test record was then removed. This is a test observation, not a permanent production fact or DPE investment decision. Earlier sample findings remain in [API Integration](API_INTEGRATION.md).

## Minimum Viable Product

| Capability | Status | Scope / remaining gap |
| --- | --- | --- |
| Select an in-scope IT investment | **PARTIAL** | All returned real Sandbox projects can be selected/reviewed; no verified DPE production IT-investment classification/scope filter. |
| Retrieve lifecycle/WBS evidence | **DONE** | Real UUID navigation and honest empty/error states; separately qualified synthetic showcase milestones. No invented live milestone or automatic governance-gate assignment. |
| Retrieve available financial evidence | **DONE** | Live G/L joins and cautious returned non-commitment amounts by currency; not complete project cost. |
| Retrieve available procurement evidence | **PARTIAL** | Live PO connectivity, exact matching and zero/error handling work. Current tested samples have no project PO joins, so populated procurement amounts remain data-limited. |
| Assemble continuation-review evidence pack | **DONE** | Project context, lifecycle/G/L/PO snapshot summaries, reviewer assessment and timing/readiness are presented together, with raw/debug information secondary. |
| Capture non-SAP governance evidence | **DONE** | Human Review Trigger, six visible assessment choice groups, comments/dependencies and a selected prototype-directory owner. No automatic budget variance is invented. |
| Record human continuation decision | **DONE** | Exact five A2 outcomes, no preselection/recommendation; required rationale/owner and conditional action requirements enforced again on save. |
| Retain/show rationale, action/owner, next review | **DONE (prototype)** | Versioned browser-local records include actual timestamps/targets, assessment and concise evidence snapshots. No production database/audit/authentication. |
| Preserve AI/human decision boundary | **DONE for this baseline** | No AI or automated continuation decision exists. Future AI safeguards still require implementation/validation. |

Readiness is a deterministic completeness list, not a weighted score: context exists; lifecycle loaded; G/L and PO attempted; basis selected; each of the six categories has a value other than `Not assessed`; owner entered. Cost Position = `Insufficient information` is a completed reviewer assessment identifying an evidence gap, not an unassessed field. The Summary labels that finding as REVIEWER INPUT; it does not imply missing SAP data or recommend an outcome. Zero joins, failed requests or unavailable identifiers are distinguished explicitly. Attempted does not mean successful or adequate evidence; the human remains accountable for judgement. Pending evidence loads block progression/confirmation.

Review-open time is set once per cycle from the actual browser clock. The 14-day decision target and 30-day escalation threshold use UTC calendar days. Dashboard shows current review subsets and completed records through its Recorded Decisions lens. Thresholds are displayed controls, not external notifications. Stored Next Review dates are human checkpoints, never automatic cycle creation. Decisions never modify SAP processing status.

Review Trigger is captured before a new review is written, never inferred by Dashboard/SAP. Assessment captures six human judgements/owner/optional notes; Not assessed remains an internal incomplete sentinel, while Insufficient information is an assessed Evidence Gap. Summary contains one headline/matrix, timeline and compact Evidence Basis rather than repeating lists/cards. Source availability never implies sufficiency. Dashboard's current/history lenses, Portfolio derived states and complete immutable History remain. No scores/recommendations/charts or source-join changes; zero linked PO records never establish zero exposure.

## Showcase scope and presentation baseline

Five SHOWCASE investments appear first, with SAP SANDBOX projects appended automatically when a key exists. Local provider errors are not live SAP results; Sandbox outages do not remove showcase availability. Raw payloads are immutable, use only selected SAP-schema fields, and remain distinct from governance context and seed state. No data/config fetch is needed for showcase or owner choices. A static HTTP preview remains recommended for live CORS and consistent browser storage.

| Investment | Synthetic scenario / initial review state |
| --- | --- |
| Digital Ordering Platform Modernisation | Open Material trigger review; 3 material / 2 emerging; overdue on 15 Oct 2026 |
| Customer Loyalty & CRM Enhancement | Open scheduled stage-gate review; 4 emerging |
| Data & Analytics Platform Upgrade | Open scheduled stage-gate review; 1 emerging / 1 explicit cost evidence gap; forecast unvalidated |
| Store Technology Infrastructure Refresh | No review or seeded assessment; manual Start Review retains normal defaults |
| Legacy Reporting Consolidation | Synthetic historical Stop, 2 Sep 2026; 6 historical material findings; excluded from current attention |

Initial metrics derive 3 open / 3 material / 1 gap / 1 recorded decision; chart adds 7 emerging and 1 overdue **at the 15 October reference date**. Do not freeze the clock: more reviews may become overdue later. Explicit fixed seed dates are not actual user-created timestamps. Seeds preserve edits/completed decisions; confirmed Reset Showcase restores only showcase records. Reviewer judgements are editable while open; no current final decision is seeded or recommended.

Showcase-only Investment Context displays approved investment/explicit forecast and derived posted activity, forecast variance/remaining forecast investment, PO-linked activity and not-finally-invoiced amounts. These are not live SAP budgets/forecasts, total project costs or outstanding liabilities. Numerical facts never choose an assessment; this qualitative convention requires DPE governance/pilot calibration before production. See [API Integration](API_INTEGRATION.md) for exact totals and schema checks.

Decision Owner is selected once from immutable configuration in `js/services/governance-directory.js`, explicitly fictional PROTOTYPE GOVERNANCE DIRECTORY roles, not SAP/DPE personnel. Store ID/name/role and carry it forward read-only on Decision. Legacy completed text owners remain readable; open legacy reviews keep the text until explicitly selecting an eligible owner for a new decision. Action Owner stays free text. Visible native radio choices preserve every stored enum and Not assessed default; new decision cards start unselected. Required follow-up expands for conditional/Modify/Pause; other outcomes keep optional fields secondary. The selected History record presents the human outcome, owner/date/rationale/action/next review.

## Remaining MVP Limitations

- Public Sandbox data is not DPE production data. No marked milestones were present in the 26 tested elements; review basis is chosen by the human rather than inferred from SAP gates.
- No PO joins in current tested live projects. Synthetic showcase procurement is separate and never fills a live-project gap; unrelated diagnostics remain excluded.
- Limited returned pages (5 projects / up to 100 G/L or PO rows); no automatic pagination or complete-cost/remaining-liability assurance.
- LocalStorage is browser/origin-local, editable/clearable and not production-grade, multi-user, tamper-proof or backed up. The fictional controlled directory is not authenticated authority. Legacy records are preserved; storage failure never counts as a successful save.
- Saved SAP evidence summaries are explicitly snapshots; fresh API evidence is reloaded on demand. Raw payloads are not persisted.
- Product hierarchy builds on Jerry's UI; final visual refinement remains with UI/UX. No automatic material-trigger detection, outcome recommendations, external notifications/escalation or production gate/materiality policy. Attention projections are local decision support, not a new analytics/notification service.
- Responsibility Management has high semantic fit, but its public Sandbox/APIKey probe returned HTTP 500/unavailable. It is not an MVP dependency; the non-gating remote probe emits no member values.

## Stretch / Later

Purchase Requisition, MCP, AI Review Brief, richer shared persistence/audit, authenticated roles, useful advanced analytics, configured governance gates/triggers, and visual polish beyond the usable MVP. Not every later item must be implemented. This iteration intentionally resolves the earlier AI scope question by deferring AI in the decision log rather than silently changing the human accountability principle.

## Acceptance Principles

Functional end-to-end flow; traceability to A2; transparent SHOWCASE / SAP SANDBOX distinction and technical provenance; no fake live evidence; accountable human decision; defensive joins/currencies/empty states; unchanged live API interpretation; focused teammate PR/review work. See [CONTRIBUTING.md](../CONTRIBUTING.md) and [UI Contract](UI_CONTRACT.md).
