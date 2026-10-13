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
  const poPanel = document.getElementById("po-panel");
  const poButton = document.getElementById("load-po-evidence");
  const poMessage = document.getElementById("po-message");
  const poError = document.getElementById("po-error");
  const poSummary = document.getElementById("po-summary");
  const poBody = document.getElementById("po-body");
  const rawPO = document.getElementById("raw-po-response");
  let poRecords = [];
  let poController = null;
  let poRequestID = 0;

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
    resetProcurementEvidence();
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
    resetProcurementEvidence();
    elementsLoaded = false;
    const requestID = ++elementRequestID;
    elementController?.abort();
    selectedProject = project;
    glPanel.hidden = false;
    poPanel.hidden = false;
    document.getElementById("po-project").textContent = `Selected project: ${project.Project || "Unnamed project"}`;
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
      poButton.disabled = !loadedWBSIDs().length;
      setPOMessage(poButton.disabled ? "No loaded WBS Internal IDs available; no PO query can be sent." : "WBS IDs loaded. Click Load Purchase Order Evidence to test procurement links.");
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

  function loadedWBSIDs() {
    // Keep raw strings intact; WBS linking is exact, never zero-normalised.
    return [...new Set(projectElements.map(element => element.WBSElementInternalID)
      .filter(value => typeof value === "string" && value.trim()))];
  }

  function projectIDsEquivalent(left, right) {
    if (typeof left !== "string" || typeof right !== "string" || !left || !right) return false;
    if (left === right) return true;
    return /^\d+$/.test(left) && /^\d+$/.test(right)
      && left.replace(/^0+(?=\d)/, "") === right.replace(/^0+(?=\d)/, "");
  }

  function projectIDVariants(value) {
    return /^\d+$/.test(value) ? [...new Set([value, value.replace(/^0+(?=\d)/, "")])] : [value];
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
    const projectID = typeof project.ProjectInternalID === "string" && project.ProjectInternalID.trim() ? project.ProjectInternalID : "";
    const wbsIDs = loadedWBSIDs();
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
      const integrity = [];
      function acceptLinkedRows(field, identifiers, allowNumericEquivalence = false) {
        const returned = data.d.results;
        const matches = returned.filter(record => allowNumericEquivalence
          ? projectIDsEquivalent(record[field], identifiers[0]) : identifiers.includes(record[field]));
        const rejected = returned.filter(record => !matches.includes(record));
        integrity.push({ method: field, returned: returned.length, linked: matches.length,
          discarded: rejected.length, unexpectedIdentifiers: [...new Set(rejected.map(record => record[field] ?? "(missing)"))].slice(0, 10) });
        data = { ...data, d: { ...data.d, results: matches } };
        // Original SAP responses stay in attempts, not in the evidence array.
        rawGL.textContent = JSON.stringify({ attempts, filterIntegrity: integrity }, null, 2);
      }
      if (wbsIDs.length) {
        setGLMessage("Testing primary exact WBS Internal ID link…");
        data = await request(wbsIDs.map(id => `WBSElementInternalID eq ${odataString(id)}`).join(" or "), window.GL_API_CONFIG.limit);
        acceptLinkedRows("WBSElementInternalID", wbsIDs);
        if (data.d.results.length) linkMethod = "WBS Internal ID";
      }
      if (!linkMethod && projectID) {
        setGLMessage("No exact WBS-linked records found (or WBS unavailable). Testing secondary ProjectInternalID…");
        data = await request(projectIDVariants(projectID).map(id => `ProjectInternalID eq ${odataString(id)}`).join(" or "), window.GL_API_CONFIG.limit);
        acceptLinkedRows("ProjectInternalID", [projectID], true);
        if (data.d.results.length) linkMethod = "ProjectInternalID (secondary; numeric-only leading-zero equivalence allowed)";
      }
      if (requestID !== glRequestID) return;
      if (linkMethod) {
        glRecords = data.d.results;
        renderFinancialEvidence();
        setGLMessage(`Linked by ${linkMethod} · ${lastHTTP} · ${glRecords.length} linked records.${integrity.some(check => check.discarded) ? " Filter-integrity warning: unrelated returned rows were discarded; inspect Raw G/L Response." : ""}${data.d.__next ? " SAP indicates additional pages; summary covers only this returned page." : ""}`, "success");
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

  function setPOMessage(text, kind = "info") {
    poMessage.textContent = text;
    poMessage.dataset.kind = kind;
  }

  function emptyPO(text) {
    poBody.replaceChildren();
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 11;
    cell.className = "empty";
    cell.textContent = text;
    row.append(cell);
    poBody.append(row);
  }

  function resetProcurementEvidence() {
    poRequestID += 1;
    poController?.abort();
    poController = null;
    poRecords = [];
    poPanel.hidden = true;
    poButton.disabled = true;
    poButton.textContent = "Load Purchase Order Evidence";
    document.getElementById("po-project").textContent = "";
    poSummary.replaceChildren();
    poError.hidden = true;
    poError.textContent = "";
    rawPO.textContent = "No PO query sent yet.";
    emptyPO("No procurement evidence loaded.");
    setPOMessage("Select a project and load its WBS IDs first.");
  }

  function poDecimal(value) {
    if (typeof value === "number") {
      if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) return null;
      value = String(value);
    }
    if (typeof value !== "string" || value.length > 100) return null;
    const match = /^([+-]?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(value);
    if (!match) return null;
    const exponent = Number(match[4] || 0);
    if (!Number.isInteger(exponent) || Math.abs(exponent) > 30) return null;
    const fraction = match[3] || "";
    let scale = fraction.length - exponent;
    let units = BigInt(match[2] + fraction) * (match[1] === "-" ? -1n : 1n);
    if (scale < 0) { units *= 10n ** BigInt(-scale); scale = 0; }
    return { units, scale };
  }

  function addPODecimals(left, right) {
    const scale = Math.max(left.scale, right.scale);
    return { scale, units: left.units * 10n ** BigInt(scale - left.scale)
      + right.units * 10n ** BigInt(scale - right.scale) };
  }

  function displayPODecimal(value) {
    const digits = String(value.units < 0n ? -value.units : value.units).padStart(value.scale + 1, "0");
    const text = value.scale ? `${digits.slice(0, -value.scale)}.${digits.slice(-value.scale)}` : digits;
    return (value.units < 0n ? "-" : "") + text;
  }

  function renderProcurementEvidence() {
    poBody.replaceChildren();
    for (const record of poRecords) {
      const row = document.createElement("tr");
      const values = [record.PurchaseOrder, record.PurchaseOrderItem, record.WBSElementInternalID,
        record.PurgDocNetAmount, record.DocumentCurrency, record.Quantity, record.OrderQuantityUnit,
        record.GLAccount, booleanLabel(record.IsDeleted), booleanLabel(record.IsFinallyInvoiced), formatDate(record.CreationDate)];
      for (const value of values) {
        const cell = document.createElement("td");
        cell.textContent = value === null || value === undefined || value === "" ? "—" : String(value);
        row.append(cell);
      }
      poBody.append(row);
    }
    const active = poRecords.filter(record => record.IsDeleted === false);
    const final = active.filter(record => record.IsFinallyInvoiced === true).length;
    const notFinal = active.filter(record => record.IsFinallyInvoiced === false).length;
    const deleted = poRecords.filter(record => record.IsDeleted === true).length;
    const totals = new Map();
    let invalidAmounts = 0;
    for (const record of active) {
      const amount = poDecimal(record.PurgDocNetAmount);
      const currency = record.DocumentCurrency;
      if (!amount || typeof currency !== "string" || !currency.trim()) { invalidAmounts += 1; continue; }
      const group = totals.get(currency) || { total: { units: 0n, scale: 0 }, notFinal: { units: 0n, scale: 0 } };
      group.total = addPODecimals(group.total, amount);
      if (record.IsFinallyInvoiced === false) group.notFinal = addPODecimals(group.notFinal, amount);
      totals.set(currency, group);
    }
    const lines = [
      `Linked PO account assignments: ${poRecords.length} · Active / non-deleted assignments: ${active.length} · Deleted: ${deleted} · Unknown deletion flags: ${poRecords.length - active.length - deleted}`,
      `Active assignments — Finally invoiced: ${final} · Not-finally-invoiced: ${notFinal} · Unknown final-invoice flags: ${active.length - final - notFinal}`,
      "Amounts grouped by DocumentCurrency (active assignments only):"
    ];
    for (const [currency, group] of totals) {
      lines.push(`${currency} — PO-linked procurement amount: ${displayPODecimal(group.total)} · Not-finally-invoiced PO-linked amount: ${displayPODecimal(group.notFinal)}`);
    }
    if (!totals.size) lines.push("No valid active procurement amounts available.");
    lines.push(`${invalidAmounts} active assignments excluded from amounts due to invalid/missing amount or currency. Unknown deletion flags are excluded from active amounts; unknown final-invoice flags are excluded from the not-finally-invoiced indicator.`);
    lines.push("Returned account assignments only; amounts are not multiplied by quantity or distribution percentage, and no exchange rates or invoiced amounts are invented.");
    poSummary.replaceChildren();
    for (const text of lines) {
      const paragraph = document.createElement("p");
      paragraph.textContent = text;
      poSummary.append(paragraph);
    }
  }

  async function loadPurchaseOrderEvidence() {
    if (!selectedProject || !elementsLoaded || !loadedWBSIDs().length) {
      setPOMessage("Select a project and successfully load its real WBS Internal IDs first.", "error");
      return;
    }
    const project = selectedProject;
    const wbsIDs = loadedWBSIDs();
    resetProcurementEvidence();
    poPanel.hidden = false;
    document.getElementById("po-project").textContent = `Selected project: ${project.Project || "Unnamed project"}`;
    const requestID = poRequestID;
    const configuredKey = window.APP_CONFIG?.SAP_API_KEY;
    const apiKey = typeof configuredKey === "string" ? configuredKey.trim() : "";
    if (!apiKey || apiKey === placeholder) {
      setPOMessage("Please add your SAP Sandbox API key to config.local.js first.", "error");
      poButton.disabled = false;
      return;
    }
    const config = window.PO_API_CONFIG;
    const url = new URL(config.baseUrl + config.collectionPath);
    url.searchParams.set("$top", String(config.limit));
    url.searchParams.set("$select", config.fields.join(","));
    url.searchParams.set("$filter", wbsIDs.map(id => `WBSElementInternalID eq ${odataString(id)}`).join(" or "));
    const controller = new AbortController();
    poController = controller;
    const timeout = setTimeout(() => controller.abort(), 30000);
    poButton.textContent = "Loading…";
    setPOMessage("Requesting exact WBS-linked Purchase Order account assignments…");
    let response;
    let httpStatus = "";
    try {
      response = await fetch(url, { method: "GET", headers: { APIKey: apiKey, Accept: "application/json" },
        credentials: "omit", signal: controller.signal });
      httpStatus = `HTTP ${response.status} ${redact(response.statusText, apiKey) || "(status text unavailable)"}`;
      const safeBody = redact(await response.text(), apiKey);
      if (requestID !== poRequestID) return;
      let data;
      try { data = JSON.parse(safeBody); } catch { /* Preserve non-JSON body in debug output. */ }
      rawPO.textContent = JSON.stringify({ url: url.href, status: httpStatus, response: data ?? safeBody }, null, 2);
      if (!response.ok) {
        poError.textContent = `${httpStatus}\n${safeBody || "SAP returned no response body."}`;
        poError.hidden = false;
        throw new Error(`${httpStatus}. Purchase Order request failed; inspect the safe response below.`);
      }
      if (!Array.isArray(data?.value) || !data.value.every(record => record && typeof record === "object" && !Array.isArray(record))) {
        throw new Error(`${httpStatus}. Expected OData V4 data.value records. Inspect Raw Purchase Order Response.`);
      }
      poRecords = data.value.filter(record => typeof record.WBSElementInternalID === "string" && wbsIDs.includes(record.WBSElementInternalID));
      const rejected = data.value.filter(record => !poRecords.includes(record));
      const integrity = { status: rejected.length ? "mismatch" : "ok", returned: data.value.length,
        exactMatches: poRecords.length, discarded: rejected.length,
        unexpectedIdentifiers: [...new Set(rejected.map(record => record.WBSElementInternalID ?? "(missing)"))].slice(0, 10) };
      rawPO.textContent = JSON.stringify({ url: url.href, status: httpStatus, filterIntegrity: integrity, response: data }, null, 2);
      if (poRecords.length) renderProcurementEvidence();
      else emptyPO("No linked Purchase Order account assignments found in current SAP Sandbox sample.");
      setPOMessage(`${poRecords.length ? `Linked by exact WBS Internal ID · ${poRecords.length} PO account assignments.` : "No linked Purchase Order account assignments found in current SAP Sandbox sample."} ${httpStatus}.${rejected.length ? ` Filter-integrity warning: ${rejected.length} unrelated rows discarded; inspect debug information.` : ""}${data["@odata.nextLink"] ? " SAP indicates additional pages; counts and amounts cover the returned page only." : ""}`, poRecords.length ? "success" : "info");
      if (rejected.length) console.warn("SAP Purchase Order filter-integrity warning", { discarded: rejected.length, unexpectedIdentifiers: integrity.unexpectedIdentifiers });
    } catch (error) {
      if (requestID !== poRequestID) return;
      poRecords = [];
      poSummary.replaceChildren();
      emptyPO("No procurement evidence displayed. Inspect the error and raw response.");
      const detail = error.name === "AbortError" ? "Purchase Order request timed out after 30 seconds." : !response
        ? "No HTTP response available. A network, browser/CORS or local-file restriction may have blocked the request. Inspect the console and Network tab; do not disable browser security."
        : redact(error.message, apiKey);
      setPOMessage(`${httpStatus ? httpStatus + ". " : ""}${detail}`, "error");
      console.error("SAP Purchase Order evidence request failed", { url: url.href, status: httpStatus || "unavailable", diagnostic: detail });
    } finally {
      clearTimeout(timeout);
      if (requestID === poRequestID) {
        poController = null;
        poButton.disabled = false;
        poButton.textContent = "Load Purchase Order Evidence";
      }
    }
  }

  glButton.addEventListener("click", loadFinancialEvidence);
  poButton.addEventListener("click", loadPurchaseOrderEvidence);

  button.addEventListener("click", () => {
    resetElementSelection();
    return loadProjects();
  });
})();
