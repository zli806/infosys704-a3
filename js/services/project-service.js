(() => {
  "use strict";
  const app = window.DPEApp = window.DPEApp || {};
  const http = app.http;
  const { redact } = app.utils;
  app.services = app.services || {};

  function projectURL() {
    const config = window.SAP_API_CONFIG;
    const url = new URL(config.baseUrl + config.collectionPath);
    url.searchParams.set("$top", String(config.limit));
    url.searchParams.set("$select", config.projectFields.join(","));
    url.searchParams.set("$format", "json");
    return url;
  }
  function validUUID(project) {
    return typeof project.ProjectUUID === "string"
      && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(project.ProjectUUID);
  }
  function elementURL(project) {
    const config = window.SAP_API_CONFIG;
    const path = config.elementNavigationPath.replace("{ProjectUUID}", project.ProjectUUID);
    const url = new URL(config.baseUrl + path);
    url.searchParams.set("$select", config.elementFields.join(","));
    url.searchParams.set("$format", "json");
    return url;
  }
  async function loadProjects({ key, controller, onResponse, onHTTPError }) {
    const context = await http.read(projectURL(), key, controller);
    const { response, data, safeBody, httpStatus } = context;
    onResponse(context);
    if (!response.ok) {
      onHTTPError(safeBody || "SAP returned no response body.");
      console.error("SAP Enterprise Project HTTP error", {
        url: context.url, status: response.status,
        statusText: redact(response.statusText, key), responseBody: safeBody
      });
      http.fail(`${httpStatus}. SAP request failed; see the response body below.`, context);
    }
    if (!data) http.fail(`${httpStatus}. Expected JSON but received an empty or non-JSON response. Inspect Raw SAP Response.`, context);
    if (!Array.isArray(data.d?.results)) http.fail(`${httpStatus}. Unexpected response shape: expected OData V2 data.d.results. Inspect Raw SAP Response.`, context);
    if (!data.d.results.every(project => project && typeof project === "object" && !Array.isArray(project))) {
      http.fail(`${httpStatus}. Invalid project records in data.d.results. Inspect Raw SAP Response.`, context);
    }
    return { ...context, records: data.d.results.slice(0, window.SAP_API_CONFIG.limit) };
  }
  async function loadElements(project, { key, controller, isCurrent, onResponse, onHTTPError }) {
    const context = await http.read(elementURL(project), key, controller);
    http.ensureCurrent(isCurrent);
    const { response, data, safeBody, httpStatus } = context;
    onResponse(context);
    if (!response.ok) {
      onHTTPError(safeBody || "SAP returned no response body.");
      console.error("SAP Project Element HTTP error", {
        url: context.url, status: response.status,
        statusText: redact(response.statusText, key), responseBody: safeBody
      });
      http.fail(`${httpStatus}. Project element request failed; see the response body below.`, context);
    }
    if (!Array.isArray(data?.d?.results)) http.fail(`${httpStatus}. Expected OData V2 data.d.results. Inspect Raw Project Element Response.`, context);
    if (!data.d.results.every(element => element && typeof element === "object" && !Array.isArray(element))) {
      http.fail(`${httpStatus}. Invalid project element records. Inspect Raw Project Element Response.`, context);
    }
    return { ...context, records: data.d.results };
  }
  app.services.projects = { projectURL, elementURL, validUUID, loadProjects, loadElements };
})();
