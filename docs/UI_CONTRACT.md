# Frontend UI Contract

This contract covers the customer workflow and retained SAP diagnostics. `js/ui/renderers.js` owns evidence tables/status; `js/ui/governance.js` owns navigation/forms/summaries. The checker requires 119 IDs. Implementation, contract and checks must change together.

## Functional Hooks

| Area | ID | Role / expected element behaviour |
| --- | --- | --- |
| Projects | `load-projects` | Secondary live Refresh SAP Projects on Portfolio only; showcase renders/seeds immediately, then live projects auto-load with a key without leaving Dashboard. Failures keep showcase available. |
| Projects | `connection-status` | Connection status text. |
| Projects | `message` | Status text and `data-kind` styling. |
| Projects | `error-details` | Safe error body text; supports `hidden`. |
| Projects | `projects-body` | Five-column Portfolio: Investment (name, ID, source), Governance State, Latest Decision, Next Review, Next Step. Dates/metadata remain in Investment Detail, not primary list columns. |
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
| Shell/navigation | `nav-dashboard`, `nav-investments`, `page-title`, `storage-notice` | Only Dashboard / Portfolio. Title supports focus; aria-current marks Portfolio for investment/review process and Dashboard for decision records. No third destination. |
| Dashboard | `dashboard-view`, `dashboard-portfolio-count`, `page-eyebrow`, `dashboard-cards`, `decision-queue-title`, `dashboard-filter-count`, `dashboard-columns`, `dashboard-attention` | Portfolio Governance header/current loaded investment count, five native metric buttons and one shared dynamic list. Current attention and recorded decisions use different headings/fields in the same grid. The shared eyebrow remains hidden on Dashboard. |
| Investment details | `investments-view`, `detail-view`, `investment-context`, `detail-review-status`, `start-review`, `view-last-decision`, `detail-lifecycle-overview`, `reload-lifecycle`, `load-review-evidence`, `detail-financial-overview`, `detail-procurement-overview` | Source-labelled context, evidence loads and start/continue/view decision actions. |
| Investment review history | `investment-history-title`, `investment-history-body` | Secondary completed-review history for the selected ProjectUUID, newest decision first; six columns omit repeated investment identity. Active reviews are never duplicated here. Truthful empty/unavailable states. |
| Shared review context | `review-chrome`, `current-review-project`, `review-steps`, `workflow-message`, `review-back-investment` | Step indicator, compact trigger/due date, submit-only missing-fields message and back navigation. No persistent control rail. |
| Assessment | `assessment-view`, `assessment-form`, `review-basis`, `assessment-alignment`, `assessment-benefits`, `assessment-delivery`, `assessment-financial-evidence`, `assessment-cost`, `assessment-risk`, `assessment-value`, `assessment-comments`, `assessment-dependencies`, `assessment-owner`, `assessment-save-summary` | Review Trigger select, six radio fieldsets, directory-owner dropdown, reviewer text and local save/summary. |
| Summary | `summary-view`, `review-summary`, `summary-decision-overview`, `back-assessment`, `proceed-decision` | Decision overview beside the single top-of-summary action; review evidence/assessment/control pack; decision progression only when READY and no request pending. |
| Decision | `decision-view`, `decision-form`, `decision-outcome`, `decision-rationale`, `decision-owner`, `decision-requirements`, `decision-action`, `decision-action-owner`, `decision-next-date`, `back-summary`, `confirm-decision` | No initial outcome selection; required human decision fields and conditional actions; store revalidates on confirmation. |
| Confirmation | `confirmation-view`, `confirmation-record`, `return-investment`, `back-dashboard` | Saved immutable prototype record/snapshots and return actions. |

Forms use input/change for local drafts and submit for progression/confirmation. The six assessment IDs and `decision-outcome` identify native fieldsets, not selects. Generated radios keep original enum strings, a shared group name and unique `-choice-N` IDs. Preserve native keyboard/checked semantics, explicit Not assessed defaults, visible focus/selection and no preselected decision. Shared alert messages appear after an incomplete submit and clear on editing. Preserve novalidate, date input, source meanings and safe textContent rendering.

