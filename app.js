(() => {
  "use strict";
  const { state, utils, http, services, ui } = window.DPEApp;
  const { reviewRules: rules, governanceUI: governance } = window.DPEApp;
  const store = services.reviewStore;
  const missingKeyMessage = "Please add your SAP Sandbox API key to config.local.js first.";
  state.evidence = rules.emptyEvidence();

  function refreshRecords() {
    try { state.reviews = store.list(); state.storageError = ""; governance.storageNotice(""); return true; }
    catch (error) { state.storageError = error.message; governance.storageNotice(error.message); return false; }
  }
  function currentReview() { return state.reviews.find(record => record.id === state.currentReviewID) || null; }
  function busy() { return !!(state.elementController || state.glController || state.poController); }
  function evidenceForSelected() {
    const record = currentReview();
    if (record?.project.ProjectUUID === state.selectedProject?.ProjectUUID) return record.status === "decision_recorded" ? record.decision.evidenceSnapshot : record.evidence;
    return rules.activeReview(state.reviews, state.selectedProject?.ProjectUUID)?.evidence || state.evidence;
  }
  function refreshGovernance() {
    governance.renderDashboard(state.reviews, state.projects.length, openReview, !state.storageError);
    governance.renderReviews(state.reviews, openReview, !state.storageError);
    if (state.selectedProject) governance.details(state.selectedProject, evidenceForSelected(), state.reviews, !!state.selectedFromSnapshot, !state.storageError);
    const record = currentReview();
    if (record && ["assessment", "summary", "decision"].includes(state.view)) {
      governance.chrome(record, busy());
      governance.financialSnapshot(record);
      if (state.view === "summary") governance.reviewSummary(record);
    }
    governance.evidenceButton(!!state.selectedProject && !busy());
  }
  function persistEvidence(source, value) {
    state.evidence[source] = value;
    const record = rules.activeReview(state.reviews, state.selectedProject?.ProjectUUID);
    if (record) {
      try { store.update(record.id, { evidence: { ...record.evidence, [source]: value } }); refreshRecords(); }
      catch (error) { governance.storageNotice(error.message); state.storageError = error.message; }
    }
    refreshGovernance();
  }
  function attemptedFailure(source, note, unavailable = false) {
    persistEvidence(source, { ...rules.emptyEvidence()[source], attempted: true, status: unavailable ? "unavailable" : "error", note, capturedAt: new Date().toISOString() });
  }
  function saveDraft() {
    const record = currentReview();
    if (!record || record.status !== "in_progress" || !["assessment", "decision"].includes(state.view)) return true;
    try {
      const patch = state.view === "assessment" ? governance.readAssessment() : { decisionDraft: governance.readDecision(), decisionOwner: governance.readDecision().owner };
      store.update(record.id, patch); refreshRecords(); refreshGovernance(); return true;
    } catch (error) { governance.storageNotice(error.message); governance.error(error.message); return false; }
  }
  function navigate(view) {
    if (!saveDraft()) return;
    refreshRecords(); state.view = view; governance.showView(view); refreshGovernance();
    if (view === "investments") ui.renderProjects(state.projects, state.selectedProject, loadProjectElements);
  }
  function startReview() {
    if (!state.selectedProject) return;
    try {
      if (!refreshRecords()) return;
      const record = store.start(state.selectedProject, state.evidence);
      refreshRecords(); state.currentReviewID = record.id; showReviewStep("assessment", false);
    } catch (error) { governance.storageNotice(error.message); }
  }
  function openReview(id) {
    if (!saveDraft() || !refreshRecords()) return;
    const record = state.reviews.find(item => item.id === id); if (!record) return;
    if (state.selectedProject?.ProjectUUID !== record.project.ProjectUUID) {
      resetElementSelection(); state.evidence = rules.emptyEvidence();
      state.selectedProject = state.projects.find(project => project.ProjectUUID === record.project.ProjectUUID) || record.project;
      state.selectedFromSnapshot = !state.projects.some(project => project.ProjectUUID === record.project.ProjectUUID);
      ui.selectProject(state.selectedProject, state.projects, loadProjectElements);
    }
    state.currentReviewID = id;
    if (record.status === "decision_recorded") { state.view = "confirmation"; governance.showView("confirmation"); governance.confirmation(record); refreshGovernance(); }
    else showReviewStep("assessment", false);
  }
  function showReviewStep(view, save = true) {
    if (save && !saveDraft()) return;
    const record = currentReview(); if (!record || record.status !== "in_progress") return;
    if (view === "decision" && (!rules.readiness(record).ready || busy())) { governance.error("Complete the readiness items and finish evidence loading before proceeding to Decision."); return; }
    state.view = view; governance.showView(view);
    if (view === "assessment") governance.assessment(record);
    if (view === "decision") governance.decision(record);
    refreshGovernance();
  }
  function confirmDecision() {
    if (!saveDraft()) return;
    const record = currentReview(); if (!record) return;
    if (busy()) { governance.error("Finish current SAP evidence requests before recording a decision."); return; }
    try {
      const saved = store.confirm(record.id, governance.readDecision());
      refreshRecords(); state.view = "confirmation"; governance.showView("confirmation"); governance.confirmation(saved); refreshGovernance();
      ui.renderProjects(state.projects, state.selectedProject, loadProjectElements);
    } catch (error) { governance.error(error.message); }
  }
  function returnInvestment() {
    if (!saveDraft()) return;
    const record = currentReview();
    if (!state.selectedProject && record) { state.selectedProject = record.project; state.selectedFromSnapshot = true; ui.selectProject(record.project, state.projects, loadProjectElements); }
    if (state.selectedProject) navigate("detail"); else navigate("investments");
  }
  async function loadReviewEvidence() {
    if (!state.selectedProject || busy()) return;
    if (!state.elementsLoaded) await loadProjectElements(state.selectedProject, true);
    if (!state.elementsLoaded) return;
    await Promise.allSettled([loadFinancialEvidence(), loadPurchaseOrderEvidence()]);
  }

  function resetFinancialEvidence() { state.resetFinancialEvidence(); ui.resetGL(); }
  function resetProcurementEvidence() { state.resetProcurementEvidence(); ui.resetPO(); }
  function resetElementSelection() {
    resetFinancialEvidence(); resetProcurementEvidence();
    state.resetElementSelection(); ui.resetElements(); state.evidence = rules.emptyEvidence(); state.currentReviewID = null;
  }

  async function loadProjects() {
    const key = http.apiKey();
    state.projects = [];
    ui.projectStart();
    if (http.keyMissing(key)) { ui.projectKeyMissing(); return; }
    ui.projectLoading();
    const controller = new AbortController();
    try {
      const result = await services.projects.loadProjects({ key, controller,
        onResponse: ui.projectRaw, onHTTPError: ui.projectHTTPError });
      state.projects = result.records;
      ui.projectSuccess(state.projects, state.selectedProject, loadProjectElements, result.httpStatus);
      refreshGovernance();
    } catch (error) {
      const context = error.sap || {};
      let detail;
      if (error.name === "AbortError") {
        detail = "Request timed out after 30 seconds. No complete response was received; check your connection and retry.";
      } else if (!context.response) {
        detail = "No HTTP response is available. A network, browser/CORS, or local-file restriction may have blocked the SAP request. Inspect the browser console and Network tab. Do not disable browser security.";
        if (window.location.protocol === "file:") detail += " This page is running from file://; try a local static web preview as described in README.md.";
      } else { detail = utils.redact(error.message, key); }
      ui.projectFailure(detail);
      console.error("SAP Enterprise Project connection test failed", {
        url: services.projects.projectURL().href, status: context.response?.status ?? "unavailable", diagnostic: detail
      });
    } finally { ui.projectFinished(); refreshGovernance(); }
  }

  async function loadProjectElements(project, preserveReview = false) {
    if (!preserveReview && !saveDraft()) return;
    resetFinancialEvidence(); resetProcurementEvidence();
    state.evidence = rules.emptyEvidence();
    if (!preserveReview) state.currentReviewID = null;
    state.elementsLoaded = false;
    const requestID = ++state.elementRequestID;
    state.elementController?.abort();
    state.selectedProject = project;
    state.selectedFromSnapshot = !state.projects.some(item => item.ProjectUUID === project.ProjectUUID);
    state.projectElements = [];
    ui.selectProject(project, state.projects, loadProjectElements);
    state.view = "detail"; governance.showView("detail"); refreshGovernance();
    const key = http.apiKey();
    if (http.keyMissing(key)) { ui.elementsRejected(missingKeyMessage); attemptedFailure("lifecycle", missingKeyMessage, true); return; }
    if (!services.projects.validUUID(project)) {
      ui.elementsRejected("The selected SAP project has no valid ProjectUUID. No request was sent."); attemptedFailure("lifecycle", "Invalid SAP project UUID; no lifecycle request sent.", true); return;
    }
    const controller = new AbortController();
    state.elementController = controller;
    refreshGovernance();
    const isCurrent = () => requestID === state.elementRequestID;
    try {
      const result = await services.projects.loadElements(project, { key, controller, isCurrent,
        onResponse: ui.elementsRaw, onHTTPError: ui.elementsHTTPError });
      if (!isCurrent()) return;
      state.projectElements = result.records;
      state.elementsLoaded = true;
      ui.renderElements(state.projectElements, result, utils.loadedWBSIDs(state.projectElements));
      persistEvidence("lifecycle", { attempted: true, loaded: true, status: "success", elementCount: result.records.length,
        wbsIDs: utils.loadedWBSIDs(result.records), milestoneCount: result.records.filter(item => utils.milestoneFlag(item.IsProjectMilestone).marked).length,
        mainMilestoneCount: result.records.filter(item => item.IsMainMilestone === true).length,
        capturedAt: new Date().toISOString(), hasMore: !!result.data.d.__next, note: result.httpStatus + ". SAP lifecycle evidence loaded; absence of marked milestones does not prevent a governance review." });
    } catch (error) {
      if (!isCurrent()) return;
      state.projectElements = [];
      const context = error.sap || {};
      let detail;
      if (error.name === "AbortError") {
        detail = "Project element request timed out after 30 seconds. Check your connection and retry.";
      } else if (!context.response) {
        detail = "No HTTP response is available. A network, browser/CORS, or local-file restriction may have blocked the project element request. Inspect the browser console and Network tab. Do not disable browser security.";
        if (window.location.protocol === "file:") detail += " Try a local static web preview as described in README.md.";
      } else { detail = utils.redact(error.message, key); }
      ui.elementsFailure(detail);
      attemptedFailure("lifecycle", detail);
      console.error("SAP Project Element request failed", {
        url: services.projects.elementURL(project).href, status: context.response?.status ?? "unavailable", diagnostic: detail
      });
    } finally { if (isCurrent()) { state.elementController = null; refreshGovernance(); } }
  }

  async function loadFinancialEvidence() {
    if (!state.selectedProject || !state.elementsLoaded) {
      ui.setGLMessage("Select a project and successfully load its Project Elements first.", "error");
      if (state.selectedProject) attemptedFailure("gl", "Lifecycle must load before a linked G/L request can be constructed.", true); return;
    }
    const project = state.selectedProject;
    const wbsIDs = utils.loadedWBSIDs(state.projectElements);
    resetFinancialEvidence();
    ui.glSelected(project);
    const requestID = state.glRequestID;
    const key = http.apiKey();
    if (http.keyMissing(key)) { ui.setGLMessage(missingKeyMessage, "error"); ui.glFinished(); attemptedFailure("gl", missingKeyMessage, true); return; }
    if (!services.gl.projectID(project) && !wbsIDs.length) {
      ui.setGLMessage("No ProjectInternalID or loaded WBS Internal IDs available. No linked query can be sent.", "error");
      ui.glFinished(); attemptedFailure("gl", "No project/WBS identifier available; no linked G/L request sent.", true); return;
    }
    const controller = new AbortController();
    state.glController = controller;
    refreshGovernance();
    ui.glLoading();
    let lastHTTP = "";
    const isCurrent = () => requestID === state.glRequestID;
    try {
      const result = await services.gl.load(project, wbsIDs, { key, controller, isCurrent,
        onRaw: ui.glRaw, onDiagnosticRaw: ui.glDiagnosticRaw, onProgress: ui.setGLMessage,
        onDiagnosticStart: ui.glDiagnosticStart, onHTTP: status => { lastHTTP = status; }, onHTTPError: ui.glHTTPError });
      if (!isCurrent()) return;
      if (result.linkMethod) {
        state.glRecords = result.records;
        ui.renderGL(state.glRecords, services.gl.summarize(state.glRecords));
      }
      ui.setGLMessage(result.message, result.linkMethod ? "success" : "info");
      persistEvidence("gl", { attempted: true, status: "success", linkedRecordCount: result.records.length, linkMethod: result.linkMethod,
        summaryLines: result.linkMethod ? services.gl.summarize(result.records) : [], capturedAt: new Date().toISOString(),
        hasMore: result.message.includes("additional pages"), note: result.message });
    } catch (error) {
      if (!isCurrent()) return;
      state.glRecords = [];
      const detail = error.name === "AbortError" ? "G/L request timed out after 30 seconds." : utils.redact(error.message, key);
      ui.glFailure(detail, lastHTTP);
      attemptedFailure("gl", `${lastHTTP ? lastHTTP + ". " : ""}${detail}`);
      console.error("SAP G/L evidence request failed", { status: lastHTTP || "unavailable", diagnostic: detail });
    } finally {
      if (isCurrent()) { state.glController = null; ui.glFinished(); refreshGovernance(); }
    }
  }

  async function loadPurchaseOrderEvidence() {
    if (!state.selectedProject || !state.elementsLoaded || !utils.loadedWBSIDs(state.projectElements).length) {
      ui.setPOMessage("Select a project and successfully load its real WBS Internal IDs first.", "error");
      if (state.selectedProject) attemptedFailure("po", "No loaded real WBS IDs available; no PO account-assignment request sent.", true); return;
    }
    const project = state.selectedProject;
    const wbsIDs = utils.loadedWBSIDs(state.projectElements);
    resetProcurementEvidence();
    ui.poSelected(project);
    const requestID = state.poRequestID;
    const key = http.apiKey();
    if (http.keyMissing(key)) { ui.setPOMessage(missingKeyMessage, "error"); ui.poFinished(); attemptedFailure("po", missingKeyMessage, true); return; }
    const controller = new AbortController();
    state.poController = controller;
    refreshGovernance();
    ui.poLoading();
    let context = {};
    const isCurrent = () => requestID === state.poRequestID;
    try {
      const result = await services.po.load(wbsIDs, { key, controller, isCurrent,
        onRaw: ui.poRaw, onHTTP: headers => { context = headers; }, onHTTPError: ui.poHTTPError });
      if (!isCurrent()) return;
      state.poRecords = result.records;
      if (state.poRecords.length) ui.renderPO(state.poRecords, services.po.summarize(state.poRecords));
      else ui.poEmpty();
      ui.setPOMessage(result.message, state.poRecords.length ? "success" : "info");
      services.po.logIntegrity(result.integrity);
      persistEvidence("po", { attempted: true, status: "success", linkedRecordCount: result.records.length,
        summaryLines: result.records.length ? services.po.summarize(result.records) : [], capturedAt: new Date().toISOString(),
        hasMore: !!result.data["@odata.nextLink"], note: result.message });
    } catch (error) {
      if (!isCurrent()) return;
      context = error.sap || context;
      state.poRecords = [];
      const detail = error.name === "AbortError" ? "Purchase Order request timed out after 30 seconds." : !context.response
        ? "No HTTP response available. A network, browser/CORS or local-file restriction may have blocked the request. Inspect the console and Network tab; do not disable browser security."
        : utils.redact(error.message, key);
      ui.poFailure(detail, context.httpStatus || "");
      attemptedFailure("po", `${context.httpStatus ? context.httpStatus + ". " : ""}${detail}`);
      console.error("SAP Purchase Order evidence request failed", { url: services.po.queryURL(wbsIDs).href, status: context.httpStatus || "unavailable", diagnostic: detail });
    } finally { if (isCurrent()) { state.poController = null; ui.poFinished(); refreshGovernance(); } }
  }

  ui.configureReviews(project => state.storageError ? "Local review status unavailable" : rules.projectStatus(state.reviews, project.ProjectUUID));
  ui.bindEvents({ loadGL: loadFinancialEvidence, loadPO: loadPurchaseOrderEvidence,
    loadProjects: () => { if (!saveDraft()) return; resetElementSelection(); navigate("investments"); return loadProjects(); } });
  governance.bind({ navigate, startReview, saveDraft, summary: () => showReviewStep("summary"), reviewStep: showReviewStep,
    confirm: confirmDecision, returnInvestment, loadEvidence: loadReviewEvidence,
    reloadLifecycle: () => state.selectedProject && loadProjectElements(state.selectedProject, true),
    lastDecision: () => {
      const record = [...state.reviews].filter(item => item.project.ProjectUUID === state.selectedProject?.ProjectUUID && item.status === "decision_recorded").sort((a, b) => b.decision.timestamp.localeCompare(a.decision.timestamp))[0];
      if (record) openReview(record.id);
    } });
  refreshRecords(); governance.showView("dashboard"); refreshGovernance();
  setInterval(refreshGovernance, 60000);
})();
