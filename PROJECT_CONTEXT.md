# INFOSYS 704 A3 – Project Context

## 1. Purpose

This project is the A3 implementation assignment for INFOSYS 704.

The client is Domino's Pizza Enterprises Limited (DPE), and the selected domain is **Financial**.

The team has chosen Harneet Singh's A2-D1 financial-domain solution as the basis for A3.

The original A3 was intended to use SAP Build Apps / AppGyver. The course direction has since changed because the academic SAP Build Code platform is unavailable. The current technical direction is to use **OpenCode** together with **SAP APIs**, with SAP Integration Suite / MCP material taught in the labs.

This file is the current development source of truth. When implementing features, preserve the business logic below unless a later decision recorded in `DECISIONS.md` explicitly changes it.

---

## 2. Original A2 Business Problem

DPE faces avoidable financial exposure when capitalised IT development projects remain strategically misaligned or no longer justify their expected economic benefits.

The problem is not that projects can never change after approval. Strategy, technology, expected benefits, delivery conditions, costs, risks and dependencies can legitimately change.

The problem is whether material changes are identified and acted on early enough before further avoidable expenditure is committed.

---

## 3. Original A2 Solution

### Stage-Gated Portfolio Continuation Review Process

The approved A2 solution introduces formal reassessment of material IT investments:

- at major project milestones / defined stage gates; and
- when a material trigger suggests the original investment case may no longer remain valid.

A continuation review reassesses relevant evidence, including:

- strategic alignment;
- expected benefits;
- delivery performance;
- risks and dependencies;
- remaining costs / financial exposure; and
- future economic value.

The review results in a documented human decision:

- Continue
- Continue with Conditions
- Modify
- Pause
- Stop

The solution also includes:

- integrated portfolio information;
- clear governance ownership;
- documented rationale and actions;
- next review date where applicable;
- a target for material concerns to receive a documented decision within 14 days; and
- escalation of unresolved issues after 30 days.

The solution is intended to support earlier intervention and reduce avoidable financial exposure. It does **not** attempt to eliminate all impairments or write-offs.

---

## 4. Non-Negotiable Governance Principle

The application and AI must **support** governance judgement, not replace it.

The AI may:

- retrieve evidence;
- identify that a scheduled gate or material issue needs attention;
- consolidate project and financial information;
- summarise material concerns;
- identify missing evidence;
- prepare a continuation-review brief; and
- suggest questions that a decision-maker should consider.

The AI must **not** make the final accountable Continue / Continue with Conditions / Modify / Pause / Stop decision on behalf of DPE.

Final accountability remains with the human governance decision-maker.

---

## 5. A3 Positioning

Current working position: **Option 2 – SAP APIs partially fit the existing solution.**

The SAP APIs can support the project-lifecycle and financial-evidence parts of the original A2 solution particularly well.

Other evidence such as strategic alignment, benefits outlook, some delivery risks, dependencies and future economic value may require human-entered information or prototype-local data.

Therefore the A3 prototype should be presented as a focused digital implementation of the highest-value, API-supported parts of the original solution, without changing the financial domain or the central Stage-Gated Portfolio Continuation Review concept.

This positioning can be revised if later SAP sandbox testing shows a stronger or weaker fit.

---

## 6. Selected SAP APIs

All four JSON specifications are stored under `./api/`.

### Core API 1 – Enterprise Project

Specification:
`./api/API_ENTERPRISE_PROJECT_SRV_0002.json`

Sandbox base URL:
`https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_ENTERPRISE_PROJECT_SRV;v=0002`

Purpose:

- project identity and description;
- project status;
- planned and actual dates;
- project elements / WBS;
- milestones;
- main milestone indicator;
- milestone approval status;
- forecasted end date.

Important fields include:

- ProjectUUID
- ProjectInternalID
- Project
- ProjectDescription
- ProcessingStatus
- ProjectStartDate
- ProjectEndDate
- ProjectCurrency
- CompanyCode
- ProjectElementUUID
- ProjectElement
- WBSElementInternalID
- PlannedStartDate
- PlannedEndDate
- ActualStartDate
- ActualEndDate
- IsProjectMilestone
- IsMainMilestone
- MilestoneApprovalStatus
- ForecastedEndDate

Primary business role:
**Which project is being reviewed, where is it in its lifecycle, and is a relevant stage gate / milestone due?**

---

### Core API 2 – G/L Account Line Items - Read

Specification:
`./api/API_GLACCOUNTLINEITEM.json`

