(() => {
  "use strict";
  const app = window.DPEApp = window.DPEApp || {};
  const http = app.http;
  const { odataString, poDecimal, addPODecimals, displayPODecimal } = app.utils;
  app.services = app.services || {};

  function queryURL(wbsIDs) {
    const config = window.PO_API_CONFIG;
    const url = new URL(config.baseUrl + config.collectionPath);
    url.searchParams.set("$top", String(config.limit));
    url.searchParams.set("$select", config.fields.join(","));
    url.searchParams.set("$filter", wbsIDs.map(id => `WBSElementInternalID eq ${odataString(id)}`).join(" or "));
    return url;
  }
  async function load(wbsIDs, { key, controller, isCurrent, onRaw, onHTTP, onHTTPError }) {
    const context = await http.read(queryURL(wbsIDs), key, controller, onHTTP);
    http.ensureCurrent(isCurrent);
    const { response, data, safeBody, httpStatus } = context;
    onRaw(JSON.stringify({ url: context.url, status: httpStatus, response: data ?? safeBody }, null, 2));
    if (!response.ok) {
      onHTTPError(`${httpStatus}\n${safeBody || "SAP returned no response body."}`);
      http.fail(`${httpStatus}. Purchase Order request failed; inspect the safe response below.`, context);
    }
    if (!Array.isArray(data?.value) || !data.value.every(record => record && typeof record === "object" && !Array.isArray(record))) {
      http.fail(`${httpStatus}. Expected OData V4 data.value records. Inspect Raw Purchase Order Response.`, context);
    }
    const records = data.value.filter(record => typeof record.WBSElementInternalID === "string" && wbsIDs.includes(record.WBSElementInternalID));
    const rejected = data.value.filter(record => !records.includes(record));
    const integrity = { status: rejected.length ? "mismatch" : "ok", returned: data.value.length,
      exactMatches: records.length, discarded: rejected.length,
      unexpectedIdentifiers: [...new Set(rejected.map(record => record.WBSElementInternalID ?? "(missing)"))].slice(0, 10) };
    onRaw(JSON.stringify({ url: context.url, status: httpStatus, filterIntegrity: integrity, response: data }, null, 2));
    return { ...context, records, integrity,
      message: `${records.length ? `Linked by exact WBS Internal ID · ${records.length} PO account assignments.` : "No linked Purchase Order account assignments found in current SAP Sandbox sample."} ${httpStatus}.${rejected.length ? ` Filter-integrity warning: ${rejected.length} unrelated rows discarded; inspect debug information.` : ""}${data["@odata.nextLink"] ? " SAP indicates additional pages; counts and amounts cover the returned page only." : ""}` };
  }
  function logIntegrity(integrity) {
    if (integrity.discarded) console.warn("SAP Purchase Order filter-integrity warning", { discarded: integrity.discarded, unexpectedIdentifiers: integrity.unexpectedIdentifiers });
  }
  function summarize(poRecords) {
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
    return lines;
  }
  app.services.po = { queryURL, load, summarize, logIntegrity };
})();
