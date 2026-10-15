(() => {
  "use strict";
  const app = window.DPEApp = window.DPEApp || {};
  const data = window.DPE_SHOWCASE_PORTFOLIO;
  const { utils, reviewRules: rules, services } = app;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const limits = {
    ProjectInternalID: 8, Project: 24, ProjectDescription: 60, ProcessingStatus: 2, ProjectCurrency: 5, CompanyCode: 4,
    ProjectElement: 24, WBSElementInternalID: 8, ProjectElementDescription: 60, EntProjectElementType: 15, ResponsibleCostCenter: 10, IsProjectMilestone: 1, MilestoneApprovalStatus: 5,
    AccountingDocument: 10, LedgerGLLineItem: 6, GLAccount: 10, CompanyCodeCurrency: 5, GlobalCurrency: 5, DebitCreditCode: 1,
    PurchasingDocument: 10, PurchasingDocumentItem: 5, Supplier: 10, DocumentItemText: 50,
    PurchaseOrder: 10, PurchaseOrderItem: 5, AccountAssignmentNumber: 2, WBSElementExternalID: 24, DocumentCurrency: 3, OrderQuantityUnit: 3, AcctLineFinalReason: 2
  };
  const booleans = ["IsMainMilestone", "IsCommitment", "IsReversal", "IsReversed", "IsDeleted", "IsFinallyInvoiced", "IsAcctLineFinal"];
  const v2Dates = ["ProjectStartDate", "ProjectEndDate", "PlannedStartDate", "PlannedEndDate", "ActualStartDate", "ActualEndDate", "ForecastedEndDate", "PostingDate", "DocumentDate"];
  const decimals = ["AmountInCompanyCodeCurrency", "AmountInGlobalCurrency", "PurgDocNetAmount", "Quantity", "MultipleAcctAssgmtDistrPercent"];
  function requireValue(condition, message) { if (!condition) throw new Error(`Invalid synthetic showcase data: ${message}`); }
  function collection(response, v4 = false) {
    const rows = v4 ? response?.value : response?.d?.results;
    requireValue(Array.isArray(rows), v4 ? "expected value array" : "expected d.results array"); return rows;
  }
  function records(rows, fields, v4 = false) {
    for (const row of rows) {
      requireValue(row && typeof row === "object" && !Array.isArray(row) && Object.keys(row).length === fields.length && fields.every(field => Object.hasOwn(row, field)), "unexpected or missing SAP fields");
      for (const [field, value] of Object.entries(row)) {
        if (booleans.includes(field)) { requireValue(typeof value === "boolean", `${field} must be Boolean`); continue; }
        if (value === null) { requireValue(v2Dates.includes(field) || field === "CreationDate", `${field} must not be null in these cases`); continue; }
        requireValue(typeof value === "string", `${field} must be a string in these cases`);
        if (limits[field]) requireValue(value.length <= limits[field], `${field} is too long`);
        if (field.endsWith("UUID")) requireValue(uuid.test(value), `${field} must be a UUID`);
        if (v2Dates.includes(field)) requireValue(!v4 && /^\/Date\(-?\d+\)\/$/.test(value) && !Number.isNaN(new Date(Number(value.slice(6, -2))).getTime()), `${field} must use a V2 date`);
        if (field === "CreationDate") requireValue(rules.validDate(value), "CreationDate must be a V4 calendar date");
        if (decimals.includes(field)) {
          const parsed = utils.poDecimal(value);
          requireValue(!!parsed, `${field} must be a decimal string`);
          if (field.startsWith("AmountIn")) requireValue(/^-?\d+\.\d{3}$/.test(value) && value.replace(/[-.]/g, "").length <= 23, `${field} must be precision-23 / scale-3`);
          if (field === "PurgDocNetAmount") requireValue(Math.abs(Number(value)) <= 9999999999999, "PO amount exceeds specification range");
          if (field === "Quantity") requireValue(parsed.scale <= 3 && Math.abs(Number(value)) <= 9999999999.999, "Quantity exceeds specification range");
          if (field === "MultipleAcctAssgmtDistrPercent") requireValue(parsed.scale <= 1 && Math.abs(Number(value)) <= 99.9, "Distribution percentage exceeds specification range");
        }
      }
    }
  }
  function validate(root = data) {
    requireValue(root?.metadata?.source === "SHOWCASE" && /synthetic/i.test(root.metadata.description), "source disclosure missing");
    const projects = collection(root.enterpriseProjectResponse); records(projects, window.SAP_API_CONFIG.projectFields);
    requireValue(projects.length === 5 && new Set(projects.map(p => p.ProjectUUID)).size === 5 && new Set(projects.map(p => p.ProjectInternalID)).size === 5 && new Set(projects.map(p => p.Project)).size === 5, "project identifiers must be unique");
    const allWBS = new Set(), allElementIDs = new Set(), allGLIDs = new Set();
    for (const name of ["projectElementResponses", "glResponses", "poResponses", "governanceContexts"]) requireValue(root[name] && Object.keys(root[name]).length === projects.length && Object.keys(root[name]).every(id => projects.some(p => p.ProjectUUID === id)), `unexpected ${name} project keys`);
    for (const project of projects) {
      const id = project.ProjectUUID, elements = collection(root.projectElementResponses[id]); records(elements, window.SAP_API_CONFIG.elementFields);
      requireValue(elements.length >= 4 && elements.length <= 5 && new Set(elements.map(e => e.ProjectElementUUID)).size === elements.length, "invalid project structure");
      const wbs = elements.map(e => e.WBSElementInternalID);
      for (const element of elements) {
        requireValue(element.ProjectUUID === id && element.WBSElementInternalID && !allWBS.has(element.WBSElementInternalID) && !allElementIDs.has(element.ProjectElementUUID), "element/WBS ownership or uniqueness mismatch");
        allWBS.add(element.WBSElementInternalID); allElementIDs.add(element.ProjectElementUUID);
        requireValue(["", "X"].includes(element.IsProjectMilestone) && (!element.IsMainMilestone || element.IsProjectMilestone === "X"), "invalid milestone flags");
      }
      const gl = collection(root.glResponses[id]); records(gl, window.GL_API_CONFIG.fields);
      requireValue(gl.length > 0 && new Set(gl.map(r => r.ID)).size === gl.length, "missing/duplicate accounting item IDs");
      for (const row of gl) {
        requireValue(!allGLIDs.has(row.ID), "duplicate accounting item ID across projects"); allGLIDs.add(row.ID);
        requireValue(row.ProjectInternalID === project.ProjectInternalID && wbs.includes(row.WBSElementInternalID)
        && /^\d{10}$/.test(row.AccountingDocument) && /^\d{6}$/.test(row.LedgerGLLineItem) && /^\d{10}$/.test(row.GLAccount)
        && row.CompanyCodeCurrency === "AUD" && row.GlobalCurrency === "AUD" && row.CompanyCode === "AU01"
        && row.IsCommitment === false && row.IsReversal === false && row.IsReversed === false, "invalid G/L link, identifier, currency or posting flags");
      }
      const po = collection(root.poResponses[id], true); records(po, window.PO_API_CONFIG.fields, true);
      requireValue(po.length > 0 && new Set(po.map(r => `${r.PurchaseOrder}/${r.PurchaseOrderItem}/${r.AccountAssignmentNumber}`)).size === po.length, "missing/duplicate procurement assignments");
      for (const row of po) requireValue(wbs.includes(row.WBSElementInternalID) && elements.some(e => e.WBSElementInternalID === row.WBSElementInternalID && e.ProjectElement === row.WBSElementExternalID)
        && /^\d{10}$/.test(row.PurchaseOrder) && /^\d{5}$/.test(row.PurchaseOrderItem) && /^\d{2}$/.test(row.AccountAssignmentNumber) && row.DocumentCurrency === "AUD" && row.CompanyCode === "AU01" && row.IsDeleted === false, "invalid PO link, identifier, currency or deletion flag");
      const context = root.governanceContexts[id];
      requireValue(context?.source === "SHOWCASE CONTEXT" && context.currency === "AUD" && utils.decimalUnits(context.approvedInvestment) > 0n
        && (context.forecastAtCompletion === null || utils.decimalUnits(context.forecastAtCompletion) > 0n)
        && rules.validDate(context.plannedCompletion) && (context.forecastCompletion === null || rules.validDate(context.forecastCompletion))
        && typeof context.evidenceAsOf === "string" && !Number.isNaN(Date.parse(context.evidenceAsOf))
        && [context.reviewReason, context.businessNarrative, context.stageLabel].every(value => typeof value === "string" && !!value.trim()) && typeof context.historical === "boolean", "invalid governance context");
      requireValue(project.ProjectCurrency === "AUD" && project.CompanyCode === "AU01", "invalid project currency/company");
    }
    requireValue(Array.isArray(root.seededReviews) && root.seededReviews.length === 4 && new Set(root.seededReviews.map(r => r.id)).size === 4, "invalid seed records");
    for (const seed of root.seededReviews) {
      requireValue(projects.some(p => p.ProjectUUID === seed.projectUUID) && rules.normalizeBasis(seed.reviewBasis) && !Number.isNaN(Date.parse(seed.reviewOpenedAt)) && services.governanceDirectory.resolve(seed.decisionOwnerId), "invalid seed identity/trigger/owner");
      requireValue(Object.entries(rules.ASSESSMENTS).every(([key, field]) => field.options.includes(seed.assessment?.[key]) && seed.assessment[key] !== field.missing), "invalid seeded assessment");
      requireValue(["in_progress", "decision_recorded"].includes(seed.status) && (seed.status === "in_progress" ? !seed.decision : seed.decision?.outcome === "Stop" && !!seed.decision.rationale && !Number.isNaN(Date.parse(seed.decision.timestamp))), "invalid seed decision");
    }
    return true;
  }
  let validated = false;
  function ensure() { if (!validated) { validate(); validated = true; } }
  function isShowcase(project) { return !!data?.enterpriseProjectResponse.d.results.some(p => p.ProjectUUID === project?.ProjectUUID); }
  function projectUUID(project) { ensure(); requireValue(isShowcase(project), "unknown showcase project"); return project.ProjectUUID; }
  function projects() { ensure(); return data.enterpriseProjectResponse.d.results; }
  function elements(project) { const response = data.projectElementResponses[projectUUID(project)]; return { data: response, records: response.d.results, httpStatus: "Synthetic showcase payload · local provider" }; }
  function gl(project) { const response = data.glResponses[projectUUID(project)]; return { data: response, records: response.d.results, linkMethod: "WBS Internal ID", message: "Synthetic showcase postings linked by exact WBS ID; no SAP request." }; }
  function po(project) { const response = data.poResponses[projectUUID(project)]; return { data: response, records: response.value, integrity: { status: "ok", returned: response.value.length, exactMatches: response.value.length, discarded: 0 }, message: "Synthetic showcase account assignments linked by exact WBS ID; no SAP request." }; }
  function governanceContext(project) { return data.governanceContexts[projectUUID(project)]; }
  function evidence(project) {
    const structure = elements(project), financial = gl(project), procurement = po(project), capturedAt = governanceContext(project).evidenceAsOf;
    return {
      lifecycle: { attempted: true, loaded: true, status: "success", elementCount: structure.records.length, wbsIDs: utils.loadedWBSIDs(structure.records),
        milestoneCount: structure.records.filter(r => utils.milestoneFlag(r.IsProjectMilestone).marked).length, mainMilestoneCount: structure.records.filter(r => r.IsMainMilestone === true).length,
        capturedAt, hasMore: false, note: "Synthetic SAP-schema-compatible showcase structure." },
      gl: { attempted: true, status: "success", linkedRecordCount: financial.records.length, linkMethod: financial.linkMethod, summaryLines: services.gl.summarize(financial.records), capturedAt, hasMore: false, note: financial.message },
      po: { attempted: true, status: "success", linkedRecordCount: procurement.records.length, summaryLines: services.po.summarize(procurement.records), capturedAt, hasMore: false, note: procurement.message }
    };
  }
  function financialContext(project) {
    const context = governanceContext(project), posted = services.gl.aggregate(gl(project).records).totals.get("AUD");
    const procurement = services.po.aggregate(po(project).records).totals.get("AUD");
    const approved = utils.decimalUnits(context.approvedInvestment), forecast = utils.decimalUnits(context.forecastAtCompletion);
    const variance = forecast === null ? null : forecast - approved;
    const tenths = variance === null ? null : ((variance < 0n ? -variance : variance) * 1000n + approved / 2n) / approved;
    return { ...context, postedFinancialActivity: utils.displayUnits(posted), forecastVariance: variance === null ? null : utils.displayUnits(variance),
      variancePercent: tenths === null ? null : `${variance < 0n ? "-" : ""}${tenths / 10n}.${tenths % 10n}`,
      remainingForecastInvestment: forecast === null ? null : utils.displayUnits(forecast - posted),
      procurementActivity: utils.displayPODecimal(procurement.total), notFinallyInvoiced: utils.displayPODecimal(procurement.notFinal) };
  }
  function seededReviews() {
    ensure();
    return data.seededReviews.map(seed => {
      const project = projects().find(p => p.ProjectUUID === seed.projectUUID), owner = services.governanceDirectory.resolve(seed.decisionOwnerId), snapshot = evidence(project);
      const record = { id: seed.id, project: rules.projectSnapshot(project), projectContextCapturedAt: governanceContext(project).evidenceAsOf, status: seed.status,
        reviewBasis: seed.reviewBasis, reviewOpenedAt: seed.reviewOpenedAt, assessment: { ...seed.assessment }, decisionOwner: owner.name, decisionOwnerId: owner.id, decisionOwnerSnapshot: owner,
        evidence: snapshot, decisionDraft: { outcome: "", rationale: "", owner: owner.name, requiredAction: "", actionOwner: "", nextReviewDate: "" }, decision: null };
      if (seed.decision) record.decision = { ...seed.decision, owner: owner.name, ownerId: owner.id, ownerSnapshot: owner, decisionTarget: rules.calendarTarget(seed.reviewOpenedAt, 14),
        escalationThreshold: rules.calendarTarget(seed.reviewOpenedAt, 30), assessmentSnapshot: { ...seed.assessment }, evidenceSnapshot: snapshot };
      return record;
    });
  }
  function isHistorical(record) { return data.seededReviews.some(seed => seed.id === record?.id && seed.projectUUID === record?.project?.ProjectUUID && seed.decision?.timestamp === record?.decision?.timestamp && !!seed.decision); }
  services.showcase = { validate, isShowcase, projects, elements, gl, po, governanceContext, evidence, financialContext, seededReviews, isHistorical,
    projectResponse() { ensure(); return data.enterpriseProjectResponse; } };
})();