Other required controls include `review-trigger` (header callout), `governance-directory-status` (configuration/error/legacy notice), `decision-owner-help` (read-only provenance), `decision-follow-up` (details), `decision-follow-up-title` (required/optional summary), `confirmation-outcome` (prominent saved human outcome).

`assessment-owner` is a directory-ID select with an empty placeholder, populated synchronously from deferred JS configuration (no JSON fetch). A disabled legacy option preserves old text until explicit selection; never infer identity from names. `decision-owner` is a display-only accountability div, not an input or independent owner source. Follow-up expands and is required for conditional/Modify/Pause only; optional fields remain available and are not erased when outcomes change. Action Owner stays text. Completed records remain immutable.

Customer simplification hooks: `project-refresh-error`, `retry-projects`, `project-diagnostics` provide one concise refresh failure and explicit retry/details. `investment-technical-details` is the single, initially collapsed Investment Details disclosure; all raw/error/table/filter diagnostics and `technical-evidence-context` provenance live inside. `decision-incomplete` shows validation errors only on a recording attempt. Earlier removed hooks: `review-timing`, `readiness-status`, `readiness-missing`; timing is rendered within Summary instead.

Showcase hooks: `detail-source` displays SHOWCASE / SAP SANDBOX; each investment/review also has a small source badge without extending raw records. `showcase-investment-context` is visible only for registered showcase projects and renders computed activity/variance plus explicit scenario context; no forecast/budget metrics are invented for live projects. `technical-source` qualifies the provider; `showcase-project-payload` / `raw-showcase-project` expose the synthetic V2 project payload. The live `connection-details` section is normally hidden for that selection, except a failed live refresh remains inspectable under its explicit separate-live-connection heading. Element/G/L/PO raw hooks contain the selected provider's correctly wrapped payloads. `reset-showcase` is a footer-only prototype action, requiring native confirmation and preserving unrelated local records/configuration/live project list.

Review basis displays canonical Material trigger / Scheduled stage-gate review, read-through-normalising legacy wording. Trigger is not an assessment concern. Matrix labels are Normal / no concern identified, Emerging Concern, Material Concern, Evidence Gap and Not assessed; the central qualitative map owns semantics. Internal `attentionItems` remains compatible but no customer text says Attention Items. Not assessed is never a gap. The historical synthetic Stop uses normal stored-record confirmation and is labelled as history; no current decision is preselected. Dates are real clock based; fixed showcase seeds are explicitly synthetic historical dates.

View Investment starts structure retrieval, then financial/procurement calls using existing identifier rules. Active Portfolio next steps resume the review directly; Back to Investment opens evidence/context. Card retry controls retain their historical IDs but are secondary and hidden on success. `load-review-evidence` is Refresh Evidence, not a required happy-path task. Summary contains the six-signal matrix, grouped management attention, timeline, three evidence rows and a link to the consolidated details; no repeated raw tables. Native form semantics and the store's final validation remain authoritative.

All review entry points resume an incomplete active review at Assessment and a ready one at Summary using the shared Continue Assessment / Review & Decide labels, never directly at Decision; recorded decisions open Confirmation. `proceed-decision` remains Make Governance Decision. `decision-context-title` / `decision-context-counts` summarise current reviewSignals without selecting any outcome; `decision-rationale-help` is non-blocking material-concern guidance, not a validation rule.

### Investment → review → immutable decision

An investment can have 0..N reviews, with one active at most. `portfolioState()` derives presentation only from the active review/readiness and latest completed decision; there is no persisted project-governance-status field. Latest/history/Recorded Decisions order is descending decision timestamp with record-ID tie break, not review-open date. Source badges and stored owner/date/snapshot meanings are unchanged.

