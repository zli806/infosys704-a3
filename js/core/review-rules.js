(() => {
  "use strict";
  const app = window.DPEApp = window.DPEApp || {};
  const BASIS = ["Scheduled governance review", "Material trigger / concern", "Other governance review"];
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
    if (!BASIS.includes(review?.reviewBasis)) missing.push("Review basis");
    for (const [key, field] of Object.entries(ASSESSMENTS)) {
      const value = review?.assessment?.[key];
      if (!field.options.includes(value) || value === field.missing) missing.push(field.label);
    }
    if (!review?.decisionOwner?.trim()) missing.push("Decision owner");
    return { ready: missing.length === 0, missing };
  }
  function validDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value + "T00:00:00Z").getTime())
      && new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value;
  }
  function needsActions(outcome) { return ["Continue with Conditions", "Modify", "Pause"].includes(outcome); }
  function decisionErrors(review, draft) {
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
    return errors;
  }
  function activeReview(records, uuid) { return records.find(record => record.project.ProjectUUID === uuid && record.status === "in_progress") || null; }
  function latestReview(records, uuid) {
    return records.filter(record => record.project.ProjectUUID === uuid).sort((a, b) => b.reviewOpenedAt.localeCompare(a.reviewOpenedAt))[0] || null;
  }
  function projectStatus(records, uuid) {
    return activeReview(records, uuid) ? "Review in progress" : records.some(record => record.project.ProjectUUID === uuid && record.status === "decision_recorded") ? "Decision recorded" : "No active review";
  }
  function dashboard(records, projectCount, now = new Date()) {
    const open = records.filter(record => record.status === "in_progress");
    const decisions = records.filter(record => record.status === "decision_recorded").sort((a, b) => b.decision.timestamp.localeCompare(a.decision.timestamp));
    return { projectCount, open, decisions, overdue: open.filter(record => timing(record, now).status !== "Within decision window").length };
  }
  app.reviewRules = { BASIS, OUTCOMES, ASSESSMENTS, PROJECT_FIELDS, projectSnapshot, emptyEvidence, defaultAssessment,
    calendarTarget, timing, readiness, validDate, needsActions, decisionErrors, activeReview, latestReview, projectStatus, dashboard };
})();
