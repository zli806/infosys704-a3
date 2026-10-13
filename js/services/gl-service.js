(() => {
  "use strict";
  const app = window.DPEApp = window.DPEApp || {};
  const http = app.http;
  const { odataString, projectIDVariants, projectIDsEquivalent, decimalUnits, displayUnits } = app.utils;
  app.services = app.services || {};

  function projectID(project) {
    return typeof project.ProjectInternalID === "string" && project.ProjectInternalID.trim() ? project.ProjectInternalID : "";
  }
  function queryURL(filter, limit = window.GL_API_CONFIG.limit) {
    const config = window.GL_API_CONFIG;
    const url = new URL(config.baseUrl + config.collectionPath);
    url.searchParams.set("$top", String(limit));
    url.searchParams.set("$select", config.fields.join(","));
    url.searchParams.set("$format", "json");
    if (filter) url.searchParams.set("$filter", filter);
    return url;
  }
  async function load(project, wbsIDs, options) {
    const { key, controller, isCurrent, onRaw, onDiagnosticRaw, onProgress, onDiagnosticStart, onHTTP, onHTTPError } = options;
    const id = projectID(project);
    const attempts = [];
    const integrity = [];
    let lastHTTP = "";
    async function request(filter, limit, diagnostic = false) {
      const url = queryURL(filter, limit);
      lastHTTP = "";
      onHTTP(lastHTTP);
      let context;
      try {
        context = await http.read(url, key, controller, headers => {
          lastHTTP = headers.httpStatus;
          onHTTP(lastHTTP);
        });
        http.ensureCurrent(isCurrent);
        const { data, response, safeBody } = context;
        const entry = { url: url.href, status: lastHTTP, response: data ?? safeBody };
        if (diagnostic) onDiagnosticRaw(JSON.stringify(entry, null, 2));
        else {
          attempts.push(entry);
          onRaw(JSON.stringify(attempts, null, 2));
        }
        if (!response.ok) {
          onHTTPError(`${lastHTTP}\n${safeBody || "SAP returned no response body."}`);
          console.error("SAP G/L HTTP error", { url: url.href, status: lastHTTP, responseBody: safeBody });
          http.fail(`${lastHTTP}. SAP G/L request failed; see the response body below.`, context);
        }
        if (!Array.isArray(data?.d?.results) || !data.d.results.every(record => record && typeof record === "object" && !Array.isArray(record))) {
          http.fail(`${lastHTTP}. Expected OData V2 data.d.results records. Inspect the raw G/L response.`, context);
        }
        return data;
      } catch (error) {
        if (!(context?.response || error.sap?.response) && error.name !== "AbortError") {
          throw http.attach(new Error("No HTTP response available. Network, browser/CORS or local-file restrictions may have blocked G/L. Inspect the console and Network tab; do not disable browser security."), error.sap || {});
        }
        throw error;
      }
    }
    let data;
    let linkMethod = "";
    function acceptLinkedRows(field, identifiers, allowNumericEquivalence = false) {
      const returned = data.d.results;
      const matches = returned.filter(record => allowNumericEquivalence
        ? projectIDsEquivalent(record[field], identifiers[0]) : identifiers.includes(record[field]));
      const rejected = returned.filter(record => !matches.includes(record));
      integrity.push({ method: field, returned: returned.length, linked: matches.length,
        discarded: rejected.length, unexpectedIdentifiers: [...new Set(rejected.map(record => record[field] ?? "(missing)"))].slice(0, 10) });
      data = { ...data, d: { ...data.d, results: matches } };
      onRaw(JSON.stringify({ attempts, filterIntegrity: integrity }, null, 2));
    }
    if (wbsIDs.length) {
      onProgress("Testing primary exact WBS Internal ID link…");
      data = await request(wbsIDs.map(id => `WBSElementInternalID eq ${odataString(id)}`).join(" or "), window.GL_API_CONFIG.limit);
      acceptLinkedRows("WBSElementInternalID", wbsIDs);
      if (data.d.results.length) linkMethod = "WBS Internal ID";
    }
    if (!linkMethod && id) {
      onProgress("No exact WBS-linked records found (or WBS unavailable). Testing secondary ProjectInternalID…");
      data = await request(projectIDVariants(id).map(id => `ProjectInternalID eq ${odataString(id)}`).join(" or "), window.GL_API_CONFIG.limit);
      acceptLinkedRows("ProjectInternalID", [id], true);
      if (data.d.results.length) linkMethod = "ProjectInternalID (secondary; numeric-only leading-zero equivalence allowed)";
    }
    http.ensureCurrent(isCurrent);
    if (linkMethod) {
      const records = data.d.results;
      return { records, linkMethod, message: `Linked by ${linkMethod} · ${lastHTTP} · ${records.length} linked records.${integrity.some(check => check.discarded) ? " Filter-integrity warning: unrelated returned rows were discarded; inspect Raw G/L Response." : ""}${data.d.__next ? " SAP indicates additional pages; summary covers only this returned page." : ""}` };
    }
    onDiagnosticStart(`No linked G/L records found in current SAP Sandbox sample · ${lastHTTP}. Running a separate unlinked connectivity diagnostic…`);
    const diagnostic = await request(null, 5, true);
    return { records: [], linkMethod: "", message: `No linked G/L records found in current SAP Sandbox sample · G/L API responded ${lastHTTP}; diagnostic returned ${diagnostic.d.results.length} unlinked records. These are debug-only, not project evidence.` };
  }
  function summarize(glRecords) {
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
    const lines = [
      `Linked G/L records: ${glRecords.length} · Non-commitment line items: ${nonCommitments.length} · Commitment-flagged line items: ${commitments.length} · Unknown commitment flags: ${unknown}`,
      "Net amount from returned non-commitment postings, grouped by Company Code Currency:"
    ];
    for (const [currency, units] of totals) lines.push(`${currency}: ${displayUnits(units)}`);
    if (!totals.size) lines.push("No valid non-commitment currency amounts available.");
    lines.push(`Unknown commitment flags are excluded from amounts. ${excluded} non-commitment records excluded from amounts because the amount/currency was missing or invalid. Reversals and reversed items remain included with SAP's supplied signs.`);
    lines.push("Returned records only (maximum 100); no automatic pagination, currency conversion, ledger deduplication or complete-project-cost claim.");
    return lines;
  }
  app.services.gl = { projectID, queryURL, load, summarize };
})();
