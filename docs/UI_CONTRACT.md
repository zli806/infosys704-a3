# Frontend UI Contract

This contract covers the customer workflow and retained SAP diagnostics. `js/ui/renderers.js` owns evidence tables/status/shared provenance/notifications; `js/ui/governance.js` owns navigation/forms/summaries. The checker requires 156 IDs. Implementation, contract and checks must change together.

## Functional Hooks

| Area | ID | Role / expected element behaviour |
| --- | --- | --- |
| Projects | `load-projects` | Secondary Refresh SAP Data on Portfolio only; showcase renders/seeds immediately, then live projects auto-load with a key without leaving Dashboard. Failures keep showcase available; missing key disables refresh without a blocking error. |
| Projects | `portfolio-tools`, `connection-status`, `connection-issue-details` | Quiet Portfolio-only SAP Sandbox status: Connected / Not connected / Refreshing… / Connection issue. Missing-key title explains local configuration and Showcase availability. Issue Details remains accessible after toast dismissal. |
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
| Shell/navigation | `nav-dashboard`, `nav-investments`, `nav-how-it-works`, `page-title`, `global-page-header`, `skip-link`, `storage-notice` | Dashboard / Portfolio remain the core destinations; How It Works is a separate utility nav with aria-current. The global page title hides inside the workspace; the persistent investment name becomes the focus/skip target. Portfolio remains active throughout Overview, Current Review and History, including records entered from Dashboard. |
| Onboarding utility | `how-it-works-view`, `how-dashboard`, `how-portfolio` | Static four-step journey, work-area cards, evidence + human assessment model, trigger/findings distinction, real source badges and human-decision principle. Normal Dashboard/Portfolio callbacks; no calculations, persistence, SAP calls or review creation. |
| Dashboard | `dashboard-view`, `dashboard-cards`, `decision-queue-title`, `dashboard-filter-count`, `dashboard-columns`, `dashboard-attention` | Five distinct-investment filters, each with dominant count, supplemental independent percentage ring, separate help and one shared numbered list. No monitored-count sentence, card-wide native title or retired dashboard-portfolio-count/page-eyebrow hooks. Dynamic list count stays sr-only; Portfolio has no eyebrow above its title. |
| Investment workspace | `workspace-view`, `detail-project-name`, `detail-project-id`, `detail-source`, `detail-review-status`, `workspace-review-context`, `workspace-snapshot-notice` | Compact identity/state first row and source/relevant governance metadata second row; wraps on narrow screens. No visible workspace eyebrow or repeated trigger/due block above the stepper. Current Review uses the same full-width stage grid as tabs/Overview/History. |
| Workspace tabs | `workspace-tab-overview`, `workspace-tab-current`, `workspace-tab-history` | Native buttons with role=tab, aria-selected, roving tabindex and aria-controls. ArrowLeft/Right, Home/End activate tabs; controller saves drafts before leaving and failed saves block selection/focus change. No tab/step is persisted. |
| Overview | `detail-view`, `investment-context`, `start-review`, `view-last-decision`, `detail-lifecycle-overview`, `reload-lifecycle`, `load-review-evidence`, `detail-financial-overview`, `detail-procurement-overview` | Legacy detail-view is the Overview tabpanel, not a separate page. Current Governance actions, business/project context, evidence summaries and collapsed Technical Details only. No forms or completed ledger. |
| History | `workspace-history`, `investment-history-title`, `investment-history-body`, `workspace-recorded-notice`, `history-fresh-actions` | Completed cycles for the selected UUID, newest decision first. View Record selects/expands that exact ID in one detail area; clicking it again collapses. Only one selected row/aria-expanded=true. Empty = No recorded decisions; unknown = Decision history unavailable. |
| Current Review | `workspace-current`, `current-review-empty`, `review-chrome`, `review-steps`, `review-step-assessment`, `review-step-summary`, `review-step-decision`, `workflow-message` | All three stages are native focusable/clickable buttons, never native-disabled for readiness. Assessment/Summary always available in an active cycle; Decision uses aria-disabled, a labelled gate and a focusable inline explanation on activation. Assessment check derives from readiness, not earlier/later position; Summary remains neutral/available when not current. No repeated identity/exit button. Unknown review state is not an empty-review claim. |
| Draft persistence | `review-save-status`, `draft-save-error`, `retry-save` | Successful synchronous autosave is silent: the status node is sr-only and empty on success, with data-state=saved retained for persistence truth/testing. Failure stays in the persistent visible inline alert/Retry Save, not a toast or manual Save button. Failed edits block navigation and beforeunload; retry removes protection and returns focus to the current step. Persistence does not imply readiness or recording. |
| Review initiation | `review-start-dialog`, `review-start-form`, `review-start-title`, `review-start-trigger`, `review-start-help`, `review-start-error`, `review-start-cancel`, `review-start-submit` | Native modal with two human trigger choices, no default. Cancel/Escape creates nothing; Start persists a valid trigger and new review together. Existing active reviews bypass initiation. Same dialog explicitly repairs missing legacy triggers without opening another cycle. |
| Assessment | `assessment-view`, `assessment-form`, six assessment fieldsets and matching `-help` hosts, `assessment-comments`, `assessment-dependencies`, `assessment-owner`, `assessment-owner-help`, `assessment-save-summary` | Human judgement only: compact owner/header and 2×3 desktop layout, six contextual questions from ASSESSMENTS, Optional Review Notes collapsed. No editable trigger, copied financial evidence or visible Not assessed option. Missing radio selection reads the unchanged missing sentinel; Insufficient information remains visible/valid. |
| Summary stage | `summary-view`, `review-summary`, `summary-decision-overview`, `summary-readiness`, `back-assessment`, `proceed-decision` | Always-viewable read-only preview. Incomplete status counts the existing missing readiness items; unassessed dimensions stay Not assessed. One count/owner headline/matrix/timeline, compact Evidence Basis with Overview link and collapsed Reviewer Context. Decision action shares the stepper gate; preview never authorises a decision. |
| Decision | `decision-view`, `decision-form`, `decision-outcome`, `decision-rationale`, `decision-owner`, `decision-requirements`, `decision-action`, `decision-action-owner`, `decision-next-date`, `back-summary`, `confirm-decision` | Five neutral choices, rationale, compact read-only owner and conditional follow-up. No duplicate Decision Context/findings block. Desktop choices use full width; long rationale/notes stay locally readable rather than narrowing the entire stage. Validation is unchanged. |
| Inline Decision Record | `confirmation-view`, `confirmation-record`, `confirmation-outcome`, `back-dashboard` | Legacy confirmation IDs now belong inside History only, never a standalone global view. One immutable selected record includes outcome, owner/time, rationale/follow-up and collapsible saved context/snapshots. Fresh save shows a small acknowledgement and optional Back to Dashboard action, not a fourth workflow stage. |