| Current context | Governance State | Portfolio Next Step | Investment Detail primary action |
| --- | --- | --- | --- |
| Active, incomplete | Assessment in progress | Continue Assessment | Continue Assessment |
| Active, ready | Ready for decision | Review & Decide | Review & Decide |
| No active, no decision | Monitoring | View Investment | Start Review |
| No active, Continue | Monitoring | View Investment | Start New Review |
| No active, Continue with Conditions / Modify | Follow-up | View Investment | Start New Review |
| No active, Pause | Paused | View Investment | Start New Review |
| No active, Stop | Stopped | View Decision | View Decision only |

Latest Decision is stored outcome/date or —; Next Review uses only the latest decision's stored nextReviewDate or — (always — for Portfolio Stop). An active cycle takes precedence for current state/next step without hiding latest historical context. After non-Stop completion, Detail offers secondary View Latest Decision beside Start New Review. History/Recorded Decisions actions use exact review IDs, never infer a record from investment alone, and work with historical project snapshots absent from the loaded portfolio. Storage unavailable reports unknown governance/history and disables starting instead of claiming Monitoring or zero decisions.

New cycles use existing `store.start()` to allocate a new ID/opened time/default assessment, retaining all prior decision snapshots; an existing active cycle is reused. Store update/confirm reject completed reviews. Stop has no normal new-review UI, plus a controller guard against a hidden/stale Start handler; this is not a new store schema or restart-approval workflow. A Next Review date never auto-creates a cycle. No background governance automation is introduced.

Consolidated product validation: 91 Node tests, 119 required hooks and runtime syntax/static checks pass. Native Edge exercised all five lenses, Modify → record → Recorded Decisions, ordinary-nav/reload defaults, historical callbacks, new review cycles, Stop protection and 320–1440px layouts without console errors. Desktop/laptop/mobile screenshots were inspected. This is not formal cross-browser/screen-reader certification; browser QA used isolated existing showcase data, not new evidence or live SAP validation.

Dashboard governance navigation: `dashboard-cards` is one labelled native-button group, not a second tab bar. Generated `dashboard-filter-active/overdue/material/gap/recorded` buttons use one true aria-pressed state and aria-controls for `dashboard-attention`. Tab/Enter/Space provide native keyboard access; colour, label weight, selected surface and bottom rule identify selection. Recorded Decisions uses muted neutral violet, never success green. Five desktop columns wrap cleanly at ≤1100px to three and ≤700px to two, with the fifth full width on phones. Number/label scale is retained. Zero-match buttons stay selectable; unavailable storage disables unknown counts instead of inventing zero.

Counts and rows are derived from the same sorted subsets: Active Reviews = every open review; Overdue = open reviews with existing overdue/escalation status; Material Concerns / Evidence Gaps = distinct matching investment identities with ≥1 corresponding assessment signal. Distinctness uses exact ProjectUUID, then project code, then review ID; if a caller supplies duplicate investment references, the first executive-ordered matching record is retained. Multiple signals still count as one investment in the metric, but remain detailed chips in its row. Current storage already enforces one active review per project. No source transaction or rule is changed.

Recorded Decisions = every `status === "decision_recorded"` record, without investment deduplication or a recent-record cap. Three completed cycles for one investment count as three decisions and render three rows. An active later cycle for the same investment may simultaneously appear in current-review lenses. Completed rows show only investment identity/source, stored trigger, neutral human outcome, formatted decision.timestamp and View Decision; rationale/actions/evidence remain inside the immutable record.

One list updates in place without changing route. `decision-queue-title` changes to the selected lens; `dashboard-filter-count` reports reviews/investments/decisions in a polite atomic live region. `dashboard-columns` switches Findings / Decision Timing to Decision / Decision Date only for Recorded Decisions; the list's labelledby links it to the updated heading and `data-mode` distinguishes current/recorded presentation. Current subsets retain escalation → overdue → within-window, then decision target, project code, record ID; recorded records use descending decision.timestamp then record ID. No priority score. Normal resumeLabel/onOpen behaviour remains.

