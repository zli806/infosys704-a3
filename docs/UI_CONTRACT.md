# Frontend UI Contract

This contract covers the customer workflow and retained SAP diagnostics. `js/ui/renderers.js` owns evidence tables/status; `js/ui/governance.js` owns navigation/forms/summaries. The checker requires 117 IDs. Implementation, contract and checks must change together.

## Functional Hooks

| Area | ID | Role / expected element behaviour |
| --- | --- | --- |
| Projects | `load-projects` | Secondary live Refresh SAP Data; showcase renders/seeds immediately, then live projects auto-load with a key without leaving Dashboard. Failures keep showcase available. |
| Projects | `connection-status` | Connection status text. |
| Projects | `message` | Status text and `data-kind` styling. |
| Projects | `error-details` | Safe error body text; supports `hidden`. |
| Projects | `projects-body` | Table `tbody` for six-column business rows, local review status and View Investment actions. Raw status/company/currency remain in SAP context/diagnostics. |
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
| Shared review context | `review-chrome`, `current-review-project`, `review-steps`, `workflow-message`, `review-back-investment` | Step indicator, compact trigger/due date, submit-only missing-fields message and back navigation. No persistent control rail. |
| Assessment | `assessment-view`, `assessment-form`, `review-basis`, `assessment-alignment`, `assessment-benefits`, `assessment-delivery`, `assessment-financial-evidence`, `assessment-cost`, `assessment-risk`, `assessment-value`, `assessment-comments`, `assessment-dependencies`, `assessment-owner`, `assessment-save-summary` | Review Trigger select, six radio fieldsets, directory-owner dropdown, reviewer text and local save/summary. |
| Summary | `summary-view`, `review-summary`, `summary-decision-overview`, `back-assessment`, `proceed-decision` | Decision overview beside the single top-of-summary action; review evidence/assessment/control pack; decision progression only when READY and no request pending. |
| Decision | `decision-view`, `decision-form`, `decision-outcome`, `decision-rationale`, `decision-owner`, `decision-requirements`, `decision-action`, `decision-action-owner`, `decision-next-date`, `back-summary`, `confirm-decision` | No initial outcome selection; required human decision fields and conditional actions; store revalidates on confirmation. |
| Confirmation | `confirmation-view`, `confirmation-record`, `return-investment`, `back-dashboard` | Saved immutable prototype record/snapshots and return actions. |

Forms use input/change for local drafts and submit for progression/confirmation. The six assessment IDs and `decision-outcome` identify native fieldsets, not selects. Generated radios keep original enum strings, a shared group name and unique `-choice-N` IDs. Preserve native keyboard/checked semantics, explicit Not assessed defaults, visible focus/selection and no preselected decision. Shared alert messages appear after an incomplete submit and clear on editing. Preserve novalidate, date input, source meanings and safe textContent rendering.

Added required IDs: `dashboard-attention` (open-review signals/timing), `review-trigger` (header callout), `governance-directory-status` (configuration/error/legacy notice), `decision-owner-help` (read-only provenance), `decision-follow-up` (details), `decision-follow-up-title` (required/optional summary), `confirmation-outcome` (prominent saved human outcome).

`assessment-owner` is a directory-ID select with an empty placeholder, populated synchronously from deferred JS configuration (no JSON fetch). A disabled legacy option preserves old text until explicit selection; never infer identity from names. `decision-owner` is a display-only accountability div, not an input or independent owner source. Follow-up expands and is required for conditional/Modify/Pause only; optional fields remain available and are not erased when outcomes change. Action Owner stays text. Completed records remain immutable.

Customer simplification hooks: `attention-profile` renders labelled horizontal bars from open-review signals/timing only, or a truthful empty/unavailable message. `project-refresh-error`, `retry-projects`, `project-diagnostics` provide one concise refresh failure and explicit retry/details. `investment-technical-details` is the single, initially collapsed Investment Details disclosure; all raw/error/table/filter diagnostics and `technical-evidence-context` provenance live inside. `decision-incomplete` shows validation errors only on a recording attempt. Removed hooks: `review-timing`, `readiness-status`, `readiness-missing`; timing is rendered within Summary instead.