Sandbox base URL:
`https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_GLACCOUNTLINEITEM`

Purpose:

- retrieve accounting line items / actual financial postings;
- connect actual financial evidence to projects and WBS elements.

Important fields include:

- ProjectInternalID
- WBSElementInternalID
- CompanyCode
- GLAccount
- PostingDate
- CompanyCodeCurrency
- AmountInCompanyCodeCurrency
- GlobalCurrency
- AmountInGlobalCurrency
- IsCommitment
- PurchasingDocument
- PurchasingDocumentItem

Primary business role:
**What cost has actually been posted against this project / WBS?**

---

### Core API 3 – Purchase Order (OData V4)

Specification:
`./api/CE_PURCHASEORDER_0001.json`

Sandbox base URL:
`https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata4/sap/api_purchaseorder_2/srvd_a2x/sap/purchaseorder/0001`

Purpose:

- retrieve project-related procurement commitments / purchasing evidence;
- connect Purchase Orders to project/WBS through account assignment.

Important fields include:

- PurchaseOrder
- PurchaseOrderItem
- PurchaseOrderDate
- Supplier
- DocumentCurrency
- NetAmount
- GrossAmount
- PurchasingProcessingStatus
- IsCompletelyDelivered
- IsFinallyInvoiced
- OpenPurchaseOrderQuantity
- PurgDocNetAmount
- WBSElementInternalID
- WBSElementExternalID
- IsDeleted

Primary business role:
**What procurement commitments or open purchasing exposure are associated with this project / WBS?**

Do not automatically treat every PO amount as "outstanding commitment" unless the status, delivery / invoice state and relevant amount logic support that interpretation.

---

### Stretch API 4 – Purchase Requisition (OData V4)

Specification:
`./api/CE_PURCHASEREQUISITION_0001.json`

Sandbox base URL:
`https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata4/sap/api_purchaserequisition_2/srvd_a2x/sap/purchaserequisition/0001`

Purpose:

- show purchase requisitions / procurement pipeline before they become Purchase Orders;
- provide an optional forward-looking view of proposed future procurement.

Important fields include:

- PurchaseRequisition
- PurchaseRequisitionItem
- ProcessingStatus
- PurReqnReleaseStatus
- PurchaseRequisitionPrice
- PurReqnNetAmount
- PurReqnItemCurrency
- WBSElementExternalID
- IsDeleted
- PurchasingDocument
- PurchasingDocumentItem

Primary business role:
**What project-related procurement is still in the requisition / pipeline stage?**

This is a stretch feature. Do not allow it to delay or destabilise the core prototype.

---

## 7. Intended Data Relationship

The preferred project-level joining concept is:

Enterprise Project
→ Project / WBS identifiers
→ G/L Account Line Items
→ actual posted cost

Enterprise Project
→ WBS identifiers
→ Purchase Order Account Assignment
→ procurement commitments / purchasing exposure

Enterprise Project
→ WBS identifiers
→ Purchase Requisition Account Assignment
→ optional procurement pipeline

Do not assume sandbox records will always join cleanly. Validate actual sample data before relying on a join in the final prototype.

If sandbox data does not naturally align across APIs, do not fabricate a false relationship. Use a transparent prototype mapping or narrow the feature scope and record the decision in `DECISIONS.md`.

---

## 8. Target User and Main Job

Primary user:
A DPE Technology Portfolio / PMO / governance decision-support user preparing a continuation review.

Main job to support:

> Prepare a concise, evidence-based continuation review for an in-scope IT investment when a scheduled stage gate or material trigger requires reassessment.

---

## 9. Target MVP User Journey

The preferred end-to-end journey is:

1. **Review Queue / Portfolio Entry**
   - show a small set of in-scope projects;
   - identify projects with a continuation review due or a material issue requiring attention.

2. **Open Project / Continuation Review Pack**
   - show project context and current milestone / gate;
   - show relevant actual financial postings;
   - show project-related Purchase Order evidence;
   - optionally show Purchase Requisition pipeline;
   - allow human-entered strategic / benefits / risk evidence where SAP does not provide it.

3. **Generate AI Review Brief**
   - summarise why the review is due;
   - summarise current project / financial position;
   - identify material concerns;
   - identify missing evidence;
   - identify questions the governance decision-maker should resolve.

4. **Human Continuation Decision**
   - Continue
   - Continue with Conditions
   - Modify
   - Pause
   - Stop

5. **Decision Record**
   - evidence considered;
   - rationale;
   - responsible owner;
   - required actions;
   - next review date where applicable;
   - decision timestamp / status.

