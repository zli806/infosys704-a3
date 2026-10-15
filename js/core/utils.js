(() => {
  "use strict";
  const app = window.DPEApp = window.DPEApp || {};

  function redact(text, apiKey) {
    // Guard against a gateway echoing the credential in a response body.
    return apiKey ? String(text).split(apiKey).join("[REDACTED]") : String(text);
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
  function milestoneFlag(value) {
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
  function odataString(value) {
    return `'${String(value).replace(/'/g, "''")}'`;
  }
  function loadedWBSIDs(projectElements) {
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
  function booleanLabel(value) {
    return value === true ? "Yes" : value === false ? "No" : "Unknown";
  }
  // Preserve the existing exact three-decimal G/L arithmetic.
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
  app.utils = { redact, formatDate, milestoneFlag, mainMilestoneLabel, odataString,
    loadedWBSIDs, projectIDsEquivalent, projectIDVariants, booleanLabel,
    decimalUnits, displayUnits, poDecimal, addPODecimals, displayPODecimal };
})();