Showcase hooks: `detail-source` displays SHOWCASE / SAP SANDBOX; each investment/review also has a small source badge without extending raw records. `showcase-investment-context` is visible only for registered showcase projects and renders computed activity/variance plus explicit scenario context; no forecast/budget metrics are invented for live projects. `technical-source` qualifies the provider; `showcase-project-payload` / `raw-showcase-project` expose the synthetic V2 project payload. The live `connection-details` section is normally hidden for that selection, except a failed live refresh remains inspectable under its explicit separate-live-connection heading. Element/G/L/PO raw hooks contain the selected provider's correctly wrapped payloads. `reset-showcase` is a footer-only prototype action, requiring native confirmation and preserving unrelated local records/configuration/live project list.

Review basis displays canonical Material trigger / Scheduled stage-gate review, read-through-normalising legacy wording. Trigger is not an assessment concern. Matrix labels are Normal / no concern identified, Emerging Concern, Material Concern, Evidence Gap and Not assessed; the central qualitative map owns semantics. Internal `attentionItems` remains compatible but no customer text says Attention Items. Not assessed is never a gap. The historical synthetic Stop uses normal stored-record confirmation and is labelled as history; no current decision is preselected. Dates are real clock based; fixed showcase seeds are explicitly synthetic historical dates.

Selecting an investment starts structure retrieval, then financial/procurement calls using existing identifier rules. Card retry controls retain their historical IDs but are secondary and hidden on success. `load-review-evidence` is now Refresh Evidence, not a required happy-path task. Summary contains the six-signal matrix, grouped management attention, timeline, three evidence rows and a link to the consolidated details; no repeated raw tables. Native form semantics and the store's final validation remain authoritative.

Final handover UX: all review entry points resume an incomplete active review at Assessment and a ready one at Summary, never directly at Decision; recorded decisions open Confirmation. Investment CTA is Start Review / Continue Assessment / Review Summary & Decide / View Decision. `proceed-decision` is the primary Make Governance Decision action. `decision-context-title` / `decision-context-counts` summarise current reviewSignals without selecting any outcome; `decision-rationale-help` is non-blocking material-concern guidance, not a validation rule.

Dashboard explanations: each native Why is this flagged? details starts collapsed and lists dimension/value findings from `signalBreakdown()` over the unchanged assessment map; timing-only flags explain timing without inventing concerns. Native chart buttons control `attention-breakdown` with aria-expanded/aria-controls, show one inline category at a time, and disable empty categories. Counts distinguish assessment signals from affected open reviews; overdue counts reviews. Closing returns focus to the category; refresh reconciles content and clears stale/now-empty selections. `signals-help` is the collapsed How signals work disclosure. No new route, persisted filter, pre-assessment classification hints, score or recommendation is introduced.

## Script Contract

All runtime scripts are **normal deferred scripts**, not ES modules and not async. The deterministic order is:

