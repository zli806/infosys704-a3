(() => {
  "use strict";
  const { state, utils, http, services, ui } = window.DPEApp;
  const missingKeyMessage = "Please add your SAP Sandbox API key to config.local.js first.";

  function resetFinancialEvidence() { state.resetFinancialEvidence(); ui.resetGL(); }
  function resetProcurementEvidence() { state.resetProcurementEvidence(); ui.resetPO(); }
  function resetElementSelection() {
    resetFinancialEvidence(); resetProcurementEvidence();
    state.resetElementSelection(); ui.resetElements();
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
    } finally { ui.projectFinished(); }
  }

  async function loadProjectElements(project) {
    resetFinancialEvidence(); resetProcurementEvidence();
    state.elementsLoaded = false;
    const requestID = ++state.elementRequestID;
    state.elementController?.abort();
    state.selectedProject = project;
    state.projectElements = [];
    ui.selectProject(project, state.projects, loadProjectElements);
    const key = http.apiKey();
    if (http.keyMissing(key)) { ui.elementsRejected(missingKeyMessage); return; }
    if (!services.projects.validUUID(project)) {
      ui.elementsRejected("The selected SAP project has no valid ProjectUUID. No request was sent."); return;
    }
    const controller = new AbortController();
    state.elementController = controller;
    const isCurrent = () => requestID === state.elementRequestID;
    try {
      const result = await services.projects.loadElements(project, { key, controller, isCurrent,
        onResponse: ui.elementsRaw, onHTTPError: ui.elementsHTTPError });
      if (!isCurrent()) return;
      state.projectElements = result.records;
      state.elementsLoaded = true;
      ui.renderElements(state.projectElements, result, utils.loadedWBSIDs(state.projectElements));
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
      console.error("SAP Project Element request failed", {
        url: services.projects.elementURL(project).href, status: context.response?.status ?? "unavailable", diagnostic: detail
      });
    } finally { if (isCurrent()) state.elementController = null; }
  }

  async function loadFinancialEvidence() {
    if (!state.selectedProject || !state.elementsLoaded) {
      ui.setGLMessage("Select a project and successfully load its Project Elements first.", "error"); return;
    }
    const project = state.selectedProject;
    const wbsIDs = utils.loadedWBSIDs(state.projectElements);
    resetFinancialEvidence();
    ui.glSelected(project);
    const requestID = state.glRequestID;
    const key = http.apiKey();
    if (http.keyMissing(key)) { ui.setGLMessage(missingKeyMessage, "error"); ui.glFinished(); return; }
    if (!services.gl.projectID(project) && !wbsIDs.length) {
      ui.setGLMessage("No ProjectInternalID or loaded WBS Internal IDs available. No linked query can be sent.", "error");
      ui.glFinished(); return;
    }
    const controller = new AbortController();
    state.glController = controller;
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
    } catch (error) {
      if (!isCurrent()) return;
      state.glRecords = [];
      const detail = error.name === "AbortError" ? "G/L request timed out after 30 seconds." : utils.redact(error.message, key);
      ui.glFailure(detail, lastHTTP);
      console.error("SAP G/L evidence request failed", { status: lastHTTP || "unavailable", diagnostic: detail });
    } finally {
      if (isCurrent()) { state.glController = null; ui.glFinished(); }
    }
  }

  async function loadPurchaseOrderEvidence() {
    if (!state.selectedProject || !state.elementsLoaded || !utils.loadedWBSIDs(state.projectElements).length) {
      ui.setPOMessage("Select a project and successfully load its real WBS Internal IDs first.", "error"); return;
    }
    const project = state.selectedProject;
    const wbsIDs = utils.loadedWBSIDs(state.projectElements);
    resetProcurementEvidence();
    ui.poSelected(project);
    const requestID = state.poRequestID;
    const key = http.apiKey();
    if (http.keyMissing(key)) { ui.setPOMessage(missingKeyMessage, "error"); ui.poFinished(); return; }
    const controller = new AbortController();
    state.poController = controller;
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
    } catch (error) {
      if (!isCurrent()) return;
      context = error.sap || context;
      state.poRecords = [];
      const detail = error.name === "AbortError" ? "Purchase Order request timed out after 30 seconds." : !context.response
        ? "No HTTP response available. A network, browser/CORS or local-file restriction may have blocked the request. Inspect the console and Network tab; do not disable browser security."
        : utils.redact(error.message, key);
      ui.poFailure(detail, context.httpStatus || "");
      console.error("SAP Purchase Order evidence request failed", { url: services.po.queryURL(wbsIDs).href, status: context.httpStatus || "unavailable", diagnostic: detail });
    } finally { if (isCurrent()) { state.poController = null; ui.poFinished(); } }
  }

  ui.bindEvents({ loadGL: loadFinancialEvidence, loadPO: loadPurchaseOrderEvidence,
    loadProjects: () => { resetElementSelection(); return loadProjects(); } });
})();
