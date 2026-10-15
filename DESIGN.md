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

Jerry approved the review-workspace direction on 14 October 2026. The interface serves a portfolio/PMO reviewer preparing an accountable continuation decision. Preserve the existing eight views, SAP services, captured records and five human outcomes. This is a product workspace, with visual expression concentrated in the evidence/source distinction rather than decoration.

The signature is a readable path from **SAP evidence → reviewer assessment → human decision**, with system controls visible beside the assessment. Keep the navy sidebar; use blue for actions, purple for reviewer input, and text-labelled states for evidence.

## Colors

Runtime ownership: **styles.css :root is canonical (Model B)**. The frontmatter mirrors its accepted palette; the CSS is hand-maintained, not generated. `colors.background` maps to `--color-bg`, `colors.surface` to `--color-paper`, `colors.border` to `--color-line`; other semantic names map to corresponding kebab-case `--color-*` variables. Scrollbar colors map to `--color-scroll-thumb` / `--color-scroll-track`. `colors.primary` is the documentation alias of `colors.action`, mapping to the same `--color-action` owner. All screens consume these shared variables.

Success means a successfully returned result; a zero-match result is a labelled warning, not failed connectivity or a zero project-cost claim. Loading supersedes captured evidence. Error, unavailable and not-loaded states remain distinct. Source labels and explanatory text supplement color.

## Typography

`typography.body` maps to `--font-body`; `typography.heading` maps to `--font-heading`. Use local font fallbacks to avoid downloads and font swaps. Short labels use explanatory help below the field. English display dates use en-NZ and preserve UTC interpretation; native date-picker chrome follows the user's browser/OS locale.

## Layout

Desktop shell: navy sidebar, compact page title/connection strip, project title/actions and four-field context strip. Investment evidence occupies the main column, with a quiet human-review guide alongside. Assessment/summary/decision share a step indicator and a control rail. Dashboard and Reviews use the same panel/table vocabulary.

Document scrolling owns page height. Evidence tables own horizontal overflow only; raw captures have bounded internal scrolling. Forms have natural height, including long comments. At 980px the control rail moves below the form; at 700px navigation moves above content and fields stack. No mobile-only functions are introduced.

## Elevation & Depth

Flat surfaces with a thin border. Do not add marketing gradients, hero artwork, invented financial charts or fabricated metrics. Technical details are available through disclosure; errors remain visible outside collapsed technical data.

## Shapes

`rounded.panel` → `--radius-panel`; `rounded.control` → `--radius-control`. Status badges use a smaller radius. Primary, secondary, disabled and focus treatments are shared globally. Buttons have stable minimum widths during SAP loading.

## Components

Canonical owners: `styles.css` owns shell/panels/buttons/fields/tables/scrollbars. `js/ui/renderers.js` owns SAP tables, status feedback and English dates; `js/ui/governance.js` owns evidence overview, navigation, native form control binding and local-review presentation. `docs/UI_CONTRACT.md` owns functional hooks and behavior.

Keep native controls: assessment/decision fieldsets use visible labelled radios, with explicit unassessed/no-decision defaults. Review Trigger and prototype-directory owner use selects; date-picker language and select popup geometry remain platform-owned. Product labels/help/rendered dates stay English. Textareas grow; forms retain novalidate and the rule/store owner. No new libraries, framework or build step. These product controls reuse the accepted tokens; final visual refinement remains with UI/UX.

## Do's and Don'ts

- Keep exact raw SAP codes when no authoritative text mapping exists.
- Keep partial financial postings and procurement indicators qualified; currencies remain separate.
- Keep source-labelled snapshots distinguishable from fresh retrieval.
- Preserve all existing enums, readiness/decision rules, UTC target calculation and storage boundaries.
- Respect reduced motion and visible keyboard focus; never use color as the only indicator.
- Preserve safe textContent rendering and Git-ignored local credentials.
