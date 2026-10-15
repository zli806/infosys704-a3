---
version: alpha
colors:
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

`typography.body` maps to `--font-body`; `typography.heading` maps to `--font-heading`. Use local font fallbacks to avoid downloads and font swaps. Short labels use explanatory help below the field. English display dates use en-NZ and preserve UTC interpretation; native date-picker chrome follows the user's browser/OS locale.

## Layout

Desktop shell: navy navigation, generous whitespace, quiet surfaces and clear primary actions. No global source legend or persistent review rail. Source labels appear only where useful; prototype/Sandbox context is a small footer note.

Document scrolling owns page height. Tables have keyboard-focusable horizontal overflow; raw captures have bounded scrolling. At narrow widths dashboard/evidence columns, assessment groups, matrix and timeline stack; navigation moves above content. All actions remain available without horizontal page overflow.

## Elevation & Depth

Flat surfaces with a thin border. Do not add marketing gradients, hero artwork, invented financial charts or fabricated metrics. Technical details are available through disclosure; errors remain visible outside collapsed technical data.

## Shapes

`rounded.panel` → `--radius-panel`; `rounded.control` → `--radius-control`. Status badges use a smaller radius. Primary, secondary, disabled and focus treatments are shared globally. Buttons have stable minimum widths during SAP loading.

## Components

Canonical owners: `styles.css` owns shell/panels/buttons/fields/tables/scrollbars. `js/ui/renderers.js` owns SAP tables, status feedback and English dates; `js/ui/governance.js` owns evidence overview, navigation, native form control binding and local-review presentation. `docs/UI_CONTRACT.md` owns functional hooks and behavior.

Keep native controls: assessment/decision fieldsets use visible labelled radios, with explicit unassessed/no-decision defaults. Review Trigger and prototype-directory owner use selects; date-picker language and select popup geometry remain platform-owned. Product labels/help/rendered dates stay English. Textareas grow; forms retain novalidate and the rule/store owner. No new libraries, framework or build step. These product controls reuse the accepted tokens; final visual refinement remains with UI/UX.

### Customer-facing components

- **Attention dashboard:** Open Reviews, Material Concerns, Evidence Gaps, Decisions Recorded; small investment-availability context. Below: Governance Attention Profile beside Needs Attention, then Recent Decisions. Other open reviews are secondary and exclude flagged duplicates.
- **Real chart:** lightweight labelled HTML/CSS horizontal bars count material concerns, emerging concerns, evidence gaps and overdue open reviews from reviewSignals()/timing(). Shared count scale; textual counts stay accessible. No active signals means an empty message, not fabricated bars. Storage failure is not zero.
- **Automatic loading:** a configured key starts one project refresh while Dashboard remains visible. Opening an investment loads structure, then dependent financial/procurement evidence. Happy-path success is quiet; refresh/retry are secondary. Failures do not auto-loop. HTTP status/raw diagnostics never lead the normal workflow.
- **Three evidence cards:** Project Structure, Financial Activity, Procurement Activity. One state, actual count and short qualification. One collapsed Technical Details section near the bottom retains all original tables, raw responses, HTTP/filter diagnostics and provenance. No nested technical toggles on Investment Details.
- **Assessment:** three-step header plus compact human-selected trigger/due date. Two desktop groups: Investment Case and Delivery & Risk. Six native radio groups retain Not assessed defaults and visible checked/Selected states. Owner follows; optional comments/dependencies are collapsed. Missing items appear only after Review Summary is attempted.
- **Short Summary:** a two-column/three-row categorical signal matrix is central, followed by grouped Management Attention, horizontal governance timeline and three evidence rows. Optional reviewer context and a link to Investment Technical Details avoid repeating context/raw lists.
- **Timeline:** actual opened/14-day/30-day milestones with text status. Dates are concise; exact UTC timestamps remain in time elements, accessible names and hover titles. Geometry denotes milestone order, not elapsed-time scale. Recorded milestones retain actual chronological position.
- **Decision:** five spacious native cards with neutral descriptions and no default choice. Existing conditional follow-up expands; the selected owner/name/role is a small read-only accountability card. Record Decision validates the unchanged rules/store on submit.
- **Resume and accountability:** incomplete active reviews resume Assessment; ready ones resume Summary, never skip the checkpoint. Contextual investment CTAs lead to Make Governance Decision. Immediately before the five cards, compact signal counts explain context without deciding an outcome. Material concerns add non-blocking rationale guidance; all five outcomes remain available and all require rationale under the unchanged rules.
- **Explainability on demand:** collapsed Why is this flagged? disclosures expose dimension/value findings and distinct timing urgency. Native chart buttons reveal one compact inline breakdown, distinguishing signal counts from affected reviews. Empty categories are disabled; explanations refresh with open records and close when no longer applicable. Collapsed How signals work explains the prototype convention/calibration boundary. No extra classification cues appear alongside assessment inputs.
- **Record:** outcome hero, project/name, owner/role/date, then separate rationale and follow-up sections rather than a key/value dump. Saved provenance/snapshots remain secondary.
- **Owner configuration:** immutable fictional Alex Lee, Morgan Chen and Taylor Singh roles live only in governance-directory.js. Normal deferred JS populates immediately even on local-file loads; no JSON fetch. This does not make SAP file-origin requests supported or create authenticated authority.

