(() => {
  "use strict";
  const app = window.DPEApp = window.DPEApp || {};
  const rules = app.reviewRules;
  const el = id => document.getElementById(id);
  const views = ["dashboard", "investments", "detail", "reviews", "assessment", "summary", "decision", "confirmation"];
  const titles = { dashboard: "Dashboard", investments: "Investments", detail: "Investment Details", reviews: "Reviews", assessment: "Continuation Review – Assessment", summary: "Review Summary", decision: "Governance Decision", confirmation: "Decision Confirmation" };
  const assessmentIDs = { strategicAlignment: "assessment-alignment", expectedBenefits: "assessment-benefits", deliveryPerformance: "assessment-delivery", costPosition: "assessment-cost", risk: "assessment-risk", futureEconomicValue: "assessment-value" };
  let directoryPeople = [];
  let directoryError = "";
  let ownerRecord = { decisionOwner: "", decisionOwnerId: "", decisionOwnerSnapshot: null };
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
  function countLabel(count, singular) { return `${count} ${singular}${count === 1 ? "" : "s"}`; }
  const decisionDescriptions = {
    Continue: "Proceed under the current approved direction.",
    "Continue with Conditions": "Proceed subject to specified conditions or corrective actions.",
    Modify: "Change scope, plan or investment approach before continuing.",
    Pause: "Temporarily stop further progression while issues are resolved.",
    Stop: "End the investment / continuation path."
  };
  function buildChoices(id, values) {
    const group = el(id); const choices = node("div", undefined, "choice-options");
    values.forEach((value, index) => {
      const label = node("label", undefined, "choice-card"); const input = node("input");
      input.type = "radio"; input.name = id; input.value = value; input.id = `${id}-choice-${index}`;
      const copy = node("span", undefined, "choice-copy"); copy.append(node("strong", value));
      if (id === "decision-outcome") copy.append(node("small", decisionDescriptions[value], "choice-description"));
      const selected = node("span", "Selected", "choice-selected"); selected.setAttribute("aria-hidden", "true"); copy.append(selected);
      label.append(input, copy); choices.append(label);
    });
    group.append(choices);
  }
  function choiceValue(id, fallback = "") { return el(id).querySelector?.('input[type="radio"]:checked')?.value || fallback; }
  function setChoice(id, value) { for (const input of el(id).querySelectorAll?.('input[type="radio"]') || []) input.checked = input.value === value; }
  function ownerLabel(snapshot, legacy) { return snapshot?.id && snapshot.name && snapshot.role ? `${snapshot.name} · ${snapshot.role}` : legacy || "Not selected"; }
  function populateOwners() {
    const select = el("assessment-owner"); select.replaceChildren();
    const empty = node("option", directoryPeople.length ? "Select decision owner" : "Directory unavailable / loading"); empty.value = ""; select.append(empty);
    for (const person of directoryPeople) { const option = node("option", `${person.name} · ${person.role}`); option.value = person.id; select.append(option); }
    const eligible = directoryPeople.some(person => person.id === ownerRecord.decisionOwnerId);
    if (ownerRecord.decisionOwner && !eligible) {
      const legacy = node("option", `Previously saved: ${ownerRecord.decisionOwner} (select a governed owner)`);
      legacy.value = "__legacy__"; legacy.disabled = true; select.append(legacy); select.value = "__legacy__";
    } else select.value = ownerRecord.decisionOwnerId || "";
    select.disabled = !directoryPeople.length;
    el("governance-directory-status").textContent = directoryError || (ownerRecord.decisionOwner && !eligible
      ? "Previously saved owner text is preserved. Select an eligible owner before a new decision. PROTOTYPE GOVERNANCE DIRECTORY — fictional configuration, not SAP staff."
      : "PROTOTYPE GOVERNANCE DIRECTORY · Fictional prototype roles, not SAP or real DPE employees.");
  }
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
    if (!pending && key !== "lifecycle" && item.status === "success" && item.linkedRecordCount > 0) status.label = "Evidence available";
    container.dataset.tone = status.tone;
    const badge = node("span", status.label, "evidence-status"); badge.dataset.tone = status.tone;
    container.replaceChildren(badge);
    if (pending) container.append(node("p", "Reading SAP evidence. Please wait for this request to finish.", "evidence-note"));
    else {
      if (key === "lifecycle" && item.loaded) container.append(node("p", `${item.elementCount} project elements · ${item.wbsIDs.length} WBS IDs`));
      if (key !== "lifecycle" && item.linkedRecordCount !== null) container.append(node("p", `${item.linkedRecordCount} linked ${key === "gl" ? "G/L records" : "PO account assignments"}`));
      if (key !== "lifecycle") {
        let guidance = "";
        if (item.status === "success" && item.linkedRecordCount === 0) guidance = key === "po"
          ? "No linked Purchase Order account assignments were found in the current SAP Sandbox sample. This does not establish that procurement exposure is zero."
          : "No linked G/L records were found in the current SAP Sandbox sample. This does not establish that project cost is zero.";
        else if (item.status === "error") guidance = "The evidence request was attempted but failed technically. Retry loading evidence and inspect the technical details; this is not a zero-exposure finding.";
        else if (item.status === "unavailable") guidance = "Evidence is unavailable with the current identifiers or configuration. Check lifecycle/WBS and connection details, then retry or document the limitation.";
        else if (item.status !== "success") guidance = "This evidence has not yet been requested. Use Load review evidence to attempt retrieval.";
        if (guidance) container.append(node("p", guidance, "evidence-note"));
      }
      if (sourceDetails) { const details = node("details", undefined, "technical"); details.append(node("summary", "Evidence context & technical limitations")); for (const line of evidenceLines(key, evidence)) details.append(node("p", line)); container.append(details); }
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
    const milestones = [{ title: "Review Opened", date: control.reviewOpenedAt, state: "opened" },
      { title: "14-Day Decision Target", date: control.decisionTarget, state: "target" },
      { title: "30-Day Escalation Threshold", date: control.escalationThreshold, state: "threshold" }];
    if (record.status === "decision_recorded" && record.decision?.timestamp) milestones.push({ title: "Decision Recorded", date: record.decision.timestamp, state: "recorded" });
    milestones.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
    const timeline = node("ol", undefined, "governance-timeline"); timeline.setAttribute("aria-label", "Governance milestones in date order");
    for (const milestone of milestones) {
      const item = node("li", undefined, "timeline-step"); item.dataset.state = milestone.state;
      const time = node("time", dateTime(milestone.date)); time.dateTime = milestone.date;
      item.append(node("strong", milestone.title), time); timeline.append(item);
    }
    const status = node("p", control.status, "timing-status");
    status.dataset.tone = control.status === "Decision recorded" ? "recorded" : control.status === "Within decision window" ? "within-window" : "overdue";
    container.append(status, timeline);
    if (record.status !== "decision_recorded") container.append(node("p", control.status === "Within decision window" ? `${control.daysRemaining} days remaining` : `${control.daysOverdue} days overdue`, "timing-window"));
    const precision = node("details", undefined, "technical-disclosure technical"); precision.append(node("summary", "Timing dates & context")); container.append(precision);
    precision.append(node("p", "Milestone order, not an elapsed-time scale. Exact UTC timestamps are retained in the time elements."));
    pairs(precision, [["Review opened", dateTime(control.reviewOpenedAt)], ["14-day decision target", dateTime(control.decisionTarget)],
      ["30-day escalation threshold", dateTime(control.escalationThreshold)], ["Current timing status", control.status],
      ["Decision window", record.status === "decision_recorded" ? "Decision recorded; not an open overdue review" : control.status === "Within decision window" ? `${control.daysRemaining} days remaining` : `${control.daysOverdue} days overdue`]]);
  }
  function projectContext(container, project) {
    pairs(container, [["Project", project.Project], ["Description", project.ProjectDescription], ["SAP processing status", project.ProcessingStatus],
      ["Start date", app.ui.formatDate(project.ProjectStartDate)], ["End date", app.ui.formatDate(project.ProjectEndDate)], ["Company code", project.CompanyCode], ["Currency", project.ProjectCurrency]]);
  }
  function renderDashboard(records, count, onOpen, storageAvailable = true) {
    const result = rules.dashboard(records, count);
    const attention = el("dashboard-attention"); attention.replaceChildren();
    if (!storageAvailable) attention.append(node("p", "Prototype storage unavailable; attention items cannot be refreshed."));
    else {
      const items = rules.needsAttention(records);
      if (!items.length) attention.append(node("p", "No open reviews are currently flagged for management attention. Check open reviews for incomplete assessments; this is not assurance of safe continuation."));
      for (const { review, signals, timing } of items) {
        const row = node("article", undefined, "attention-item"); row.dataset.timing = timing.status;
        const context = node("div", undefined, "attention-item-context");
        context.append(node("h4", review.project.Project), node("p", `Review Trigger: ${review.reviewBasis || "Not selected"}`, "attention-trigger"));
        const counts = node("div", undefined, "attention-counts");
        for (const [count, label, tone] of [[signals.materialConcerns.length, "material concern", "material"], [signals.attentionItems.length, "attention item", "attention"], [signals.evidenceGaps.length, "evidence gap", "gap"]]) {
          const indicator = node("span", countLabel(count, label), "attention-count"); indicator.dataset.tone = tone; counts.append(indicator);
        }
        const timingText = node("p", timing.status === "Within decision window" ? `Decision due in ${timing.daysRemaining} days · ${dateTime(timing.decisionTarget)}` : `${timing.status} · ${timing.daysOverdue} days overdue`, "attention-timing");
        const button = action("Continue Review", () => onOpen(review.id)); button.className = "attention-action";
        row.append(context, counts, timingText, button); attention.append(row);
      }
    }
    const cards = el("dashboard-cards"); cards.replaceChildren();
    const openSignals = result.open.map(review => rules.reviewSignals(review));
    const materialCount = openSignals.reduce((sum, signals) => sum + signals.materialConcerns.length, 0);
    const gapCount = openSignals.reduce((sum, signals) => sum + signals.evidenceGaps.length, 0);
    for (const [label, value] of [["Reviews In Progress", result.open.length], ["Material Concerns", materialCount], ["Evidence Gaps", gapCount], ["Decisions Recorded", result.decisions.length]]) {
      const card = node("div", undefined, "metric status-card"); card.append(node("p", label), node("strong", storageAvailable ? value : "Unavailable"), node("small", label === "Decisions Recorded" ? "Saved local records" : "Across open local reviews")); cards.append(card);
    }
    const session = node("p", `SAP Projects Loaded This Session: ${result.projectCount} · Overdue open reviews: ${storageAvailable ? result.overdue : "Unavailable"} · SYSTEM CALCULATED`, "session-context");
    if (count === 0 && storageAvailable && records.length) session.append(node("span", " Load SAP Projects to refresh the current portfolio view.")); cards.append(session);
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
    ownerRecord = record; populateOwners();
    el("review-basis").value = record.reviewBasis;
    for (const [key, id] of Object.entries(assessmentIDs)) setChoice(id, record.assessment[key]);
    el("assessment-comments").value = record.assessment.comments; el("assessment-dependencies").value = record.assessment.keyRisks;
    overview(el("assessment-financial-evidence"), "gl", record.evidence, !!app.state?.glController, true);
    growTextareas();
  }
  function readAssessment() {
    const value = { reviewBasis: el("review-basis").value,
      assessment: { ...Object.fromEntries(Object.entries(assessmentIDs).map(([key, id]) => [key, choiceValue(id, rules.ASSESSMENTS[key].missing)])), comments: el("assessment-comments").value, keyRisks: el("assessment-dependencies").value } };
    if (el("assessment-owner").value !== "__legacy__") value.decisionOwnerId = el("assessment-owner").value;
    return value;
  }
  function decision(record) {
    ownerRecord = record;
    const draft = record.decisionDraft;
    setChoice("decision-outcome", draft.outcome); el("decision-rationale").value = draft.rationale; el("decision-owner").value = record.decisionOwner;
    if (record.decisionOwnerId) ownerContext(el("decision-owner-help"), record.decisionOwnerSnapshot, record.decisionOwner);
    else el("decision-owner-help").textContent = "Legacy saved owner text. Select a governed owner in Assessment before a new decision.";
    el("decision-action").value = draft.requiredAction; el("decision-action-owner").value = draft.actionOwner; el("decision-next-date").value = draft.nextReviewDate;
    decisionRequirements();
    growTextareas();
  }
  function readDecision() {
    return { outcome: choiceValue("decision-outcome"), rationale: el("decision-rationale").value, owner: ownerRecord.decisionOwner,
      requiredAction: el("decision-action").value, actionOwner: el("decision-action-owner").value, nextReviewDate: el("decision-next-date").value };
  }
  function decisionRequirements() {
    const outcome = choiceValue("decision-outcome"); const required = rules.needsActions(outcome);
    const followUp = el("decision-follow-up");
    if (followUp.dataset.outcome !== outcome) followUp.open = required;
    followUp.dataset.outcome = outcome;
    el("decision-follow-up-title").textContent = required ? "Required follow-up action" : "Optional follow-up action";
    el("decision-requirements").textContent = required ? "Required action, action owner and next review date are required for this outcome." : "Action, action owner and next review date are optional for Continue / Stop. Rationale and decision owner remain required.";
    for (const id of ["decision-action", "decision-action-owner", "decision-next-date"]) el(id).required = required;
  }
  function chrome(record, busy) {
    ownerRecord = record;
    el("current-review-project").textContent = `${record.project.Project} · ${record.project.ProjectDescription || "Continuation review"}`;
    const trigger = el("review-trigger"); trigger.dataset.trigger = record.reviewBasis === "Material trigger / concern" ? "material" : record.reviewBasis === "Scheduled governance review" ? "scheduled" : "other";
    trigger.replaceChildren(node("p", "Review Trigger · Why this review is happening", "component-eyebrow"), node("h4", record.reviewBasis || "Not selected"), node("p", "Formal continuation review", "hint"), badge("REVIEWER INPUT"));
    pairs(trigger, [["Opened · SYSTEM CALCULATED", dateTime(record.reviewOpenedAt)], ["Decision target · SYSTEM CALCULATED", dateTime(rules.timing(record).decisionTarget)]]);
    renderTiming(el("review-timing"), record);
    const readiness = rules.readiness(record); const missing = readiness.missing.map(item => item === "Review basis" ? "Review Trigger" : item); if (busy) missing.push("Wait for current SAP evidence requests to finish");
    const eligible = app.services?.governanceDirectory?.eligible(record) ?? rules.ownerAssigned(record);
    if (eligible) ownerContext(el("governance-directory-status"), record.decisionOwnerSnapshot, record.decisionOwner);
    if (!eligible && !missing.includes("Decision owner")) missing.push("Eligible Decision Owner from prototype governance directory");
    el("readiness-status").textContent = readiness.ready && eligible && !busy ? "READY – required completeness items captured. No decision recommendation." : "INCOMPLETE – resolve the missing items below.";
    el("readiness-status").dataset.kind = readiness.ready && eligible && !busy ? "success" : "info";
    el("readiness-missing").replaceChildren(...missing.map(item => node("li", item)));
    el("proceed-decision").disabled = !readiness.ready || !eligible || busy;
    el("confirm-decision").disabled = !eligible || busy || rules.decisionErrors(record, readDecision()).length > 0;
    const errors = rules.decisionErrors(record, readDecision());
    el("decision-incomplete").textContent = busy ? "Wait for SAP evidence requests to finish." : !eligible ? "Select an eligible Decision Owner in Assessment." : errors.length ? errors.join(" ").replace(/Review basis/g, "Review Trigger") : "All required decision fields are complete. Confirm to save the record in this browser.";
    el("assessment-save-status").textContent = !el("storage-notice").hidden ? "Local save needs attention. See the storage error above." : "Draft saved in this browser only.";
    for (const [key, id] of Object.entries(assessmentIDs)) fieldFeedback(id, record.assessment[key] === rules.ASSESSMENTS[key].missing ? "Select a completed assessment for this category." : "");
    fieldFeedback("review-basis", !record.reviewBasis ? "Select the reason for this review." : "");
    fieldFeedback("assessment-owner", !eligible ? "Select an eligible Decision Owner from the prototype directory." : "");
    const mapping = {
      "decision-outcome": "Select a human governance decision.", "decision-rationale": "Decision rationale is required.",
      "decision-owner": "Decision owner is required.", "decision-action": "Required action is required for this decision.",
      "decision-action-owner": "Action owner is required for this decision.", "decision-next-date": "Next review date is required for this decision."
    };
    for (const [id, message] of Object.entries(mapping)) fieldFeedback(id, errors.includes(message) ? message : id === "decision-next-date" && errors.includes("Next review date must be a valid calendar date.") ? "Enter a valid calendar date." : "");
  }
  function ownerContext(container, snapshot, legacy) {
    container.className = "accountability-context hint";
    container.replaceChildren(node("strong", snapshot?.name || legacy || "Not selected"), node("span", snapshot?.role || "Previously saved text owner"), node("small", snapshot?.id ? "PROTOTYPE GOVERNANCE DIRECTORY" : "Not directory-verified"));
  }
  function signalMatrix(container, record) {
    const heading = node("h4", "Reviewer Assessment Signals "); heading.append(badge("REVIEWER INPUT")); container.append(heading);
    const matrix = node("div", undefined, "signal-matrix"); matrix.setAttribute("aria-label", "Six categorical reviewer assessments; no quantitative score");
    for (const [key, field] of Object.entries(rules.ASSESSMENTS)) {
      const value = record.assessment[key]; const signals = rules.reviewSignals({ assessment: { [key]: value } });
      const missing = !field.options.includes(value) || value === field.missing;
      const tone = missing ? "unassessed" : signals.materialConcerns.length ? "material" : signals.evidenceGaps.length ? "gap" : signals.attentionItems.length ? "attention" : "assessed";
      const labels = { unassessed: "Not assessed", material: "Material concern", gap: "Evidence gap", attention: "Attention item", assessed: "Reviewer assessment" };
      const card = node("article", undefined, "assessment-signal"); card.dataset.dimension = key; card.dataset.tone = tone;
      card.append(node("h4", field.label), node("p", value || field.missing, "signal-value"), node("span", labels[tone], "semantic-label")); matrix.append(card);
    }
    container.append(matrix);
  }
  function executiveSnapshot(container, record) {
    const snapshot = section(container, "Executive Review Snapshot", "SYSTEM CALCULATED");
    const facts = node("dl", undefined, "executive-facts");
    const assessment = record.assessment;
    for (const [label, value, source] of [
      ["Project", `${record.project.Project} · ${record.project.ProjectDescription || "No description"}`, "SAP"],
      ["Review Trigger", record.reviewBasis || "Not selected", "REVIEWER INPUT"],
      ["Decision Target", dateTime(rules.timing(record).decisionTarget), "SYSTEM CALCULATED"]
    ]) {
      const fact = node("div"); const title = node("dt", label + " "); title.append(badge(source));
      fact.append(title, node("dd", value || "Not assessed")); facts.append(fact);
    }
    snapshot.append(facts); signalMatrix(snapshot, record);
    const signals = rules.reviewSignals(record);
    const hasSignals = signals.materialConcerns.length || signals.attentionItems.length || signals.evidenceGaps.length;
    const attention = node("section", undefined, hasSignals ? "management-attention" : ""); snapshot.append(attention);
    attention.append(node("h4", hasSignals ? "Management Attention Required" : "Management Attention"));
    attention.append(node("p", [countLabel(signals.materialConcerns.length, "material concern"), countLabel(signals.attentionItems.length, "attention item"), countLabel(signals.evidenceGaps.length, "evidence gap")].join(" · ")));
    for (const [title, items] of [["Material concerns", signals.materialConcerns], ["Attention items", signals.attentionItems], ["Evidence gaps", signals.evidenceGaps]]) {
      if (!items.length) continue;
      const group = node("section", undefined, "evidence-card"); const heading = node("h4", title + " "); heading.append(badge("REVIEWER INPUT"));
      const list = node("ul"); for (const item of items) list.append(node("li", item)); group.append(heading, list); attention.append(group);
    }
    if (!hasSignals) attention.append(node("p", Object.entries(rules.ASSESSMENTS).every(([key, field]) => field.options.includes(assessment[key]) && assessment[key] !== field.missing)
      ? "No material concerns are identified from the completed reviewer assessment." : "Complete the reviewer assessment to identify management concerns."));
    snapshot.append(node("p", "Decision support only. The accountable human selects the outcome.", "hint"));
    const explanation = node("details", undefined, "technical"); explanation.append(node("summary", "How to read these indicators"), node("p", "Indicators use explicit REVIEWER INPUT only. They are not scores, weights, recommendations or assurance that the investment is safe to continue. Unassessed categories are not classified; check readiness and evidence.")); snapshot.append(explanation);
  }
  function reviewSummary(record) {
    const target = el("review-summary"); target.replaceChildren();
    executiveSnapshot(target, record);
    const context = section(target, "Project Context", "SAP"); projectContext(context, record.project); context.append(node("p", `Context captured: ${dateTime(record.projectContextCapturedAt)} (SYSTEM CALCULATED)`, "hint"));
    renderEvidence(target, record.evidence);
    const input = section(target, "Reviewer Assessment", "REVIEWER INPUT");
    pairs(input, [["Review Trigger", record.reviewBasis || "Not selected"], ...Object.entries(rules.ASSESSMENTS).map(([key, field]) => [field.label, record.assessment[key]]), ["Reviewer comments", record.assessment.comments], ["Key risks / dependencies", record.assessment.keyRisks], ["Decision owner", ownerLabel(record.decisionOwnerSnapshot, record.decisionOwner)]]);
    input.append(node("p", record.decisionOwnerId ? "Owner source: PROTOTYPE GOVERNANCE DIRECTORY" : "Owner source: previously saved reviewer text (not directory-verified).", "hint"));
    if (record.assessment.costPosition === "Insufficient information") {
      const gap = node("p", "Evidence gap identified: cost position assessed as Insufficient information. ");
      gap.append(badge("REVIEWER INPUT")); input.append(gap);
    }
    const system = section(target, "System Controls", "SYSTEM CALCULATED"); renderTiming(system, record);
    system.append(node("p", "Readiness is evidence completeness only. No score, AI or automatic governance decision is generated."));
  }
  function confirmation(record) {
    const target = el("confirmation-record"); target.replaceChildren(); const decision = record.decision;
    el("confirmation-outcome").textContent = decision.outcome;
    const hero = node("header", undefined, "decision-record-context");
    hero.append(node("h3", record.project.ProjectDescription || record.project.Project), node("p", record.project.Project, "component-eyebrow"));
    const accountability = node("div"); ownerContext(accountability, decision.ownerSnapshot, decision.owner);
    hero.append(accountability, node("p", dateTime(decision.timestamp), "record-date")); target.append(hero);
    pairs(target, [["Decision owner", ownerLabel(decision.ownerSnapshot, decision.owner)], ["Decision Date (SYSTEM CALCULATED)", dateTime(decision.timestamp)], ["Decision Rationale (REVIEWER INPUT)", decision.rationale],
      ["Required Action (REVIEWER INPUT)", decision.requiredAction], ["Action Owner (REVIEWER INPUT)", decision.actionOwner], ["Next Review (REVIEWER INPUT)", decision.nextReviewDate || "Not specified"]]);
    target.append(node("p", decision.ownerId ? `Owner ID: ${decision.ownerId} · PROTOTYPE GOVERNANCE DIRECTORY` : "Previously saved text owner — not verified against the prototype directory.", "hint"));
    const metadata = node("details"); metadata.append(node("summary", "Record context & timing")); target.append(metadata);
    pairs(metadata, [["Record ID (SYSTEM CALCULATED)", record.id], ["SAP Project", record.project.Project], ["ProjectUUID (SAP)", record.project.ProjectUUID], ["Review Trigger (REVIEWER INPUT)", record.reviewBasis || "Not selected"],
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
    for (const [key, id] of Object.entries(assessmentIDs)) buildChoices(id, rules.ASSESSMENTS[key].options);
    buildChoices("decision-outcome", rules.OUTCOMES);
    for (const id of [...Object.values(assessmentIDs), "decision-outcome"]) {
      const group = el(id); const error = node("span", "", "field-error"); error.id = id + "-error"; error.hidden = true;
      group.dataset.help = group.getAttribute("aria-describedby") || ""; group.append(error);
      group.addEventListener("change", () => { group.dataset.touched = "true"; });
    }
    for (const input of document.querySelectorAll("input, select, textarea")) {
      if (input.type === "radio" || input.readOnly) continue;
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
    options(el("review-basis"), rules.BASIS);
    for (const input of document.querySelectorAll("textarea")) input.addEventListener("input", growTextareas);
  }
  app.governanceUI = { bind, showView, details, renderDashboard, renderReviews, assessment, readAssessment, decision, readDecision, chrome, reviewSummary, confirmation, evidenceStatus,
    setDirectory(people, error = "") { directoryPeople = people; directoryError = error; populateOwners(); },
    storageNotice(text) { el("storage-notice").hidden = !text; el("storage-notice").textContent = text; el("assessment-save-status").textContent = text ? "Local save needs attention. See the storage error above." : "Draft saved in this browser only."; },
    error(text) { el("workflow-message").hidden = false; el("workflow-message").textContent = text; },
    financialSnapshot(record) { overview(el("assessment-financial-evidence"), "gl", record.evidence, !!app.state?.glController, true); },
    evidenceButton(enabled) { el("load-review-evidence").disabled = !enabled; }
  };
})();
