# INFOSYS 704 A3 – Decision Log

This file records current decisions that should guide development.

If a later decision conflicts with an earlier one, the later dated decision takes precedence.

---

## 2026-10-12 – Domain and A2 Solution

**Decision**  
Use the Financial domain and Harneet Singh's A2-D1 solution as the basis for A3.

**Solution**  
Stage-Gated Portfolio Continuation Review Process for material IT investments.

**Reason**  
The group has already selected the Financial domain. The A2 solution provides a clear process, governance logic and decision flow that can be implemented as a focused prototype.

---

## 2026-10-12 – A3 Option Positioning

**Decision**  
Use **Option 2 – partially fit** as the current working assumption.

**Reason**  
SAP APIs can support project lifecycle, milestones and financial evidence strongly, but strategic alignment, expected benefits, some risks / dependencies and future economic value may still require human-entered or prototype-local information.

**Status**  
Working assumption. Reassess after sandbox testing.

---

## 2026-10-12 – API Selection

**Decision**

Core APIs:

1. Enterprise Project
   - `API_ENTERPRISE_PROJECT_SRV_0002.json`

2. G/L Account Line Items - Read
   - `API_GLACCOUNTLINEITEM.json`

3. Purchase Order OData V4
   - `CE_PURCHASEORDER_0001.json`

Stretch API:

4. Purchase Requisition OData V4
   - `CE_PURCHASEREQUISITION_0001.json`

**Reason**  
Together these APIs support project/milestone evidence, actual financial postings, purchasing commitments and optional future procurement pipeline.

---

## 2026-10-12 – Human Decision Boundary

**Decision**  
AI will not make the final Continue / Continue with Conditions / Modify / Pause / Stop decision.

**Reason**  
The original A2 solution explicitly positions integrated information and the dashboard as decision support rather than a replacement for governance judgement.

---

## 2026-10-12 – Scope Principle

**Decision**  
Prioritise one complete, polished continuation-review journey over many generic features.

**Core journey**

Review Queue  
→ Continuation Review Pack  
→ AI Review Brief  
→ Human Continuation Decision  
→ Decision Record

**Reason**  
The prototype should demonstrate the highest-value part of the A2 solution clearly and reliably rather than becoming a broad but shallow ERP dashboard.

---

## 2026-10-12 – Purchase Requisition

**Decision**  
Treat Purchase Requisition as stretch scope.

**Reason**  
It provides useful forward-looking procurement pipeline information, but it is not required to prove the core continuation-review workflow.

**Go / No-Go Rule**  
Only integrate it into the final MVP if:
- the sandbox data can be related meaningfully to the project/WBS context; and
- it does not delay or destabilise the core flow.

---

## 2026-10-12 – Initial Technical Path

**Decision**  
Before implementing the complete MCP / agent architecture, first prove direct SAP Sandbox API connectivity using the tutor's local HTML/CSS/JavaScript approach.

**First test**  
Enterprise Project API.

**Reason**  
This isolates API connectivity, response parsing and sandbox-data issues before MCP adds another technical layer.

---

## 2026-10-12 – API Key Handling

**Decision**  
Use a local `config.local.js` file for the SAP Sandbox API key during the local prototype test.

**Rules**
- never hard-code the real key into `app.js`, `index.html`, API specs or documentation;
- never print the key in the UI or console;
- include `config.local.js` in `.gitignore`;
- keep a safe `config.example.js` placeholder for sharing;
- if the project later becomes more production-like, move secrets behind a backend/proxy rather than treating browser-side config as truly secret.

---

## Open Decisions

- Whether sandbox records from Enterprise Project, G/L and Purchase Order join cleanly through project/WBS identifiers.
- Whether Purchase Requisition will be included in the final prototype.
- Final MCP authentication / subscription pattern after the next lab.
- Exact material-trigger rules to implement in code versus demonstrate as configured prototype logic.
- Final approach for persisting human-entered strategic / benefit / risk evidence and decision records.

---

## 2026-10-14 – Sandbox lifecycle-data finding

The five tested SAP Sandbox projects contained project elements and real WBS IDs. None of the 26 returned elements were flagged as SAP project milestones or main milestones (`IsProjectMilestone` was blank and `IsMainMilestone` was false).

The final prototype must not depend on the current Sandbox dataset containing a marked milestone. This does **not** change the original Stage-Gated Portfolio Continuation Review solution. Later implementation may use DPE-configured continuation gates and/or material-trigger-based reviews. No fake SAP milestone data should be introduced.

