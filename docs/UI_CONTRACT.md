# Frontend UI Contract

This contract covers the playable desktop workflow and retained SAP/debug areas. `js/ui/renderers.js` owns SAP views; `js/ui/governance.js` owns navigation, local-review forms and source-labelled summaries. The structural checker lists 94 required IDs, all present in index.html. IDs must change together with implementation/checks, not independently during visual refinement.

## Functional Hooks

| Area | ID | Role / expected element behaviour |
| --- | --- | --- |
| Projects | `load-projects` | Button: click loads projects; supports disabled/loading state. |
| Projects | `connection-status` | Connection status text. |
| Projects | `message` | Status text and `data-kind` styling. |
| Projects | `error-details` | Safe error body text; supports `hidden`. |
| Projects | `projects-body` | Table `tbody` for nine-column rows, local review status and View Investment actions. |
| Projects | `raw-response` | Raw project-list JSON/text output. |
| Elements | `elements-panel` | Selected-project/elements section; supports `hidden`. |
| Elements | `selected-project` | Selected-project summary text. |
| Elements | `elements-message` | Element status text and `data-kind`. |
| Elements | `elements-error` | Safe element error body; supports `hidden`. |
| Elements | `elements-body` | Table `tbody` for ten-column element rows. |
| Elements | `raw-elements-response` | Separate raw element JSON/text output. |
| G/L | `gl-panel` | Financial evidence section; supports `hidden`. |
| G/L | `load-financial-evidence` | Button: click requests G/L evidence; disabled until elements load. |
| G/L | `gl-project` | Current project label. |
| G/L | `gl-message` | G/L progress/result/error text and `data-kind`. |
| G/L | `gl-error` | Safe G/L error body; supports `hidden`. |
| G/L | `gl-summary` | Container for per-currency summary paragraphs. |
| G/L | `gl-body` | Table `tbody` for twelve-column posting rows. |
| G/L | `raw-gl-response` | Linked queries and filter-integrity debug text. |
| G/L | `gl-diagnostic` | Separate unlinked diagnostic details; supports `hidden`. |
| G/L | `raw-gl-diagnostic` | Unlinked diagnostic JSON/text, never project evidence. |
| PO | `po-panel` | Procurement evidence section; supports `hidden`. |
| PO | `load-po-evidence` | Button: click requests PO evidence; disabled until real WBS IDs load. |
| PO | `po-project` | Current project label. |
| PO | `po-message` | PO progress/result/error text and `data-kind`. |
| PO | `po-error` | Safe PO error body; supports `hidden`. |
| PO | `po-summary` | Container for per-currency procurement summary paragraphs. |
| PO | `po-body` | Table `tbody` for eleven-column account-assignment rows. |
| PO | `raw-po-response` | PO JSON and filter-integrity debug text. |

Renderer-created row buttons call the controller's selection callback; they are not separate static HTML IDs. Keep the raw/error output areas as text-compatible elements, typically `pre`, and retain accessible status semantics. Summary containers must allow child paragraphs. Do not leave table headers inconsistent with rendered/empty-row column counts.

## Governance / Navigation Hooks

All of these are functional IDs (in addition to the SAP hooks above):

