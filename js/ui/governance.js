(() => {
  "use strict";
  const app = window.DPEApp = window.DPEApp || {};
  const rules = app.reviewRules;
  const el = id => document.getElementById(id);
  const views = ["dashboard", "investments", "detail", "reviews", "assessment", "summary", "decision", "confirmation"];
  const titles = { dashboard: "Dashboard", investments: "Investments", detail: "Investment Details", reviews: "Reviews", assessment: "Continuation Review – Assessment", summary: "Review Summary", decision: "Governance Decision", confirmation: "Decision Confirmation" };
  const assessmentIDs = { strategicAlignment: "assessment-alignment", expectedBenefits: "assessment-benefits", deliveryPerformance: "assessment-delivery", costPosition: "assessment-cost", risk: "assessment-risk", futureEconomicValue: "assessment-value" };
  const dateTime = value => value && !Number.isNaN(Date.parse(value)) ? new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(new Date(value)) + " UTC" : "—";
  function node(tag, text, className) { const result = document.createElement(tag); if (text !== undefined) result.textContent = String(text); if (className) result.className = className; return result; }
  function paragraphs(container, lines) { container.replaceChildren(...lines.map(line => node("p", line))); }
  function pairs(container, entries) {
    const list = node("dl", undefined, "key-values");
    for (const [label, value] of entries) list.append(node("dt", label), node("dd", value === "" || value === null || value === undefined ? "—" : value));
    container.append(list);
  }
  function badge(source) { return node("span", source, `source ${source === "SAP" ? "sap" : source === "REVIEWER INPUT" ? "reviewer" : "system"}`); }
  function section(container, title, source) { const part = node("section", undefined, "panel"); const heading = node("h3", title + " "); heading.append(badge(source)); part.append(heading); container.append(part); return part; }
  function action(text, callback) { const button = node("button", text, "secondary"); button.type = "button"; button.addEventListener("click", callback); return button; }
  function options(select, values) { for (const value of values) { const option = node("option", value); option.value = value; select.append(option); } }
  function evidenceLines(key, evidence) {
    const item = evidence[key];
    const lines = [`Status: ${item.status.replace(/_/g, " ")} · ${item.note}`, `Captured: ${dateTime(item.capturedAt)} (SYSTEM CALCULATED)`];
    if (key === "lifecycle" && item.loaded) lines.push(`Returned elements: ${item.elementCount}; marked milestones: ${item.milestoneCount}; main milestones: ${item.mainMilestoneCount}.`, `WBS IDs (SAP): ${item.wbsIDs.join(", ") || "None returned"}`);
    if (key !== "lifecycle" && item.linkedRecordCount !== null) lines.push(`Validated linked records: ${item.linkedRecordCount} (SYSTEM CALCULATED from SAP)`);
    if (key === "gl" && item.linkMethod) lines.push(`Link method: ${item.linkMethod} (SYSTEM CALCULATED)`);
    if (key !== "lifecycle") lines.push(...item.summaryLines);
    if (item.hasMore) lines.push("Additional SAP pages indicated; this snapshot covers returned records only.");
    return lines;
  }
  function renderEvidence(container, evidence) {
    for (const [key, title] of [["lifecycle", "Lifecycle / WBS"], ["gl", "G/L Financial Evidence"], ["po", "Purchase Order Evidence"]]) {
      const part = section(container, title, "SAP");
      part.append(node("p", "Counts and grouped amounts: SYSTEM CALCULATED from SAP. Captured snapshots are not a claim of current production data.", "hint"));
      for (const line of evidenceLines(key, evidence)) part.append(node("p", line));
    }
  }
  function renderTiming(container, record) {
    container.replaceChildren(); const control = rules.timing(record);
    const heading = node("h3", "Governance Timing "); heading.append(badge("SYSTEM CALCULATED")); container.append(heading);
    pairs(container, [["Review opened", dateTime(control.reviewOpenedAt)], ["14-day decision target", dateTime(control.decisionTarget)],
      ["30-day escalation threshold", dateTime(control.escalationThreshold)], ["Current timing status", control.status],
      ["Decision window", record.status === "decision_recorded" ? "Decision recorded; not an open overdue review" : control.status === "Within decision window" ? `${control.daysRemaining} days remaining` : `${control.daysOverdue} days overdue`]]);
  }
  function projectContext(container, project) {
    pairs(container, [["Project", project.Project], ["Description", project.ProjectDescription], ["SAP processing status", project.ProcessingStatus],
      ["Start date", app.utils.formatDate(project.ProjectStartDate)], ["End date", app.utils.formatDate(project.ProjectEndDate)], ["Company code", project.CompanyCode], ["Currency", project.ProjectCurrency]]);
  }
  function renderDashboard(records, count, onOpen, storageAvailable = true) {
    const result = rules.dashboard(records, count);
    const cards = el("dashboard-cards"); cards.replaceChildren();
    for (const [label, value] of [["SAP Projects Loaded", result.projectCount], ["Reviews In Progress", storageAvailable ? result.open.length : "Unavailable"], ["Decisions Recorded", storageAvailable ? result.decisions.length : "Unavailable"], ["Overdue Open Reviews", storageAvailable ? result.overdue : "Unavailable"]]) {
      const card = node("div", undefined, "metric"); card.append(badge("SYSTEM CALCULATED"), node("strong", value), node("p", label)); cards.append(card);
    }
    const open = el("dashboard-open-reviews"); open.replaceChildren();
    const recent = el("dashboard-decisions"); recent.replaceChildren();
    if (!storageAvailable) { open.append(node("p", "Prototype storage unavailable; review records could not be read.")); recent.append(node("p", "Prototype storage unavailable; decision records could not be read.")); return; }
    if (!result.open.length) open.append(node("p", "No open prototype reviews yet. Load SAP projects and start a review from an investment."));
    for (const record of result.open) {
      const row = node("div", undefined, "review-item"); row.append(node("p", `${record.project.Project} · ${rules.timing(record).status}`), action("Continue Review", () => onOpen(record.id))); open.append(row);
    }
    if (!result.decisions.length) recent.append(node("p", "No decisions recorded in this browser yet."));
    for (const record of result.decisions.slice(0, 5)) {
      const row = node("div", undefined, "review-item"); row.append(node("p", `${record.project.Project} · ${record.decision.outcome} · ${dateTime(record.decision.timestamp)}`), action("View Decision", () => onOpen(record.id))); recent.append(row);
    }
  }
  function renderReviews(records, onOpen, storageAvailable = true) {
    const body = el("reviews-body"); body.replaceChildren();
    if (!records.length || !storageAvailable) { const row = node("tr"); const cell = node("td", storageAvailable ? "No prototype reviews saved yet." : "Prototype storage needs attention; review records cannot be refreshed.", "empty"); cell.colSpan = 6; row.append(cell); body.append(row); }
    if (!storageAvailable) return;
    for (const record of [...records].sort((a, b) => b.reviewOpenedAt.localeCompare(a.reviewOpenedAt))) {
      const control = rules.timing(record); const row = node("tr");
      for (const value of [record.project.Project, record.reviewBasis || "Not selected", dateTime(record.reviewOpenedAt), dateTime(control.decisionTarget), record.status === "decision_recorded" ? "Decision recorded" : control.status === "Within decision window" ? "In progress" : control.status]) row.append(node("td", value));
      const cell = node("td"); cell.append(action(record.status === "decision_recorded" ? "View Decision" : "Continue Review", () => onOpen(record.id))); row.append(cell); body.append(row);
    }
  }
  function details(project, evidence, records, capturedContext = false, storageAvailable = true) {
    const context = el("investment-context"); context.replaceChildren(); projectContext(context, project);
    if (capturedContext) context.append(node("p", "Saved SAP project context from a prototype review. Reload SAP projects/evidence for fresh data.", "hint"));
    el("detail-review-status").textContent = `Local review status (SYSTEM CALCULATED): ${storageAvailable ? rules.projectStatus(records, project.ProjectUUID) : "Unavailable"}`;
    el("start-review").disabled = !storageAvailable;
    el("start-review").textContent = rules.activeReview(records, project.ProjectUUID) ? "Continue Review" : "Start Continuation Review";
    el("view-last-decision").hidden = !storageAvailable || !records.some(record => record.project.ProjectUUID === project.ProjectUUID && record.status === "decision_recorded");
    paragraphs(el("detail-lifecycle-overview"), evidenceLines("lifecycle", evidence));
    paragraphs(el("detail-financial-overview"), evidenceLines("gl", evidence).slice(0, 4));
    paragraphs(el("detail-procurement-overview"), evidenceLines("po", evidence).slice(0, 3));
  }
  function assessment(record) {
    el("review-basis").value = record.reviewBasis;
    for (const [key, id] of Object.entries(assessmentIDs)) el(id).value = record.assessment[key];
    el("assessment-comments").value = record.assessment.comments; el("assessment-dependencies").value = record.assessment.keyRisks; el("assessment-owner").value = record.decisionOwner;
    paragraphs(el("assessment-financial-evidence"), evidenceLines("gl", record.evidence));
  }
  function readAssessment() {
    return { reviewBasis: el("review-basis").value, decisionOwner: el("assessment-owner").value,
      assessment: { ...Object.fromEntries(Object.entries(assessmentIDs).map(([key, id]) => [key, el(id).value])), comments: el("assessment-comments").value, keyRisks: el("assessment-dependencies").value } };
  }
  function decision(record) {
    const draft = record.decisionDraft;
    el("decision-outcome").value = draft.outcome; el("decision-rationale").value = draft.rationale; el("decision-owner").value = record.decisionOwner;
    el("decision-action").value = draft.requiredAction; el("decision-action-owner").value = draft.actionOwner; el("decision-next-date").value = draft.nextReviewDate;
    decisionRequirements();
  }
  function readDecision() {
    return { outcome: el("decision-outcome").value, rationale: el("decision-rationale").value, owner: el("decision-owner").value,
      requiredAction: el("decision-action").value, actionOwner: el("decision-action-owner").value, nextReviewDate: el("decision-next-date").value };
  }
  function decisionRequirements() {
    const required = rules.needsActions(el("decision-outcome").value);
    el("decision-requirements").textContent = required ? "Required action, action owner and next review date are required for this outcome." : "Action, action owner and next review date are optional for Continue / Stop. Rationale and decision owner remain required.";
    for (const id of ["decision-action", "decision-action-owner", "decision-next-date"]) el(id).required = required;
  }
  function chrome(record, busy) {
    el("current-review-project").textContent = `${record.project.Project} · Prototype Review ${record.id}`;
    renderTiming(el("review-timing"), record);
    const readiness = rules.readiness(record); const missing = [...readiness.missing]; if (busy) missing.push("Wait for current SAP evidence requests to finish");
    el("readiness-status").textContent = readiness.ready && !busy ? "READY – required completeness items captured. No decision recommendation." : "INCOMPLETE – resolve the missing items below.";
    el("readiness-missing").replaceChildren(...missing.map(item => node("li", item)));
    el("proceed-decision").disabled = !readiness.ready || busy;
    el("confirm-decision").disabled = busy || rules.decisionErrors(record, readDecision()).length > 0;
  }
  function reviewSummary(record) {
    const target = el("review-summary"); target.replaceChildren();
    const context = section(target, "Project Context", "SAP"); projectContext(context, record.project); context.append(node("p", `Context captured: ${dateTime(record.projectContextCapturedAt)} (SYSTEM CALCULATED)`, "hint"));
    renderEvidence(target, record.evidence);
    const input = section(target, "Reviewer Assessment", "REVIEWER INPUT");
    pairs(input, [["Review basis", record.reviewBasis || "Not selected"], ...Object.entries(rules.ASSESSMENTS).map(([key, field]) => [field.label, record.assessment[key]]), ["Reviewer comments", record.assessment.comments], ["Key risks / dependencies", record.assessment.keyRisks], ["Decision owner", record.decisionOwner]]);
    const system = section(target, "System Controls", "SYSTEM CALCULATED"); renderTiming(system, record);
    system.append(node("p", "Readiness is evidence completeness only. No score, AI or automatic governance decision is generated."));
  }
  function confirmation(record) {
    const target = el("confirmation-record"); target.replaceChildren(); const decision = record.decision;
    pairs(target, [["Record ID (SYSTEM CALCULATED)", record.id], ["SAP Project", record.project.Project], ["ProjectUUID (SAP)", record.project.ProjectUUID],
      ["Decision (REVIEWER INPUT)", decision.outcome], ["Rationale (REVIEWER INPUT)", decision.rationale], ["Decision owner (REVIEWER INPUT)", decision.owner], ["Decision timestamp (SYSTEM CALCULATED)", dateTime(decision.timestamp)],
      ["Required action (REVIEWER INPUT)", decision.requiredAction], ["Action owner (REVIEWER INPUT)", decision.actionOwner], ["Next review date (REVIEWER INPUT)", decision.nextReviewDate || "Not specified"],
      ["Review opened (SYSTEM CALCULATED)", dateTime(record.reviewOpenedAt)], ["14-day target (SYSTEM CALCULATED)", dateTime(decision.decisionTarget)], ["30-day threshold (SYSTEM CALCULATED)", dateTime(decision.escalationThreshold)]]);
    const snapshot = node("details"); snapshot.append(node("summary", "Saved Assessment / SAP Evidence Summary Snapshot")); target.append(snapshot);
    const assessment = section(snapshot, "Assessment Snapshot", "REVIEWER INPUT"); pairs(assessment, [...Object.entries(rules.ASSESSMENTS).map(([key, field]) => [field.label, decision.assessmentSnapshot[key]]), ["Reviewer comments", decision.assessmentSnapshot.comments], ["Key risks / dependencies", decision.assessmentSnapshot.keyRisks]]);
    renderEvidence(snapshot, decision.evidenceSnapshot);
  }
  function showView(view) {
    for (const name of views) el(`${name}-view`).hidden = name !== view;
    el("review-chrome").hidden = !["assessment", "summary", "decision"].includes(view);
    el("page-title").textContent = titles[view]; el("page-title").focus();
    for (const name of ["dashboard", "investments", "reviews"]) {
      const active = view === name || name === "investments" && view === "detail" || name === "reviews" && ["assessment", "summary", "decision", "confirmation"].includes(view);
      if (active) el(`nav-${name}`).setAttribute("aria-current", "page"); else el(`nav-${name}`).removeAttribute("aria-current");
    }
    const step = ["assessment", "summary", "decision"].indexOf(view);
    [...el("review-steps").children].forEach((item, index) => { if (index === step) item.setAttribute("aria-current", "step"); else item.removeAttribute("aria-current"); });
    el("workflow-message").hidden = true;
  }
  function bind(actions) {
    for (const view of ["dashboard", "investments", "reviews"]) el(`nav-${view}`).addEventListener("click", () => actions.navigate(view));
    el("dashboard-view-investments").addEventListener("click", () => actions.navigate("investments"));
    el("start-review").addEventListener("click", actions.startReview);
    el("view-last-decision").addEventListener("click", actions.lastDecision);
    el("reload-lifecycle").addEventListener("click", actions.reloadLifecycle);
    el("load-review-evidence").addEventListener("click", actions.loadEvidence);
    for (const id of ["review-back-investment", "return-investment"]) el(id).addEventListener("click", actions.returnInvestment);
    el("back-dashboard").addEventListener("click", () => actions.navigate("dashboard"));
    el("assessment-form").addEventListener("submit", event => { event.preventDefault(); actions.summary(); });
    for (const event of ["input", "change"]) el("assessment-form").addEventListener(event, actions.saveDraft);
    el("back-assessment").addEventListener("click", () => actions.reviewStep("assessment"));
    el("proceed-decision").addEventListener("click", () => actions.reviewStep("decision"));
    el("back-summary").addEventListener("click", () => actions.reviewStep("summary"));
    for (const event of ["input", "change"]) el("decision-form").addEventListener(event, () => { decisionRequirements(); actions.saveDraft(); });
    el("decision-form").addEventListener("submit", event => { event.preventDefault(); actions.confirm(); });
    options(el("review-basis"), rules.BASIS); options(el("decision-outcome"), rules.OUTCOMES);
    for (const [key, id] of Object.entries(assessmentIDs)) options(el(id), rules.ASSESSMENTS[key].options);
  }
  app.governanceUI = { bind, showView, details, renderDashboard, renderReviews, assessment, readAssessment, decision, readDecision, chrome, reviewSummary, confirmation,
    storageNotice(text) { el("storage-notice").hidden = !text; el("storage-notice").textContent = text; },
    error(text) { el("workflow-message").hidden = false; el("workflow-message").textContent = text; },
    financialSnapshot(record) { paragraphs(el("assessment-financial-evidence"), evidenceLines("gl", record.evidence)); },
    evidenceButton(enabled) { el("load-review-evidence").disabled = !enabled; }
  };
})();
