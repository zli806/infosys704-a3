---
version: alpha
colors:
  brandBlue: "#006491"
  brandRed: "#E31837"
  canvas: "#f3f4f6"
  ink: "#202f3d"
  muted: "#596875"
  background: "#f6f7f9"
  surface: "#ffffff"
  border: "#dfe4e9"
  primary: "#146b9a"
  action: "#146b9a"
  actionHover: "#105477"
  secondary: "#eaf0f5"
  success: "#16734f"
  successBackground: "#edf7f2"
  warning: "#895d12"
  warningBackground: "#fff6e5"
  danger: "#9a352b"
  dangerBackground: "#fff0ee"
  reviewer: "#655391"
  reviewerBackground: "#f0ecf8"
  scrollbarThumb: "#9bafc2"
  scrollbarTrack: "#edf2f7"
typography:
  body:
    fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif'
    fontSize: "16px"
    lineHeight: "1.6"
  heading:
    fontFamily: '"Avenir Next", "Segoe UI", system-ui, sans-serif'
rounded:
  panel: "12px"
  control: "8px"
omitted:
  - section: spacing
    reason: "Layout-specific spacing is maintained in styles.css; no generated scale."
  - section: components
    reason: "Shared semantic HTML and CSS selectors are the component owners."
---
# Review workspace design

## Overview

The customer-facing workspace serves a portfolio/governance manager: what needs attention, why a review exists, what evidence and judgement support it, and what accountable action follows. The customer simplification pass supersedes the earlier control-rail/source-legend presentation, not the underlying governance architecture.

Keep the approved Dashboard / Portfolio core, Overview / Current Review / History workspace, native controls and five human outcomes. How It Works is a separated informational utility, not another business workspace. SAP services, exact joins, amount interpretation, source provenance, readiness, 14/30-day rules and browser-local immutable decision records remain authoritative. No recommendations or scores.

## Colors

Runtime ownership: **styles.css :root is canonical (Model B)**. The frontmatter mirrors its accepted palette; the CSS is hand-maintained, not generated. `colors.background` maps to `--color-bg`, `colors.surface` to `--color-paper`, `colors.border` to `--color-line`; other semantic names map to corresponding kebab-case `--color-*` variables. Scrollbar colors map to `--color-scroll-thumb` / `--color-scroll-track`. `colors.primary` is the documentation alias of `colors.action`, mapping to the same `--color-action` owner. All screens consume these shared variables.

Text accompanies semantic colour. Available, Limited evidence, Unavailable, Loading and Error are not interchangeable. Zero matches are not zero exposure; partial financial activity is not complete project cost.

## Typography

`typography.body` maps to `--font-body`; `typography.heading` maps to `--font-heading`. Use local font fallbacks to avoid downloads and font swaps. Short labels use explanatory help below the field. English display dates reuse `app.ui.formatDate()` with en-NZ and preserve UTC interpretation; date-only records display the same way as investment dates while event timestamps retain explicit UTC time; native date-picker chrome follows the user's browser/OS locale.

## Layout

Shared shell: the user-supplied root logo.png is the only visible product identity, Domino’s Investment Governance Hub, with no adjacent lockup/subtitle. The unchanged 2172×724 asset has visible bounds (61,137)–(2105,575); a 76px-high frame trims only transparent padding, preserving its natural 3:1 image ratio. Responsive image width is 300–360px desktop/tablet and available mobile width; desktop header stays 85px tall. No additional banner or decoration is needed. Dashboard / Portfolio remain primary; a thin divider separates How It Works with native keyboard/focus and aria-current. Existing red navigation rule remains; old SVG is retained but not displayed. Soft cool-grey canvas, white surfaces and system fonts remain. Forced colours gives the logo a white backing so the supplied dark lettering stays readable.

Document scrolling owns page height. Tables have keyboard-focusable horizontal overflow; raw captures have bounded scrolling. At narrow widths dashboard/evidence columns, assessment groups, matrix and timeline stack; navigation moves above content. All actions remain available without horizontal page overflow.

## Elevation & Depth

