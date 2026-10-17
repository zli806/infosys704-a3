---
version: alpha
colors:
  brandBlue: "#006491"
  brandRed: "#E31837"
  canvas: "#fafbfc"
  ink: "#20324b"
  muted: "#596b7e"
  background: "#f3f6fa"
  surface: "#ffffff"
  border: "#d8e1eb"
  primary: "#146b9a"
  action: "#146b9a"
  actionHover: "#105477"
  secondary: "#eaf1f7"
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
    fontSize: "15px"
    lineHeight: "1.55"
  heading:
    fontFamily: '"Avenir Next", "Segoe UI", system-ui, sans-serif'
rounded:
  panel: "10px"
  control: "6px"
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

Shared shell: white top navigation with the existing local geometric red/blue mark, a DPE/app-name lockup and Dashboard / Portfolio / Decisions. The mark is a prototype asset, not an official Domino's logo. Brand blue/red are reserved for this lockup and the short active-navigation rule; muted rust/ochre/slate remain governance semantics. There is no left sidebar, tagline or extra global control. Existing navigation IDs, focus and callbacks remain. The shared canvas is nearly white; working surfaces stay white and secondary surfaces retain the existing cool-neutral tokens.

Document scrolling owns page height. Tables have keyboard-focusable horizontal overflow; raw captures have bounded scrolling. At narrow widths dashboard/evidence columns, assessment groups, matrix and timeline stack; navigation moves above content. All actions remain available without horizontal page overflow.

## Elevation & Depth

Flat surfaces with a thin border. Do not add marketing gradients, hero artwork, invented financial charts or fabricated metrics. Technical details are available through disclosure; errors remain visible outside collapsed technical data.

## Shapes

`rounded.panel` → `--radius-panel`; `rounded.control` → `--radius-control`. Status badges use a smaller radius. Primary, secondary, disabled and focus treatments are shared globally. Buttons have stable minimum widths during SAP loading.

## Components

Canonical owners: `styles.css` owns shell/panels/buttons/fields/tables/scrollbars. `js/ui/renderers.js` owns SAP tables, status feedback and English dates; `js/ui/governance.js` owns evidence overview, navigation, native form control binding and local-review presentation. `docs/UI_CONTRACT.md` owns functional hooks and behavior.

Keep native controls: assessment/decision fieldsets use visible labelled radios, with explicit unassessed/no-decision defaults. Review Trigger and prototype-directory owner use selects; date-picker language and select popup geometry remain platform-owned. Product labels/help/rendered dates stay English. Textareas grow; forms retain novalidate and the rule/store owner. No new libraries, framework or build step. These product controls reuse the accepted tokens; final visual refinement remains with UI/UX.

### Customer-facing components

- **Interactive executive status strip:** Portfolio Governance and the actual investment count are the only Dashboard header layers. The four metrics themselves are buttons—Active Reviews, Overdue, Material Concerns, Evidence Gaps—with no second tab bar or visible Portfolio Pulse heading. Large status-coloured numbers, readable labels, thin separators and one selected surface/bottom rule make summary and filtering one system, not four cards. Material/gap counts are distinct matching investments, never signal totals.
- **One filtered review list:** the heading/count explains the selected subset, while the same Investment / Review Trigger / Findings / Decision Timing / Next Step grid is reused. Readable semibold desktop headings align with rows and become field labels when stacked. Counts match displayed records; detailed row chips may show multiple findings. All row actions share one clear blue treatment; urgency uses a thin rule/text, not special fill. Filter interaction/composition and Recent Decisions remain frozen. The sole help adds the overlapping-lenses explanation.
- **Portfolio / Decisions:** Dashboard is the visual reference, not redesigned to match older pages. Portfolio lists every loaded investment with derived governance state, latest decision, stored next review and contextual next step; generic Start/End columns are secondary Detail metadata. Decisions replaces the mixed Reviews destination with an immutable completed-only register. Both reuse the executive canvas/width, typography, thin rules, source badges and neutral chips; narrow rows stack with readable labels.
- **Repeated review cycles:** investments outlive reviews. No active review means Start Review for a first cycle, or Start New Review after non-Stop completion; View Latest Decision remains secondary. Stop offers only View Decision. A secondary thin-rule Review History below current evidence shows completed cycles newest first. All new cycles preserve old snapshots; no auto-review date logic or persisted display status is added.
- **Automatic loading:** a configured key starts one project refresh while Dashboard remains visible. Opening an investment loads structure, then dependent financial/procurement evidence. Happy-path success is quiet; refresh/retry are secondary. Failures do not auto-loop. HTTP status/raw diagnostics never lead the normal workflow.
- **Three evidence cards:** Project Structure, Financial Activity, Procurement Activity. One state, actual count and short qualification. One collapsed Technical Details section near the bottom retains all original tables, raw responses, HTTP/filter diagnostics and provenance. No nested technical toggles on Investment Details.
- **Assessment:** three-step header plus compact human-selected trigger/due date. Two desktop groups: Investment Case and Delivery & Risk. Six native radio groups retain Not assessed defaults and visible checked/Selected states. Owner follows; optional comments/dependencies are collapsed. Missing items appear only after Review Summary is attempted.
- **Short Summary:** a two-column/three-row categorical signal matrix is central, followed by grouped Management Attention, horizontal governance timeline and three evidence rows. Optional reviewer context and a link to Investment Technical Details avoid repeating context/raw lists.
- **Timeline:** actual opened/14-day/30-day milestones with text status. Dates are concise; exact UTC timestamps remain in time elements, accessible names and hover titles. Geometry denotes milestone order, not elapsed-time scale. Recorded milestones retain actual chronological position.
- **Decision:** five spacious native cards with neutral descriptions and no default choice. Existing conditional follow-up expands; the selected owner/name/role is a small read-only accountability card. Record Decision validates the unchanged rules/store on submit.
- **Resume and accountability:** incomplete active reviews resume Assessment; ready ones resume Summary, never skip the checkpoint. Contextual investment CTAs lead to Make Governance Decision. Immediately before the five cards, compact signal counts explain context without deciding an outcome. Material concerns add non-blocking rationale guidance; all five outcomes remain available and all require rationale under the unchanged rules.
- **Executive restraint:** there are no per-project Why is this flagged? controls or extra reasoning rows. Project-specific assessment reasoning remains in Review Summary. The single question-mark help retains the prototype definitions, timing/severity distinction and calibration caveat; hover, focus, Escape and touch toggling stay accessible. No extra classification cues appear beside assessment inputs.
- **Record:** outcome hero, project/name, owner/role/date, then separate rationale and follow-up sections rather than a key/value dump. Saved provenance/snapshots remain secondary.
- **Owner configuration:** immutable fictional Alex Lee, Morgan Chen and Taylor Singh roles live only in governance-directory.js. Normal deferred JS populates immediately even on local-file loads; no JSON fetch. This does not make SAP file-origin requests supported or create authenticated authority.