Initial load, ordinary navigation and every Dashboard nav click default to Active Reviews, even if already on Dashboard. Only Back to Dashboard from the current freshly recorded Confirmation selects Recorded Decisions once; the controller consumes a transient fresh-record ID and never persists it. Visiting another page, returning to Investment or opening a historical record clears that context. Periodic render/help interactions preserve selection/focus; reload defaults active. There is no Decisions route or second completed-decision list.

Dashboard visual refinement: repeated Why is this flagged? controls and their presentation helpers are removed. The queue is action-only; project-specific findings remain in the unchanged Review Summary. `signalBreakdown()` and other business helpers remain available, not deleted. `queue-help` / `queue-help-trigger` expose `signals-help` as the sole Dashboard explanation. Hover or focus reveals the preserved definitions; moving into the tooltip keeps it open, Escape dismisses it, click supports touch/toggling, and leaving Dashboard closes it. The labelled native button has aria-describedby/aria-expanded and visible focus. No classification hints are added to assessment inputs.

Presentation metadata (`pulse-metric` kind/active and row urgent flags) only styles existing counts/timing. It does not calculate severity or recommendations. Actions share blue `queue-action-button` styling and white row surfaces; only current urgent rows retain a thin semantic rule/timing marker. Readable 13.5px semibold headings share the exact queue-grid. At ≤1100px desktop headings hide and matching per-field labels appear in either mode. The same ? help explains overlapping current lenses and completed outcomes across historical cycles, in addition to the taxonomy/timing/calibration guidance. Neutral outcomes never imply good/bad judgement. Brand/logo styling and assets remain unchanged.

Obsolete chart, separate review-list and recent-decision hooks/renderers/styles are removed from the DOM, contract and runtime. The redundant third-navigation button/page/rendering path is removed, not merely hidden. Reusable `completedReviews()`, exact review-ID callbacks, confirmation rendering and investment Review History remain authoritative. No charts, duplicated history list or extra Dashboard module is added.

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


Technical evidence tables retain all columns and the existing bounded API retrieval (5 projects; up to 100 G/L/PO rows). Portfolio/Review History use their approved semantic tables, thin rules and neutral chips; Dashboard uses one shared list grid in both modes. Narrow layouts stack with matching field labels rather than overflowing. No search/pagination or URL-selection persistence is introduced. Technical table overflow remains keyboard focusable; ordinary forms scroll with the document. Native controls are deliberate.

Zero matches/partial results are Limited evidence; errors, unavailable/unrequested and loading retain truthful states and explanatory copy. Pending requests supersede saved success badges; readiness still checks attempts, not evidence sufficiency. No scoring/recommendations are added. Comments/dependencies are optional disclosures whose input persists through local drafts; textareas grow. A concise submit-time message replaces permanent readiness/touched-field lists. Source/amount qualifications and raw technical tables remain available in the consolidated disclosure.

Local save feedback reflects visible storage errors. Normal navigation attempts to save drafts and refuses navigation after a failed save. Completed records remain immutable under normal store APIs. The only reset is the explicitly confirmed showcase-scoped prototype action; malformed storage is never silently repaired/erased. No authentication or unsaved-data modal workflow is introduced.

## Final UI refinement (15 October 2026)

Historical note: the former Needs Attention/chart composition has been superseded by the approved governance-lens Dashboard above. Categories/deadlines remain unchanged; timing urgency stays separate from assessment concerns.

`summary-decision-overview` is presentation only: current concern/gap counts, decision target/status and the selected owner. It refreshes from the current record whenever Summary renders. The original `proceed-decision` button is moved beside this overview, not duplicated; its controller callback and readiness/owner/pending-request guard remain unchanged. Trigger context remains above; the duplicate trigger-header date is visually omitted on Summary because the same target appears in the overview. The six-dimension matrix uses three desktop columns, two at intermediate narrow widths and one on small phones. Management Attention, the full timeline and qualified evidence remain in the page below.

