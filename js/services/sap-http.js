(() => {
  "use strict";
  const app = window.DPEApp = window.DPEApp || {};
  const { redact } = app.utils;
  const placeholder = "PASTE_YOUR_SAP_SANDBOX_API_KEY_HERE";

  function apiKey() {
    const configuredKey = window.APP_CONFIG?.SAP_API_KEY;
    return typeof configuredKey === "string" ? configuredKey.trim() : "";
  }
  function keyMissing(key) {
    return !key || key === placeholder;
  }
  function httpStatus(response, key) {
    return `HTTP ${response.status} ${redact(response.statusText, key) || "(status text unavailable)"}`;
  }
  function attach(error, context) {
    error.sap = context;
    return error;
  }
  function fail(message, context) {
    throw attach(new Error(message), context);
  }
  function ensureCurrent(isCurrent) {
    if (!isCurrent()) throw new DOMException("Selection changed", "AbortError");
  }
  async function read(url, key, controller, onHeaders = () => {}) {
    const timeout = setTimeout(() => controller.abort(), 30000);
    const context = { url: url.href, httpStatus: "", response: undefined };
    try {
      // The optional local server enables a same-origin, read-only SAP route.
      // Keep the original SAP URL in diagnostics and leave static hosting unchanged.
      const requestURL = window.APP_CONFIG?.SAP_PROXY_BASE_URL === "/sap-proxy"
        && url.origin === "https://sandbox.api.sap.com"
        ? new URL(`/sap-proxy${url.pathname}${url.search}`, window.location.origin) : url;
      context.response = await fetch(requestURL, {
        method: "GET", headers: { APIKey: key, Accept: "application/json" },
        credentials: "omit", signal: controller.signal
      });
      context.httpStatus = httpStatus(context.response, key);
      onHeaders(context);
      context.safeBody = redact(await context.response.text(), key);
      try { context.data = JSON.parse(context.safeBody); } catch { /* Preserve non-JSON text. */ }
      return context;
    } catch (error) {
      throw attach(error, context);
    } finally {
      clearTimeout(timeout);
    }
  }
  app.http = { apiKey, keyMissing, httpStatus, read, attach, fail, ensureCurrent };
})();
