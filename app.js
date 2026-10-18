(() => {
  "use strict";
  const { state, utils, http, services, ui } = window.DPEApp;
  const { reviewRules: rules, governanceUI: governance } = window.DPEApp;
  const store = services.reviewStore;
  const showcase = services.showcase;
  let freshlyRecordedDecisionID = null;
  let pendingReviewStart = null;
  let unsavedDraft = false;
  const missingKeyMessage = "Please add your SAP Sandbox API key to config.local.js first.";
  state.evidence = rules.emptyEvidence();

  function refreshRecords() {
    try { state.reviews = store.list(); state.storageError = ""; governance.storageNotice(""); return true; }
    catch (error) { state.storageError = error.message; governance.storageNotice(error.message); return false; }
  }
  function mergeProjects(sandboxProjects) {
    const result = [...showcase.projects()], seen = new Set(result.map(project => project.ProjectUUID.toLowerCase()));
    for (const project of sandboxProjects) {
      const id = project.ProjectUUID?.toLowerCase();
      if (id && !seen.has(id)) { seen.add(id); result.push(project); }
    }
    return result;
  }
  function seedShowcase(reset = false) {
    try { store.seedShowcase({ reset }); return refreshRecords(); }
    catch (error) { state.storageError = error.message; governance.storageNotice(error.message); return false; }
  }
  function resetShowcase() {
    if (!window.confirm("Reset all local reviews and decision records (Showcase and SAP Sandbox)? This cannot be undone. The default Showcase baseline will be restored: 3 active reviews and 1 historical decision. SAP data, loaded projects and API key will not change.")) return;
    if (!canLeaveReview() || !seedShowcase(true)) return;
    freshlyRecordedDecisionID = null; pendingReviewStart = null;
    resetElementSelection();
    state.view = "dashboard"; governance.showView("dashboard"); refreshGovernance();
    ui.renderProjects(state.projects, state.selectedProject, loadProjectElements);
    ui.toast({ title: "Showcase reset", message: "All local reviews and decisions reset. Default showcase restored.", kind: "neutral", duration: 4500 });
  }
  function currentReview() { return state.reviews.find(record => record.id === state.currentReviewID) || null; }
  function busy() { return !!(state.elementController || state.glController || state.poController); }
  function evidenceForSelected() {
    if (state.view === "detail") {
      if (state.evidence.lifecycle.attempted || state.elementController) return state.evidence;
      return rules.activeReview(state.reviews, state.selectedProject?.ProjectUUID)?.evidence || state.evidence;
    }
    const record = currentReview();
    if (record?.project.ProjectUUID === state.selectedProject?.ProjectUUID) return record.status === "decision_recorded" ? record.decision.evidenceSnapshot : record.evidence;
    return rules.activeReview(state.reviews, state.selectedProject?.ProjectUUID)?.evidence || state.evidence;
  }
  function refreshGovernance() {
    if (state.view === "investments") ui.renderProjects(state.projects, state.selectedProject, loadProjectElements);
    governance.renderDashboard(state.reviews, state.projects, openReview, !state.storageError, state.portfolioScopeResolved);
    if (state.selectedProject) governance.details(state.selectedProject, evidenceForSelected(), state.reviews, !!state.selectedFromSnapshot, !state.storageError, selectHistoryRecord,
      state.view === "confirmation" ? state.currentReviewID : null, state.view === "confirmation" && freshlyRecordedDecisionID === state.currentReviewID);
    const record = currentReview();
    if (record && ["assessment", "summary", "decision"].includes(state.view)) {
      governance.chrome(record, busy(), unsavedDraft || !!state.storageError);
      if (state.view === "summary") governance.reviewSummary(record);
    }
    governance.evidenceButton(!!state.selectedProject && !state.selectedFromSnapshot && !busy());
    governance.autosaveStatus(unsavedDraft, !!state.storageError);
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
  function beforeUnsavedUnload(event) { event.preventDefault(); event.returnValue = ""; }
  function setUnsavedDraft(value) {
    if (unsavedDraft !== value) {
      if (value) window.addEventListener?.("beforeunload", beforeUnsavedUnload);
      else window.removeEventListener?.("beforeunload", beforeUnsavedUnload);
    }
    unsavedDraft = value; governance.autosaveStatus(value, !!state.storageError);
  }
  function draftChanged(record, patch) {
    if (patch.assessment) return Object.keys(patch.assessment).some(key => patch.assessment[key] !== record.assessment[key])
      || Object.hasOwn(patch, "decisionOwnerId") && patch.decisionOwnerId !== record.decisionOwnerId;
    return ["outcome", "rationale", "requiredAction", "actionOwner", "nextReviewDate"].some(key => patch.decisionDraft[key] !== record.decisionDraft[key]);
  }
  function saveDraft() {
    const record = currentReview();
    if (!record || record.status !== "in_progress" || !["assessment", "decision"].includes(state.view)) return !unsavedDraft;
    try {
      const patch = state.view === "assessment" ? governance.readAssessment() : { decisionDraft: governance.readDecision() };
      if (!draftChanged(record, patch)) {
        const recovered = unsavedDraft; setUnsavedDraft(false);
        if (recovered) refreshGovernance();
        return true;
      }
      store.update(record.id, patch); setUnsavedDraft(false); refreshRecords(); refreshGovernance(); return true;
    } catch { setUnsavedDraft(true); refreshGovernance(); return false; }
  }
  function canLeaveReview() {
    if (saveDraft()) return true;
    governance.focusSaveError(); return false;
  }
  function navigate(view, dashboardFilter = "active") {
    if (!canLeaveReview()) return;
    freshlyRecordedDecisionID = null;
    refreshRecords(); state.view = view; governance.showView(view, dashboardFilter); refreshGovernance();
    if (view === "investments") ui.renderProjects(state.projects, state.selectedProject, loadProjectElements);
  }
  function workspaceTab(tab) {
    if (!state.selectedProject || !canLeaveReview()) return false;
    freshlyRecordedDecisionID = null;
    refreshRecords();
    if (tab === "overview") { openOverview(); return true; }
    if (tab === "current" && !state.storageError) {
      const active = rules.activeReview(state.reviews, state.selectedProject.ProjectUUID);
      if (active) { state.currentReviewID = active.id; resumeReview(active); return true; }
    }
    state.currentReviewID = null;
    state.view = tab === "history" ? "history" : "current";
    governance.showView(state.view); refreshGovernance();
    return true;
  }
  function selectHistoryRecord(id) {
    if (state.view === "confirmation" && state.currentReviewID === id) { workspaceTab("history"); return; }
    openReview(id);
  }
  function refreshProjects() {
    if (state.projectsRefreshing || !canLeaveReview()) return;
    if (!["dashboard", "investments"].includes(state.view)) {
      state.view = "investments"; governance.showView("investments");
    }
    resetElementSelection();
    return loadProjects(true);
  }
  function validationMissing(record) {
    const labels = { "SAP project context": "Project context", "Project Elements / lifecycle evidence loaded": "Project Structure",
      "G/L evidence attempted": "Financial Activity", "PO evidence attempted": "Procurement Activity", "Review basis": "Review Trigger", "Decision owner": "Decision Owner" };
    const missing = rules.readiness(record).missing.map(item => labels[item] || item);
    if (busy()) missing.push("Evidence refresh");
    return missing;
  }
  function startReview() {
    if (!state.selectedProject) return;
    try {
      if (!refreshRecords()) return;
      if (state.selectedFromSnapshot && !rules.activeReview(state.reviews, state.selectedProject.ProjectUUID)) return;
      const context = governance.portfolioState(state.selectedProject, state.reviews);
      if (!context.active && context.latest?.decision.outcome === "Stop") { openReview(context.latest.id); return; }
      if (context.active) { state.currentReviewID = context.active.id; resumeReview(context.active); return; }
      pendingReviewStart = { projectUUID: state.selectedProject.ProjectUUID };
      governance.reviewStart(false);
    } catch (error) { governance.storageNotice(error.message); }
  }
  function setLegacyReviewTrigger() {
    if (!canLeaveReview() || !refreshRecords()) return;
    const record = rules.activeReview(state.reviews, state.selectedProject?.ProjectUUID);
    if (!record || rules.normalizeBasis(record.reviewBasis)) return;
    pendingReviewStart = { projectUUID: record.project.ProjectUUID, recordID: record.id };
    governance.reviewStart(true);
  }
  function cancelReviewStart() { pendingReviewStart = null; governance.closeReviewStart(); }
  function confirmReviewStart() {
    const basis = rules.normalizeBasis(governance.readReviewStart());
    if (!basis) { governance.reviewStartError(pendingReviewStart?.recordID ? "Select the missing Review Trigger for this existing review." : "Select a Review Trigger before starting the review."); return; }
    if (!pendingReviewStart || pendingReviewStart.projectUUID !== state.selectedProject?.ProjectUUID) { cancelReviewStart(); return; }
    try {
      if (!refreshRecords()) { governance.reviewStartError(state.storageError); return; }
      let record;
      if (pendingReviewStart.recordID) {
        record = store.get(pendingReviewStart.recordID);
        if (!record || record.status !== "in_progress") throw new Error("This legacy review is no longer active.");
        if (!rules.normalizeBasis(record.reviewBasis)) record = store.update(record.id, { reviewBasis: basis });
      } else record = store.start(state.selectedProject, state.evidence, { reviewBasis: basis });
      refreshRecords(); state.currentReviewID = record.id; pendingReviewStart = null;
      governance.closeReviewStart(); resumeReview(record);
    } catch (error) { governance.reviewStartError(error.message); }
  }
  function openReview(id) {
    if (!canLeaveReview() || !refreshRecords()) return;
    freshlyRecordedDecisionID = null;
    const record = state.reviews.find(item => item.id === id); if (!record) return;
    if (state.selectedProject?.ProjectUUID !== record.project.ProjectUUID) {
      resetElementSelection(); state.evidence = rules.emptyEvidence();
      state.selectedProject = state.projects.find(project => project.ProjectUUID === record.project.ProjectUUID) || record.project;
      state.selectedFromSnapshot = !state.projects.some(project => project.ProjectUUID === record.project.ProjectUUID);
      ui.selectProject(state.selectedProject, state.projects, loadProjectElements);
      if (state.selectedFromSnapshot) state.evidence = record.status === "decision_recorded" ? record.decision.evidenceSnapshot : record.evidence;
    }
    state.currentReviewID = id;
    if (record.status === "decision_recorded") { state.view = "confirmation"; governance.showView("confirmation"); governance.confirmation(record); refreshGovernance(); document.getElementById("confirmation-view").focus(); }
    else resumeReview(record);
  }
  function resumeReview(record) { showReviewStep(rules.readiness(record).ready ? "summary" : "assessment", false); }
  function showReviewStep(view, save = true) {
    if (save && !canLeaveReview()) return;
    const record = currentReview(); if (!record || record.status !== "in_progress") return;
    if (view === "decision") {
      const missing = validationMissing(record).filter(item => item !== "Evidence refresh");
      if (!services.governanceDirectory.eligible(record) && !missing.includes("Decision Owner")) missing.push("Decision Owner");
      if (missing.length) { governance.workflowGate(`Complete Assessment before entering Governance Decision: ${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} still required.`); return; }
      if (busy()) { governance.workflowGate("Finish the current evidence refresh before entering Governance Decision."); return; }
      if (state.storageError) { governance.workflowGate("Governance storage is unavailable. Restore storage before entering Governance Decision."); return; }
    }
    if (view === state.view) { refreshGovernance(); return; }
    state.view = view; governance.showView(view);
    if (view === "assessment") governance.assessment(record);
    if (view === "decision") governance.decision(record);
    refreshGovernance();
  }
  function confirmDecision() {
    if (!canLeaveReview()) return;
    const record = currentReview(); if (!record) return;
    if (busy()) { governance.error("Finish current SAP evidence requests before recording a decision."); return; }
    const errors = rules.decisionErrors(record, governance.readDecision());
    if (errors.length) { governance.incompleteDecision(errors); return; }
    try {
      const saved = store.confirm(record.id, governance.readDecision());
      freshlyRecordedDecisionID = saved.id;
      refreshRecords(); state.view = "confirmation"; governance.showView("confirmation"); governance.confirmation(saved); refreshGovernance(); document.getElementById("workspace-recorded-notice").focus();
      ui.renderProjects(state.projects, state.selectedProject, loadProjectElements);
    } catch (error) { governance.incompleteDecision([`Couldn’t record decision. ${error.message}`], { recordFailure: true }); }
  }
  function openOverview() {
    freshlyRecordedDecisionID = null;
    if (!state.selectedFromSnapshot && !state.elementsLoaded) { void loadProjectElements(state.selectedProject, true); return; }
    state.view = "detail"; governance.showView("detail"); refreshGovernance();
  }
  async function loadReviewEvidence() {
    if (!state.selectedProject || state.selectedFromSnapshot || busy()) return;
    await loadProjectElements(state.selectedProject, true);
  }
  function technicalDetails() {
    if (!canLeaveReview()) return;
    const project = state.selectedProject || state.projects[0];
    if (project && !state.selectedFromSnapshot && (!state.selectedProject || !state.elementsLoaded)) void loadProjectElements(project, true);
    else { state.view = "detail"; governance.showView("detail"); refreshGovernance(); }
    governance.openTechnical();
  }

  function resetFinancialEvidence() { state.resetFinancialEvidence(); ui.resetGL(); }
  function resetProcurementEvidence() { state.resetProcurementEvidence(); ui.resetPO(); }
  function resetElementSelection() {
    resetFinancialEvidence(); resetProcurementEvidence();
    state.resetElementSelection(); ui.resetElements(); state.evidence = rules.emptyEvidence(); state.currentReviewID = null;
  }

  async function loadProjects(manual = false) {
    if (state.projectsRefreshing) return;
    state.sandboxRefreshError = false;
    const key = http.apiKey();
    state.portfolioScopeResolved = http.keyMissing(key);
    state.projects = mergeProjects([]);
    ui.projectStart();
    ui.renderProjects(state.projects, state.selectedProject, loadProjectElements);
    refreshGovernance();
    if (http.keyMissing(key)) { ui.projectKeyMissing(); ui.renderProjects(state.projects, state.selectedProject, loadProjectElements); return; }
    state.projectsRefreshing = true;
    ui.projectLoading();
    const controller = new AbortController();
    try {
      const result = await services.projects.loadProjects({ key, controller,
        onResponse: ui.projectRaw, onHTTPError: ui.projectHTTPError });
      state.projects = mergeProjects(result.records);
      state.portfolioScopeResolved = true;
      ui.projectSuccess(state.projects, state.selectedProject, loadProjectElements, result.httpStatus, result.records.length);
      refreshGovernance();
      if (manual) ui.toast({ title: "SAP Sandbox refreshed", duration: 3500, kind: "neutral" });
    } catch (error) {
      state.portfolioScopeResolved = true;
      const context = error.sap || {};
      let detail;
      if (error.name === "AbortError") {
        detail = "Request timed out after 30 seconds. No complete response was received; check your connection and retry.";
      } else if (!context.response) {
        detail = "No HTTP response is available. A network, browser/CORS, or local-file restriction may have blocked the SAP request. Inspect the browser console and Network tab. Do not disable browser security.";
        if (window.location.protocol === "file:") detail += " This page is running from file://; try a local static web preview as described in README.md.";
      } else { detail = utils.redact(error.message, key); }
      state.sandboxRefreshError = true;
      ui.projectFailure(detail);
      console.warn("SAP Enterprise Project refresh unavailable", {
        url: services.projects.projectURL().href, status: context.response?.status ?? "unavailable", diagnostic: detail
      });
    } finally { state.projectsRefreshing = false; ui.projectFinished(); ui.renderProjects(state.projects, state.selectedProject, loadProjectElements); refreshGovernance(); }
  }

  async function loadProjectElements(project, preserveReview = false) {
    if (!preserveReview && !canLeaveReview()) return;
    resetFinancialEvidence(); resetProcurementEvidence();
    state.evidence = rules.emptyEvidence();
    if (!preserveReview) state.currentReviewID = null;
    state.elementsLoaded = false;
    const requestID = ++state.elementRequestID;
    state.elementController?.abort();
    state.elementController = null;
    state.selectedProject = project;
    state.selectedFromSnapshot = !state.projects.some(item => item.ProjectUUID === project.ProjectUUID);
    state.projectElements = [];
    ui.selectProject(project, state.projects, loadProjectElements);
    state.view = "detail"; governance.showView("detail"); refreshGovernance();
    const key = http.apiKey();
    const local = showcase.isShowcase(project);
    if (!local && http.keyMissing(key)) { ui.elementsRejected(missingKeyMessage); attemptedFailure("lifecycle", missingKeyMessage, true); unavailableDependents(); return; }
    if (!services.projects.validUUID(project)) {
      ui.elementsRejected("The selected SAP project has no valid ProjectUUID. No request was sent."); attemptedFailure("lifecycle", "Invalid SAP project UUID; no lifecycle request sent.", true); unavailableDependents(); return;
    }
    const controller = new AbortController();
    state.elementController = controller;
    refreshGovernance();
    const isCurrent = () => requestID === state.elementRequestID;
    try {
      const result = local ? showcase.elements(project) : await services.projects.loadElements(project, { key, controller, isCurrent,
        onResponse: ui.elementsRaw, onHTTPError: ui.elementsHTTPError });
      if (local) ui.elementsRaw(result);
      if (!isCurrent()) return;
      state.projectElements = result.records;
      state.elementsLoaded = true;
      ui.renderElements(state.projectElements, result, utils.loadedWBSIDs(state.projectElements));
      persistEvidence("lifecycle", { attempted: true, loaded: true, status: "success", elementCount: result.records.length,
        wbsIDs: utils.loadedWBSIDs(result.records), milestoneCount: result.records.filter(item => utils.milestoneFlag(item.IsProjectMilestone).marked).length,
        mainMilestoneCount: result.records.filter(item => item.IsMainMilestone === true).length,
        capturedAt: local ? showcase.governanceContext(project).evidenceAsOf : new Date().toISOString(), hasMore: !!result.data.d.__next,
        note: local ? "Synthetic SAP-schema-compatible showcase structure." : result.httpStatus + ". SAP lifecycle evidence loaded; absence of marked milestones does not prevent a governance review." });
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
      unavailableDependents();
      if (local) console.error("Showcase structure provider failed", { diagnostic: detail });
      else console.error("SAP Project Element request failed", {
        url: services.projects.elementURL(project).href, status: context.response?.status ?? "unavailable", diagnostic: detail
      });
    } finally { if (isCurrent()) { state.elementController = null; refreshGovernance(); } }
    if (isCurrent() && state.elementsLoaded) await Promise.allSettled([loadFinancialEvidence(), loadPurchaseOrderEvidence()]);
  }

  function unavailableDependents() {
    for (const source of ["gl", "po"]) attemptedFailure(source, "Project structure could not be loaded; no dependent request sent.", true);
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
    const local = showcase.isShowcase(project);
    if (!local && http.keyMissing(key)) { ui.setGLMessage(missingKeyMessage, "error"); ui.glFinished(); attemptedFailure("gl", missingKeyMessage, true); return; }
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
      const result = local ? showcase.gl(project) : await services.gl.load(project, wbsIDs, { key, controller, isCurrent,
        onRaw: ui.glRaw, onDiagnosticRaw: ui.glDiagnosticRaw, onProgress: ui.setGLMessage,
        onDiagnosticStart: ui.glDiagnosticStart, onHTTP: status => { lastHTTP = status; }, onHTTPError: ui.glHTTPError });
      if (local) ui.glRaw(JSON.stringify(result.data, null, 2));
      if (!isCurrent()) return;
      if (result.linkMethod) {
        state.glRecords = result.records;
        ui.renderGL(state.glRecords, services.gl.summarize(state.glRecords));
      }
      ui.setGLMessage(result.message, result.linkMethod ? "success" : "info");
      persistEvidence("gl", { attempted: true, status: "success", linkedRecordCount: result.records.length, linkMethod: result.linkMethod,
        summaryLines: result.linkMethod ? services.gl.summarize(result.records) : [], capturedAt: local ? showcase.governanceContext(project).evidenceAsOf : new Date().toISOString(),
        hasMore: result.message.includes("additional pages"), note: result.message });
    } catch (error) {
      if (!isCurrent()) return;
      state.glRecords = [];
      const detail = error.name === "AbortError" ? "G/L request timed out after 30 seconds." : utils.redact(error.message, key);
      ui.glFailure(detail, lastHTTP);
      attemptedFailure("gl", `${lastHTTP ? lastHTTP + ". " : ""}${detail}`);
      console.error(local ? "Showcase financial provider failed" : "SAP G/L evidence request failed", { status: lastHTTP || "unavailable", diagnostic: detail });
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
    const local = showcase.isShowcase(project);
    if (!local && http.keyMissing(key)) { ui.setPOMessage(missingKeyMessage, "error"); ui.poFinished(); attemptedFailure("po", missingKeyMessage, true); return; }
    const controller = new AbortController();
    state.poController = controller;
    refreshGovernance();
    ui.poLoading();
    let context = {};
    const isCurrent = () => requestID === state.poRequestID;
    try {
      const result = local ? showcase.po(project) : await services.po.load(wbsIDs, { key, controller, isCurrent,
        onRaw: ui.poRaw, onHTTP: headers => { context = headers; }, onHTTPError: ui.poHTTPError });
      if (local) ui.poRaw(JSON.stringify(result.data, null, 2));
      if (!isCurrent()) return;
      state.poRecords = result.records;
      if (state.poRecords.length) ui.renderPO(state.poRecords, services.po.summarize(state.poRecords));
      else ui.poEmpty();
      ui.setPOMessage(result.message, state.poRecords.length ? "success" : "info");
      services.po.logIntegrity(result.integrity);
      persistEvidence("po", { attempted: true, status: "success", linkedRecordCount: result.records.length,
        summaryLines: result.records.length ? services.po.summarize(result.records) : [], capturedAt: local ? showcase.governanceContext(project).evidenceAsOf : new Date().toISOString(),
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
      if (local) console.error("Showcase procurement provider failed", { diagnostic: detail });
      else console.error("SAP Purchase Order evidence request failed", { url: services.po.queryURL(wbsIDs).href, status: context.httpStatus || "unavailable", diagnostic: detail });
    } finally { if (isCurrent()) { state.poController = null; ui.poFinished(); refreshGovernance(); } }
  }

  ui.configureReviews(project => governance.portfolioState(project, state.reviews, !state.storageError), openReview);
  ui.bindEvents({ loadGL: loadFinancialEvidence, loadPO: loadPurchaseOrderEvidence,
    loadProjects: refreshProjects, projectDetails: technicalDetails });
  governance.bind({ navigate, workspaceTab, startReview, confirmReviewStart, cancelReviewStart, setLegacyReviewTrigger, saveDraft, retrySave: saveDraft, summary: () => showReviewStep("summary"), reviewStep: showReviewStep,
    viewEvidence: () => { if (workspaceTab("overview") !== false) governance.focusEvidence(); },
    backDashboard: () => navigate("dashboard", state.view === "confirmation" && freshlyRecordedDecisionID === state.currentReviewID ? "recorded" : "active"),
    confirm: confirmDecision, loadEvidence: loadReviewEvidence,
    reloadLifecycle: loadReviewEvidence,
    resetShowcase,
    lastDecision: () => {
      const record = governance.completedReviews(state.reviews, state.selectedProject?.ProjectUUID)[0];
      if (record) openReview(record.id);
    } });
  state.portfolioScopeResolved = http.keyMissing(http.apiKey());
  state.projects = mergeProjects([]);
  seedShowcase(); governance.showView("dashboard"); refreshGovernance();
  ui.renderProjects(state.projects, state.selectedProject, loadProjectElements);
  governance.setDirectory(services.governanceDirectory.people());
  if (!http.keyMissing(http.apiKey())) void loadProjects();
  else { ui.projectKeyMissing(); ui.renderProjects(state.projects, state.selectedProject, loadProjectElements); }
  setInterval(refreshGovernance, 60000);
})();
