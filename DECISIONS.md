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