Flat surfaces with a thin border. Do not add marketing gradients, hero artwork, invented financial charts or fabricated metrics. Technical details are available through disclosure; errors remain visible outside collapsed technical data.

## Shapes

`rounded.panel` → `--radius-panel`; `rounded.control` → `--radius-control`. Status badges use a smaller radius. Primary, secondary, disabled and focus treatments are shared globally. Buttons have stable minimum widths during SAP loading.

## Components

Canonical owners: `styles.css` owns shell/panels/buttons/fields/tables/scrollbars. `js/ui/renderers.js` owns SAP tables, status feedback and English dates; `js/ui/governance.js` owns evidence overview, navigation, native form control binding and local-review presentation. `docs/UI_CONTRACT.md` owns functional hooks and behavior.

Keep native controls: assessment/decision fieldsets use labelled radios, with no visible missing-sentinel choice and no default outcome. No judgement selection still means Not assessed internally. Review initiation uses a small native trigger dialog; directory owner remains a select. Date-picker/select geometry stays browser-owned, product labels/dates English. Forms retain custom validation, growing textareas and the unchanged rule owner; no framework/build dependency.

### Customer-facing components

- **Interactive executive status strip:** Portfolio Governance leads five distinct-investment lenses; the monitored-count sentence is removed. Active Reviews / Overdue / Material Concerns / Evidence Gaps / Reviewed Investments overlap independently. Clear blue / deadline red / rust / indigo / historical violet remain. Dominant 64px counts and labels sit left; secondary 52px (44px mobile) percentage rings use a thin 3px conic arc, transparent remainder, 12-o'clock start and centred percentage only. No track/chart dependency/animation. Existing selected weight, tinted surface and 4px rule remain; help stays beside each label, below the ring. Cards retain 5→3→2 responsive wrapping.
- **One shared governance list:** all lenses show one row per investment. Current lenses retain Investment / Review Trigger / Findings / Decision Timing / Next Step. Reviewed Investments uses Latest Decision / Decision Date and deep-links to that exact latest completed History record, even when another cycle is active. Three completed cycles still count once here; full immutable History remains complete. No Monitoring/no-review-needed card is added: Portfolio owns the full universe. Decorative indexes, urgency, findings and source badges remain.
- **Portfolio:** all loaded investments retain derived state/latest decision/next review. Open Investment → workspace Overview; active Continue Review → Current Review; stopped View Decision → History. Dashboard uses the same business wording and exact-record links; History retains View Record and Overview View Latest Decision. The refined register, neutral outcomes/state chips and data semantics are unchanged.
- **Persistent investment workspace:** compact title/state row plus source/relevant trigger/due or latest/next metadata, then the existing tabs. No visible governance eyebrow, repeated Continuation Review heading or second trigger/due block. Current Review/stepper/stage canvas align to full workspace width; only prose/notes/audit detail use local readable measures. Overview owns facts/evidence; initiation owns why opened; Assessment judgement; Summary synthesis/timing; Decision accountability; History the immutable audit trail.
- **Repeated review cycles:** Start Review / Start New Review belong to Overview. Non-Stop cycles may repeat, Stop cannot restart. Current Review contains the active cycle only; History has every completed cycle, newest first, one neutral ledger and one selected immutable detail area. Previous decisions remain visible while new work is active. No step preference or display state is persisted.
- **Automatic loading:** a configured key starts one project refresh while Dashboard remains visible. Missing key is a neutral Portfolio status, not an initial scary error/toast. Opening an investment loads structure, then dependent financial/procurement evidence. Initial success is quiet; manual success may show a small short-lived toast. Refresh/retry stay secondary and never auto-loop. HTTP status/raw diagnostics never lead the normal workflow.
- **Three evidence cards:** Project Structure, Financial Activity, Procurement Activity. One state, actual count and short qualification. One collapsed Technical Details section near the bottom retains all original tables, raw responses, HTTP/filter diagnostics and provenance. No nested technical toggles on Investment Details.
- **Current Review:** the full-width three-stage navigation is the primary orientation. Every step is a focusable/clickable native button; Assessment and Summary are always available while active. Decision uses aria-disabled plus a labelled gate and inline explanation, never silent native-disabled behaviour. Assessment completion is readiness-derived; current state is strong action-blue, Summary non-current is neutral/available. Ready users can jump freely among stages; safe re-entry remains incomplete→Assessment / ready→Review Summary. Six judgement groups retain the compact 2×3 layout, contextual questions, owner input and collapsed Optional Review Notes. Missing stays internal; Insufficient information remains a valid human Evidence Gap.
- **Autosave:** successful writes are silent and occupy no layout row; the empty sr-only status retains persistence state without a visible Saved label. Writes remain synchronous, with no fake Saving… or manual Save button. All drafts survive normal navigation. Failed writes keep entered values, persistent visible Retry Save, navigation blocking and genuine-unsaved beforeunload protection; retry/reversion removes protection. Global unavailable storage and immutable-record failures remain distinct from draft persistence/readiness.
- **Review initiation:** Start Review / Start New Review opens one small native dialog with Scheduled stage-gate review / Material trigger, no default. Cancel/Escape creates nothing; creation+trigger are one write. Missing legacy triggers have explicit recovery, never silent inference. Normal started reviews display their stored trigger read-only; Dashboard does not detect it.
- **Short Summary:** always-viewable read-only preview, including incomplete reviews. A concise derived remaining-item count and truthful Not assessed matrix cells prevent readiness claims; Decision activation explains requirements in a neutral/action-blue inline message. One count/owner headline/matrix, real timeline, compact Evidence Basis and View evidence in Overview remain. No duplicated attention lists or evidence cards; collapsed Reviewer Context keeps notes. Source availability is explicitly not evidence sufficiency.
- **Timeline:** actual opened/14-day/30-day milestones with text status. Dates are concise; exact UTC timestamps remain in time elements, accessible names and hover titles. Geometry denotes milestone order, not elapsed-time scale. Recorded milestones retain actual chronological position.
- **Decision:** one focused commit form, not another Summary. Five neutral choices use available desktop width; rationale is locally readable; owner is light read-only context. No finding-count/Decision Context block. Required fields/conditional follow-up/Stop behaviour remain unchanged; historical records retain their complete audit content.
- **Workflow grammar:** Continue Review outside the workflow; destination-aligned Review Summary → / Governance Decision → / Record Decision inside. Previous-stage actions are ← Assessment / ← Review Summary. Stepper answers where am I; bottom actions what next. Only Record Decision ends the cycle and selects History/new immutable record with a small acknowledgement. No standalone confirmation page or fourth step; optional fresh-record Back to Dashboard retains its one-time recorded-lens context.
- **Executive restraint:** no per-project explanation rows, global methodology popup or sixth help icon. Five concise lens definitions explain current overlap/counting/history where needed; hover/focus/tap, Escape/outside dismiss and stable refresh behaviour remain accessible. Calibration/methodology belongs in review context/documentation. No assessment hints infer classifications or outcomes.
- **History record:** View Record expands the exact ledger ID in one detail area beneath the rows, not a new screen. Neutral outcome/owner/time, rationale/follow-up and saved timing/assessment/evidence remain. Only the small fresh-save acknowledgement is green. Switching rows changes selection; clicking the selected row can collapse it. Unknown storage never claims no history.
- **Owner configuration:** immutable fictional Alex Lee, Morgan Chen and Taylor Singh roles live only in governance-directory.js. Normal deferred JS populates immediately even on local-file loads; no JSON fetch. This does not make SAP file-origin requests supported or create authenticated authority.

