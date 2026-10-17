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

Keep the eight views, native controls and five human outcomes. SAP services, exact joins, amount interpretation, source provenance, readiness, 14/30-day rules and browser-local immutable decision records remain authoritative. No recommendations or scores.

## Colors

Runtime ownership: **styles.css :root is canonical (Model B)**. The frontmatter mirrors its accepted palette; the CSS is hand-maintained, not generated. `colors.background` maps to `--color-bg`, `colors.surface` to `--color-paper`, `colors.border` to `--color-line`; other semantic names map to corresponding kebab-case `--color-*` variables. Scrollbar colors map to `--color-scroll-thumb` / `--color-scroll-track`. `colors.primary` is the documentation alias of `colors.action`, mapping to the same `--color-action` owner. All screens consume these shared variables.

Text accompanies semantic colour. Available, Limited evidence, Unavailable, Loading and Error are not interchangeable. Zero matches are not zero exposure; partial financial activity is not complete project cost.

## Typography

`typography.body` maps to `--font-body`; `typography.heading` maps to `--font-heading`. Use local font fallbacks to avoid downloads and font swaps. Short labels use explanatory help below the field. English display dates reuse `app.ui.formatDate()` with en-NZ and preserve UTC interpretation; date-only records display the same way as investment dates while event timestamps retain explicit UTC time; native date-picker chrome follows the user's browser/OS locale.

## Layout

Shared shell: white top navigation with the existing local geometric red/blue mark, a DPE/app-name lockup and Dashboard / Portfolio only. The mark is a prototype asset, not an official Domino's logo. Brand blue/red are reserved for the lockup/nav; controlled action-blue remains for workflow controls, separate from governance semantics. There is no sidebar or extra global control. The canvas is soft cool-grey (#f3f4f6), working surfaces white, with restrained borders and system fonts.

Document scrolling owns page height. Tables have keyboard-focusable horizontal overflow; raw captures have bounded scrolling. At narrow widths dashboard/evidence columns, assessment groups, matrix and timeline stack; navigation moves above content. All actions remain available without horizontal page overflow.

## Elevation & Depth

Flat surfaces with a thin border. Do not add marketing gradients, hero artwork, invented financial charts or fabricated metrics. Technical details are available through disclosure; errors remain visible outside collapsed technical data.

## Shapes

`rounded.panel` → `--radius-panel`; `rounded.control` → `--radius-control`. Status badges use a smaller radius. Primary, secondary, disabled and focus treatments are shared globally. Buttons have stable minimum widths during SAP loading.

## Components

Canonical owners: `styles.css` owns shell/panels/buttons/fields/tables/scrollbars. `js/ui/renderers.js` owns SAP tables, status feedback and English dates; `js/ui/governance.js` owns evidence overview, navigation, native form control binding and local-review presentation. `docs/UI_CONTRACT.md` owns functional hooks and behavior.

Keep native controls: assessment/decision fieldsets use visible labelled radios, with explicit unassessed/no-decision defaults. Review Trigger and prototype-directory owner use selects; date-picker language and select popup geometry remain platform-owned. Product labels/help/rendered dates stay English. Textareas grow; forms retain novalidate and the rule/store owner. No new libraries, framework or build step. These product controls reuse the accepted tokens; final visual refinement remains with UI/UX.

### Customer-facing components