Forms use input/change for local drafts and submit for progression/confirmation. Six assessment groups and decision/start-trigger groups are native fieldsets. Radios keep original values, group names and unique IDs; only missing sentinel options are filtered out of visible judgement rendering. No selection remains Not assessed internally, not an inferred positive/negative judgement. Preserve native required/checked/focus semantics, novalidate/custom error feedback, source meanings and textContent safety.

`review-trigger` / `set-review-trigger` are a small controlled legacy-recovery state, hidden for normal valid triggers. `governance-directory-status` stays available via aria-describedby (normally sr-only, errors/legacy warnings visible); owner-source help exposes fictional provenance without a repeated paragraph. Other required hooks retain their existing follow-up/record roles. Retired `review-basis`, Assessment evidence and Decision Context IDs/styles/rendering are removed with their contract entries.

`assessment-owner` is a directory-ID select with an empty placeholder, populated synchronously from deferred JS configuration (no JSON fetch). A disabled legacy option preserves old text until explicit selection; never infer identity from names. `decision-owner` is a display-only accountability div, not an input or independent owner source. Follow-up expands and is required for conditional/Modify/Pause only; optional fields remain available and are not erased when outcomes change. Action Owner stays text. Completed records remain immutable.

Notification hooks: `toast-region`, `toast-message`, `toast-actions` provide one reusable non-modal notification with polite atomic status copy and native action buttons. SAP refresh failure offers Retry / Details / Dismiss, auto-dismisses after 9 seconds and pauses the remaining timer while hovered/focused (including focus moves between actions). Mobile uses viewport insets. Persistent connection issue/Details outlives the toast. The former `project-refresh-error`, `retry-projects`, `project-diagnostics` banner hooks are retired. `investment-technical-details` remains the single collapsed diagnostics disclosure with all raw/error/table/filter data and `technical-evidence-context`. `decision-incomplete` shows validation or persistent formal-recording failure on a Record Decision attempt; draft edits never clear a recording failure as if recording succeeded. Earlier removed hooks `review-timing`, `readiness-status`, `readiness-missing` stay retired; timing is in Summary.