### Final portfolio baseline

Show five immediately available SHOWCASE investments, then live SAP SANDBOX projects, distinguished by compact high-contrast provenance badges—not modes. SHOWCASE uses #6c4aa0 violet/white; SAP SANDBOX #006491 blue/white, ~11.5px bold, 4×8px padding and 4px radius. Shared rendering carries truthful titles/accessible labels across Dashboard/Portfolio/workspace/records; How It Works uses the real badge classes in its source legend. Neither source is DPE production. A quiet footer also explains sources and offers confirmed Reset Showcase. Default records still demonstrate normal/no review, emerging deterioration, material concerns, an explicit cost evidence gap and historical Stop. Never overwrite a user's completed showcase decision on refresh.

Showcase-only Investment Context is a compact flat business summary of approved/forecast context and derived posted/procurement/remaining-forecast figures, plus completion dates and the concise review reason. Do not repeat its project/company strip or add invented context to live projects. Historical figures are labelled pre-Stop; unknown forecast stays Not validated. Evidence cards and one collapsed Technical Details remain underneath. Raw showcase payloads are explicitly synthetic SAP-schema-compatible, never labelled live SAP data.

The six-dimension matrix uses the central prototype convention: normal green/positive-neutral, emerging amber, material red, evidence gap grey/neutral, unassessed unfilled. Text markers accompany colour. A Material trigger explains why the review began, not a classified finding. No numeric materiality threshold, score or recommended outcome is implied; production governance/pilot must calibrate policy. Seeded assessments stay editable, with project-level SHOWCASE provenance rather than repeated field badges. Preserve Assessment → Summary → Decision without restoring a control rail.