- **Interactive executive status strip:** Portfolio Governance/current investment count lead five metric filter buttons. Clear blue / deadline red / rust / indigo / historical violet distinguish lenses; recorded never means success. Selected weight, tinted surface and 4px rule make interaction obvious without solid-colour boxes. Each label has its own separate 24px help button, not nested in the filter. 64px numbers/16px labels fit five desktop columns and wrap 5→3→2 without illegible sizing.
- **One shared governance list:** current lenses use Investment / Review Trigger / Findings / Decision Timing / Next Step; recorded swaps Decision / Decision Date in the same grid. The heading has no visible repeated total (live count is sr-only). Decorative 01/02/03 indexes sit inside the left row margin, separate from the urgent accent. Strong investment names, readable headings, compact high-contrast findings and explicit timing retain orientation without spreadsheet grid lines. Emerging chips expose concise accessible meanings; no extra explanation row/icon.
- **Portfolio:** all loaded investments retain derived state/latest decision/next review. Open Investment → workspace Overview; active Open Review → Current Review; stopped View Record → History. The refined register, neutral outcomes/state chips and data semantics are unchanged.
- **Persistent investment workspace:** one identity/source/governance header owns Overview / Current Review / History. Secondary tabs use quiet text and selected rules, proper tab semantics/arrow keys, no breadcrumbs. The investment name remains visible while changing tabs/stages; Portfolio stays globally active even for records entered from Dashboard. Overview owns Current Governance actions, context, evidence and collapsed diagnostics; no full history or review forms.
- **Repeated review cycles:** Start Review / Start New Review belong to Overview. Non-Stop cycles may repeat, Stop cannot restart. Current Review contains the active cycle only; History has every completed cycle, newest first, one neutral ledger and one selected immutable detail area. Previous decisions remain visible while new work is active. No step preference or display state is persisted.
- **Automatic loading:** a configured key starts one project refresh while Dashboard remains visible. Opening an investment loads structure, then dependent financial/procurement evidence. Happy-path success is quiet; refresh/retry are secondary. Failures do not auto-loop. HTTP status/raw diagnostics never lead the normal workflow.
- **Three evidence cards:** Project Structure, Financial Activity, Procurement Activity. One state, actual count and short qualification. One collapsed Technical Details section near the bottom retains all original tables, raw responses, HTTP/filter diagnostics and provenance. No nested technical toggles on Investment Details.
- **Current Review:** Continuation Review heading, compact trigger/due context, connected Assessment / Review Summary / Governance Decision wizard. Completed buttons navigate backward only; current/upcoming are disabled. The persistent tabs replace investment exit/breadcrumb chrome. Safe re-entry derives incomplete→Assessment / ready→Review Summary, never Decision. Six native groups/defaults, validation and draft saving remain.
- **Short Summary:** a two-column/three-row categorical signal matrix is central, followed by grouped Management Attention, horizontal governance timeline and three evidence rows. Optional reviewer context and a link to Investment Technical Details avoid repeating context/raw lists.
- **Timeline:** actual opened/14-day/30-day milestones with text status. Dates are concise; exact UTC timestamps remain in time elements, accessible names and hover titles. Geometry denotes milestone order, not elapsed-time scale. Recorded milestones retain actual chronological position.
- **Decision:** five spacious native radio cards with neutral descriptions/no default. Required fields have red asterisks plus native required/accessibility semantics; conditional markers follow existing rules. Accountability and follow-up are grouped surfaces. Stop hides/disables Next Review, with a concise terminal-outcome explanation; optional closure work remains possible. Record Decision retains human rationale/owner validation.
- **Workflow grammar:** outside the workspace, Open Review is uniform. Inside, Continue to Review Summary → / Continue to Governance Decision → / Record Decision describe progression. Previous-stage actions remain secondary. Recording ends the current cycle and selects History/new record, with a small save acknowledgement. There is no standalone confirmation page or fourth step; optional fresh-record Back to Dashboard retains its one-time recorded-lens context.
- **Executive restraint:** no per-project explanation rows, global methodology popup or sixth help icon. Five concise lens definitions explain current overlap/counting/history where needed; hover/focus/tap, Escape/outside dismiss and stable refresh behaviour remain accessible. Calibration/methodology belongs in review context/documentation. No assessment hints infer classifications or outcomes.
- **History record:** View Record expands the exact ledger ID in one detail area beneath the rows, not a new screen. Neutral outcome/owner/time, rationale/follow-up and saved timing/assessment/evidence remain. Only the small fresh-save acknowledgement is green. Switching rows changes selection; clicking the selected row can collapse it. Unknown storage never claims no history.
- **Owner configuration:** immutable fictional Alex Lee, Morgan Chen and Taylor Singh roles live only in governance-directory.js. Normal deferred JS populates immediately even on local-file loads; no JSON fetch. This does not make SAP file-origin requests supported or create authenticated authority.

### Final portfolio baseline

Show five immediately available SHOWCASE investments, then live SAP SANDBOX projects, distinguished by small per-project badges—not modes or a global legend. A quiet footer explains the two sources and offers confirmed Reset Showcase. Default records demonstrate normal/no review, emerging deterioration, material concerns, an explicit cost evidence gap and a synthetic historical Stop through the same workflow. Never overwrite a user's completed showcase decision on refresh.

Showcase-only Investment Context is a compact flat business summary of approved/forecast context and derived posted/procurement/remaining-forecast figures, plus completion dates and the concise review reason. Do not repeat its project/company strip or add invented context to live projects. Historical figures are labelled pre-Stop; unknown forecast stays Not validated. Evidence cards and one collapsed Technical Details remain underneath. Raw showcase payloads are explicitly synthetic SAP-schema-compatible, never labelled live SAP data.

The six-dimension matrix uses the central prototype convention: normal green/positive-neutral, emerging amber, material red, evidence gap grey/neutral, unassessed unfilled. Text markers accompany colour. A Material trigger explains why the review began, not a classified finding. No numeric materiality threshold, score or recommended outcome is implied; production governance/pilot must calibrate policy. Seeded assessments stay editable, with project-level SHOWCASE provenance rather than repeated field badges. Preserve Assessment → Summary → Decision without restoring a control rail.

