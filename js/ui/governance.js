(() => {
  "use strict";
  const app = window.DPEApp = window.DPEApp || {};
  const rules = app.reviewRules;
  const el = id => document.getElementById(id);
  const views = ["dashboard", "investments", "detail", "reviews", "assessment", "summary", "decision", "confirmation"];
  const titles = { dashboard: "Dashboard", investments: "Investments", detail: "Investment Details", reviews: "Reviews", assessment: "Continuation Review – Assessment", summary: "Review Summary", decision: "Governance Decision", confirmation: "Decision Confirmation" };
  const assessmentIDs = { strategicAlignment: "assessment-alignment", expectedBenefits: "assessment-benefits", deliveryPerformance: "assessment-delivery", costPosition: "assessment-cost", risk: "assessment-risk", futureEconomicValue: "assessment-value" };
  const dateTime = value => value && !Number.isNaN(Date.parse(value)) ? new Intl.DateTimeFormat("en-NZ", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(new Date(value)) + " UTC" : "—";
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
  function evidenceStatus(item, pending = false) {
    if (pending) return { label: "Loading", tone: "loading" };
    if (item.status === "error") return { label: "Request failed", tone: "error" };
    if (item.status === "unavailable") return { label: "Unavailable", tone: "warning" };
    if (item.status !== "success") return { label: "Not loaded", tone: "info" };
    if (item.linkedRecordCount === 0) return { label: "No matching records", tone: "warning" };
    if (item.hasMore) return { label: "Loaded · partial page", tone: "warning" };
    return { label: "Loaded", tone: "success" };
  }
  function overview(container, key, evidence, pending = false, sourceDetails = true) {
    const item = evidence[key]; const status = evidenceStatus(item, pending);
    const badge = node("span", status.label, "evidence-status"); badge.dataset.tone = status.tone;
    container.replaceChildren(badge);
    if (pending) container.append(node("p", "Reading SAP evidence. Please wait for this request to finish.", "evidence-note"));
    else {
      if (key === "lifecycle" && item.loaded) container.append(node("p", `${item.elementCount} returned elements · ${item.milestoneCount} marked milestones · ${item.mainMilestoneCount} main milestones`));
      if (key !== "lifecycle" && item.linkedRecordCount !== null) container.append(node("p", `${item.linkedRecordCount} validated linked records · SYSTEM CALCULATED from SAP`));
      if (item.status === "error" || item.status === "unavailable" || item.status === "not_attempted") container.append(node("p", item.note, "evidence-note"));
      else if (sourceDetails) { const details = node("details", undefined, "technical"); details.append(node("summary", "Source result & limitations")); for (const line of evidenceLines(key, evidence)) details.append(node("p", line)); container.append(details); }
      if (item.capturedAt) container.append(node("p", `Captured ${dateTime(item.capturedAt)} · SYSTEM CALCULATED`, "evidence-caption"));
      if (item.hasMore) container.append(node("p", "Additional pages are available. This is a partial snapshot.", "evidence-note"));
    }
  }
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
      overview(part.appendChild(node("div", undefined, "evidence-overview")), key, evidence, false, true);
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
      ["Start date", app.ui.formatDate(project.ProjectStartDate)], ["End date", app.ui.formatDate(project.ProjectEndDate)], ["Company code", project.CompanyCode], ["Currency", project.ProjectCurrency]]);
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
    el("detail-project-id").textContent = project.Project;
    el("detail-project-name").textContent = project.ProjectDescription || "Unnamed investment";
    const context = el("investment-context"); context.replaceChildren();
    pairs(context, [["Project dates (SAP)", `${app.ui.formatDate(project.ProjectStartDate)} – ${app.ui.formatDate(project.ProjectEndDate)}`], ["Company (SAP)", project.CompanyCode], ["Currency (SAP)", project.ProjectCurrency], ["SAP status code", project.ProcessingStatus]]);
    if (capturedContext) context.append(node("p", "Saved SAP project context from a prototype review. Reload SAP projects/evidence for fresh data.", "hint"));
    el("detail-review-status").textContent = `Local review status (SYSTEM CALCULATED): ${storageAvailable ? rules.projectStatus(records, project.ProjectUUID) : "Unavailable"}`;
    el("start-review").disabled = !storageAvailable;
    el("start-review").textContent = rules.activeReview(records, project.ProjectUUID) ? "Continue Review" : "Start Continuation Review";
    el("view-last-decision").hidden = !storageAvailable || !records.some(record => record.project.ProjectUUID === project.ProjectUUID && record.status === "decision_recorded");
    overview(el("detail-lifecycle-overview"), "lifecycle", evidence, !!app.state?.elementController, false);
    overview(el("detail-financial-overview"), "gl", evidence, !!app.state?.glController, false);
    overview(el("detail-procurement-overview"), "po", evidence, !!app.state?.poController, false);
  }
  function assessment(record) {
    el("review-basis").value = record.reviewBasis;
    for (const [key, id] of Object.entries(assessmentIDs)) el(id).value = record.assessment[key];
    el("assessment-comments").value = record.assessment.comments; el("assessment-dependencies").value = record.assessment.keyRisks; el("assessment-owner").value = record.decisionOwner;
    overview(el("assessment-financial-evidence"), "gl", record.evidence, !!app.state?.glController, true);
    growTextareas();
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
    growTextareas();
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
    el("current-review-project").textContent = `${record.project.Project} · ${record.project.ProjectDescription || "Continuation review"}`;
    renderTiming(el("review-timing"), record);
    const readiness = rules.readiness(record); const missing = [...readiness.missing]; if (busy) missing.push("Wait for current SAP evidence requests to finish");
    el("readiness-status").textContent = readiness.ready && !busy ? "READY – required completeness items captured. No decision recommendation." : "INCOMPLETE – resolve the missing items below.";
    el("readiness-status").dataset.kind = readiness.ready && !busy ? "success" : "info";
    el("readiness-missing").replaceChildren(...missing.map(item => node("li", item)));
    el("proceed-decision").disabled = !readiness.ready || busy;
    el("confirm-decision").disabled = busy || rules.decisionErrors(record, readDecision()).length > 0;
    const errors = rules.decisionErrors(record, readDecision());
    el("decision-incomplete").textContent = busy ? "Wait for SAP evidence requests to finish." : errors.length ? errors.join(" ") : "All required decision fields are complete. Confirm to save the record in this browser.";
    el("assessment-save-status").textContent = !el("storage-notice").hidden ? "Local save needs attention. See the storage error above." : "Draft saved in this browser only.";
    for (const [key, id] of Object.entries(assessmentIDs)) fieldFeedback(id, record.assessment[key] === rules.ASSESSMENTS[key].missing ? "Select a completed assessment for this category." : "");
    fieldFeedback("review-basis", !record.reviewBasis ? "Select the reason for this review." : "");
    fieldFeedback("assessment-owner", !record.decisionOwner.trim() ? "Enter the accountable decision owner." : "");
    const mapping = {
      "decision-outcome": "Select a human governance decision.", "decision-rationale": "Decision rationale is required.",
      "decision-owner": "Decision owner is required.", "decision-action": "Required action is required for this decision.",
      "decision-action-owner": "Action owner is required for this decision.", "decision-next-date": "Next review date is required for this decision."
    };
    for (const [id, message] of Object.entries(mapping)) fieldFeedback(id, errors.includes(message) ? message : id === "decision-next-date" && errors.includes("Next review date must be a valid calendar date.") ? "Enter a valid calendar date." : "");
  }
  function reviewSummary(record) {
    const target = el("review-summary"); target.replaceChildren();
    const context = section(target, "Project Context", "SAP"); projectContext(context, record.project); context.append(node("p", `Context captured: ${dateTime(record.projectContextCapturedAt)} (SYSTEM CALCULATED)`, "hint"));
    renderEvidence(target, record.evidence);
    const input = section(target, "Reviewer Assessment", "REVIEWER INPUT");
    pairs(input, [["Review basis", record.reviewBasis || "Not selected"], ...Object.entries(rules.ASSESSMENTS).map(([key, field]) => [field.label, record.assessment[key]]), ["Reviewer comments", record.assessment.comments], ["Key risks / dependencies", record.assessment.keyRisks], ["Decision owner", record.decisionOwner]]);
    if (record.assessment.costPosition === "Insufficient information") {
      const gap = node("p", "Evidence gap identified: cost position assessed as Insufficient information. ");
      gap.append(badge("REVIEWER INPUT")); input.append(gap);
    }
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
    document.querySelector("main").dataset.view = view;
    el("load-projects").hidden = ["assessment", "summary", "decision", "confirmation"].includes(view);
    el("connection-details").closest("section").hidden = ["assessment", "summary", "decision", "confirmation"].includes(view);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function growTextareas() { for (const input of document.querySelectorAll("textarea")) { if (input.offsetParent !== null) { input.style.height = "auto"; input.style.height = Math.max(110, input.scrollHeight + 2) + "px"; } } }
  function fieldFeedback(id, message) {
    const input = el(id); const error = el(id + "-error");
    if (!error) return;
    const visible = input.dataset.touched === "true" && !!message;
    error.textContent = visible ? message : ""; error.hidden = !visible;
    if (visible) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
    const references = [input.dataset.help, visible ? error.id : ""].filter(Boolean).join(" ");
    if (references) input.setAttribute("aria-describedby", references); else input.removeAttribute("aria-describedby");
  }
  function bind(actions) {
    for (const input of document.querySelectorAll("input, select, textarea")) {
      const error = node("span", "", "field-error"); error.id = input.id + "-error"; error.hidden = true;
      input.dataset.help = input.getAttribute("aria-describedby") || ""; input.closest("label").append(error);
      for (const event of ["input", "change"]) input.addEventListener(event, () => { input.dataset.touched = "true"; });
    }
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
    for (const input of document.querySelectorAll("textarea")) input.addEventListener("input", growTextareas);
  }
  app.governanceUI = { bind, showView, details, renderDashboard, renderReviews, assessment, readAssessment, decision, readDecision, chrome, reviewSummary, confirmation, evidenceStatus,
    storageNotice(text) { el("storage-notice").hidden = !text; el("storage-notice").textContent = text; el("assessment-save-status").textContent = text ? "Local save needs attention. See the storage error above." : "Draft saved in this browser only."; },
    error(text) { el("workflow-message").hidden = false; el("workflow-message").textContent = text; },
    financialSnapshot(record) { overview(el("assessment-financial-evidence"), "gl", record.evidence, !!app.state?.glController, true); },
    evidenceButton(enabled) { el("load-review-evidence").disabled = !enabled; }
  };
})();