This is reusable component anatomy. Lens tones are #006491 / #b42318 / #d15a35 / #4f6cc9 / #7257b3; small material/emerging/gap text retains darker contrast-safe variants. Percentage denominator is the distinct union of loaded Portfolio projects and saved-only investment identities; normal state equals Portfolio, absent historical projects extend the represented universe rather than creating >100% shares. Whole percentages round/clamp to 0..100; zero denominator shows 0%/no arc, unavailable governance hides the ring and says Unavailable. Denominator is not visible. Rings are non-focusable/aria-hidden; accessible button text includes count/percentage and help explains independent overlap. Forced colours retains numeric meaning and selected outline. Dashboard defaults Active Reviews; fresh-record closure selects Reviewed Investments once. No preference persistence or decorative animation.

Executive polish keeps the 16px body baseline, strong titles/counts, white surfaces and neutral canvas. Portfolio/History remain refined ledgers; Current Review uses the same full-width grid instead of a 1120px inset. The compact header and reduced repetition bring real working content into the initial viewport without shrinking important text. Only the supplied wordmark is added imagery; no marketing gradients or pervasive shadows. Ring gradients encode actual percentages, not decoration.

Semantic polish: active cycles suppress previous-cycle Next Review in current presentation while history retains it. Store.start guards latest Stop by actual decision date, and new Stop confirmations omit Next Review even from direct service calls. Old recorded snapshots are never migrated. Required markers follow conditional native flags; no assessment classification, 14/30-day policy, owner model or five-outcome change.

### Connection feedback and onboarding utility

Portfolio places a small SAP Sandbox connection status beside Refresh SAP Data: Connected / Not connected / Refreshing… / Connection issue. A missing-key title explains local configuration and continued Showcase access. Project refresh failure keeps Showcase rendered and uses one white lower-right toast with a restrained semantic accent/shadow, Retry / Details / Dismiss and polite status semantics. Nine-second auto-dismiss pauses for hover/focus, including between actions. Mobile uses 16px viewport insets, away from the top navigation; persistent issue/Details remains after dismissal. Structure/G/L/PO errors stay on their evidence cards. Draft/record/storage failures never use the disappearing toast.

How It Works uses the same canvas/system typography/radii with a restrained editorial hierarchy: brief hero; large 01–04 Monitor / Review / Decide / Record journey joined by thin rules; three work-area cards; portfolio evidence + six human judgements converging into Summary → Decision → History. Desktop journey is horizontal; tablet/phone stack with visible connections. Compact Trigger vs Findings panels explicitly reject automatic Material Trigger → Material Concern inference. Real source badges, the human-authority principle and Dashboard/Portfolio actions finish the page. No external imagery, gradients, decorative animation, new governance state or SAP calls.

Polish verification: 97 Node tests, 123-ID contract and syntax/static checks; isolated Edge exercised all Dashboard modes, ready Summary, rejected empty Decision, required Modify fields, Stop date toggling/recording, service-level Stop guard, immutable history and the new-cycle Portfolio date suppression. Desktop/laptop/mobile screenshots of all workflow views were inspected; 320–1440px layouts had no page overflow or console errors. Existing showcase data only; no new live SAP validation. Client-projector readability, other engines and formal screen-reader/WCAG review remain nice-to-have validation.