---

## 2026-10-14 – Primary cross-API linking key

Live SAP Sandbox validation confirmed exact Enterprise Project → G/L joins through WBSElementInternalID: TEMP003 produced 40 exact WBS-linked G/L records and I1000 produced 2. ProjectInternalID showed cross-API formatting inconsistency such as `00000041` versus `41`.

WBSElementInternalID is now the preferred primary cross-API key. ProjectInternalID remains a secondary/fallback identifier; numeric-only leading-zero variants may be compared as equivalent only for that fallback. Raw SAP identifiers must be retained and not destructively rewritten. WBS matching remains exact.

This is an implementation/evidence decision, not a change to the original Stage-Gated Portfolio Continuation Review business solution.

---

## 2026-10-14 – Playable continuation-review MVP

Use one product combining real SAP Business Accelerator Hub Sandbox evidence, explicitly labelled reviewer/governance input and deterministic system controls. Do not create separate Demo/Live modes or fabricate SAP transactions/milestones/PO joins.

Store versioned prototype reviews and immutable completed decisions in browser localStorage (`dpeA3.reviews.v1`), with whitelisted project identity and concise evidence summaries, never credentials or raw transactions. This is origin/browser-local prototype persistence, not production storage, authentication or SAP write-back.

Readiness checks evidence/assessment completeness only, not an investment score/recommendation. Clearly reported unsuccessful/unavailable G/L/PO attempts satisfy the attempt checks; lifecycle evidence must have loaded. Reviewers remain responsible for evidence quality and for selecting the exact five A2 decision outcomes. Conditional/Modify/Pause decisions require an action, owner and next review date.

Calculate 14-day decision and 30-day escalation thresholds from the actual review-open timestamp using UTC calendar days and the browser's clock. Marked SAP milestones are not a prerequisite for opening a reviewer-selected governance review. AI Review Brief, MCP and Purchase Requisition are deferred from this first playable baseline; no AI decision is introduced.

Normal teammate changes remain branch → PR → review → merge. The repository admin/technical owner may directly update master for explicitly coordinated baseline/integration work; static checks now cover master pushes as well as PRs.

---

## 2026-10-14 – Cost evidence gap versus unassessed review

Cost Position defaults to `Not assessed`: the reviewer has not completed the assessment. `Insufficient information` means the reviewer assessed available evidence and identified an information gap. With all other readiness requirements satisfied, that explicit finding does not automatically block an accountable human governance decision.

The Summary presents the cost evidence gap as REVIEWER INPUT, not a SAP-data absence claim or Material variance. The app still calculates no score and recommends no outcome; the five A2 decisions remain entirely human-selected.

---

## 2026-10-15 – Executive review and management attention

The Executive Review Snapshot and management-attention indicators are decision support only. Classification is deterministic from explicit reviewer assessments: Low alignment, No benefits, Off track delivery, Material variance, High risk and Negative future value are material concerns; Partially achievable benefits, At risk delivery and Uncertain future value are softer attention items. Cost = Insufficient information is an explicit reviewer evidence gap, not an inferred SAP-data absence.

No score, weights, automated recommendation or new readiness/decision requirement is introduced. Unassessed inputs are not classified as positive assurance. Existing Review Basis is surfaced in review context, Summary and Confirmation; it is not inferred from SAP milestones or detected by a trigger engine. SAP joins/amount semantics and the merged UI hierarchy remain unchanged. Session project counts and zero-match evidence are qualified so they cannot imply portfolio completeness or zero cost/procurement exposure.

---

## 2026-10-15 – Governed owner and management decision productisation

Decision Owner is selected once in Assessment from a clearly labelled synthetic prototype governance directory and carried into Summary, Decision and Confirmation. Retain owner ID/name/role snapshot alongside existing text. Completed legacy text owners remain readable and are never silently matched to directory members; open legacy reviews retain that text but require explicit eligible selection before a new decision. Action Owner remains free text, distinct from decision authority. This configuration is neither authentication nor real DPE/SAP personnel data.

SAP Responsibility Management has high semantic fit for production governance authority, but the separate Sandbox/APIKey probe returned HTTP 500/unavailable. It remains a non-gating technical exploration, not a browser/MVP dependency. Reports retain counts/schema/status, not member/sample values.