This is reusable component anatomy. Lens tones are #006491 / #b42318 / #d15a35 / #4f6cc9 / #7257b3; small material/emerging/gap text uses darker #a83d21 / #905400 / #3e55aa on restrained tints for contrast. These are governance-specific aliases, not a reclassification of brand red or decision outcomes. Native focus/aria-pressed/live counts remain, with counts visually hidden. Dashboard normally enters Active Reviews; fresh-record closure selects Recorded Decisions once. No preference persistence, new route, gradient or decorative animation.

Executive polish: 16px body baseline, ~42px main titles and 64px desktop lens numbers (52px phone); the integrated strip, white row surfaces and grey canvas establish hierarchy. Portfolio/History keep semantic tables with subtle horizontal rules. Workspace Overview groups evidence/context; Current Review retains the six-dimension matrix, Management Attention and timeline. Inline History records use the same formal neutral component language. No gradients, imagery or pervasive shadows; only small help overlays have light elevation.

Semantic polish: active cycles suppress previous-cycle Next Review in current presentation while history retains it. Store.start now guards latest Stop by actual decision date, and new Stop confirmations omit Next Review even from direct service calls. Old recorded snapshots are never migrated. Required markers follow conditional native flags; no assessment classification, 14/30-day policy, owner model or five-outcome change.

Polish verification: 97 Node tests, 123-ID contract and syntax/static checks; isolated Edge exercised all Dashboard modes, ready Summary, rejected empty Decision, required Modify fields, Stop date toggling/recording, service-level Stop guard, immutable history and the new-cycle Portfolio date suppression. Desktop/laptop/mobile screenshots of all workflow views were inspected; 320–1440px layouts had no page overflow or console errors. Existing showcase data only; no new live SAP validation. Client-projector readability, other engines and formal screen-reader/WCAG review remain nice-to-have validation.

Workflow/hierarchy verification: 103 Node tests, 120-ID contract; isolated Edge reviewed all five lenses and Assessment/Summary/Decision/Confirmation at 1440/1280/1024/768/390px. Hoverable/focusable help, physical emulated touch, Escape, hidden live counts, decorative indexes, selected states and action hierarchy passed without page overflow/console errors. Portfolio QA included Monitoring, active/ready, Follow-up, Paused/Stopped and long names through real showcase review cycles. Material/emerging/gap chip text measured 5.51:1 minimum; large metric numbers ≥4.01:1 on white and ≥3.69:1 on selected surfaces. Mobile inspection prompted label-aligned help positioning; latest-decision dates were quietened without leading separators. This is qualitative product QA, not formal cross-engine/screen-reader/projector certification.

Workspace consolidation supersedes the older peer-screen/confirmation presentation: 114 Node tests and the 135-ID contract cover persistent tabs, all governance states, safe stage entry, backward-only steps, preserved drafts, exact/multiple historical cycles, Stop, unavailable storage and absent live context. Isolated Edge inspected Overview, all Current Review stages and History/record expansion at 1440/1280/1024/768/390px with no overflow or console errors. The first screenshot pass exposed heavy default focus rectangles on programmatically focused headings/stages; only those non-interactive focus targets were quietened, while tabs/buttons/fields retain visible keyboard rings. Historical-only snapshots are explicitly labelled, do not auto-fetch fresh data and cannot start a new cycle until current portfolio context exists. Review Trigger help is reused; Findings help hides in recorded mode. No business/SAP/store/rule changes or external dependencies.

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

Earlier product-model verification (17 October 2026): 84 Node regressions covered derived Portfolio states, completed records, repeated immutable cycles, Stop protection, per-investment history, absent live context and unavailable storage. Those contracts remain; portfolio-wide completed history now lives in Dashboard Recorded Decisions, not a separate page.

Consolidation verification (17 October 2026): 91 Node tests and the 119-ID frontend contract cover five lenses, completed-cycle counts without deduplication/cap, dynamic columns and one-time post-decision selection. Isolated Edge checked all lenses, Modify → record → Recorded Decisions (active 3→2, recorded 1→2), normal-nav/reload defaults, Review History, Start New Review and Stop protection. Desktop/laptop/mobile screenshots were inspected; all five modes fit at 320/390/768/1024/1100/1280/1440px with no console errors. Large numbers remain about 49px desktop / 42px phone, labels 15px / 14.25px. Existing showcase supplied QA; no new live SAP call. Other engines, formal screen-reader/WCAG and projector checks remain uncertified.