Workflow/hierarchy verification: 103 Node tests, 120-ID contract; isolated Edge reviewed all five lenses and Assessment/Summary/Decision/Confirmation at 1440/1280/1024/768/390px. Hoverable/focusable help, physical emulated touch, Escape, hidden live counts, decorative indexes, selected states and action hierarchy passed without page overflow/console errors. Portfolio QA included Monitoring, active/ready, Follow-up, Paused/Stopped and long names through real showcase review cycles. Material/emerging/gap chip text measured 5.51:1 minimum; large metric numbers ≥4.01:1 on white and ≥3.69:1 on selected surfaces. Mobile inspection prompted label-aligned help positioning; latest-decision dates were quietened without leading separators. This is qualitative product QA, not formal cross-engine/screen-reader/projector certification.

Workspace consolidation supersedes the older peer-screen/confirmation presentation: 114 Node tests and the 135-ID contract cover persistent tabs, all governance states, safe stage entry, backward-only steps, preserved drafts, exact/multiple historical cycles, Stop, unavailable storage and absent live context. Isolated Edge inspected Overview, all Current Review stages and History/record expansion at 1440/1280/1024/768/390px with no overflow or console errors. The first screenshot pass exposed heavy default focus rectangles on programmatically focused headings/stages; only those non-interactive focus targets were quietened, while tabs/buttons/fields retain visible keyboard rings. Historical-only snapshots are explicitly labelled, do not auto-fetch fresh data and cannot start a new cycle until current portfolio context exists. Review Trigger help is reused; Findings help hides in recorded mode. No business/SAP/store/rule changes or external dependencies.

Information-density verification: 125 Node tests/148 functional hooks retain History and business contracts. Before/after native Edge measurements at 1280px reduced header height 256→93px and Assessment/Summary start y645→y356. Full document heights: Assessment 1899→1092px, Summary 2696→1556px, Decision 2187→1244px (roughly 42–43% shorter). At 1440px the stage grows 1120→1336px and the six judgement groups end near y807. All stages, dialog and History were inspected at 1440/1280/1024/768/390px, without page overflow/console errors. Dialog Cancel/Escape/invalid submit/new cycles, stored-trigger display, legacy recovery, dimension help, source-state truth, Stop and old history all passed. Existing showcase only; no new live SAP call or formal cross-engine/screen-reader certification.

Usability/onboarding verification (17 October 2026): 142 Node regressions, the 158-ID frontend contract, 15 application JavaScript and two Python syntax checks pass. Native Edge 155 exercised missing-key startup, two-dimension incomplete Summary, keyboard-activated Decision gates, ready-stage jumping, Decision draft round-trips, actual browser-storage write failures in both forms and formal recording, Retry Save/focus/beforeunload recovery, immutable History, SAP issue/Retry/Details/success and toast focus-pause/auto-dismiss. Dashboard, Portfolio, stages, errors, History and How It Works were captured/reviewed at 1440/1280/1024/768/390px without page overflow or console errors. Badge contrast is 6.72:1 (Showcase) / 6.50:1 (SAP Sandbox), at 11.52px bold. Storage failures remain inline, distinct from neutral readiness gates and quiet success. Existing showcase plus explicitly labelled browser-only service stubs supplied QA; no live SAP request or committed scenario change. Other engines, formal screen-reader/WCAG review, projector readability and the 20–30-second comprehension target still need external user validation, not assumed certification.

Verification retains engineering tests, CI, static checks and the remote SAP validator. Qualitative manager self-checks are not formal timed user studies; Jerry still owns the final client-projection/usability and brand refinement.