Needs Attention projects open local reviews from existing explicit reviewSignals/timing, not invented portfolio metrics. Visible native assessment/decision radios keep stored enum values, unassessed defaults and no preselected outcome. Existing reviewBasis is presented consistently as Review Trigger, never inferred. Progressive disclosure emphasises business evidence, trigger, management concerns and the recorded human outcome while retaining diagnostics/caveats. No scoring, recommendation, new SAP semantics or write-back is added. Jerry's visual tokens/component direction remain the foundation.

---

## 2026-10-15 – Transparent showcase portfolio and prototype classification convention

Five explicitly synthetic showcase projects are introduced because the public SAP Sandbox does not provide a complete portfolio business scenario. They demonstrate a healthy investment without a review, emerging deterioration, material concerns, an explicit evidence gap and a synthetic historical Stop decision. This supersedes earlier prohibitions on synthetic records **only for the separately identified SHOWCASE provider**: never fabricate or relabel Sandbox joins, fill a live data gap with showcase rows, or add Demo/Live modes. Live Enterprise Project/G/L/PO integration remains active, separate and unchanged in endpoint/join/amount semantics.

Synthetic transactional payloads follow the downloaded Enterprise Project/Elements and G/L V2 (`d.results`, V2 dates) and PO V4 (`value`, calendar dates) schemas and selected fields. Stable reserved UUIDs/WBS IDs isolate the showcase. Approved investment, explicit forecast, stage, narrative and review reason are **SHOWCASE CONTEXT**, outside SAP-shaped records. Posted/procurement figures are derived with shared existing decimal-safe aggregators; no currency conversion, total-project-cost or outstanding-liability claim is introduced. Unknown forecast stays unknown.

Review Trigger explains **why the review began**; Material Concern is an **assessment finding**. Use `Material trigger`, read-through-normalising legacy `Material trigger / concern` without deleting records. `Scheduled stage-gate review` similarly accepts the former scheduled wording. **Emerging Concern** replaces user-facing Attention Item; `attentionItems` remains an internal compatibility key.

The central prototype classification convention is: High/Yes/On track/Within expectations/Low/Positive → normal; Medium alignment/Partially/At risk/Minor variance/Medium risk/Uncertain → emerging; Low alignment/No/Off track/Material variance/High risk/Negative → material; explicit Insufficient information → evidence gap. Not assessed/unknown is unclassified, not an evidence gap or positive assurance. This is **not DPE production policy**. Production materiality thresholds and trigger criteria require calibration during governance design/pilot. No numeric threshold (including 10%) is implemented: numerical scenario facts may inform, but never determine, the human assessment.

Seed three editable open reviews and one immutable historical decision with stable IDs and explicit synthetic dates; do not seed Infrastructure or a current final decision. Normal startup adds missing seeds without overwriting a modified/completed stable record. Confirmed Reset Showcase now clears all this app’s local governance cycles (Showcase and SAP Sandbox), replacing them with the four baseline records in one write. Its irreversible scope is explicit; SAP data, loaded projects, configuration and other browser-storage keys are kept. Malformed storage is never silently erased. Dates remain fixed and timing uses the real clock, not a demonstration clock. Newly opened user reviews/decisions retain actual timestamps and the existing 14/30-day controls.

The final Continue / Continue with Conditions / Modify / Pause / Stop outcome remains human, unselected by default, with existing owner/readiness/follow-up validation. The seeded Stop is transparently synthetic portfolio history, not a system recommendation. No AI, MCP, Responsibility Management browser dependency or SAP write-back is added. This is the final substantive integration baseline for BA/PO validation, Jerry's final UI/UX refinement and presentation preparation.

## 2026-10-15 – Pre-handover workflow checkpoint and explanations

Ready active reviews resume at Summary, incomplete ones at Assessment, and recorded decisions at their record; Summary remains the checkpoint before the explicit human decision. Dashboard drill-downs project the unchanged assessment convention and timing, distinguishing signal counts from affected reviews. All five outcomes remain available regardless of severity: required rationale explains the accountable human judgement; material-concern guidance is non-blocking. There is no system recommendation or override concept, and no new business/validation rule.

## 2026-10-18 — Review validation and historical context

Next Review validates against the browser-local calendar date at confirmation. Follow-up due today / Follow-up date passed distinguish previous decision checkpoints from the unchanged 14/30-day active-review controls. UUID matching is canonical and historical context is saved without reconstruction from current values.

Overview owns current evidence, Assessment owns human judgement, Review Summary synthesises that judgement, and History owns the full saved financial context. Financial Basis is therefore shown only in History. Existing multi-cycle history, five outcomes, Stop protection and Reset Showcase behaviour remain unchanged.
