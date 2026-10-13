# MVP Scope

## Business Objective

Implement the A2 **Stage-Gated Portfolio Continuation Review** solution as a functional INFOSYS 704 A3 prototype for DPE. Help a portfolio/PMO user reassess a material IT investment at an appropriate gate or material issue before further avoidable expenditure is committed. The app supports evidence and judgement; an accountable human decides Continue / Continue with Conditions / Modify / Pause / Stop.

The original [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md) and dated [DECISIONS.md](../DECISIONS.md) remain the source of truth. This is a capability/status guide for team validation, not a new business solution or final UI design.

## Current Technical Baseline

Working now:

- Live SAP project retrieval, selection and Project Element/WBS retrieval.
- G/L integration and client-validated joins, with exact WBS preferred and numeric-only project-ID fallback.
- Live exact WBS G/L joins observed for TEMP003 (40 records) and I1000 (2).
- Purchase Order connectivity, V4 response handling and exact-WBS matching logic. Current tested public samples produce no exact PO project joins.
- Cautious financial/procurement summaries grouped by currency; commitment/deletion/reversal/final-invoice flags remain transparent.
- Truthful zero-result/error handling, raw/debug responses and safe rejection of unrelated rows.
- Remote connectivity/join validation with GitHub Actions artifacts.

These are real Sandbox evidence capabilities, not yet a complete continuation-review pack. All 26 currently observed project elements lacked marked milestones/main milestones. This and zero PO joins constrain demonstrations, not the original business problem. [API Integration](API_INTEGRATION.md) separates implementation capability from sample availability.

## Minimum Viable Product

Proposed capability-level acceptance view for team review:

| Capability | Status | Current evidence / gap |
| --- | --- | --- |
| 1. Identify/select an in-scope IT project | **PARTIAL** | Selection of real Sandbox projects works; DPE IT-investment scope/filter/review queue is not configured. Sandbox projects are not automatically real DPE investments. |
| 2. Retrieve lifecycle/WBS evidence | **DONE** | Project/element/WBS retrieval works, with truthful milestone flags and zero states. This does not mean DPE continuation gates are configured. |
| 3. Retrieve available financial evidence | **DONE** | G/L retrieval and exact WBS joins work. Amounts are returned posting evidence, not validated complete project cost. |
| 4. Retrieve available procurement evidence | **PARTIAL** | PO connectivity/matching/display/empty-state capability exists; current samples have no project joins, so populated project procurement evidence is not demonstrated. No fake linkage may fill that gap. |
| 5. Assemble a continuation-review evidence pack | **PARTIAL** | A single page displays source evidence sections. There is no purpose-built consolidated review pack, configured gate/review-due logic or coherent full review journey yet. |
| 6. Capture governance evidence not available from SAP | **NOT STARTED** | No strategic alignment, benefits outlook, risks/dependencies or review-configuration forms/storage. These must be source-labelled as DPE/prototype governance evidence. |
| 7. Record an accountable human continuation decision | **NOT STARTED** | No Continue / Continue with Conditions / Modify / Pause / Stop workflow or decision-rights implementation. |
| 8. Retain/show rationale, action/owner and next review | **NOT STARTED** | No decision record, timestamp/status, action ownership or persistence. In-memory API evidence is not a retained governance record. |
| 9. Preserve the AI/human decision boundary if AI is added | **PARTIAL** | The principle is documented and no automated decision is made. No AI feature/guardrail workflow has yet been implemented or validated. |

"DONE" here applies to the specific retrieval capability, not the final assignment or all of its governance requirements. Functional validation should cite an actual flow/test/report and treat graceful empty results as valid, while identifying where the full business demonstration remains incomplete.

Remaining core work includes agreeing DPE project scope, continuation gate/review configuration, non-SAP governance evidence, a coherent review pack and the human decision record. The A2 14-day decision target / 30-day unresolved escalation concept remains in project context; no rules implementing those targets exist yet. Do not invent a material-trigger rule in documentation.

## Stretch / Later

- Purchase Requisition pipeline (stretch; not implemented).
- Advanced analytics/automatic queue prioritisation (only when useful to the review journey).
- Richer persistence/audit trail (basic retained decision evidence is still needed for the MVP).
- MCP architecture/integration (not implemented; depends on agreed technical direction).
- AI Review Brief (not implemented; later implementation work subject to scope confirmation below).
- Visual polish beyond the usable, professional MVP (not a substitute for the end-to-end flow).

**Scope reconciliation:** `PROJECT_CONTEXT.md` currently lists an AI-assisted Review Brief among MVP/must-have items, while this team-baseline request groups it under later work. This guide does not silently remove that requirement or change the original AI role. Confirm the final assignment/team scope and record any material change in `DECISIONS.md` before treating it as optional. AI may gather/summarise evidence and identify gaps, never make the final accountable continuation decision.

Not every stretch option must be implemented. Avoid a generic ERP dashboard, universal chatbot, fabricated cross-API mapping or unrelated analytics. Deepen one convincing review journey first.

## Acceptance Principles

- **Functional:** working click flow, valid identifiers/response versions, understandable evidence and honest empty/error states.
- **Traceable to A2:** every proposed function should support stage-gated/material-review preparation or the decision record, not merely enlarge the prototype.
- **No fake SAP evidence:** milestones, financial records and PO joins must come from real defensible evidence; absence remains visible.
- **Clear source labels:** distinguish public SAP Sandbox data, unlinked diagnostics and future DPE/prototype governance inputs.
- **Human accountable decision:** decision rights/rationale remain human; AI synthesis cannot replace governance judgement.
- **Usable end-to-end flow:** project selection → evidence pack → governance evidence → human decision/record, rather than disconnected API screens.
- **Graceful states and safe interpretation:** prevent stale project evidence, never combine currencies without approved conversion, and do not call partial G/L/PO amounts complete cost/outstanding liability.
- **Reviewable delivery:** use focused branch/PR/review work and update documentation/material decisions. See [CONTRIBUTING.md](../CONTRIBUTING.md).
