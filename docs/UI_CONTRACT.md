# Frontend UI Contract

This contract covers the playable workflow and retained SAP/debug areas. `js/ui/renderers.js` owns SAP views; `js/ui/governance.js` owns navigation/forms/source-labelled summaries. The checker retains original hooks plus seven product controls (101 required IDs). IDs must change with implementation/checks, not independently during visual refinement.

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
| Assessment | `assessment-view`, `assessment-form`, `review-basis`, `assessment-alignment`, `assessment-benefits`, `assessment-delivery`, `assessment-financial-evidence`, `assessment-cost`, `assessment-risk`, `assessment-value`, `assessment-comments`, `assessment-dependencies`, `assessment-owner`, `assessment-save-summary` | Review Trigger select, six radio fieldsets, directory-owner dropdown, reviewer text and local save/summary. |
| Summary | `summary-view`, `review-summary`, `back-assessment`, `proceed-decision` | Review evidence/assessment/control pack; decision progression only when READY and no request pending. |
| Decision | `decision-view`, `decision-form`, `decision-outcome`, `decision-rationale`, `decision-owner`, `decision-requirements`, `decision-action`, `decision-action-owner`, `decision-next-date`, `back-summary`, `confirm-decision` | No initial outcome selection; required human decision fields and conditional actions; store revalidates on confirmation. |
| Confirmation | `confirmation-view`, `confirmation-record`, `return-investment`, `back-dashboard` | Saved immutable prototype record/snapshots and return actions. |

Forms use input/change for local drafts and submit for progression/confirmation. The six assessment IDs and `decision-outcome` now identify native fieldsets, not selects. Generated radios keep original enum strings, a shared group name and unique `-choice-N` IDs. Preserve native keyboard/checked semantics, explicit Not assessed defaults, visible focus/selection and no preselected decision. Feedback attaches to groups rather than individual radios. Preserve novalidate, date input, source meanings and safe textContent rendering.

Added required IDs: `dashboard-attention` (open-review signals/timing), `review-trigger` (header callout), `governance-directory-status` (configuration/error/legacy notice), `decision-owner-help` (read-only provenance), `decision-follow-up` (details), `decision-follow-up-title` (required/optional summary), `confirmation-outcome` (prominent saved human outcome).

`assessment-owner` is a directory-ID select with an empty placeholder, not free text. A disabled legacy option preserves old text until explicit selection; never infer identity from names. `decision-owner` is read-only, not an independent owner source. Follow-up expands and is required for conditional/Modify/Pause only; optional fields remain available and are not erased when outcomes change. Action Owner stays text. Completed records remain immutable.

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
js/services/governance-directory.js
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

## Review workspace presentation (14 October 2026)

The visual contract is [DESIGN.md](../DESIGN.md). This UI revision retains all 94 original hooks and deferred scripts. Added hooks are `connection-details`, `detail-project-id`, `detail-project-name`, `assessment-save-status` and `decision-incomplete`. They are presentation-only; original services, rule/store functions and record schema remain authoritative.

Canonical UI owners:

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Choices / owner select | Native radios in governance.js; Trigger/owner selects in index.html | Existing enums / validated prototype directory | Visible cards, platform-owned select popup | Defaults / keyboard / requirements / owner carry-through |
| Date | Native date input / UI English formatter | Existing UTC date and rules contract | Browser/OS picker; en-NZ UTC display | UTC presentation test / date entry |
| Form | Rule/store validation and governance.js binding | review-rules.js / review-store.js | Assessment / decision | Missing readiness / conditional decision / retained input |
| Scrollbar | Global styles.css baseline | DESIGN.md / styles.css | Table horizontal overflow; raw-data bounded scroller | Narrow layout / keyboard scroll |
| Status | renderers.js / governance.js | Evidence snapshots and storage error state | Loading / zero / error / unavailable / success | Live evidence flow / presentation tests |
| CRUD | Existing governance.js navigation and controller callbacks | UI_CONTRACT.md / app.js / review-store.js | Local draft / immutable completed record; no delete | Back / resume / summary / persisted decision |


Tables retain all columns and the existing bounded API retrieval (5 projects; up to 100 G/L/PO rows). No search/pagination changes or persistence of selection in URLs are introduced. There is no selection/bulk grid. Responsive horizontal table overflow is keyboard focusable; ordinary forms continue to scroll with the document. Native controls, rather than authored popup implementations, are deliberate.

Zero matched records, unavailable identifiers, request errors, partial pages and unrequested evidence are separate UI states. Pending requests supersede saved success badges; existing readiness still checks attempts, not evidence sufficiency. The right rail presents the same existing missing-items list and UTC targets. No scoring/recommendations are added. Comments/dependencies are optional disclosures whose input persists through local drafts; textareas grow rather than permitting manual resizing. Touched fields show text errors with aria-invalid and aria-describedby using the existing missing-item/decision-error rules. Source/amount qualifications and raw technical tables remain available.

Local save feedback reflects visible storage errors. Normal navigation already attempts to save drafts and refuses navigation after a failed save; no new modal or unsaved-data workflow is introduced. Completed records remain immutable under the existing store. No app-owned destructive actions or authentication screens are introduced.