Showcase hooks: `detail-source` and generated source badges use shared sourceBadge() without extending raw records. SHOWCASE is white on strong violet (#6c4aa0); SAP SANDBOX white on strong blue (#006491), at ~11.5px bold with compact padding/radius. Titles/accessible labels explain synthetic SAP-schema-compatible scenarios versus SAP Business Accelerator Hub Sandbox samples; neither is DPE production. The How It Works legend uses the same classes/titles. `showcase-investment-context` is visible only for registered showcase projects and renders computed activity/variance plus explicit scenario context; no forecast/budget metrics are invented for live projects. `technical-source` qualifies the provider; `showcase-project-payload` / `raw-showcase-project` expose the synthetic V2 project payload. The live `connection-details` section is normally hidden for that selection, except a failed live refresh remains inspectable under its explicit separate-live-connection heading. Element/G/L/PO raw hooks contain the selected provider's correctly wrapped payloads. `reset-showcase` is a footer-only prototype action, requiring native confirmation and preserving unrelated local records/configuration/live project list.

Review basis displays canonical Material trigger / Scheduled stage-gate review, read-through-normalising legacy wording. Trigger is not an assessment concern. Matrix labels are Normal / no concern identified, Emerging Concern, Material Concern, Evidence Gap and Not assessed; the central qualitative map owns semantics. Internal `attentionItems` remains compatible but no customer text says Attention Items. Not assessed is never a gap. The historical synthetic Stop uses normal stored-record confirmation and is labelled as history; no current decision is preselected. Dates are real clock based; fixed showcase seeds are explicitly synthetic historical dates.

Open Investment enters Overview and starts structure → financial/procurement retrieval with unchanged identifiers/providers. Continue Review enters Current Review at the readiness-derived safe stage. View Decision on Portfolio/Dashboard enters History with the exact immutable record; History itself keeps View Record. Card retry controls remain secondary/hidden on success. Stored historical-only projects never trigger automatic fresh retrieval or new review creation; existing snapshot context is labelled and evidence refresh disabled.

Outside the process, active-review actions say Continue Review. Bottom controls match destinations: Assessment has Review Summary →; Summary has ← Assessment and Governance Decision →; Decision has ← Review Summary and Record Decision. Ready reviews permit Assessment ↔ Summary ↔ Decision or direct stage jumps, preserving all drafts. Making Assessment incomplete re-locks Decision, never deletes its draft. Only Record Decision commits, then selects History/new record and acknowledges saving. Ready re-entry always resumes Review Summary even with a saved Decision draft. No Back to Investment/return button competes with Overview; no breadcrumb is added.

### Investment → review → immutable decision

An investment can have 0..N reviews, with one active at most. `portfolioState()` derives presentation only from the active review/readiness and latest completed decision; there is no persisted project-governance-status field. Latest/history/Reviewed Investments order is descending decision timestamp with record-ID tie break, not review-open date. Dashboard deduplication does not remove any immutable History cycle. Source badges and stored owner/date/snapshot meanings are unchanged.

| Current context | Governance State | Portfolio Next Step | Overview primary action |
| --- | --- | --- | --- |
| Active, incomplete | Assessment in progress | Continue Review | Continue Review → Assessment |
| Active, ready | Ready for decision | Continue Review | Continue Review → Review Summary |
| No active, no decision | Monitoring | Open Investment | Start Review |
| No active, Continue | Monitoring | Open Investment | Start New Review |
| No active, Continue with Conditions / Modify | Follow-up | Open Investment | Start New Review |
| No active, Pause | Paused | Open Investment | Start New Review |
| No active, Stop | Stopped | View Decision | View Latest Decision only |

Latest Decision is stored outcome/date or —; Next Review is the latest stored checkpoint or —, suppressed while an active cycle exists or latest Stop. Prior context remains in History. Overview offers secondary View Latest Decision for completed cycles, expanding the exact latest ID in History. Active work and old completed cycles coexist. Governance status unavailable / Review status unavailable / Decision history unavailable distinguish unknown storage across header and panels; starting is disabled rather than fabricating Monitoring/no history.

New cycles use `store.start()` to allocate a new ID/opened time/default assessment, retaining prior snapshots; an existing active cycle is reused unless the latest decision is Stop. The store now rejects normal starts after latest Stop, using actual decision timestamps/ID ties and case-insensitive UUID matching, in addition to UI/controller protection. Store update/confirm reject completed reviews. No new schema or restart-approval workflow is added. A Next Review date never auto-creates a cycle.

Required-field presentation: red asterisks and a concise key accompany native required selects/radios/rationale. Six assessment legends and the outcome legend retain accessible Required text; business readiness still treats Not assessed as incomplete. Conditional `decision-action-required`, `decision-action-owner-required`, `decision-next-date-required` markers mirror native required flags for conditional/Modify/Pause only. Owner stays read-only in Decision and required through the existing directory/validation rule. The grouped accountability and follow-up surfaces are presentation only.

Stop hides `decision-next-review-field` and disables its input; other optional closure action fields remain available. UI drafts omit Stop's nextReviewDate, while toggling outcomes preserves the date in the current form until navigation. `confirm()` also clears nextReviewDate for newly recorded Stop decisions, even through a direct service call. Read/sanitise paths do not rewrite historical dates or snapshots. Continue retains an optional date; the other three outcomes retain their existing required date/action rules.

Information-ownership validation: 125 Node tests and the 148-ID contract retain lifecycle/audit coverage and add atomic trigger creation/cancel/error/legacy recovery, missing-choice semantics, six help questions, compact Summary/source status boundaries and full-width stage contracts. Isolated Edge checked 1440/1280/1024/768/390px, all five lenses, initiation/Escape, six questions, Summary/Decision, repeated history and Stop without overflow/console errors. Historical audit rendering is unchanged; no live SAP validation was newly run.

Dashboard governance navigation: `dashboard-cards` is one labelled native-button group. Each generated pulse-metric-wrap holds the filter button and a sibling metric-help-wrap; never nested interactive controls. Filter IDs remain dashboard-filter-active/overdue/material/gap/recorded, with exactly one true aria-pressed and aria-controls for the shared list. Tab/Enter/Space remain native; selected number/label weight, tinted surface and coloured bottom rule identify selection structurally. Colours are clearer blue / deadline red / rust / indigo / historical violet; recorded never means success. Responsive 5→3→2 columns keep readable labels/counts. Unavailable storage disables unknown counts, not explanatory help.

All five counts and lists are distinct-investment projections of the same sorted subsets. Active Reviews = investments with an open review; Overdue = active investments with existing overdue/escalation status; Material Concerns / Evidence Gaps = active investments with ≥1 corresponding human assessment signal. Identity uses case-normalised UUID, then project code, then review ID. Duplicate references retain the first executive-ordered matching record. Multiple findings still contribute one investment, while row chips retain every finding. Storage's one-active-review rule is unchanged.

Reviewed Investments = distinct investments with ≥1 completed immutable decision, using the latest completed decision per investment. It may overlap active lenses; View Decision always opens that exact completed History record, never redirects to the active review. History retains all cycles. Current rows keep Continue Review. Internal recorded filter IDs/data-mode remain compatibility hooks, not a record-count definition.

Percentages are Math.round(lens distinct investments / represented universe × 100), clamped to 0..100. renderDashboard() receives actual Portfolio projects, not a numeric count; the universe is the distinct union of loaded projects and saved review identities, so absent historical/live projects remain represented truthfully. Denominator is never visible. A 62px (50px mobile) CSS conic-gradient/mask ring has a 5px arc starting at 12 o'clock and transparent remainder; only percentage text is centred inside. Zero universe = 0% with no arc; unavailable storage = Unavailable with ring hidden, never 0%. Rings are aria-hidden/non-focusable; button accessible names include count, investments and percentage. Contextual help/group text explains overlap and independent percentages without a card-wide native title. Forced colours retains percentage text and a structural selected outline. No chart dependency.

One list updates in place without changing route. `decision-queue-title` changes to the lens; sr-only `dashboard-filter-count` reports matching investments in the polite atomic live region. Each row gets a decorative aria-hidden queue-sequence (01, 02, …), reindexed for that subset; it is not another table column and does not replace the urgent rail. Reviewed Investments switches Findings / Decision Timing to Latest Decision / Decision Date. Current ordering and newest-completed ordering remain unchanged; no priority score. Normal Monitoring investments stay in Portfolio, with no sixth Dashboard lens or no-review-needed claim.

Initial load, ordinary navigation and Dashboard nav clicks default Active Reviews. The optional fresh-record Back to Dashboard action from History selects Reviewed Investments once; the transient fresh ID is never persisted. Tab/global navigation and historical record opening clear that acknowledgement/context. No customer-facing confirmation route exists; internal state names remain UI compatibility aliases, with main[data-view=workspace] stable during tabs/stages and Portfolio always globally active.

Dashboard contextual help: the former global mini-manual and all its hooks/styles/listeners are removed. Generated metric-help-{key} buttons have About {label}, aria-describedby/controls to metric-tip-{key}, aria-expanded and visible focus. Each tooltip contains only its lens definition/count semantics: open cycles/overlap; 14-day target including 30-day escalation; distinct material investments; distinct evidence-gap investments; immutable completed cycles. No repeated production-calibration disclaimer. Hover/focus opens; text stays hoverable; click/tap pins/toggles; Escape, outside press, selecting a lens or leaving Dashboard dismisses. Opening another closes the previous. Stable DOM controls preserve focus/pinning during data refresh. Tooltip placement is viewport-clamped on open/scroll/resize; the small button stays beside its label after wrapping.

Emerging finding chips have a native title and an aria-label with their count plus the concise deteriorating/uncertain, attention/monitoring, not-material definition. Material/gap chips have similarly concise metadata. No sixth help icon or extra explanation row is added. Business helpers/classification remain unchanged; methodology remains in documentation/review context, not a Dashboard popup.

Reusable help retains hover/focus/tap/Escape/viewport behaviour. Stored Review Trigger help belongs in the Dashboard column and compact workspace metadata; initiation has concise why-opened copy, not a finding definition. Each Assessment dimension uses the existing ASSESSMENTS question verbatim via its help host. Findings help remains current-mode only. Dashboard displays stored triggers and never infers one from SAP or concern counts.

Presentation metadata only styles existing governance information. Actions share blue styling; current urgent rows retain their rail and explicit deadline text. Desktop headings are ~14.4px, names ~17.3px, body/status ~14–15px, lens numbers 64px; mobile scales without hiding useful orientation. At ≤1100px headings become per-field labels. Small chips use darker contrast-safe variants of the brighter large-number tones. Portfolio keeps semantic table rows, horizontal rules/hover, outcome-first latest decisions with quieter dates and differentiated state chips. History stays a neutral compact ledger. Neutral outcomes do not imply good/bad judgement. The global header uses the unchanged supplied logo.png (2172×724) as its only visible identity, with meaningful alt/heading and responsive natural-ratio sizing. Its frame trims transparent padding only; old SVG/text lockup is not displayed and no subtitle/banner is added.

Obsolete chart, separate review-list, portfolio-wide history navigation and recent-decision hooks/renderers/styles stay removed. How It Works is informational utility navigation, not a replacement business/history page. Reusable `completedReviews()`, exact review-ID callbacks, confirmation rendering and investment Review History remain authoritative. No charts, duplicated history list or extra Dashboard module is added.

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

The visual contract is [DESIGN.md](../DESIGN.md). Deferred scripts and SAP diagnostic hooks remain; the current required-ID manifest is in the checker. `connection-details`, `detail-project-id` and `detail-project-name` retain their roles; the former Assessment-only save hook is replaced by shared `review-save-status`. SAP services, rule/store functions and record schema remain authoritative.

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

Local save feedback is independent of readiness and global storage availability. Inputs save synchronously; unchanged inputs require no write. Central canLeaveReview() guards all stage/tab/global/utility/project navigation. A failed draft write leaves entered fields intact, blocks exits, shows persistent Retry Save and attaches beforeunload only for genuine unsaved edits. Retry success (or reverting exactly to persisted values) clears protection; background reads/renders do not clear failure. No normal unsaved-changes prompt, fake Saving state or manual Save button exists. Completed records remain immutable under normal store APIs. The only reset is confirmed showcase-scoped reset; malformed storage is never silently repaired/erased.

## Final UI refinement (15 October 2026)

Historical note: the former Needs Attention/chart composition has been superseded by the approved governance-lens Dashboard above. Categories/deadlines remain unchanged; timing urgency stays separate from assessment concerns.

`summary-decision-overview` contains counts once and owner once, without target duplication or action. The matrix is the authoritative assessment findings representation; duplicate narrative lists are removed, not reclassified. Timeline retains actual opened/14-day/30-day controls. Evidence Basis uses evidenceStatus() only, explicitly distinguishing source availability from reviewer sufficiency. View evidence in Overview switches tabs/focuses current evidence rather than opening diagnostics. Reviewer notes are collapsed and do not repeat the owner. History still renders the full saved evidence/assessment/timing/rationale snapshot.

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

Recommended demonstration path: Dashboard Continue Review → workspace Current Review (Assessment or Review Summary) → Governance Decision → Record Decision → History/new immutable record. Overview owns evidence/initiation; History owns completed cycles and one selected detail area. No peer-level investment/review/confirmation pages remain. How It Works is optional utility onboarding, not a required step.


Validation for this follow-up: 58 credential-free Node tests and the 118-ID frontend contract pass; application JavaScript syntax, Python parse, diff whitespace and official DESIGN.md lint pass (zero lint errors/warnings). New regression tests were observed failing before the fixes and passing afterward. Real-browser checks covered neutral/no-selection guidance, all five outcome labels, rejected empty Modify submission, retained drafts, calendar-date entry and the formatted preview, saved/reloaded Next Review, the Data & Analytics gap case, Investments-only SAP refresh visibility, and 390px form/record layouts without page overflow. Desktop evidence is captured at 1280px. Screenshots under `docs/ui-review/` use synthetic showcase data; the mobile saved record is explicitly UI QA only. The native calendar popup itself and other browser engines were not certified. No live SAP requests were made. The same 24 supplemental strict-scanner findings described above remain; they are not reported as a passing audit.

## Usability and onboarding refinement — 17 October 2026

Persistence and readiness remain separate; successful autosave is now silent. Ready = unchanged governance completeness/owner requirements, with evidence refresh finished before Decision entry. Summary is always a read-only preview, never a permission to decide. Step labels and bottom controls share one controller gate; all navigation flushes through canLeaveReview(). Decision drafts survive incomplete Assessment changes and all normal navigation. Only Record Decision commits an immutable record. No new stage preference, storage schema, governance calculation or SAP call is introduced.

| Event | Customer feedback |
| --- | --- |
| API key missing | Neutral SAP Sandbox · Not connected on Portfolio; Showcase stays available, no initial toast. |
| Project refresh fails | Non-blocking Retry / Details / Dismiss toast; persistent Connection issue/Details remains. |
| Structure / G/L / PO fails | Local evidence-card error and Retry; technical details retained. |
| Draft autosave fails | Persistent blocking Current Review alert, retained form values, Retry Save and exceptional beforeunload protection. |
| Record Decision fails | Persistent local Decision error; saved draft is not mistaken for an immutable record. |
| Governance storage unavailable/malformed | Persistent truthful unavailable states; never false Monitoring/no-history or automatic repair. |

How It Works is an optional static utility with its own separated native navigation/aria-current. It introduces the four-step journey, three work areas, evidence + human judgement model, trigger versus findings, true source legend and human authority. It does not mutate data. SHOWCASE and SAP SANDBOX are provenance, not good/bad status.

Validation: 142 Node tests, 158 required functional IDs, 15 application JS syntax checks and two Python parses pass. Isolated native Edge 155 checked the full requested flow, actual localStorage/update/confirm failure recovery, keyboard gate focus, retained Decision fields, exact History selection, connection stubs, toast focus-pause/auto-dismiss and utility navigation at 1440/1280/1024/768/390px. No page overflow or console errors. Source-badge text/background contrast measured 6.72:1 / 6.50:1. Browser-only SAP stubs were explicitly labelled; no new live SAP validation or source-data change. This is not a timed comprehension study or formal cross-engine/screen-reader/WCAG/projector certification.

Final submission validation: 151 tests/157 hooks pass, including deterministic investment percentages, zero/unavailable states, saved-only universe identities and three-cycle/latest-record overlap. Edge 155 reviewed all five lenses, branding, working screens, silent success and persistent save-failure recovery at 1440/1280/1024/768/390px, with no overflow/console errors. Count/ring/help geometry and forced-colours numeric/selected states pass; supplied logo bytes are unchanged and resolve through index.html. Historical audit rendering, controller save guards, SAP services, rules, store and scenario data remain unchanged. Prior dated test totals above are historical evidence, not the final baseline.
