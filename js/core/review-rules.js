(() => {
  "use strict";
  const app = window.DPEApp = window.DPEApp || {};
  const BASIS = ["Scheduled stage-gate review", "Material trigger", "Other governance review"];
  function normalizeBasis(value) {
    const canonical = value === "Material trigger / concern" ? "Material trigger" : value === "Scheduled governance review" ? "Scheduled stage-gate review" : value;
    return BASIS.includes(canonical) ? canonical : "";
  }
  const OUTCOMES = ["Continue", "Continue with Conditions", "Modify", "Pause", "Stop"];
  const ASSESSMENTS = {
    strategicAlignment: { label: "Strategic Alignment", question: "Does the investment remain aligned with current enterprise IT strategy?", options: ["High", "Medium", "Low", "Not assessed"], missing: "Not assessed" },
    expectedBenefits: { label: "Expected Benefits", question: "Are the expected benefits still achievable?", options: ["Yes", "Partially", "No", "Not assessed"], missing: "Not assessed" },
    deliveryPerformance: { label: "Delivery Performance", question: "How is delivery performing against plan?", options: ["On track", "At risk", "Off track", "Not assessed"], missing: "Not assessed" },
    costPosition: { label: "Cost Position", question: "What is the reviewer’s current assessment of the project cost position?", options: ["Not assessed", "Within expectations", "Minor variance", "Material variance", "Insufficient information"], missing: "Not assessed" },
    risk: { label: "Risk", question: "What is the reviewer’s risk judgement?", options: ["Low", "Medium", "High", "Not assessed"], missing: "Not assessed" },
    futureEconomicValue: { label: "Future Economic Value", question: "Does the investment still appear capable of generating positive future economic value?", options: ["Positive", "Uncertain", "Negative", "Not assessed"], missing: "Not assessed" }
  };
  const PROJECT_FIELDS = ["Project", "ProjectUUID", "ProjectInternalID", "ProjectDescription", "ProcessingStatus", "ProjectStartDate", "ProjectEndDate", "ProjectCurrency", "CompanyCode"];
  // Prototype convention, NOT DPE policy. Qualitative reviewer input only;
  // numbers never choose an assessment, trigger or investment outcome.
  const SIGNAL_RULES = {
    strategicAlignment: { High: ["normal"], Medium: ["emerging", "Strategic alignment is medium"], Low: ["material", "Strategic alignment is low"] },
    expectedBenefits: { Yes: ["normal"], Partially: ["emerging", "Expected benefits are only partially achievable"], No: ["material", "Expected benefits are assessed as not achievable"] },
    deliveryPerformance: { "On track": ["normal"], "At risk": ["emerging", "Delivery is at risk"], "Off track": ["material", "Delivery is off track"] },
    costPosition: { "Within expectations": ["normal"], "Minor variance": ["emerging", "Cost position assessed as Minor variance"], "Material variance": ["material", "Cost position assessed as Material variance"], "Insufficient information": ["gap", "Cost position cannot yet be fully assessed"] },
    risk: { Low: ["normal"], Medium: ["emerging", "Project risk is medium"], High: ["material", "High project risk"] },
    futureEconomicValue: { Positive: ["normal"], Uncertain: ["emerging", "Future economic value is uncertain"], Negative: ["material", "Future economic value is negative"] }
  };
  for (const entries of Object.values(SIGNAL_RULES)) { for (const rule of Object.values(entries)) Object.freeze(rule); Object.freeze(entries); }
  Object.freeze(SIGNAL_RULES);
  function classifyAssessment(key, value) { return Object.hasOwn(SIGNAL_RULES[key] || {}, value) ? SIGNAL_RULES[key][value][0] : "unassessed"; }
  function signalBreakdown(review) {
    return Object.entries(ASSESSMENTS).map(([key, field]) => {
      const value = review?.assessment?.[key];
      return { dimension: field.label, value, category: classifyAssessment(key, value) };
    }).filter(entry => ["material", "emerging", "gap"].includes(entry.category));
  }
  function projectSnapshot(project) {
    return Object.fromEntries(PROJECT_FIELDS.map(field => [field, typeof project[field] === "string" ? project[field] : ""]));
  }
  function emptyEvidence() {
    return {
      lifecycle: { attempted: false, loaded: false, status: "not_attempted", elementCount: null, wbsIDs: [], milestoneCount: null, mainMilestoneCount: null, capturedAt: null, note: "Lifecycle evidence has not been loaded." },
      gl: { attempted: false, status: "not_attempted", linkedRecordCount: null, linkMethod: "", summaryLines: [], capturedAt: null, note: "G/L evidence has not been attempted." },
      po: { attempted: false, status: "not_attempted", linkedRecordCount: null, summaryLines: [], capturedAt: null, note: "PO evidence has not been attempted." }
    };
  }
  function defaultAssessment() {
    return { ...Object.fromEntries(Object.entries(ASSESSMENTS).map(([key, field]) => [key, field.missing])), comments: "", keyRisks: "" };
  }
  function calendarTarget(opened, days) {
    const date = new Date(opened);
    if (Number.isNaN(date.getTime())) throw new Error("Review opened timestamp is invalid.");
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString();
  }
  function timing(review, now = new Date()) {
    const decisionTarget = calendarTarget(review.reviewOpenedAt, 14);
    const escalationThreshold = calendarTarget(review.reviewOpenedAt, 30);
    const current = new Date(now).getTime();
    const target = new Date(decisionTarget).getTime();
    const escalated = current >= new Date(escalationThreshold).getTime();
    return {
      reviewOpenedAt: review.reviewOpenedAt, decisionTarget, escalationThreshold,
      daysRemaining: Math.max(0, Math.ceil((target - current) / 86400000)),
      daysOverdue: Math.max(0, Math.ceil((current - target) / 86400000)),
      status: review.status === "decision_recorded" ? "Decision recorded" : escalated ? "Escalation threshold reached" : current >= target ? "Decision overdue" : "Within decision window"
    };
  }
  function readiness(review) {
    const missing = [];
    if (!review?.project?.ProjectUUID || !review.project.Project) missing.push("SAP project context");
    if (!review?.evidence?.lifecycle?.loaded) missing.push("Project Elements / lifecycle evidence loaded");
    if (!review?.evidence?.gl?.attempted) missing.push("G/L evidence attempted");
    if (!review?.evidence?.po?.attempted) missing.push("PO evidence attempted");
    if (!normalizeBasis(review?.reviewBasis)) missing.push("Review basis");
    for (const [key, field] of Object.entries(ASSESSMENTS)) {
      const value = review?.assessment?.[key];
      if (!field.options.includes(value) || value === field.missing) missing.push(field.label);
    }
    if (!ownerAssigned(review)) missing.push("Decision owner");
    return { ready: missing.length === 0, missing };
  }
  function ownerAssigned(review) {
    const owner = review?.decisionOwnerSnapshot;
    return !!review?.decisionOwner?.trim() && typeof review.decisionOwnerId === "string" && !!review.decisionOwnerId
      && owner?.id === review.decisionOwnerId && owner.name === review.decisionOwner && typeof owner.role === "string" && !!owner.role.trim();
  }
  function needsAttention(records, now = new Date()) {
    return records.filter(review => review.status === "in_progress").map(review => ({ review, signals: reviewSignals(review), timing: timing(review, now) }))
      .filter(item => item.signals.materialConcerns.length || item.signals.attentionItems.length || item.signals.evidenceGaps.length || item.timing.status !== "Within decision window")
      .sort((left, right) => left.timing.decisionTarget.localeCompare(right.timing.decisionTarget));
  }
  function reviewSignals(review) {
    // Presentation-only decision support from explicit reviewer inputs. These
    // categories do not change readiness, select an outcome or inspect SAP values.
    const assessment = review?.assessment || {};
    const materialConcerns = [];
    const attentionItems = [];
    const evidenceGaps = [];
    const buckets = { material: materialConcerns, emerging: attentionItems, gap: evidenceGaps };
    for (const key of Object.keys(ASSESSMENTS)) {
      const category = classifyAssessment(key, assessment[key]);
      if (buckets[category]) buckets[category].push(SIGNAL_RULES[key][assessment[key]][1]);
    }
    return { materialConcerns, attentionItems, evidenceGaps };
  }
  function validDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value + "T00:00:00Z").getTime())
      && new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value;
  }
  function needsActions(outcome) { return ["Continue with Conditions", "Modify", "Pause"].includes(outcome); }
  function localDateKey(now = new Date()) {
    const date = new Date(now);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }
  function decisionErrors(review, draft, { now = new Date() } = {}) {
    const errors = readiness(review).missing.map(item => `Missing readiness item: ${item}`);
    if (!OUTCOMES.includes(draft.outcome)) errors.push("Select a human governance decision.");
    if (!draft.rationale?.trim()) errors.push("Decision rationale is required.");
    if (!draft.owner?.trim()) errors.push("Decision owner is required.");
    if (needsActions(draft.outcome)) {
      if (!draft.requiredAction?.trim()) errors.push("Required action is required for this decision.");
      if (!draft.actionOwner?.trim()) errors.push("Action owner is required for this decision.");
      if (!draft.nextReviewDate) errors.push("Next review date is required for this decision.");
    }
    if (draft.nextReviewDate && !validDate(draft.nextReviewDate)) errors.push("Next review date must be a valid calendar date.");
    if (draft.nextReviewDate && validDate(draft.nextReviewDate) && draft.nextReviewDate < localDateKey(now)) errors.push("Next review date must be today or later, checked when the decision is recorded.");
    return errors;
  }
  function projectKey(projectOrUUID) {
    const uuid = typeof projectOrUUID === "string" ? projectOrUUID : projectOrUUID?.ProjectUUID;
    return typeof uuid === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid) ? uuid.toLowerCase() : null;
  }
  function sameProject(left, right) { const key = projectKey(left); return key !== null && key === projectKey(right); }
  function completedReviews(records, uuid) {
    return records.filter(record => record.status === "decision_recorded" && (uuid === undefined || sameProject(record.project, uuid)))
      .sort((a, b) => Date.parse(b.decision.timestamp) - Date.parse(a.decision.timestamp) || a.id.localeCompare(b.id));
  }
  function followUpDue(records, now = new Date()) {
    const today = localDateKey(now), seen = new Set(), result = [];
    for (const record of completedReviews(records)) {
      const key = projectKey(record.project);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const date = record.decision.nextReviewDate;
      if (activeReview(records, key) || record.decision.outcome === "Stop" || !validDate(date) || date > today) continue;
      result.push({ projectKey: key, reviewId: record.id, nextReviewDate: date, status: date === today ? "due" : "overdue" });
    }
    return result;
  }
  function activeReview(records, uuid) { return records.find(record => sameProject(record.project, uuid) && record.status === "in_progress") || null; }
  function latestReview(records, uuid) {
    return records.filter(record => sameProject(record.project, uuid)).sort((a, b) => b.reviewOpenedAt.localeCompare(a.reviewOpenedAt))[0] || null;
  }
  function projectStatus(records, uuid) {
    return activeReview(records, uuid) ? "Review in progress" : records.some(record => sameProject(record.project, uuid) && record.status === "decision_recorded") ? "Decision recorded" : "No active review";
  }
  function dashboard(records, projectCount, now = new Date()) {
    const open = records.filter(record => record.status === "in_progress");
    const decisions = records.filter(record => record.status === "decision_recorded").sort((a, b) => b.decision.timestamp.localeCompare(a.decision.timestamp));
    return { projectCount, open, decisions, overdue: open.filter(record => timing(record, now).status !== "Within decision window").length };
  }
  app.reviewRules = { BASIS, normalizeBasis, SIGNAL_RULES, classifyAssessment, signalBreakdown, OUTCOMES, ASSESSMENTS, PROJECT_FIELDS, projectSnapshot, emptyEvidence, defaultAssessment,
    calendarTarget, timing, readiness, ownerAssigned, needsAttention, reviewSignals, validDate, localDateKey, needsActions, decisionErrors, projectKey, sameProject, completedReviews, followUpDue, activeReview, latestReview, projectStatus, dashboard };
})();
