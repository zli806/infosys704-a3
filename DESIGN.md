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
- **Real chart:** lightweight labelled HTML/CSS horizontal bars count material concerns, attention items, evidence gaps and overdue open reviews from reviewSignals()/timing(). Shared count scale; textual counts stay accessible. No active signals means an empty message, not fabricated bars. Storage failure is not zero.
- **Automatic loading:** a configured key starts one project refresh while Dashboard remains visible. Opening an investment loads structure, then dependent financial/procurement evidence. Happy-path success is quiet; refresh/retry are secondary. Failures do not auto-loop. HTTP status/raw diagnostics never lead the normal workflow.
- **Three evidence cards:** Project Structure, Financial Activity, Procurement Activity. One state, actual count and short qualification. One collapsed Technical Details section near the bottom retains all original tables, raw responses, HTTP/filter diagnostics and provenance. No nested technical toggles on Investment Details.
- **Assessment:** three-step header plus compact human-selected trigger/due date. Two desktop groups: Investment Case and Delivery & Risk. Six native radio groups retain Not assessed defaults and visible checked/Selected states. Owner follows; optional comments/dependencies are collapsed. Missing items appear only after Review Summary is attempted.
- **Short Summary:** a two-column/three-row categorical signal matrix is central, followed by grouped Management Attention, horizontal governance timeline and three evidence rows. Optional reviewer context and a link to Investment Technical Details avoid repeating context/raw lists.
- **Timeline:** actual opened/14-day/30-day milestones with text status. Dates are concise; exact UTC timestamps remain in time elements, accessible names and hover titles. Geometry denotes milestone order, not elapsed-time scale. Recorded milestones retain actual chronological position.
- **Decision:** five spacious native cards with neutral descriptions and no default choice. Existing conditional follow-up expands; the selected owner/name/role is a small read-only accountability card. Record Decision validates the unchanged rules/store on submit.
- **Record:** outcome hero, project/name, owner/role/date, then separate rationale and follow-up sections rather than a key/value dump. Saved provenance/snapshots remain secondary.
- **Owner configuration:** immutable fictional Alex Lee, Morgan Chen and Taylor Singh roles live only in governance-directory.js. Normal deferred JS populates immediately even on local-file loads; no JSON fetch. This does not make SAP file-origin requests supported or create authenticated authority.

This is reusable component anatomy, not final brand approval. Jerry retains latitude over DPE branding, final colours/type, spacing, borders/shadows, banners/footer, icons, component sizes and relative visual emphasis. Keep the accepted tokens as the baseline rather than introducing a replacement theme or CSS framework.

Verification retains engineering tests, CI, static checks and the remote SAP validator. Qualitative manager self-checks are not formal timed user studies; Jerry still owns the final client-projection/usability and brand refinement.

Customer-pass smoke check: real TEMP003 loaded automatically (5 projects, 4 components, 40 accounting entries, no matching PO records). Mixed assessment, GOV-001, chart counts, short Summary, Modify follow-up, confirmation and reload persistence passed; only the labelled QA record was removed. A simulated network failure showed one concise error/no retry loop; explicit Retry restored the real projects. 390px/1280px embedded-viewport checks found no page overflow and the expected one/two-column assessment and matrix. Normal visible text contained no HTTP 200 and the single technical area stayed collapsed. Qualitative structure checks passed for immediate attention, understandable evidence and an internals-free review path. Screenshot and desktop-key delivery were unavailable in the browser harness: choices were exercised through native DOM controls, not a certified keyboard/projector visual study. Final visual confidence remains Jerry's review.

## Do's and Don'ts

- Keep exact raw SAP codes when no authoritative text mapping exists.
- Keep partial financial postings and procurement indicators qualified; currencies remain separate.
- Keep source-labelled snapshots distinguishable from fresh retrieval.
- Preserve all existing enums, readiness/decision rules, UTC target calculation and storage boundaries.
- Respect reduced motion and visible keyboard focus; never use color as the only indicator.
- Preserve safe textContent rendering and Git-ignored local credentials.