The prototype should make this one journey convincing before adding extra features.

---

## 10. Recommended Main Screens

Keep the application focused.

### Screen 1 – Review Queue

Possible content:

- Project name
- Project status
- Current / next major milestone
- Review status
- Simple financial signal
- "Open Continuation Review" action

Do not turn this into a large generic portfolio analytics dashboard.

### Screen 2 – Continuation Review Pack

This should be the strongest / hero screen.

Suggested sections:

**Project Context**
- Project
- Status
- Dates
- Current / next major milestone
- Gate status

**Financial Evidence**
- Actual posted cost
- Purchase Order evidence / commitments
- Optional Purchase Requisition pipeline
- Approved investment envelope if prototype-local governance data is used

**Management Evidence**
- Strategic alignment
- Benefits outlook
- Key risk / dependency
- Comment / rationale

### Screen 3 – AI Review Brief

Suggested output:

- Why review is due
- Current position
- Material concerns
- Evidence gaps
- Questions for decision-maker

Avoid generic chatbot behaviour.

### Screen 4 – Decision

- Continue
- Continue with Conditions
- Modify
- Pause
- Stop
- Rationale
- Actions
- Owner
- Next review

---

## 11. Agentic AI Role

The desired agentic behaviour is not simply "chat with the data."

The agent should eventually be able to:

1. understand the review goal;
2. call the relevant tools / APIs;
3. gather project and financial evidence;
4. combine evidence across sources;
5. identify missing information;
6. prepare the review brief; and
7. stop before the final accountable governance decision.

The current first development step is simpler: prove direct SAP Sandbox API connectivity before implementing the full MCP / agent flow.

---

## 12. MVP vs Stretch

### MVP / Must Have

- working connection to Enterprise Project SAP Sandbox API;
- retrieve real project data;
- retrieve project elements / milestones;
- project selection;
- continuation-review context;
- working financial evidence from G/L;
- working procurement evidence from Purchase Order;
- one coherent Review Pack;
- one AI-assisted Review Brief feature;
- human continuation decision;
- clear, usable and professional interface.

### Stretch

- Purchase Requisition pipeline;
- automatic review-queue prioritisation;
- additional portfolio cards / filters;
- additional visualisations;
- more sophisticated trigger rules;
- more sophisticated MCP tool orchestration;
- richer audit trail.

Do not start stretch work until the MVP works end to end.

---

## 13. Explicit Non-Goals

Do not build:

- a generic ERP dashboard;
- a full procurement system;
- a supplier-management system;
- a large cost-centre analytics module;
- a universal AI chatbot;
- an AI that independently cancels or approves investments;
- a production-grade finance platform;
- unnecessary screens simply to make the prototype look larger.

Depth and coherence of the core review journey are more important than feature count.

---

## 14. Technical Principles

- Use the SAP JSON specifications in `./api/` as the source of truth.
- Do not invent SAP fields or endpoints.
- Preserve the distinction between OData V2 and OData V4 response shapes.
- Prefer read-only integration for the first prototype unless there is a strong business reason to write back.
- Keep business rules deterministic where possible.
- Use AI for synthesis, orchestration and evidence-gap identification rather than arithmetic that normal code can perform reliably.
- Keep the API key out of committed/shared files.
- Surface errors clearly instead of silently falling back to mock data.
- Do not fabricate joins between unrelated sandbox sample records.
- Record material scope or architecture changes in `DECISIONS.md`.

---

## 15. Current Development Sequence

1. Create safe local project structure.
2. Prove Enterprise Project Sandbox connectivity.
3. Retrieve Enterprise Project Elements / milestones.
4. Validate project/WBS identifiers.
5. Prove G/L project/WBS financial retrieval.
6. Prove Purchase Order project/WBS retrieval.
7. Decide whether Purchase Requisition is worth adding.
8. Build the focused Review Pack.
9. Add AI Review Brief behaviour.
10. Add human decision workflow.
11. Integrate / adapt to MCP architecture when the lab confirms the final technical pattern.
12. Polish usability and presentation only after the core flow works.

---

## 16. Development Working Style

OpenCode should treat this file as business and product context, not as permission to redesign the solution.

For substantial changes:

1. read `PROJECT_CONTEXT.md`;
2. read `DECISIONS.md`;
3. inspect the relevant SAP API JSON specification;
4. explain the proposed technical approach briefly;
5. implement only after the approach is consistent with the current business logic;
6. do not expand scope without a clear decision-value reason.
