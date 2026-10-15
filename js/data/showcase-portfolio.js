(() => {
  "use strict";
  // FICTIONAL cases, not SAP Sandbox responses or real DPE transactions.
  // Fields/types checked against the downloaded api/ specifications. Governance
  // context and seeded judgement are separate from every SAP-shaped payload.
  const v2Date = date => date ? `/Date(${Date.parse(date + "T00:00:00Z")})/` : null;
  const cases = [
    { number: 1, code: "ODP", name: "Digital Ordering Platform Modernisation", start: "2026-01-12", planned: "2026-09-30", forecast: "2026-11-15",
      elements: ["Platform Foundation", "Store Integration", "Customer Migration", "Analytics & Monitoring", "Pilot Completion Gate"],
      elementEnds: ["2026-03-31", "2026-06-30", "2026-08-31", "2026-09-15", "2026-09-30"],
      elementForecasts: ["2026-03-31", "2026-08-15", "2026-10-31", "2026-11-07", "2026-11-15"],
      postings: [850000, 620000, 740000, 560000, 980000, 410000, 520000, 690000, 460000, 320000],
      postingTexts: ["Platform build", "Store integration services", "Mobile ordering redesign", "Identity and payments integration", "Commerce platform tranche", "Data migration and testing", "Pilot deployment", "Vendor delivery tranche", "Security and performance testing", "Training and rollout preparation"],
      orders: [[450000, false], [320000, false], [410000, true], [300000, false]], approved: "8400000.000", forecastAmount: "9350000.000",
      stage: "Pilot completion review", basis: "Material trigger", opened: "2026-09-29", owner: "GOV-001",
      reason: "Forecast cost has moved beyond the approved investment envelope and pilot completion is forecast materially later than planned.",
      narrative: "The programme remains strategically relevant, but cost growth, delivery slippage and execution risk require a formal continuation decision before further material commitment.",
      assessment: ["High", "Partially", "Off track", "Material variance", "High", "Uncertain"],
      comments: "Vendor integration delays and higher rollout costs have reduced confidence in the original delivery assumptions.",
      risks: "Payment and identity integration, store rollout sequencing, vendor delivery capacity and customer-migration readiness." },
    { number: 2, code: "CRM", name: "Customer Loyalty & CRM Enhancement", start: "2026-03-02", planned: "2026-12-01", forecast: "2026-12-15",
      elements: ["CRM Foundation", "Customer Data Integration", "Loyalty Experience", "Stage-Gate Review"],
      elementEnds: ["2026-06-30", "2026-09-30", "2026-11-15", "2026-12-01"],
      elementForecasts: ["2026-06-30", "2026-10-15", "2026-11-30", "2026-12-15"],
      postings: [420000, 380000, 510000, 360000, 420000, 310000],
      postingTexts: ["CRM configuration", "Customer data integration", "Loyalty experience build", "Data quality services", "Integration assurance", "Release preparation"],
      orders: [[250000, false], [400000, true], [270000, false]], approved: "4800000.000", forecastAmount: "4950000.000",
      stage: "Next-stage readiness", basis: "Scheduled stage-gate review", opened: "2026-10-10", owner: "GOV-003",
      reason: "Scheduled next-stage review of delivery, cost and customer-data readiness.",
      narrative: "Customer value case remains credible, but delivery, cost and data-readiness conditions require management attention before the next stage.",
      assessment: ["High", "Partially", "At risk", "Minor variance", "Medium", "Positive"] },
    { number: 3, code: "DAT", name: "Data & Analytics Platform Upgrade", start: "2026-02-02", planned: "2027-02-28", forecast: null,
      elements: ["Data Foundation", "Migration", "Analytics Enablement", "Stage-Gate Review"],
      elementEnds: ["2026-06-30", "2026-10-31", "2027-01-31", "2027-02-28"], elementForecasts: ["2026-06-30", "2026-10-31", "2027-01-31", null],
      postings: [700000, 520000, 480000, 560000, 440000, 400000],
      postingTexts: ["Data platform foundation", "Migration services", "Analytics enablement", "Data quality controls", "Platform integration", "Assurance and training"],
      orders: [[350000, false], [300000, true]], approved: "6300000.000", forecastAmount: null,
      stage: "Cost-to-complete validation", basis: "Scheduled stage-gate review", opened: "2026-10-12", owner: "GOV-002",
      reason: "Scheduled stage-gate review; the cost-to-complete reforecast is not yet validated.",
      narrative: "Delivery remains on plan, but the current cost-to-complete reforecast has not yet been validated.",
      assessment: ["High", "Yes", "On track", "Insufficient information", "Medium", "Positive"] },
    { number: 4, code: "INF", name: "Store Technology Infrastructure Refresh", start: "2026-01-19", planned: "2026-12-18", forecast: "2026-12-18",
      elements: ["Network & Store Hardware", "Deployment Wave", "Operational Readiness", "Rollout Completion"],
      elementEnds: ["2026-06-30", "2026-10-31", "2026-11-30", "2026-12-18"], elementForecasts: ["2026-06-30", "2026-10-31", "2026-11-30", "2026-12-18"],
      postings: [800000, 720000, 680000, 750000, 650000],
      postingTexts: ["Store network equipment", "Deployment services", "Hardware installation", "Operational readiness", "Rollout support"],
      orders: [[250000, true], [220000, false], [250000, true]], approved: "5200000.000", forecastAmount: "5050000.000",
      stage: "Deployment and readiness", reason: "Current delivery and financial evidence do not indicate a seeded showcase review requirement.",
      narrative: "The showcase has no active review for this investment. A reviewer may open a review when governance requires it." },
    { number: 5, code: "LRP", name: "Legacy Reporting Consolidation", start: "2026-01-05", planned: "2026-08-31", forecast: "2026-10-15",
      elements: ["Reporting Foundation", "Migration", "Business Transition", "Legacy Exit Gate"],
      elementEnds: ["2026-03-31", "2026-06-30", "2026-08-15", "2026-08-31"], elementForecasts: ["2026-03-31", "2026-07-31", "2026-09-30", "2026-10-15"],
      postings: [650000, 580000, 540000, 560000, 520000],
      postingTexts: ["Reporting foundation", "Report migration", "Business transition", "Integration services", "Continuity planning"],
      orders: [[200000, true], [150000, false]], approved: "3400000.000", forecastAmount: "3900000.000",
      stage: "Historical Stop decision", basis: "Material trigger", opened: "2026-08-25", owner: "GOV-002",
      reason: "Strategic misalignment and a weakened remaining economic case required a continuation decision.",
      narrative: "Synthetic historical governance record. Financial and delivery forecasts describe the position before the Stop decision, not an authorised continuation plan.",
      assessment: ["Low", "No", "Off track", "Material variance", "High", "Negative"],
      decision: { outcome: "Stop", timestamp: "2026-09-02T12:00:00.000Z",
        rationale: "The investment no longer aligns with the current enterprise reporting strategy and the remaining economic case does not justify further material commitment.",
        requiredAction: "Close remaining work packages, reconcile committed spend and preserve required reporting continuity during transition.", actionOwner: "Portfolio PMO", nextReviewDate: "" } }
  ];
  const root = { metadata: { version: 1, source: "SHOWCASE", asOf: "2026-10-15T00:00:00.000Z",
    description: "Synthetic showcase data · SAP-schema compatible. Not live SAP Sandbox or real DPE data.",
    specifications: ["API_ENTERPRISE_PROJECT_SRV_0002.json", "API_GLACCOUNTLINEITEM.json", "CE_PURCHASEORDER_0001.json"] },
    enterpriseProjectResponse: { d: { results: [] } }, projectElementResponses: {}, glResponses: {}, poResponses: {}, governanceContexts: {}, seededReviews: [] };
  const dimensions = ["strategicAlignment", "expectedBenefits", "deliveryPerformance", "costPosition", "risk", "futureEconomicValue"];
  for (const c of cases) {
    const n = c.number;
    const uuid = `7040000${n}-0000-4000-8000-00000000000${n}`;
    const project = { ProjectUUID: uuid, ProjectInternalID: `0704000${n}`, Project: `DPE-IT-${c.code}-01`, ProjectDescription: c.name,
      ProcessingStatus: "20", ProjectStartDate: v2Date(c.start), ProjectEndDate: v2Date(c.planned), ProjectCurrency: "AUD", CompanyCode: "AU01" };
    root.enterpriseProjectResponse.d.results.push(project);
    const elements = c.elements.map((description, i) => {
      const milestone = i === c.elements.length - 1 && n !== 4;
      return { ProjectElementUUID: `7040000${n}-0001-4000-8000-${String(i + 1).padStart(12, "0")}`,
        ProjectElement: `${project.Project}-${String(i + 1).padStart(2, "0")}`, WBSElementInternalID: `740${n}000${i + 1}`, ProjectUUID: uuid,
        ProjectElementDescription: description, ProcessingStatus: "20", EntProjectElementType: "",
        PlannedStartDate: v2Date(milestone ? c.planned : c.start), PlannedEndDate: v2Date(c.elementEnds[i]),
        ActualStartDate: milestone ? null : v2Date(c.start), ActualEndDate: null, ResponsibleCostCenter: "", CompanyCode: "AU01",
        IsProjectMilestone: milestone ? "X" : "", ForecastedEndDate: v2Date(c.elementForecasts[i]), MilestoneApprovalStatus: "", IsMainMilestone: milestone };
    });
    root.projectElementResponses[uuid] = { d: { results: elements } };
    root.glResponses[uuid] = { d: { results: c.postings.map((amount, i) => ({
      ID: `SHOWCASE-${c.code}-${i + 1}`, ProjectInternalID: project.ProjectInternalID, WBSElementInternalID: elements[i % elements.length].WBSElementInternalID,
      CompanyCode: "AU01", AccountingDocument: `74${String(n).padStart(2, "0")}${String(i + 1).padStart(6, "0")}`, LedgerGLLineItem: "000001", GLAccount: "0000600000",
      PostingDate: v2Date(n === 5 ? "2026-08-20" : `2026-${String(5 + i % 5).padStart(2, "0")}-15`),
      DocumentDate: v2Date(n === 5 ? "2026-08-19" : `2026-${String(5 + i % 5).padStart(2, "0")}-14`),
      CompanyCodeCurrency: "AUD", AmountInCompanyCodeCurrency: `${amount}.000`, GlobalCurrency: "AUD", AmountInGlobalCurrency: `${amount}.000`,
      DebitCreditCode: "S", IsCommitment: false, IsReversal: false, IsReversed: false,
      PurchasingDocument: "", PurchasingDocumentItem: "", Supplier: "", DocumentItemText: c.postingTexts[i]
    })) } };
    root.poResponses[uuid] = { value: c.orders.map(([amount, final], i) => ({
      PurchaseOrder: `47${String(n).padStart(2, "0")}${String(i + 1).padStart(6, "0")}`, PurchaseOrderItem: String((i + 1) * 10).padStart(5, "0"), AccountAssignmentNumber: "01",
      WBSElementInternalID: elements[i].WBSElementInternalID, WBSElementExternalID: elements[i].ProjectElement, DocumentCurrency: "AUD", PurgDocNetAmount: `${amount}.000`,
      Quantity: "1.000", OrderQuantityUnit: "EA", MultipleAcctAssgmtDistrPercent: "0.0", GLAccount: "0000600000", CompanyCode: "AU01",
      IsDeleted: false, IsFinallyInvoiced: final, CreationDate: n === 5 ? "2026-07-01" : "2026-06-01", IsAcctLineFinal: final, AcctLineFinalReason: ""
    })) };
    root.governanceContexts[uuid] = { source: "SHOWCASE CONTEXT", currency: "AUD", approvedInvestment: c.approved, forecastAtCompletion: c.forecastAmount,
      plannedCompletion: c.planned, forecastCompletion: c.forecast, stageLabel: c.stage, reviewReason: c.reason, businessNarrative: c.narrative,
      evidenceAsOf: c.decision?.timestamp || root.metadata.asOf, historical: !!c.decision };
    if (c.assessment) root.seededReviews.push({ id: `SHOWCASE-${c.code}-${c.decision ? "DECISION" : "REVIEW"}`, projectUUID: uuid,
      status: c.decision ? "decision_recorded" : "in_progress", reviewOpenedAt: c.opened + "T00:00:00.000Z", reviewBasis: c.basis, decisionOwnerId: c.owner,
      assessment: { ...Object.fromEntries(dimensions.map((key, i) => [key, c.assessment[i]])), comments: c.comments || c.narrative, keyRisks: c.risks || "" }, decision: c.decision || null });
  }
  function freeze(value) { if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
  window.DPE_SHOWCASE_PORTFOLIO = freeze(root);
})();