### Final portfolio baseline

Show five immediately available SHOWCASE investments, then live SAP SANDBOX projects, distinguished by small per-project badges—not modes or a global legend. A quiet footer explains the two sources and offers confirmed Reset Showcase. Default records demonstrate normal/no review, emerging deterioration, material concerns, an explicit cost evidence gap and a synthetic historical Stop through the same workflow. Never overwrite a user's completed showcase decision on refresh.

Showcase-only Investment Context is a compact flat business summary of approved/forecast context and derived posted/procurement/remaining-forecast figures, plus completion dates and the concise review reason. Do not repeat its project/company strip or add invented context to live projects. Historical figures are labelled pre-Stop; unknown forecast stays Not validated. Evidence cards and one collapsed Technical Details remain underneath. Raw showcase payloads are explicitly synthetic SAP-schema-compatible, never labelled live SAP data.

The six-dimension matrix uses the central prototype convention: normal green/positive-neutral, emerging amber, material red, evidence gap grey/neutral, unassessed unfilled. Text markers accompany colour. A Material trigger explains why the review began, not a classified finding. No numeric materiality threshold, score or recommended outcome is implied; production governance/pilot must calibrate policy. Seeded assessments stay editable, with project-level SHOWCASE provenance rather than repeated field badges. Preserve Assessment → Summary → Decision without restoring a control rail.

This is reusable component anatomy. The status strip uses stronger navy/action-blue, governance red, warm rust and slate on large numbers and selected rules, not large colour fills. Native buttons retain visible focus and aria-pressed; the live list heading/count updates without moving focus or changing route. Active Reviews is the default on entry, selection stays while using Dashboard, and no filter preference is persisted. The logo/brand lockup and Assessment/Summary/Decision/Confirmation layouts are untouched. There are no gradients, drop shadows, metric cards, extra charts or decorative animation.

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

Status-filter verification (17 October 2026): 74 regressions include count/row equality for every filter, multiple-material and simulated multiple-gap signal arrays counted as one investment, ordering/ties, selection refresh/default behaviour and unchanged Recent Decisions/Portfolio/Reviews. Native Edge Tab/Space/Enter, help hover/focus/Escape, 320–1440px layouts and screenshots passed with no console errors. Desktop numbers measured about 49px and labels 15px. The logo asset/header brand area and all business/data/decision rules remain unchanged; this is not formal cross-browser or screen-reader certification.

Product-model verification (17 October 2026): 84 Node regressions and the 123-ID contract cover derived Portfolio states, completed-only Decisions, repeated immutable cycles, Stop protection, per-investment history, absent live context and unavailable storage. Isolated native Edge exercised ready → Summary → Modify → record → Start New Review, preserving old history and updating Dashboard counts; Stop had no restart action. Desktop queue headings measured 13.5px with exact grid alignment. Portfolio/Decisions/Detail desktop and mobile screenshots were inspected; 320–1440px layouts fit without console errors. Existing showcase data supplied this QA; no live SAP call was required. Other engines, screen-reader testing and client-projector readability remain uncertified.