Showcase context groups approved investment, explicit forecast and calculated variance as primary figures, followed by dates and smaller posted/remaining/procurement figures. The same provider values and qualifications are used; unknown forecasts remain Not validated, negative variance is not reclassified, historical Stop figures keep their pre-Stop labels, and no context figures are added to live SAP projects.

Decision Record uses a small green saved acknowledgement with a neutral outcome heading, so a successful save does not make Modify/Pause/Stop appear to be a positive investment recommendation. Document scrolling, native fields, source badges, raw diagnostics and local record boundaries remain authoritative.

Validation for this refinement: 55 credential-free Node tests, the 117-ID script/HTML contract and application JavaScript syntax pass. Official DESIGN.md lint reports zero errors/warnings. Browser checks on an exact credential-free source copy covered the initial portfolio, a complete keyboard-selected Modify with required follow-up and persistence after reload, rejected empty decision submission, incomplete new review, owner changes carried into Summary, and the Data & Analytics evidence-gap case. At 1280×800 the single Summary action was visible at y357–401; 800px and 390px detail/Summary layouts had no page overflow. A browser-only UI fixture confirmed red overdue-gap / grey current-gap / red current-material borders after a specificity fix. No real SAP requests were run for these presentation changes; this is not a formal cross-browser or WCAG certification. Reset Showcase retains its existing native confirmation and is covered by the controller/store tests, not newly certified through this preview tool.

The supplemental premium strict scanner is not green: 20 literal-button findings do not resolve the existing external event bindings, and four textarea findings do not resolve the shared `textarea { resize:none; }` rule. These remain explicitly reported static limitations; the workflow checks above do not claim every control or accessibility case was independently exercised. The canonical-map naming mismatch was corrected in documentation without changing native control ownership.


## Team feedback refinement — 16 October 2026

Harneet’s BA/PO and Dhruv’s first-time-user feedback is addressed without changing the workflow or decision rules:

- Before a decision is selected, Follow-up action explains the conditional requirements without calling them optional. Selecting Continue with Conditions, Modify or Pause expands the existing fields and marks all three required; Continue/Stop remain optional. Switching outcomes preserves the draft.
- `decision-next-date-help` is an associated calendar/input hint that displays the selected date in the shared English format. The native date picker remains browser/OS-owned; no custom calendar, default date or new date restriction is introduced.
- The confirmation’s Next Review uses `app.ui.formatDate()`, as do governance date-only displays. Saved and exported ISO values are unchanged, and event timestamps retain explicit UTC times.
- Refresh SAP Projects is available only on Investments, with its existing request/busy/error behavior. It refreshes live SAP projects; the showcase presentation path has no global refresh action. Automatic configured-key loading and retry remain unchanged.
- Financial activity still does not imply complete project expenditure. Evidence Reviewed distinguishes retrieved-record availability from the reviewer-assessed Evidence Gap category. No new assessment or financial rules are introduced.

Recommended demonstration path: Dashboard → Review & Decide → Summary → Governance Decision → immutable record → Back to Dashboard / Recorded Decisions. Portfolio → View Investment remains the evidence-first path for investments without active reviews; Investment Detail holds per-investment Review History and Start New Review after non-Stop completion.


Validation for this follow-up: 58 credential-free Node tests and the 118-ID frontend contract pass; application JavaScript syntax, Python parse, diff whitespace and official DESIGN.md lint pass (zero lint errors/warnings). New regression tests were observed failing before the fixes and passing afterward. Real-browser checks covered neutral/no-selection guidance, all five outcome labels, rejected empty Modify submission, retained drafts, calendar-date entry and the formatted preview, saved/reloaded Next Review, the Data & Analytics gap case, Investments-only SAP refresh visibility, and 390px form/record layouts without page overflow. Desktop evidence is captured at 1280px. Screenshots under `docs/ui-review/` use synthetic showcase data; the mobile saved record is explicitly UI QA only. The native calendar popup itself and other browser engines were not certified. No live SAP requests were made. The same 24 supplemental strict-scanner findings described above remain; they are not reported as a passing audit.