### Final portfolio baseline

Show five immediately available SHOWCASE investments, then live SAP SANDBOX projects, distinguished by small per-project badges—not modes or a global legend. A quiet footer explains the two sources and offers confirmed Reset Showcase. Default records demonstrate normal/no review, emerging deterioration, material concerns, an explicit cost evidence gap and a synthetic historical Stop through the same workflow. Never overwrite a user's completed showcase decision on refresh.

Showcase-only Investment Context is a compact flat business summary of approved/forecast context and derived posted/procurement/remaining-forecast figures, plus completion dates and the concise review reason. Do not repeat its project/company strip or add invented context to live projects. Historical figures are labelled pre-Stop; unknown forecast stays Not validated. Evidence cards and one collapsed Technical Details remain underneath. Raw showcase payloads are explicitly synthetic SAP-schema-compatible, never labelled live SAP data.

The six-dimension matrix uses the central prototype convention: normal green/positive-neutral, emerging amber, material red, evidence gap grey/neutral, unassessed unfilled. Text markers accompany colour. A Material trigger explains why the review began, not a classified finding. No numeric materiality threshold, score or recommended outcome is implied; production governance/pilot must calibrate policy. Seeded assessments stay editable, with project-level SHOWCASE provenance rather than repeated field badges. Preserve Assessment → Summary → Decision without restoring a control rail.

This is reusable component anatomy. The approved final refinement retains the shared palette and local typography: navy navigation, white surfaces, blue primary actions, red material concerns, amber emerging concerns and neutral evidence gaps. Dashboard gives Needs Attention the first/larger column and makes metrics/chart secondary. Summary presents the existing decision action beside signal counts, owner and deadline before a compact three-column desktop matrix. At smaller widths it stacks without clipping actions or forms. Showcase investment figures are split into primary approved/forecast/variance and quieter supporting activity figures. A saved-record acknowledgement stays green while the selected outcome is neutral. The 14/30-day timeline, human decision boundary and source/financial qualifications stay visible. No replacement theme, external fonts, decorative icons or CSS framework are introduced.

Verification retains engineering tests, CI, static checks and the remote SAP validator. Qualitative manager self-checks are not formal timed user studies; Jerry still owns the final client-projection/usability and brand refinement.

Pre-handover verification (15 October 2026): 54 credential-free tests include both controller paths, all five outcomes with material concerns, explanations and the retained actual-spec/financial contracts. Real-browser checks exercised ready hero → Summary → keyboard-selected Modify → record/reload, plus new Infrastructure → incomplete Assessment → Summary → human Continue. Native Enter/Space/arrow operation and expanded 390/1280px layouts were verified in isolated headless Edge; dashboard/decision screenshots were reviewed. Reset restored the four default showcase records. Current live TEMP003 remained 4 components / 40 G/L links / 0 PO matches, without invented context or visible HTTP success text. These qualitative self-checks are not formal timed studies or client-projector certification; final visual/BA/PO validation remains with the team.

## Do's and Don'ts

- Keep exact raw SAP codes when no authoritative text mapping exists.
- Keep partial financial postings and procurement indicators qualified; currencies remain separate.
- Keep source-labelled snapshots distinguishable from fresh retrieval.
- Preserve all existing enums, readiness/decision rules, UTC target calculation and storage boundaries.
- Respect reduced motion and visible keyboard focus; never use color as the only indicator.
- Preserve safe textContent rendering and Git-ignored local credentials.
