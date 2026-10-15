(() => {
  "use strict";
  const app = window.DPEApp = window.DPEApp || {};
  const rules = app.reviewRules;
  const STORAGE_KEY = "dpeA3.reviews.v1";
  const text = (value, limit = 4000) => typeof value === "string" ? value.slice(0, limit) : "";
  const copy = value => JSON.parse(JSON.stringify(value));

  function cleanEvidence(evidence) {
    const base = rules.emptyEvidence();
    for (const key of ["lifecycle", "gl", "po"]) {
      const value = evidence?.[key] || {};
      base[key].attempted = value.attempted === true;
      base[key].status = ["not_attempted", "success", "error", "unavailable"].includes(value.status) ? value.status : "not_attempted";
      base[key].capturedAt = typeof value.capturedAt === "string" && !Number.isNaN(Date.parse(value.capturedAt)) ? value.capturedAt : null;
      base[key].note = text(value.note);
      base[key].hasMore = value.hasMore === true;
      if (key === "lifecycle") {
        for (const field of ["elementCount", "milestoneCount", "mainMilestoneCount"]) base[key][field] = Number.isInteger(value[field]) && value[field] >= 0 ? value[field] : null;
        base[key].loaded = value.loaded === true && base[key].attempted && base[key].status === "success" && base[key].elementCount !== null;
        base[key].wbsIDs = Array.isArray(value.wbsIDs) ? [...new Set(value.wbsIDs.filter(id => typeof id === "string").map(id => text(id, 100)))].slice(0, 500) : [];
      } else {
        base[key].linkedRecordCount = Number.isInteger(value.linkedRecordCount) && value.linkedRecordCount >= 0 ? value.linkedRecordCount : null;
        base[key].summaryLines = Array.isArray(value.summaryLines) ? value.summaryLines.filter(line => typeof line === "string").slice(0, 100).map(line => text(line)) : [];
        if (key === "gl") base[key].linkMethod = text(value.linkMethod, 200);
      }
    }
    return base;
  }
  function cleanAssessment(value = {}) {
    const result = rules.defaultAssessment();
    for (const [key, field] of Object.entries(rules.ASSESSMENTS)) if (field.options.includes(value[key])) result[key] = value[key];
    result.comments = text(value.comments); result.keyRisks = text(value.keyRisks);
    return result;
  }
  function cleanDraft(value = {}) {
    return { outcome: rules.OUTCOMES.includes(value.outcome) ? value.outcome : "", rationale: text(value.rationale),
      owner: text(value.owner, 200), requiredAction: text(value.requiredAction), actionOwner: text(value.actionOwner, 200), nextReviewDate: text(value.nextReviewDate, 10) };
  }
  function cleanOwner(value) {
    return value && typeof value.id === "string" && typeof value.name === "string" && typeof value.role === "string"
      ? { id: text(value.id, 100), name: text(value.name, 200), role: text(value.role, 200), source: "PROTOTYPE GOVERNANCE DIRECTORY" } : null;
  }
  function sanitize(record) {
    const showcase = app.services.showcase?.isShowcase(record.project) || false;
    const result = {
      id: text(record.id, 100), project: rules.projectSnapshot(record.project || {}),
      projectContextCapturedAt: text(record.projectContextCapturedAt, 40), status: record.status,
      reviewBasis: rules.normalizeBasis(record.reviewBasis),
      reviewOpenedAt: record.reviewOpenedAt, assessment: cleanAssessment(record.assessment),
      decisionOwner: text(record.decisionOwner, 200), decisionOwnerId: text(record.decisionOwnerId, 100),
      decisionOwnerSnapshot: cleanOwner(record.decisionOwnerSnapshot), evidence: cleanEvidence(record.evidence),
      decisionDraft: cleanDraft(record.decisionDraft), decision: null,
      sources: { project: showcase ? "SHOWCASE" : "SAP SANDBOX", assessment: showcase ? "SHOWCASE SCENARIO / REVIEWER INPUT" : "REVIEWER INPUT", controls: "SYSTEM CALCULATED" }
    };
    if (record.decision) result.decision = {
      ...cleanDraft(record.decision), timestamp: text(record.decision.timestamp, 40),
      ownerId: text(record.decision.ownerId, 100), ownerSnapshot: cleanOwner(record.decision.ownerSnapshot),
      decisionTarget: rules.calendarTarget(record.reviewOpenedAt, 14), escalationThreshold: rules.calendarTarget(record.reviewOpenedAt, 30),
      assessmentSnapshot: cleanAssessment(record.decision.assessmentSnapshot), evidenceSnapshot: cleanEvidence(record.decision.evidenceSnapshot)
    };
    // Whitelisting prevents request/config/raw payload persistence. Exact echoed or
    // accidentally pasted local credential text is redacted before storage/output.
    const key = app.http.apiKey();
    function redact(value) {
      if (typeof value === "string") return key ? app.utils.redact(value, key) : value;
      if (Array.isArray(value)) return value.map(redact);
      if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, redact(item)]));
      return value;
    }
    return redact(result);
  }
  function validate(record) {
    if (!record || typeof record !== "object" || typeof record.id !== "string" || !record.id.trim() || !app.services.projects.validUUID(record.project || {})
      || typeof record.project.Project !== "string" || !record.project.Project || !["in_progress", "decision_recorded"].includes(record.status)
      || typeof record.reviewOpenedAt !== "string" || Number.isNaN(Date.parse(record.reviewOpenedAt))
      || (record.status === "decision_recorded" && (!record.decision || !rules.OUTCOMES.includes(record.decision.outcome)
        || typeof record.decision.rationale !== "string" || !record.decision.rationale.trim() || typeof record.decision.owner !== "string" || !record.decision.owner.trim()
        || typeof record.decision.timestamp !== "string" || Number.isNaN(Date.parse(record.decision.timestamp))))) {
      throw new Error("Stored prototype reviews are invalid. Existing data was not overwritten; inspect browser storage before repairing it.");
    }
  }
  function list() {
    let raw;
    try { raw = window.localStorage.getItem(STORAGE_KEY); }
    catch { throw new Error("Prototype review storage is unavailable in this browser/origin. Use a local static preview; reviews cannot be saved until storage is available."); }
    if (raw === null) return [];
    let data;
    try { data = JSON.parse(raw); } catch { throw new Error("Prototype review storage is malformed; existing data was not overwritten."); }
    if (data?.version !== 1 || !Array.isArray(data.reviews)) throw new Error("Prototype review storage has an unsupported format; existing data was not overwritten.");
    data.reviews.forEach(validate);
    if (new Set(data.reviews.map(record => record.id)).size !== data.reviews.length) throw new Error("Prototype review storage contains duplicate record IDs; existing data was not overwritten.");
    const active = data.reviews.filter(record => record.status === "in_progress");
    if (new Set(active.map(record => record.project.ProjectUUID)).size !== active.length) throw new Error("Prototype review storage has duplicate active reviews for a project; existing data was not overwritten.");
    return data.reviews.map(sanitize);
  }
  function write(records) {
    const clean = records.map(sanitize);
    clean.forEach(validate);
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, reviews: clean })); }
    catch { throw new Error("Could not save to prototype browser storage. No decision has been confirmed by this save; check storage permissions/capacity and retry."); }
    return clean;
  }
  function get(id) { return list().find(record => record.id === id) || null; }
  function start(project, evidence) {
    const records = list();
    const existing = rules.activeReview(records, project.ProjectUUID);
    if (existing) return existing;
    const now = new Date().toISOString();
    const record = { id: window.crypto?.randomUUID?.() || `review-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      project: rules.projectSnapshot(project), projectContextCapturedAt: now, status: "in_progress", reviewBasis: "", reviewOpenedAt: now,
      assessment: rules.defaultAssessment(), decisionOwner: "", decisionOwnerId: "", decisionOwnerSnapshot: null, evidence: cleanEvidence(evidence), decisionDraft: cleanDraft() };
    return write([...records, record]).find(item => item.id === record.id);
  }
  function update(id, patch) {
    const records = list();
    const record = records.find(item => item.id === id);
    if (!record || record.status !== "in_progress") throw new Error("This review is missing or already completed; its decision record cannot be edited.");
    // Only explicit governance/evidence fields can be updated, not identity/opened date/status.
    for (const field of ["reviewBasis", "assessment", "decisionDraft", "evidence"]) if (Object.hasOwn(patch, field)) record[field] = patch[field];
    if (Object.hasOwn(patch, "decisionOwnerId")) {
      const owner = patch.decisionOwnerId ? app.services.governanceDirectory.resolve(patch.decisionOwnerId) : null;
      record.decisionOwnerId = owner?.id || ""; record.decisionOwner = owner?.name || ""; record.decisionOwnerSnapshot = owner;
    }
    return write(records).find(item => item.id === id);
  }
  function confirm(id, draft) {
    const records = list(); const record = records.find(item => item.id === id);
    if (!record || record.status !== "in_progress") throw new Error("This review is missing or its decision is already recorded.");
    if (!app.services.governanceDirectory.eligible(record)) throw new Error("Select an eligible Decision Owner from the prototype governance directory in Assessment. Previously saved owner text is retained for reference.");
    const owner = app.services.governanceDirectory.resolve(record.decisionOwnerId);
    // The assessment's governed owner is authoritative, not an independently edited decision field.
    const decision = { ...cleanDraft(draft), owner: owner.name, ownerId: owner.id, ownerSnapshot: owner };
    const errors = rules.decisionErrors(record, decision);
    if (errors.length) throw new Error(errors.join(" "));
    record.status = "decision_recorded";
    record.decision = { ...decision, timestamp: new Date().toISOString(), assessmentSnapshot: copy(record.assessment), evidenceSnapshot: copy(record.evidence) };
    record.decisionDraft = decision;
    return write(records).find(item => item.id === id);
  }
  function seedShowcase({ reset = false } = {}) {
    const showcase = app.services.showcase;
    const seeds = showcase.seededReviews();
    const existing = list(); // Malformed/unavailable storage must never be erased.
    const records = reset ? existing.filter(record => !showcase.isShowcase(record.project)) : existing;
    const additions = seeds.filter(seed => !records.some(record => record.id === seed.id)
      && !(seed.status === "in_progress" && rules.activeReview(records, seed.project.ProjectUUID)));
    if (!reset && !additions.length) return records;
    return write([...records, ...additions]);
  }
  app.services.reviewStore = { STORAGE_KEY, list, get, start, update, confirm, seedShowcase };
})();
