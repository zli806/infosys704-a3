(() => {
  "use strict";

  const placeholder = "PASTE_YOUR_SAP_SANDBOX_API_KEY_HERE";
  const button = document.getElementById("load-projects");
  const connection = document.getElementById("connection-status");
  const message = document.getElementById("message");
  const errorDetails = document.getElementById("error-details");
  const tableBody = document.getElementById("projects-body");
  const rawResponse = document.getElementById("raw-response");
  // Retain full records, including ProjectUUID and ProjectInternalID, for later linking.
  let projects = [];
  const elementsPanel = document.getElementById("elements-panel");
  const selectedSummary = document.getElementById("selected-project");
  const elementsMessage = document.getElementById("elements-message");
  const elementsError = document.getElementById("elements-error");
  const elementsBody = document.getElementById("elements-body");
  const rawElements = document.getElementById("raw-elements-response");
  let selectedProject = null;
  // Full SAP element records retain UUIDs, WBS IDs and non-visible selected fields.
  let projectElements = [];
  let elementController = null;
  let elementRequestID = 0;
  const glPanel = document.getElementById("gl-panel");
  const glButton = document.getElementById("load-financial-evidence");
  const glMessage = document.getElementById("gl-message");
  const glError = document.getElementById("gl-error");
  const glSummary = document.getElementById("gl-summary");
  const glBody = document.getElementById("gl-body");
  const rawGL = document.getElementById("raw-gl-response");
  const glDiagnostic = document.getElementById("gl-diagnostic");
  const rawDiagnostic = document.getElementById("raw-gl-diagnostic");
  let elementsLoaded = false;
  let glRequestID = 0;
  let glController = null;
  // Only validated linked records enter this state; diagnostic records never do.
  let glRecords = [];

  function setMessage(text, kind = "info") {
    message.textContent = text;
    message.dataset.kind = kind;
  }

  function redact(text, apiKey) {
    // Guard against a gateway echoing the credential in a response body.
    return String(text).split(apiKey).join("[REDACTED]");
  }

  function formatDate(value) {
    if (value === null || value === undefined || value === "") return "—";
    const match = /^\/Date\((-?\d+)(?:[+-]\d{4})?\)\/$/.exec(String(value));
    const date = match ? new Date(Number(match[1])) : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric", month: "short", day: "numeric", timeZone: "UTC"
    }).format(date);
  }

  function showEmpty(text) {
    tableBody.replaceChildren();
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 8;
    cell.className = "empty";
    cell.textContent = text;
    row.append(cell);
    tableBody.append(row);
  }

  function renderProjects() {
    if (!projects.length) {
      showEmpty("SAP returned no projects.");
      return;
    }
    tableBody.replaceChildren();
    for (const project of projects) {
      const row = document.createElement("tr");
      const values = [
        project.Project, project.ProjectDescription, project.ProcessingStatus,
        formatDate(project.ProjectStartDate), formatDate(project.ProjectEndDate),
        project.ProjectCurrency, project.CompanyCode
      ];
      for (const value of values) {
        const cell = document.createElement("td");
        cell.textContent = value === null || value === undefined || value === "" ? "—" : String(value);
        row.append(cell);
      }
      const actionCell = document.createElement("td");
      const action = document.createElement("button");
      action.type = "button";
      action.className = "row-action";
      action.textContent = "View Project Elements";
      action.setAttribute("aria-label", `View Project Elements for ${project.Project || "project"}`);
      action.setAttribute("aria-pressed", String(project === selectedProject));
      action.addEventListener("click", () => loadProjectElements(project));
      actionCell.append(action);
      row.append(actionCell);
      if (project === selectedProject) row.className = "selected-project";
      tableBody.append(row);
    }
  }

  async function loadProjects() {
    const configuredKey = window.APP_CONFIG?.SAP_API_KEY;
    const apiKey = typeof configuredKey === "string" ? configuredKey.trim() : "";
    errorDetails.hidden = true;
    errorDetails.textContent = "";
    projects = [];
    showEmpty("No projects loaded yet.");
    rawResponse.textContent = "No response received yet.";

    if (!apiKey || apiKey === placeholder) {
      connection.textContent = "API key required · Not connected";
      setMessage("Please add your SAP Sandbox API key to config.local.js first.", "error");
      return;
    }

    const config = window.SAP_API_CONFIG;
    const url = new URL(config.baseUrl + config.collectionPath);
    url.searchParams.set("$top", String(config.limit));
    url.searchParams.set("$select", config.projectFields.join(","));
    url.searchParams.set("$format", "json");
    button.disabled = true;
    button.textContent = "Loading…";
    connection.textContent = "Connecting to SAP Sandbox…";
    setMessage("Requesting up to five Enterprise Projects…");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    let response;

    try {
      response = await fetch(url, {
        method: "GET",
        headers: { APIKey: apiKey, Accept: "application/json" },
        credentials: "omit",
        signal: controller.signal
      });
      const body = await response.text();
      const safeBody = redact(body, apiKey);
      let data;
      try {
        data = JSON.parse(safeBody);
        rawResponse.textContent = JSON.stringify(data, null, 2);
      } catch {
        rawResponse.textContent = safeBody || "(Empty response body)";
      }

      const httpStatus = `HTTP ${response.status} ${redact(response.statusText, apiKey) || "(status text unavailable)"}`;
      if (!response.ok) {
        errorDetails.textContent = safeBody || "SAP returned no response body.";
        errorDetails.hidden = false;
        console.error("SAP Enterprise Project HTTP error", {
          url: url.href, status: response.status,
          statusText: redact(response.statusText, apiKey), responseBody: safeBody
        });
        throw new Error(`${httpStatus}. SAP request failed; see the response body below.`);
      }
      if (!data) {
        throw new Error(`${httpStatus}. Expected JSON but received an empty or non-JSON response. Inspect Raw SAP Response.`);
      }
      if (!Array.isArray(data.d?.results)) {
        throw new Error(`${httpStatus}. Unexpected response shape: expected OData V2 data.d.results. Inspect Raw SAP Response.`);
      }
      if (!data.d.results.every(project => project && typeof project === "object" && !Array.isArray(project))) {
        throw new Error(`${httpStatus}. Invalid project records in data.d.results. Inspect Raw SAP Response.`);
      }
      projects = data.d.results.slice(0, config.limit);
      renderProjects();
      connection.textContent = "Connected · SAP Sandbox";
      setMessage(`Successfully loaded ${projects.length} project${projects.length === 1 ? "" : "s"} from SAP Sandbox (${httpStatus}).`, "success");
    } catch (error) {
      connection.textContent = "Connection test failed";
      showEmpty("No project data displayed. Resolve the error and try again.");
      let detail;
      if (error.name === "AbortError") {
        detail = "Request timed out after 30 seconds. No complete response was received; check your connection and retry.";
      } else if (!response) {
        detail = "No HTTP response is available. A network, browser/CORS, or local-file restriction may have blocked the SAP request. Inspect the browser console and Network tab. Do not disable browser security.";
        if (window.location.protocol === "file:") {
          detail += " This page is running from file://; try a local static web preview as described in README.md.";
        }
      } else {
        detail = redact(error.message, apiKey);
      }
      setMessage(detail, "error");
      // Do not log request headers, configuration, or the original error object.
      console.error("SAP Enterprise Project connection test failed", {
        url: url.href, status: response?.status ?? "unavailable", diagnostic: detail
      });
    } finally {
      clearTimeout(timeout);
      button.disabled = false;
      button.textContent = "Load Projects";
    }
  }

  function milestoneFlag(value) {
    // SAP uses a one-character string, not a Boolean. Never use truthiness.
    if (typeof value === "string") {
      const flag = value.trim().toUpperCase();
      if (flag === "X") return { marked: true, label: "Yes (X)" };
      if (flag === "") return { marked: false, label: "No (blank)" };
    }
    return { marked: false, label: `Unknown (${JSON.stringify(value) ?? "missing"})` };
  }

  function mainMilestoneLabel(value) {
    if (value === true) return "Yes · Main milestone candidate";
    if (value === false) return "No";
    return `Unknown (${JSON.stringify(value) ?? "missing"})`;
  }

  function emptyElements(text) {
    elementsBody.replaceChildren();
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 10;
    cell.className = "empty";
    cell.textContent = text;
    row.append(cell);
    elementsBody.append(row);
  }

  function setElementsMessage(text, kind = "info") {
    elementsMessage.textContent = text;
    elementsMessage.dataset.kind = kind;
  }

  function resetElementSelection() {
    resetFinancialEvidence();
    elementsLoaded = false;
    elementRequestID += 1;
    elementController?.abort();
    elementController = null;
    selectedProject = null;
    projectElements = [];
    elementsPanel.hidden = true;
    selectedSummary.textContent = "";
    elementsBody.replaceChildren();
    rawElements.textContent = "No response received yet.";
  }

  async function loadProjectElements(project) {
    resetFinancialEvidence();
    elementsLoaded = false;
    const requestID = ++elementRequestID;
    elementController?.abort();
    selectedProject = project;
    glPanel.hidden = false;
    document.getElementById("gl-project").textContent = `Selected project: ${project.Project || "Unnamed project"}`;
    projectElements = [];
    elementsPanel.hidden = false;
    selectedSummary.textContent = `${project.Project || "Unnamed project"} · ${project.ProjectDescription || "No description"} · Status: ${project.ProcessingStatus || "—"}`;
    renderProjects();
    elementsError.hidden = true;
    elementsError.textContent = "";
    rawElements.textContent = "No response received yet.";
    emptyElements("Loading project elements…");
    setElementsMessage("Requesting related project elements from SAP Sandbox…");

    const configuredKey = window.APP_CONFIG?.SAP_API_KEY;
    const apiKey = typeof configuredKey === "string" ? configuredKey.trim() : "";
    if (!apiKey || apiKey === placeholder) {
      emptyElements("No project elements loaded.");
      setElementsMessage("Please add your SAP Sandbox API key to config.local.js first.", "error");
      return;
    }
    if (typeof project.ProjectUUID !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(project.ProjectUUID)) {
      emptyElements("No project elements loaded.");
      setElementsMessage("The selected SAP project has no valid ProjectUUID. No request was sent.", "error");
      return;
    }
    const config = window.SAP_API_CONFIG;
    const path = config.elementNavigationPath.replace("{ProjectUUID}", project.ProjectUUID);
    const url = new URL(config.baseUrl + path);
    url.searchParams.set("$select", config.elementFields.join(","));
    url.searchParams.set("$format", "json");
    const controller = new AbortController();
    elementController = controller;
    const timeout = setTimeout(() => controller.abort(), 30000);
    let response;

    try {
      response = await fetch(url, {
        method: "GET",
        headers: { APIKey: apiKey, Accept: "application/json" },
        credentials: "omit",
        signal: controller.signal
      });
      const safeBody = redact(await response.text(), apiKey);
      if (requestID !== elementRequestID) return;
      let data;
      try {
        data = JSON.parse(safeBody);
        rawElements.textContent = JSON.stringify(data, null, 2);
      } catch {
        rawElements.textContent = safeBody || "(Empty response body)";
      }
      const httpStatus = `HTTP ${response.status} ${redact(response.statusText, apiKey) || "(status text unavailable)"}`;
      if (!response.ok) {
        elementsError.textContent = safeBody || "SAP returned no response body.";
        elementsError.hidden = false;
        console.error("SAP Project Element HTTP error", {
          url: url.href, status: response.status,
          statusText: redact(response.statusText, apiKey), responseBody: safeBody
        });
        throw new Error(`${httpStatus}. Project element request failed; see the response body below.`);
      }
      if (!Array.isArray(data?.d?.results)) {
        throw new Error(`${httpStatus}. Expected OData V2 data.d.results. Inspect Raw Project Element Response.`);
      }
      if (!data.d.results.every(element => element && typeof element === "object" && !Array.isArray(element))) {
        throw new Error(`${httpStatus}. Invalid project element records. Inspect Raw Project Element Response.`);
      }
      projectElements = data.d.results;
      elementsLoaded = true;
      glButton.disabled = false;
      setGLMessage("Project Elements loaded. Click Load Financial Evidence to test project/WBS links.");
      elementsBody.replaceChildren();
      for (const element of projectElements) {
        const milestone = milestoneFlag(element.IsProjectMilestone);
        const row = document.createElement("tr");
        if (element.IsMainMilestone === true) row.className = "main-milestone";
        else if (milestone.marked) row.className = "milestone";
        const values = [
          element.ProjectElement, element.ProjectElementDescription, element.ProcessingStatus,
          formatDate(element.PlannedStartDate), formatDate(element.PlannedEndDate),
          formatDate(element.ForecastedEndDate), element.WBSElementInternalID,
          milestone.label, mainMilestoneLabel(element.IsMainMilestone), element.MilestoneApprovalStatus
        ];
        for (const value of values) {
          const cell = document.createElement("td");
          cell.textContent = value === null || value === undefined || value === "" ? "—" : String(value);
          row.append(cell);
        }
        elementsBody.append(row);
      }
      const milestones = projectElements.filter(element => milestoneFlag(element.IsProjectMilestone).marked).length;
      const mainMilestones = projectElements.filter(element => element.IsMainMilestone === true).length;
      const unknownFlags = projectElements.filter(element => milestoneFlag(element.IsProjectMilestone).label.startsWith("Unknown")).length;
      let summary = `${httpStatus} · ${projectElements.length} project elements returned · ${milestones} marked milestones · ${mainMilestones} main milestones.`;
      if (!projectElements.length) emptyElements("SAP returned zero project elements for this project.");
      else if (!milestones) summary += " No returned elements are marked as project milestones.";
      if (unknownFlags) summary += ` ${unknownFlags} milestone flags are unknown; inspect their raw values.`;
      if (data.d.__next) summary += " SAP indicates more elements are available; these counts cover only the returned page, not the complete project. Inspect the raw response continuation link.";
      setElementsMessage(summary, "success");
    } catch (error) {
      if (requestID !== elementRequestID) return;
      projectElements = [];
      emptyElements("No project elements displayed. Resolve the error and select the project again.");
      let detail;
      if (error.name === "AbortError") {
        detail = "Project element request timed out after 30 seconds. Check your connection and retry.";
      } else if (!response) {
        detail = "No HTTP response is available. A network, browser/CORS, or local-file restriction may have blocked the project element request. Inspect the browser console and Network tab. Do not disable browser security.";
        if (window.location.protocol === "file:") detail += " Try a local static web preview as described in README.md.";
      } else {
        detail = redact(error.message, apiKey);
      }
      setElementsMessage(detail, "error");
      console.error("SAP Project Element request failed", {
        url: url.href, status: response?.status ?? "unavailable", diagnostic: detail
      });
    } finally {
      clearTimeout(timeout);
      if (requestID === elementRequestID) elementController = null;
    }
  }

  function setGLMessage(text, kind = "info") {
    glMessage.textContent = text;
    glMessage.dataset.kind = kind;
  }

  function emptyGL(text) {
    glBody.replaceChildren();
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 12;
    cell.className = "empty";
    cell.textContent = text;
    row.append(cell);
    glBody.append(row);
  }

  function resetFinancialEvidence() {
    glRequestID += 1;
    glController?.abort();
    glController = null;
    glRecords = [];
    glPanel.hidden = true;
    glButton.disabled = true;
    glButton.textContent = "Load Financial Evidence";
    glSummary.replaceChildren();
    document.getElementById("gl-project").textContent = "";
    glError.hidden = true;
    glError.textContent = "";
    rawGL.textContent = "No linked query sent yet.";
    glDiagnostic.hidden = true;
    rawDiagnostic.textContent = "No diagnostic request sent.";
    emptyGL("No financial evidence loaded.");
    setGLMessage("Select a project and load its Project Elements first.");
  }

  function odataString(value) {
    return `'${String(value).replace(/'/g, "''")}'`;
  }

  function glURL(filter, limit = window.GL_API_CONFIG.limit) {
    const config = window.GL_API_CONFIG;
    const url = new URL(config.baseUrl + config.collectionPath);
    url.searchParams.set("$top", String(limit));
    url.searchParams.set("$select", config.fields.join(","));
    url.searchParams.set("$format", "json");
    if (filter) url.searchParams.set("$filter", filter);
    return url;
  }

  function booleanLabel(value) {
    return value === true ? "Yes" : value === false ? "No" : "Unknown";
  }

  // The specification defines decimal strings with scale 3 and precision 23.
  // Scaled BigInts avoid rounding large signed SAP amounts through binary floats.
  function decimalUnits(value) {
    if (typeof value !== "string" || !/^[+-]?\d+(?:\.\d{1,3})?$/.test(value)) return null;
    const negative = value.startsWith("-");
    const [whole, fraction = ""] = value.replace(/^[+-]/, "").split(".");
    const units = BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, "0"));
    return negative ? -units : units;
  }

  function displayUnits(units) {
    const magnitude = units < 0n ? -units : units;
    return `${units < 0n ? "-" : ""}${magnitude / 1000n}.${String(magnitude % 1000n).padStart(3, "0")}`;
  }

  function renderFinancialEvidence() {
    glBody.replaceChildren();
    for (const record of glRecords) {
      const row = document.createElement("tr");
      const values = [formatDate(record.PostingDate), record.AccountingDocument,
        record.GLAccount, record.WBSElementInternalID, record.AmountInCompanyCodeCurrency,
        record.CompanyCodeCurrency, record.DebitCreditCode, booleanLabel(record.IsCommitment),
        booleanLabel(record.IsReversal), booleanLabel(record.IsReversed),
        record.PurchasingDocument, record.DocumentItemText];
      for (const value of values) {
        const cell = document.createElement("td");
        cell.textContent = value === null || value === undefined || value === "" ? "—" : String(value);
        row.append(cell);
      }
      glBody.append(row);
    }
    const nonCommitments = glRecords.filter(record => record.IsCommitment === false);
    const commitments = glRecords.filter(record => record.IsCommitment === true);
    const unknown = glRecords.length - nonCommitments.length - commitments.length;
    const totals = new Map();
    let excluded = 0;
    for (const record of nonCommitments) {
      const units = decimalUnits(record.AmountInCompanyCodeCurrency);
      const currency = record.CompanyCodeCurrency;
      if (units === null || typeof currency !== "string" || !currency.trim()) {
        excluded += 1;
        continue;
      }
      totals.set(currency, (totals.get(currency) ?? 0n) + units);
    }
    glSummary.replaceChildren();
    const lines = [
      `Linked G/L records: ${glRecords.length} · Non-commitment line items: ${nonCommitments.length} · Commitment-flagged line items: ${commitments.length} · Unknown commitment flags: ${unknown}`,
      "Net amount from returned non-commitment postings, grouped by Company Code Currency:"
    ];
    for (const [currency, units] of totals) lines.push(`${currency}: ${displayUnits(units)}`);
    if (!totals.size) lines.push("No valid non-commitment currency amounts available.");
    lines.push(`Unknown commitment flags are excluded from amounts. ${excluded} non-commitment records excluded from amounts because the amount/currency was missing or invalid. Reversals and reversed items remain included with SAP's supplied signs.`);
    lines.push("Returned records only (maximum 100); no automatic pagination, currency conversion, ledger deduplication or complete-project-cost claim.");
    for (const text of lines) {
      const paragraph = document.createElement("p");
      paragraph.textContent = text;
      glSummary.append(paragraph);
    }
  }

  async function loadFinancialEvidence() {
    if (!selectedProject || !elementsLoaded) {
      setGLMessage("Select a project and successfully load its Project Elements first.", "error");
      return;
    }
    const project = selectedProject;
    const projectID = typeof project.ProjectInternalID === "string" ? project.ProjectInternalID.trim() : "";
    const wbsIDs = [...new Set(projectElements.map(element => element.WBSElementInternalID)
      .filter(value => typeof value === "string" && value.trim()).map(value => value.trim()))];
    resetFinancialEvidence();
    glPanel.hidden = false;
    document.getElementById("gl-project").textContent = `Selected project: ${project.Project || "Unnamed project"}`;
    const requestID = glRequestID;
    const configuredKey = window.APP_CONFIG?.SAP_API_KEY;
    const apiKey = typeof configuredKey === "string" ? configuredKey.trim() : "";
    if (!apiKey || apiKey === placeholder) {
      setGLMessage("Please add your SAP Sandbox API key to config.local.js first.", "error");
      glButton.disabled = false;
      return;
    }
    if (!projectID && !wbsIDs.length) {
      setGLMessage("No ProjectInternalID or loaded WBS Internal IDs available. No linked query can be sent.", "error");
      glButton.disabled = false;
      return;
    }
    const controller = new AbortController();
    glController = controller;
    glButton.textContent = "Loading…";
    const attempts = [];
    let lastHTTP = "";

    async function request(filter, limit, diagnostic = false) {
      const url = glURL(filter, limit);
      lastHTTP = "";
      const timeout = setTimeout(() => controller.abort(), 30000);
      let response;
      try {
        response = await fetch(url, {
          method: "GET", headers: { APIKey: apiKey, Accept: "application/json" },
          credentials: "omit", signal: controller.signal
        });
        lastHTTP = `HTTP ${response.status} ${redact(response.statusText, apiKey) || "(status text unavailable)"}`;
        const safeBody = redact(await response.text(), apiKey);
        if (requestID !== glRequestID) throw new DOMException("Selection changed", "AbortError");
        let data;
        try { data = JSON.parse(safeBody); } catch { /* Raw non-JSON body stays visible. */ }
        const entry = { url: url.href, status: lastHTTP, response: data ?? safeBody };
        if (diagnostic) rawDiagnostic.textContent = JSON.stringify(entry, null, 2);
        else {
          attempts.push(entry);
          rawGL.textContent = JSON.stringify(attempts, null, 2);
        }
        if (!response.ok) {
          glError.textContent = `${lastHTTP}\n${safeBody || "SAP returned no response body."}`;
          glError.hidden = false;
          console.error("SAP G/L HTTP error", { url: url.href, status: lastHTTP, responseBody: safeBody });
          throw new Error(`${lastHTTP}. SAP G/L request failed; see the response body below.`);
        }
        if (!Array.isArray(data?.d?.results) || !data.d.results.every(record => record && typeof record === "object" && !Array.isArray(record))) {
          throw new Error(`${lastHTTP}. Expected OData V2 data.d.results records. Inspect the raw G/L response.`);
        }
        return data;
      } catch (error) {
        if (!response && error.name !== "AbortError") {
          throw new Error("No HTTP response available. Network, browser/CORS or local-file restrictions may have blocked G/L. Inspect the console and Network tab; do not disable browser security.");
        }
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    }

    try {
      let data;
      let linkMethod = "";
      if (projectID) {
        setGLMessage("Testing ProjectInternalID link…");
        data = await request(`ProjectInternalID eq ${odataString(projectID)}`, window.GL_API_CONFIG.limit);
        if (data.d.results.length) {
          if (!data.d.results.every(record => record.ProjectInternalID === projectID)) throw new Error("SAP returned records that do not match the requested ProjectInternalID. They are not used as project evidence; inspect Raw G/L Response.");
          linkMethod = "ProjectInternalID";
        }
      }
      if (!linkMethod && wbsIDs.length) {
        setGLMessage("No ProjectInternalID-linked records found (or ID unavailable). Testing loaded WBS Internal IDs…");
        data = await request(wbsIDs.map(id => `WBSElementInternalID eq ${odataString(id)}`).join(" or "), window.GL_API_CONFIG.limit);
        if (data.d.results.length) {
          if (!data.d.results.every(record => wbsIDs.includes(record.WBSElementInternalID))) throw new Error("SAP returned records that do not match the requested WBS IDs. They are not used as project evidence; inspect Raw G/L Response.");
          linkMethod = "WBS Internal ID";
        }
      }
      if (requestID !== glRequestID) return;
      if (linkMethod) {
        glRecords = data.d.results;
        renderFinancialEvidence();
        setGLMessage(`Linked by ${linkMethod} · ${lastHTTP} · ${glRecords.length} returned records.${data.d.__next ? " SAP indicates additional pages; summary covers only this returned page." : ""}`, "success");
        return;
      }
      emptyGL("No linked G/L records found in current SAP Sandbox sample.");
      setGLMessage(`No linked G/L records found in current SAP Sandbox sample · ${lastHTTP}. Running a separate unlinked connectivity diagnostic…`);
      glDiagnostic.hidden = false;
      const diagnostic = await request(null, 5, true);
      setGLMessage(`No linked G/L records found in current SAP Sandbox sample · G/L API responded ${lastHTTP}; diagnostic returned ${diagnostic.d.results.length} unlinked records. These are debug-only, not project evidence.`);
    } catch (error) {
      if (requestID !== glRequestID) return;
      glRecords = [];
      glSummary.replaceChildren();
      emptyGL("No linked financial evidence displayed. Inspect the error and raw responses.");
      const detail = error.name === "AbortError" ? "G/L request timed out after 30 seconds." : redact(error.message, apiKey);
      setGLMessage(`${glDiagnostic.hidden ? "G/L evidence request failed" : "No linked records found; unlinked diagnostic failed"}: ${lastHTTP ? lastHTTP + ". " : ""}${detail}`, "error");
      console.error("SAP G/L evidence request failed", { status: lastHTTP || "unavailable", diagnostic: detail });
    } finally {
      if (requestID === glRequestID) {
        glController = null;
        glButton.disabled = false;
        glButton.textContent = "Load Financial Evidence";
      }
    }
  }

  glButton.addEventListener("click", loadFinancialEvidence);

  button.addEventListener("click", () => {
    resetElementSelection();
    return loadProjects();
  });
})();
