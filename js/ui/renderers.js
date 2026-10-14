(() => {
  "use strict";
  const app = window.DPEApp = window.DPEApp || {};
  const { milestoneFlag, mainMilestoneLabel, booleanLabel } = app.utils;
  function formatDate(value) {
    if (value === null || value === undefined || value === "") return "—";
    const match = /^\/Date\((-?\d+)(?:[+-]\d{4})?\)\/$/.exec(String(value));
    const date = match ? new Date(Number(match[1])) : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("en-NZ", { year: "numeric", month: "short", day: "2-digit", timeZone: "UTC" }).format(date);
  }
  let reviewStatusForProject = () => "No active review";
  const dom = {
    button: document.getElementById("load-projects"),
    connection: document.getElementById("connection-status"),
    message: document.getElementById("message"),
    errorDetails: document.getElementById("error-details"),
    tableBody: document.getElementById("projects-body"),
    rawResponse: document.getElementById("raw-response"),
    elementsPanel: document.getElementById("elements-panel"),
    selectedSummary: document.getElementById("selected-project"),
    elementsMessage: document.getElementById("elements-message"),
    elementsError: document.getElementById("elements-error"),
    elementsBody: document.getElementById("elements-body"),
    rawElements: document.getElementById("raw-elements-response"),
    glPanel: document.getElementById("gl-panel"),
    glButton: document.getElementById("load-financial-evidence"),
    glProject: document.getElementById("gl-project"),
    glMessage: document.getElementById("gl-message"),
    glError: document.getElementById("gl-error"),
    glSummary: document.getElementById("gl-summary"),
    glBody: document.getElementById("gl-body"),
    rawGL: document.getElementById("raw-gl-response"),
    glDiagnostic: document.getElementById("gl-diagnostic"),
    rawDiagnostic: document.getElementById("raw-gl-diagnostic"),
    poPanel: document.getElementById("po-panel"),
    poButton: document.getElementById("load-po-evidence"),
    poProject: document.getElementById("po-project"),
    poMessage: document.getElementById("po-message"),
    poError: document.getElementById("po-error"),
    poSummary: document.getElementById("po-summary"),
    poBody: document.getElementById("po-body"),
    rawPO: document.getElementById("raw-po-response")
  };
  function message(element, text, kind = "info") {
    element.textContent = text;
    element.dataset.kind = kind;
  }
  function cells(row, values) {
    for (const value of values) {
      const cell = document.createElement("td");
      cell.textContent = value === null || value === undefined || value === "" ? "—" : String(value);
      row.append(cell);
    }
  }
  function empty(body, count, text) {
    body.replaceChildren();
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = count;
    cell.className = "empty";
    cell.textContent = text;
    row.append(cell);
    body.append(row);
  }
  function summary(element, lines) {
    element.replaceChildren();
    for (const text of lines) {
      const paragraph = document.createElement("p");
      paragraph.textContent = text;
      element.append(paragraph);
    }
  }
  function errorBody(element, text) {
    element.textContent = text;
    element.hidden = false;
  }
  function raw(context) {
    return context.data !== undefined ? JSON.stringify(context.data, null, 2) : context.safeBody || "(Empty response body)";
  }
  function renderProjects(projects, selectedProject, onSelect) {
    if (!projects.length) { empty(dom.tableBody, 9, "SAP returned no projects."); return; }
    dom.tableBody.replaceChildren();
    for (const project of projects) {
      const row = document.createElement("tr");
      cells(row, [project.Project, project.ProjectDescription, project.ProcessingStatus,
        formatDate(project.ProjectStartDate), formatDate(project.ProjectEndDate), project.ProjectCurrency, project.CompanyCode, reviewStatusForProject(project)]);
      const actionCell = document.createElement("td");
      const action = document.createElement("button");
      action.type = "button";
      action.className = "row-action";
      action.textContent = "View Investment";
      action.setAttribute("aria-label", `View Investment for ${project.Project || "project"}`);
      action.addEventListener("click", () => onSelect(project));
      actionCell.append(action);
      row.append(actionCell);
      if (project === selectedProject) row.className = "selected-project";
      dom.tableBody.append(row);
    }
  }
  function resetElements() {
    dom.elementsPanel.hidden = true;
    dom.selectedSummary.textContent = "";
    dom.elementsBody.replaceChildren();
    dom.rawElements.textContent = "No response received yet.";
  }
  function selectProject(project, projects, onSelect) {
    dom.glPanel.hidden = false;
    dom.poPanel.hidden = false;
    dom.poProject.textContent = `Selected project: ${project.Project || "Unnamed project"}`;
    dom.glProject.textContent = `Selected project: ${project.Project || "Unnamed project"}`;
    dom.elementsPanel.hidden = false;
    dom.selectedSummary.textContent = `${project.Project || "Unnamed project"} · ${project.ProjectDescription || "No description"} · Status: ${project.ProcessingStatus || "—"}`;
    renderProjects(projects, project, onSelect);
    dom.elementsError.hidden = true;
    dom.elementsError.textContent = "";
    dom.rawElements.textContent = "No response received yet.";
    empty(dom.elementsBody, 10, "Loading project elements…");
    message(dom.elementsMessage, "Requesting related project elements from SAP Sandbox…");
  }
  function renderElements(records, context, wbsIDs) {
    dom.glButton.disabled = false;
    message(dom.glMessage, "Project Elements loaded. Click Load Financial Evidence to test project/WBS links.");
    dom.poButton.disabled = !wbsIDs.length;
    message(dom.poMessage, dom.poButton.disabled ? "No loaded WBS Internal IDs available; no PO query can be sent." : "WBS IDs loaded. Click Load Purchase Order Evidence to test procurement links.");
    dom.elementsBody.replaceChildren();
    for (const element of records) {
      const milestone = milestoneFlag(element.IsProjectMilestone);
      const row = document.createElement("tr");
      if (element.IsMainMilestone === true) row.className = "main-milestone";
      else if (milestone.marked) row.className = "milestone";
      cells(row, [element.ProjectElement, element.ProjectElementDescription, element.ProcessingStatus,
        formatDate(element.PlannedStartDate), formatDate(element.PlannedEndDate), formatDate(element.ForecastedEndDate),
        element.WBSElementInternalID, milestone.label, mainMilestoneLabel(element.IsMainMilestone), element.MilestoneApprovalStatus]);
      dom.elementsBody.append(row);
    }
    const milestones = records.filter(element => milestoneFlag(element.IsProjectMilestone).marked).length;
    const mainMilestones = records.filter(element => element.IsMainMilestone === true).length;
    const unknownFlags = records.filter(element => milestoneFlag(element.IsProjectMilestone).label.startsWith("Unknown")).length;
    let text = `${context.httpStatus} · ${records.length} project elements returned · ${milestones} marked milestones · ${mainMilestones} main milestones.`;
    if (!records.length) empty(dom.elementsBody, 10, "SAP returned zero project elements for this project.");
    else if (!milestones) text += " No returned elements are marked as project milestones.";
    if (unknownFlags) text += ` ${unknownFlags} milestone flags are unknown; inspect their raw values.`;
    if (context.data.d.__next) text += " SAP indicates more elements are available; these counts cover only the returned page, not the complete project. Inspect the raw response continuation link.";
    message(dom.elementsMessage, text, "success");
  }
  function resetGL() {
    dom.glPanel.hidden = true;
    dom.glButton.disabled = true;
    dom.glButton.textContent = "Load Financial Evidence";
    dom.glButton.removeAttribute("aria-busy");
    dom.glSummary.replaceChildren();
    dom.glProject.textContent = "";
    dom.glError.hidden = true;
    dom.glError.textContent = "";
    dom.rawGL.textContent = "No linked query sent yet.";
    dom.glDiagnostic.hidden = true;
    dom.rawDiagnostic.textContent = "No diagnostic request sent.";
    empty(dom.glBody, 12, "No financial evidence loaded.");
    message(dom.glMessage, "Select a project and load its Project Elements first.");
  }
  function renderGL(records, lines) {
    dom.glBody.replaceChildren();
    for (const record of records) {
      const row = document.createElement("tr");
      cells(row, [formatDate(record.PostingDate), record.AccountingDocument, record.GLAccount,
        record.WBSElementInternalID, record.AmountInCompanyCodeCurrency, record.CompanyCodeCurrency,
        record.DebitCreditCode, booleanLabel(record.IsCommitment), booleanLabel(record.IsReversal),
        booleanLabel(record.IsReversed), record.PurchasingDocument, record.DocumentItemText]);
      dom.glBody.append(row);
    }
    summary(dom.glSummary, lines);
  }
  function resetPO() {
    dom.poPanel.hidden = true;
    dom.poButton.disabled = true;
    dom.poButton.textContent = "Load Purchase Order Evidence";
    dom.poButton.removeAttribute("aria-busy");
    dom.poProject.textContent = "";
    dom.poSummary.replaceChildren();
    dom.poError.hidden = true;
    dom.poError.textContent = "";
    dom.rawPO.textContent = "No PO query sent yet.";
    empty(dom.poBody, 11, "No procurement evidence loaded.");
    message(dom.poMessage, "Select a project and load its WBS IDs first.");
  }
  function renderPO(records, lines) {
    dom.poBody.replaceChildren();
    for (const record of records) {
      const row = document.createElement("tr");
      cells(row, [record.PurchaseOrder, record.PurchaseOrderItem, record.WBSElementInternalID,
        record.PurgDocNetAmount, record.DocumentCurrency, record.Quantity, record.OrderQuantityUnit,
        record.GLAccount, booleanLabel(record.IsDeleted), booleanLabel(record.IsFinallyInvoiced), formatDate(record.CreationDate)]);
      dom.poBody.append(row);
    }
    summary(dom.poSummary, lines);
  }
  app.ui = {
    formatDate,
    configureReviews(callback) { reviewStatusForProject = callback; },
    renderProjects, resetElements, selectProject, renderElements, resetGL, renderGL, resetPO, renderPO,
    bindEvents(actions) {
      dom.glButton.addEventListener("click", actions.loadGL);
      dom.poButton.addEventListener("click", actions.loadPO);
      dom.button.addEventListener("click", actions.loadProjects);
    },
    projectStart() {
      dom.errorDetails.hidden = true; dom.errorDetails.textContent = "";
      empty(dom.tableBody, 9, "No projects loaded yet."); dom.rawResponse.textContent = "No response received yet.";
    },
    projectKeyMissing() {
      dom.connection.textContent = "API key required · Not connected";
      dom.connection.dataset.kind = "error"; document.getElementById("connection-details").open = true;
      message(dom.message, "Please add your SAP Sandbox API key to config.local.js first.", "error");
    },
    projectLoading() {
      dom.button.disabled = true; dom.button.textContent = "Loading…";
      dom.button.setAttribute("aria-busy", "true"); dom.connection.dataset.kind = "loading";
      dom.connection.textContent = "Connecting to SAP Sandbox…";
      message(dom.message, "Requesting up to five Enterprise Projects…");
    },
    projectSuccess(records, selected, onSelect, status) {
      renderProjects(records, selected, onSelect); dom.connection.textContent = "Connected · SAP Sandbox";
      dom.connection.dataset.kind = "success";
      message(dom.message, `Successfully loaded ${records.length} project${records.length === 1 ? "" : "s"} from SAP Sandbox (${status}).`, "success");
    },
    projectFailure(detail) {
      dom.connection.textContent = "Connection test failed";
      dom.connection.dataset.kind = "error"; document.getElementById("connection-details").open = true;
      empty(dom.tableBody, 9, "No project data displayed. Resolve the error and try again."); message(dom.message, detail, "error");
    },
    projectFinished() { dom.button.disabled = false; dom.button.textContent = "Load SAP Projects"; dom.button.removeAttribute("aria-busy"); },
    projectRaw(context) { dom.rawResponse.textContent = raw(context); },
    projectHTTPError(text) { errorBody(dom.errorDetails, text); },
    elementsRaw(context) { dom.rawElements.textContent = raw(context); },
    elementsHTTPError(text) { errorBody(dom.elementsError, text); },
    elementsRejected(text) { empty(dom.elementsBody, 10, "No project elements loaded."); message(dom.elementsMessage, text, "error"); },
    elementsFailure(detail) {
      empty(dom.elementsBody, 10, "No project elements displayed. Resolve the error and select the project again.");
      message(dom.elementsMessage, detail, "error");
    },
    glSelected(project) { dom.glPanel.hidden = false; dom.glProject.textContent = `Selected project: ${project.Project || "Unnamed project"}`; },
    glLoading() { dom.glButton.textContent = "Loading…"; dom.glButton.disabled = true; dom.glButton.setAttribute("aria-busy", "true"); },
    setGLMessage(text, kind = "info") { message(dom.glMessage, text, kind); },
    glRaw(text) { dom.rawGL.textContent = text; },
    glDiagnosticRaw(text) { dom.rawDiagnostic.textContent = text; },
    glHTTPError(text) { errorBody(dom.glError, text); },
    glDiagnosticStart(text) {
      empty(dom.glBody, 12, "No linked G/L records found in current SAP Sandbox sample.");
      message(dom.glMessage, text); dom.glDiagnostic.hidden = false;
    },
    glFailure(detail, status) {
      dom.glSummary.replaceChildren(); empty(dom.glBody, 12, "No linked financial evidence displayed. Inspect the error and raw responses.");
      message(dom.glMessage, `${dom.glDiagnostic.hidden ? "G/L evidence request failed" : "No linked records found; unlinked diagnostic failed"}: ${status ? status + ". " : ""}${detail}`, "error");
    },
    glFinished() { dom.glButton.disabled = false; dom.glButton.textContent = "Load Financial Evidence"; dom.glButton.removeAttribute("aria-busy"); },
    poSelected(project) { dom.poPanel.hidden = false; dom.poProject.textContent = `Selected project: ${project.Project || "Unnamed project"}`; },
    poLoading() { dom.poButton.textContent = "Loading…"; dom.poButton.disabled = true; dom.poButton.setAttribute("aria-busy", "true"); message(dom.poMessage, "Requesting exact WBS-linked Purchase Order account assignments…"); },
    setPOMessage(text, kind = "info") { message(dom.poMessage, text, kind); },
    poRaw(text) { dom.rawPO.textContent = text; },
    poHTTPError(text) { errorBody(dom.poError, text); },
    poEmpty() { empty(dom.poBody, 11, "No linked Purchase Order account assignments found in current SAP Sandbox sample."); },
    poFailure(detail, status) {
      dom.poSummary.replaceChildren(); empty(dom.poBody, 11, "No procurement evidence displayed. Inspect the error and raw response.");
      message(dom.poMessage, `${status ? status + ". " : ""}${detail}`, "error");
    },
    poFinished() { dom.poButton.disabled = false; dom.poButton.textContent = "Load Purchase Order Evidence"; dom.poButton.removeAttribute("aria-busy"); }
  };
})();
