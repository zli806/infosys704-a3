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
    const requestID = ++elementRequestID;
    elementController?.abort();
    selectedProject = project;
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

  button.addEventListener("click", () => {
    resetElementSelection();
    return loadProjects();
  });
})();