Pre-handover verification (15 October 2026): 54 credential-free tests include both controller paths, all five outcomes with material concerns, explanations and the retained actual-spec/financial contracts. Real-browser checks exercised ready hero → Summary → keyboard-selected Modify → record/reload, plus new Infrastructure → incomplete Assessment → Summary → human Continue. Native Enter/Space/arrow operation and expanded 390/1280px layouts were verified in isolated headless Edge; dashboard/decision screenshots were reviewed. Reset restored the four default showcase records. Current live TEMP003 remained 4 components / 40 G/L links / 0 PO matches, without invented context or visible HTTP success text. These qualitative self-checks are not formal timed studies or client-projector certification; final visual/BA/PO validation remains with the team.

## Do's and Don'ts

- Keep exact raw SAP codes when no authoritative text mapping exists.
- Keep partial financial postings and procurement indicators qualified; currencies remain separate.
- Keep source-labelled snapshots distinguishable from fresh retrieval.
- Preserve all existing enums, readiness/decision rules, UTC target calculation and storage boundaries.
- Respect reduced motion and visible keyboard focus; never use color as the only indicator.
- Preserve safe textContent rendering and Git-ignored local credentials.

Final team-feedback refinement (16 October 2026): the follow-up disclosure stays neutral until a human selects an outcome; the next-review input has a formatted-date hint while retaining the native picker. The saved record formats that date without mutating ISO storage. SAP project refresh is secondary and appears only on Investments, keeping the showcase presentation route focused. Financial record availability and reviewer-assessed Evidence Gaps remain explicitly distinct.

Executive Dashboard/shared-shell verification (17 October 2026): 66 Node regressions cover distinct-investment metrics, all-open queue ordering/ties, truthful empty/unavailable states, help behaviour and retained workflows/schema contracts. Native Edge checks verified hover/focus/Escape/tap help, keyboard disclosures/navigation/resume, recorded-decision opening, an unflagged new review in the queue and no console/resource errors. Desktop/mobile screenshots were inspected; 320/390/768/1024/1280/1440px layouts had no horizontal page overflow. Other page components and all business/data rules are unchanged; this is not a formal cross-browser/WCAG audit.

Visual refinement verification (17 October 2026): per-row explanations are removed; 67 regressions preserve counts, ordering, resume and all decision rules. The bespoke local brand mark/short red nav rule are separate from muted governance colours. Screenshots at 1440px, 1280px and 390px were reviewed and the help copy tightened without changing its meaning. The full queue ended at approximately y777 at the 1440px desktop size. Native Edge hover/focus/Escape/tap and navigation passed, with no console errors or horizontal overflow at the tested widths. Material/emerging/gap chip contrast measured at least 5.0:1. Client-projection and other-browser review remain qualitative team validation, not a completed usability/WCAG certification.

Earlier status-filter verification (17 October 2026): 74 regressions covered the then-current four current-review lenses, multiple-material/gap counts, ordering/ties and selection refresh/default behaviour. Native Edge Tab/Space/Enter, help hover/focus/Escape, 320–1440px layouts and screenshots passed without console errors. The current consolidated five-lens system supersedes that composition; governance rules and logo remain unchanged.

Earlier product-model verification (17 October 2026): 84 Node regressions covered derived Portfolio states, repeated immutable cycles, Stop, history, absent live context and unavailable storage. Full history remains investment-local; Dashboard now projects reviewed investments rather than every historical cycle.

Earlier consolidation verification (17 October 2026): 91 Node tests/119 hooks established one shared five-lens list, exact History links, one-time post-decision selection, repeated cycles and Stop protection. Final investment-level counting supersedes that round's completed-record-count lens; immutable History remains unchanged.

Final submission polish: 151 Node tests, 157 functional hooks, 15 application JS and two Python syntax checks pass. Edge 155 inspected Dashboard/all five lenses, Portfolio, review stages/failure recovery, History and How It Works at 1440/1280/1024/768/390px without page overflow or console errors. Counts remain dominant; rings are smaller and do not collide with labels/help. The unmodified supplied logo retains its full visible content and natural ratio; desktop header is 85px, mobile navigation reflows. Forced colours retains readable branding/percentages/selection. Three completed cycles produce one reviewed-investment row and exact latest-record navigation alongside a new active review; all cycles remain in History. No new live SAP call, dependency or business-rule change. Other engines, formal screen-reader certification and projector validation remain outside this QA.