| Area | IDs | Role |
| --- | --- | --- |
| Shell/navigation | `nav-dashboard`, `nav-investments`, `nav-reviews`, `page-title`, `storage-notice` | Desktop navigation/title, visible storage error; title supports focus. |
| Dashboard | `dashboard-view`, `dashboard-cards`, `dashboard-view-investments`, `dashboard-open-reviews`, `dashboard-decisions` | Real/system counts and local review/decision actions, never fabricated portfolio metrics. |
| Investment details | `investments-view`, `detail-view`, `investment-context`, `detail-review-status`, `start-review`, `view-last-decision`, `detail-lifecycle-overview`, `reload-lifecycle`, `load-review-evidence`, `detail-financial-overview`, `detail-procurement-overview` | Source-labelled context, evidence loads and start/continue/view decision actions. |
| Reviews | `reviews-view`, `reviews-body` | Local-record list with six-column rows and resume/view actions. |
| Shared review controls | `review-chrome`, `current-review-project`, `review-steps`, `review-timing`, `readiness-status`, `readiness-missing`, `workflow-message`, `review-back-investment` | Step indicator, UTC controls, completeness list, errors/back navigation. |
| Assessment | `assessment-view`, `assessment-form`, `review-basis`, `assessment-alignment`, `assessment-benefits`, `assessment-delivery`, `assessment-financial-evidence`, `assessment-cost`, `assessment-risk`, `assessment-value`, `assessment-comments`, `assessment-dependencies`, `assessment-owner`, `assessment-save-summary` | Six select fields, human text/owner, actual captured G/L evidence first, local autosave/summary. |
| Summary | `summary-view`, `review-summary`, `back-assessment`, `proceed-decision` | Review evidence/assessment/control pack; decision progression only when READY and no request pending. |
| Decision | `decision-view`, `decision-form`, `decision-outcome`, `decision-rationale`, `decision-owner`, `decision-requirements`, `decision-action`, `decision-action-owner`, `decision-next-date`, `back-summary`, `confirm-decision` | No initial outcome selection; required human decision fields and conditional actions; store revalidates on confirmation. |
| Confirmation | `confirmation-view`, `confirmation-record`, `return-investment`, `back-dashboard` | Saved immutable prototype record/snapshots and return actions. |

Forms use input/change events for local draft saves and submit events for progression/confirmation. Preserve `novalidate` plus deterministic rule validation, source labels, type=date for next review, the assessment comments/dependencies text areas and six assessment selectors. Changing display text must not change enum values or data meaning. The owner appears in assessment because it is a readiness prerequisite, then is carried into Decision. No form edits may modify a completed record or project status. Use textContent rendering for untrusted input, never raw innerHTML.

## Script Contract

All runtime scripts are **normal deferred scripts**, not ES modules and not async. The deterministic order is:

```text
config.local.js
api-config.js
js/core/state.js
js/core/utils.js
js/core/review-rules.js
js/services/sap-http.js
js/services/project-service.js
js/services/gl-service.js
js/services/po-service.js
js/services/review-store.js
js/ui/renderers.js
js/ui/governance.js
app.js
```

The local credential script is referenced first but is ignored/untracked and need not exist in CI. The checker never opens it. Runtime modules expose `window.DPEApp` (`state`, `utils`, `reviewRules`, `http`, `services`, `ui`, `governanceUI`), alongside the existing configuration objects. The review store is `DPEApp.services.reviewStore`. Services do not access the DOM; renderers do not fetch SAP data or contain credentials/endpoints. `app.js` coordinates state, service results and UI/event binding.

## Safe UI Changes

- Functional IDs must not be renamed/removed without updating JavaScript, this contract and checks in the **same PR**. Duplicate IDs are prohibited.
- CSS classes/layout can generally change more freely, but update renderer-created classes and relevant styling together (selected project, milestone/main-milestone rows, empty rows and status `data-kind`). Preserve their meaning/accessibility, not necessarily their current appearance.
- Text can be refined without changing data/business meaning. Do not cosmetically relabel partial G/L amounts as complete project cost, PO amounts as exact outstanding liability, or a SAP milestone as an automatically configured DPE continuation gate.
- UI PRs must exercise loading, project switching/reloading, zero results, technical errors, raw/debug views and filter-integrity warnings. Old project evidence must not remain visible after selection changes; stale responses must not overwrite the new selection.
- No fake evidence may replace an empty sample. Keep unrelated diagnostic records clearly separate from project evidence and amounts. Never share screenshots containing request keys.

## Automated Check and Its Limits

Run `python scripts/check_frontend_contract.py`. It checks unique/nonempty IDs, the required hooks, referenced file existence (except the local credential), the exact deferred script list/order, config before runtime logic, and app.js last. Duplicate ID/script attributes and self-closing script tags are rejected to avoid ambiguity between the checker and browser. It reads HTML, not credentials, and does not semantically parse JavaScript.

**Frontend Static Checks** runs on PRs and master pushes plus manual dispatch, without SAP credentials or API calls. Structural checks cannot prove visual accessibility, browser CORS, event behaviour or API correctness; manual/core regression checks remain necessary. Test the complete assessment → summary → decision → persisted confirmation, missing readiness, each outcome's requirements, storage failures, switching and empty SAP joins. Future UI changes may intentionally revise the contract, but implementation/docs/checks must move together.