```text
config.local.js
api-config.js
js/data/showcase-portfolio.js
js/core/state.js
js/core/utils.js
js/core/review-rules.js
js/services/sap-http.js
js/services/project-service.js
js/services/gl-service.js
js/services/po-service.js
js/services/governance-directory.js
js/services/showcase-service.js
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

**Frontend Static Checks** runs on PRs and master pushes plus manual dispatch, without SAP credentials or API calls, including all Node regression/fixture tests. Static and in-memory checks cannot prove visual accessibility, browser CORS or real API correctness; browser/live checks remain necessary. Test assessment → summary → decision → persisted confirmation, missing readiness, each outcome's requirements, storage failures, switching, empty SAP joins, non-overwriting seeds and confirmed showcase-only reset. Future UI changes may intentionally revise the contract, but implementation/docs/checks must move together.

## Review workspace presentation (14 October 2026)

The visual contract is [DESIGN.md](../DESIGN.md). Deferred scripts and SAP diagnostic hooks remain; the current required-ID manifest is in the checker. `connection-details`, `detail-project-id`, `detail-project-name` and `assessment-save-status` are supplementary presentation hooks. SAP services, rule/store functions and record schema remain authoritative.

Canonical UI owners:

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Select/Listbox | Native radios in governance.js; Trigger/owner selects in index.html | Existing enums / validated prototype directory | Visible cards, platform-owned select popup | Defaults / keyboard / requirements / owner carry-through |
| Date | Native date input / UI English formatter | Existing UTC date and rules contract | Browser/OS picker; en-NZ UTC display | UTC presentation test / date entry |
| Form | Rule/store validation and governance.js binding | review-rules.js / review-store.js | Assessment / decision | Missing readiness / conditional decision / retained input |
| Scrollbar | Global styles.css baseline | DESIGN.md / styles.css | Table horizontal overflow; raw-data bounded scroller | Narrow layout / keyboard scroll |
| Status | renderers.js / governance.js | Evidence snapshots and storage error state | Loading / zero / error / unavailable / success | Live evidence flow / presentation tests |
| CRUD | Existing governance.js navigation and controller callbacks | UI_CONTRACT.md / app.js / review-store.js | Local draft / immutable completed record; confirmed showcase-only reset | Back / resume / summary / persisted decision / unrelated-record preservation |


Technical evidence tables retain all columns and the existing bounded API retrieval (5 projects; up to 100 G/L/PO rows). The primary Investments table is reduced to project, description, dates, review status and action. No search/pagination changes or persistence of selection in URLs are introduced. There is no selection/bulk grid. Responsive horizontal table overflow is keyboard focusable; ordinary forms continue to scroll with the document. Native controls, rather than authored popup implementations, are deliberate.

Zero matches/partial results are Limited evidence; errors, unavailable/unrequested and loading retain truthful states and explanatory copy. Pending requests supersede saved success badges; readiness still checks attempts, not evidence sufficiency. No scoring/recommendations are added. Comments/dependencies are optional disclosures whose input persists through local drafts; textareas grow. A concise submit-time message replaces permanent readiness/touched-field lists. Source/amount qualifications and raw technical tables remain available in the consolidated disclosure.

Local save feedback reflects visible storage errors. Normal navigation attempts to save drafts and refuses navigation after a failed save. Completed records remain immutable under normal store APIs. The only reset is the explicitly confirmed showcase-scoped prototype action; malformed storage is never silently repaired/erased. No authentication or unsaved-data modal workflow is introduced.

## Final UI refinement (15 October 2026)

Dashboard places Needs Attention first in both DOM and visual order, with the existing count chart secondary. Existing categories, deadlines, disclosures and handlers retain their meaning. Chips use text plus shared semantic surfaces; timing urgency stays separate from assessment concerns.

`summary-decision-overview` is presentation only: current concern/gap counts, decision target/status and the selected owner. It refreshes from the current record whenever Summary renders. The original `proceed-decision` button is moved beside this overview, not duplicated; its controller callback and readiness/owner/pending-request guard remain unchanged. Trigger context remains above; the duplicate trigger-header date is visually omitted on Summary because the same target appears in the overview. The six-dimension matrix uses three desktop columns, two at intermediate narrow widths and one on small phones. Management Attention, the full timeline and qualified evidence remain in the page below.

Showcase context groups approved investment, explicit forecast and calculated variance as primary figures, followed by dates and smaller posted/remaining/procurement figures. The same provider values and qualifications are used; unknown forecasts remain Not validated, negative variance is not reclassified, historical Stop figures keep their pre-Stop labels, and no context figures are added to live SAP projects.

Decision Record uses a small green saved acknowledgement with a neutral outcome heading, so a successful save does not make Modify/Pause/Stop appear to be a positive investment recommendation. Document scrolling, native fields, source badges, raw diagnostics and local record boundaries remain authoritative.

Validation for this refinement: 55 credential-free Node tests, the 117-ID script/HTML contract and application JavaScript syntax pass. Official DESIGN.md lint reports zero errors/warnings. Browser checks on an exact credential-free source copy covered the initial portfolio, a complete keyboard-selected Modify with required follow-up and persistence after reload, rejected empty decision submission, incomplete new review, owner changes carried into Summary, and the Data & Analytics evidence-gap case. At 1280×800 the single Summary action was visible at y357–401; 800px and 390px detail/Summary layouts had no page overflow. A browser-only UI fixture confirmed red overdue-gap / grey current-gap / red current-material borders after a specificity fix. No real SAP requests were run for these presentation changes; this is not a formal cross-browser or WCAG certification. Reset Showcase retains its existing native confirmation and is covered by the controller/store tests, not newly certified through this preview tool.

The supplemental premium strict scanner is not green: 20 literal-button findings do not resolve the existing external event bindings, and four textarea findings do not resolve the shared `textarea { resize:none; }` rule. These remain explicitly reported static limitations; the workflow checks above do not claim every control or accessibility case was independently exercised. The canonical-map naming mismatch was corrected in documentation without changing native control ownership.
