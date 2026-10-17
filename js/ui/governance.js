(() => {
  "use strict";
  const app = window.DPEApp = window.DPEApp || {};
  const rules = app.reviewRules;
  const el = id => document.getElementById(id);
  const views = ["dashboard", "investments", "detail", "assessment", "summary", "decision", "confirmation"];
  const titles = { dashboard: "Portfolio Governance", investments: "Portfolio", detail: "Investment Details", assessment: "Continuation Review – Assessment", summary: "Review Summary", decision: "Governance Decision", confirmation: "Decision Confirmation" };
  const assessmentIDs = { strategicAlignment: "assessment-alignment", expectedBenefits: "assessment-benefits", deliveryPerformance: "assessment-delivery", costPosition: "assessment-cost", risk: "assessment-risk", futureEconomicValue: "assessment-value" };
  let directoryPeople = [];
  let directoryError = "";
  let ownerRecord = { decisionOwner: "", decisionOwnerId: "", decisionOwnerSnapshot: null };
  const dateTime = value => value && !Number.isNaN(Date.parse(value)) ? new Intl.DateTimeFormat("en-NZ", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(new Date(value)) + " UTC" : "—";
  const shortDate = value => app.ui.formatDate(value);
  function node(tag, text, className) { const result = document.createElement(tag); if (text !== undefined) result.textContent = String(text); if (className) result.className = className; return result; }
  function pairs(container, entries) {
    const list = node("dl", undefined, "key-values");
    for (const [label, value] of entries) list.append(node("dt", label), node("dd", value === "" || value === null || value === undefined ? "—" : value));
    container.append(list);
  }
  function section(container, title) { const part = node("section", undefined, "panel"); part.append(node("h3", title)); container.append(part); return part; }
  function action(text, callback) { const button = node("button", text, "secondary"); button.type = "button"; button.addEventListener("click", callback); return button; }
  function options(select, values) { for (const value of values) { const option = node("option", value); option.value = value; select.append(option); } }
  function countLabel(count, singular) { return `${count} ${singular}${count === 1 ? "" : "s"}`; }
  function sourceBadge(project) {
    const synthetic = app.services.showcase?.isShowcase(project);
    return node("span", synthetic ? "SHOWCASE" : "SAP SANDBOX", `source ${synthetic ? "showcase" : "sap"}`);
  }
  function compactAmount(value, signed = false) {
    if (value === null) return "Not validated";
    const amount = Number(value);
    return `${amount < 0 ? "−" : signed && amount > 0 ? "+" : ""}A$${(Math.abs(amount) / 1000000).toFixed(2)}m`;
  }
  function investmentContext(project) {
    const container = el("showcase-investment-context"), synthetic = app.services.showcase?.isShowcase(project);
    container.hidden = !synthetic; container.replaceChildren(); if (!synthetic) return;
    const context = app.services.showcase.financialContext(project);
    container.append(node("p", "SHOWCASE CONTEXT", "component-eyebrow"), node("h3", "Investment Context"), node("p", context.stageLabel, "hint"));
    const primary = node("div", undefined, "investment-metrics investment-primary");
    const supporting = node("div", undefined, "investment-metrics investment-supporting");
    const variance = context.forecastVariance === null ? "Not validated" : `${compactAmount(context.forecastVariance, true)} (${Number(context.variancePercent) > 0 ? "+" : ""}${context.variancePercent}%)`;
    for (const [label, amount, display, target] of [["Approved Investment", context.approvedInvestment, null, primary],
      [context.historical ? "Forecast before Stop" : "Forecast at Completion", context.forecastAtCompletion, null, primary], ["Forecast Variance", context.forecastVariance, variance, primary],
      ["Posted Financial Activity", context.postedFinancialActivity, null, supporting],
      [context.historical ? "Remaining Forecast Investment before Stop" : "Remaining Forecast Investment", context.remainingForecastInvestment, null, supporting],
      ["PO-linked Procurement Activity", context.procurementActivity, null, supporting], ["Not-finally-invoiced PO-linked amount", context.notFinallyInvoiced, null, supporting]]) {
      const metric = node("div"); const value = node("strong", display || compactAmount(amount));
      value.title = amount === null ? "Not validated; no numeric forecast inferred" : `AUD ${amount}`;
      metric.append(node("p", label), value); target.append(metric);
    }
    const dates = node("p", `Planned completion ${shortDate(context.plannedCompletion)} · Forecast completion ${context.forecastCompletion ? shortDate(context.forecastCompletion) : "Not validated"}`, "hint");
    container.append(node("p", context.reviewReason, "context-reason"), primary, dates, supporting);
    if (context.historical) container.append(node("small", "Synthetic pre-Stop position, not a current continuation plan."));
  }
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
      input.required = true;
      const copy = node("span", undefined, "choice-copy"); copy.append(node("strong", value));
      if (id === "decision-outcome") copy.append(node("small", decisionDescriptions[value], "choice-description"));
      const selected = node("span", "Selected", "choice-selected"); selected.setAttribute("aria-hidden", "true"); copy.append(selected);
      label.append(input, copy); choices.append(label);
    });
    group.append(choices);
  }
  function choiceValue(id, fallback = "") { return el(id).querySelector?.('input[type="radio"]:checked')?.value || fallback; }
  function setChoice(id, value) { for (const input of el(id).querySelectorAll?.('input[type="radio"]') || []) input.checked = input.value === value; }
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
      : "Prototype Governance Directory · Fictional roles, not SAP or real DPE employees.");
  }
  function evidenceStatus(item, pending = false) {
    if (pending) return { label: "Loading", tone: "loading" };
    if (item.status === "error") return { label: "Error", tone: "error" };
    if (item.status === "unavailable") return { label: "Unavailable", tone: "warning" };
    if (item.status !== "success") return { label: "Unavailable", tone: "info" };
    if (item.linkedRecordCount === 0 || item.elementCount === 0 || item.hasMore) return { label: "Limited evidence", tone: "warning" };
    return { label: "Available", tone: "success" };
  }
  function overview(container, key, evidence, pending = false, sourceDetails = true) {
    const item = evidence[key]; const status = evidenceStatus(item, pending);
    container.dataset.tone = status.tone;
    const badge = node("span", status.label, "evidence-status"); badge.dataset.tone = status.tone;
    container.replaceChildren(badge);
    if (pending) container.append(node("p", "Refreshing evidence…", "evidence-note"));
    else {
      if (key === "lifecycle" && item.loaded) container.append(node("p", `${item.elementCount} project components identified`));
      if (key === "lifecycle" && item.status === "error") container.append(node("p", "Could not refresh project structure. Please retry.", "evidence-note"));
      if (key !== "lifecycle" && item.linkedRecordCount > 0) container.append(node("p", `${item.linkedRecordCount} linked ${key === "gl" ? "accounting entries" : "purchase-order records"}`));
      if (key !== "lifecycle") {
        let guidance = "";
        if (item.status === "success" && item.linkedRecordCount === 0) guidance = key === "po"
          ? "No matching purchase-order records were found in the current data."
          : "No matching accounting entries were found in the current data.";
        else if (item.status === "error") guidance = "Could not refresh this evidence. Please retry.";
        else if (item.status === "unavailable") guidance = "Evidence cannot be retrieved with the current project information.";
        else if (item.status !== "success") guidance = "Waiting for project structure.";
        if (guidance) container.append(node("p", guidance, "evidence-note"));
        if (item.status === "success" && item.linkedRecordCount === 0) container.append(node("small", key === "po" ? "This does not establish that procurement exposure is zero." : "This does not establish that project cost is zero.", "evidence-note"));
        if (key === "gl" && item.linkedRecordCount > 0) container.append(node("small", "Recorded activity, not complete project cost. Reviewers assess separately whether information is sufficient.", "evidence-note"));
      }
      if (sourceDetails) for (const line of evidenceLines(key, evidence)) container.append(node("p", line));
      if (item.hasMore) container.append(node("p", "Additional pages are available. This is a partial snapshot.", "evidence-note"));
    }
  }
  function evidenceLines(key, evidence) {
    const item = evidence[key];
    const lines = [`Status: ${item.status.replace(/_/g, " ")} · ${item.note}`, `Evidence as of: ${dateTime(item.capturedAt)}`];
    if (key === "lifecycle" && item.loaded) lines.push(`Returned elements: ${item.elementCount}; marked milestones: ${item.milestoneCount}; main milestones: ${item.mainMilestoneCount}.`, `WBS Internal IDs: ${item.wbsIDs.join(", ") || "None returned"}`);
    if (key !== "lifecycle" && item.linkedRecordCount !== null) lines.push(`Validated linked records: ${item.linkedRecordCount} (SYSTEM CALCULATED from returned records)`);
    if (key === "gl" && item.linkMethod) lines.push(`Link method: ${item.linkMethod} (SYSTEM CALCULATED)`);
    if (key !== "lifecycle") lines.push(...item.summaryLines);
    if (item.hasMore) lines.push("Additional SAP pages indicated; this snapshot covers returned records only.");
    return lines;
  }
  function renderEvidence(container, evidence, project) {
    for (const [key, title] of [["lifecycle", "Lifecycle / WBS"], ["gl", "G/L Financial Evidence"], ["po", "Purchase Order Evidence"]]) {
      const part = section(container, title);
      part.append(node("p", app.services.showcase?.isShowcase(project) ? "Counts and grouped amounts calculated from synthetic showcase records, not SAP Sandbox or production data." : "Counts and grouped amounts calculated from returned SAP Sandbox records, not complete production data.", "hint"));
      overview(part.appendChild(node("div", undefined, "evidence-overview")), key, evidence, false, true);
    }
  }
  function renderTiming(container, record) {
    container.replaceChildren(); const control = rules.timing(record);
    container.append(node("h3", "Governance Timeline"));
    const milestones = [{ title: "Review Opened", date: control.reviewOpenedAt, state: "opened" },
      { title: "14-Day Decision Target", date: control.decisionTarget, state: "target" },
      { title: "30-Day Escalation Threshold", date: control.escalationThreshold, state: "threshold" }];
    if (record.status === "decision_recorded" && record.decision?.timestamp) milestones.push({ title: "Decision Recorded", date: record.decision.timestamp, state: "recorded" });
    milestones.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
    const timeline = node("ol", undefined, "governance-timeline"); timeline.setAttribute("aria-label", "Governance milestones in date order");
    for (const milestone of milestones) {
      const item = node("li", undefined, "timeline-step"); item.dataset.state = milestone.state;
      const time = node("time", shortDate(milestone.date)); time.dateTime = milestone.date; time.setAttribute("aria-label", dateTime(milestone.date)); time.title = dateTime(milestone.date);
      item.append(node("strong", milestone.title), time); timeline.append(item);
    }
    const status = node("p", control.status, "timing-status");
    status.dataset.tone = control.status === "Decision recorded" ? "recorded" : control.status === "Within decision window" ? "within-window" : "overdue";
    container.append(status, timeline);
    if (record.status !== "decision_recorded") container.append(node("p", control.status === "Within decision window" ? `${control.daysRemaining} days remaining` : `${control.daysOverdue} days overdue`, "timing-window"));
  }
  function resumeLabel(record) { return rules.readiness(record).ready ? "Review & Decide" : "Continue Assessment"; }
  // Presentation only: an investment outlives any one review/immutable decision.
  function completedReviews(records, uuid) {
    return records.filter(record => record.status === "decision_recorded" && (!uuid || record.project.ProjectUUID === uuid))
      .sort((a, b) => Date.parse(b.decision.timestamp) - Date.parse(a.decision.timestamp) || a.id.localeCompare(b.id));
  }
  function portfolioState(project, records, storageAvailable = true) {
    if (!storageAvailable) return { label: "Governance unavailable", nextStep: "View Investment", active: null, latest: null, nextReview: null };
    const active = rules.activeReview(records, project.ProjectUUID), latest = completedReviews(records, project.ProjectUUID)[0] || null;
    const outcome = latest?.decision.outcome;
    const label = active ? (rules.readiness(active).ready ? "Ready for decision" : "Assessment in progress")
      : outcome === "Stop" ? "Stopped" : outcome === "Pause" ? "Paused" : ["Modify", "Continue with Conditions"].includes(outcome) ? "Follow-up" : "Monitoring";
    return { label, active, latest, nextReview: active || outcome === "Stop" ? null : latest?.decision.nextReviewDate || null,
      nextStep: active ? resumeLabel(active) : outcome === "Stop" ? "View Decision" : "View Investment" };
  }
  const dashboardFilters = [
    { key: "active", label: "Active Reviews", heading: "Active Reviews", unit: "review", description: "Show all currently open reviews", matches: () => true, empty: "No active reviews awaiting a governance decision." },
    { key: "overdue", label: "Overdue", heading: "Overdue Decisions", unit: "review", description: "Show open reviews with an overdue decision or reached escalation threshold", matches: item => ["Decision overdue", "Escalation threshold reached"].includes(item.timing.status), empty: "No overdue decisions awaiting governance action." },
    { key: "material", label: "Material Concerns", heading: "Investments with Material Concerns", unit: "investment", description: "Show active investments with at least one Material Concern", distinct: true, matches: item => item.signals.materialConcerns.length > 0, empty: "No active investments with material concerns." },
    { key: "gap", label: "Evidence Gaps", heading: "Investments with Evidence Gaps", unit: "investment", description: "Show active investments with at least one Evidence Gap", distinct: true, matches: item => item.signals.evidenceGaps.length > 0, empty: "No active investments with evidence gaps." },
    { key: "recorded", label: "Recorded Decisions", heading: "Recorded Decisions", unit: "decision", description: "Show completed decision records from all review cycles", recorded: true, empty: "No decisions recorded yet." }
  ];
  const lensHelp = {
    active: "Open review cycles awaiting assessment completion or a governance decision. Current-review lenses may overlap.",
    overdue: "Active reviews past the 14-day decision target, including reviews that have reached the 30-day escalation threshold.",
    material: "Active investments with at least one Material Concern identified during assessment. This number counts investments, not individual findings.",
    gap: "Active investments where at least one assessment area has insufficient evidence for a reliable conclusion. This number counts investments, not individual gaps.",
    recorded: "Completed, immutable governance decisions. One investment may appear more than once when it has completed multiple review cycles."
  };
  const findingHelp = {
    material: "A serious adverse assessment requiring formal management attention.",
    emerging: "A deteriorating or uncertain assessment requiring attention or monitoring, but not currently classified as material.",
    gap: "An assessment area has insufficient evidence for a reliable conclusion."
  };
  let selectedDashboardFilter = "active";
  let dashboardState = null;
  let dashboardFilterButtons = [];
  function distinctDashboardInvestments(items) {
    const seen = new Set();
    return items.filter(({ review }) => {
      const identity = review.project.ProjectUUID || review.project.Project || review.id;
      if (seen.has(identity)) return false;
      seen.add(identity); return true;
    });
  }
  function renderDashboard(records, count, onOpen, storageAvailable = true) {
    const now = new Date(), result = rules.dashboard(records, count, now);
    el("dashboard-portfolio-count").textContent = `${result.projectCount} investments monitored`;
    const items = result.open.map(review => ({ review, signals: rules.reviewSignals(review), timing: rules.timing(review, now) }));
    const timingOrder = ["Escalation threshold reached", "Decision overdue", "Within decision window"];
    const compare = (left, right) => left < right ? -1 : left > right ? 1 : 0;
    items.sort((left, right) => timingOrder.indexOf(left.timing.status) - timingOrder.indexOf(right.timing.status)
      || compare(left.timing.decisionTarget, right.timing.decisionTarget)
      || compare(left.review.project.Project || "", right.review.project.Project || "") || compare(left.review.id, right.review.id));
    const subsets = Object.fromEntries(dashboardFilters.map(filter => {
      if (filter.recorded) return [filter.key, completedReviews(records).map(review => ({ review }))];
      const matching = items.filter(filter.matches);
      return [filter.key, filter.distinct ? distinctDashboardInvestments(matching) : matching];
    }));
    dashboardState = { subsets, onOpen, storageAvailable };
    const pulse = el("dashboard-cards");
    for (const filter of dashboardFilters) {
      const value = subsets[filter.key].length;
      let metric = dashboardFilterButtons.find(button => button.dataset.filter === filter.key);
      if (!metric) {
        const cell = node("div", undefined, "pulse-metric-wrap"); cell.dataset.kind = filter.key;
        metric = node("button", undefined, "pulse-metric"); metric.type = "button"; metric.id = `dashboard-filter-${filter.key}`;
        metric.dataset.kind = filter.key; metric.dataset.filter = filter.key;
        metric.setAttribute("aria-controls", "dashboard-attention");
        metric.append(node("span", filter.label, "pulse-label"), node("span", "", "pulse-value"));
        metric.addEventListener("click", () => { dismissMetricHelp(); selectedDashboardFilter = filter.key; renderDashboardQueue(); });
        cell.append(metric, metricHelp(filter)); pulse.append(cell); dashboardFilterButtons.push(metric);
      }
      metric.dataset.active = String(storageAvailable && value > 0);
      metric.disabled = !storageAvailable;
      metric.setAttribute("aria-label", `${filter.label}: ${storageAvailable ? countLabel(value, filter.unit) : "Unavailable"}. ${filter.description}.`);
      metric.children[1].textContent = storageAvailable ? value : "Unavailable";
    }
    renderDashboardQueue();
  }
  function renderDashboardQueue() {
    if (!dashboardState) return;
    const filter = dashboardFilters.find(filter => filter.key === selectedDashboardFilter) || dashboardFilters[0];
    selectedDashboardFilter = filter.key;
    const { subsets, onOpen, storageAvailable } = dashboardState, items = subsets[filter.key];
    for (const button of dashboardFilterButtons) button.setAttribute("aria-pressed", String(button.dataset.filter === selectedDashboardFilter));
    for (const control of metricHelpControls) control.place();
    el("decision-queue-title").textContent = filter.heading;
    el("dashboard-filter-count").textContent = storageAvailable ? countLabel(items.length, filter.unit) : "Records unavailable";
    const labels = ["Investment", "Review Trigger", filter.recorded ? "Decision" : "Findings", filter.recorded ? "Decision Date" : "Decision Timing", "Next Step"];
    el("dashboard-columns").replaceChildren(...labels.map(label => node("span", label)));
    const queue = el("dashboard-attention"); queue.replaceChildren();
    queue.dataset.mode = filter.recorded ? "recorded" : "current";
    if (!storageAvailable) queue.append(node("p", "Review storage unavailable; governance records cannot be refreshed.", "queue-empty"));
    else if (!items.length) queue.append(node("p", filter.empty, "queue-empty"));
    else for (const [index, { review, signals, timing }] of items.entries()) {
      const row = node("article", undefined, "decision-queue-row"); row.dataset.reviewId = review.id; row.setAttribute("role", "listitem");
      const sequence = node("span", String(index + 1).padStart(2, "0"), "queue-sequence"); sequence.setAttribute("aria-hidden", "true");
      if (timing) row.dataset.timing = timing.status;
      const urgent = !!timing && timing.status !== "Within decision window"; row.dataset.urgent = String(urgent);
      const grid = node("div", undefined, "queue-grid");
      const investment = node("div", undefined, "queue-investment");
      const identity = node("p", review.project.Project, "queue-identity"); identity.append(sourceBadge(review.project));
      investment.append(node("h4", review.project.ProjectDescription || review.project.Project), identity);
      const basis = rules.normalizeBasis(review.reviewBasis), trigger = node("div", undefined, "queue-trigger"); trigger.dataset.tone = basis === "Material trigger" ? "warm" : "neutral";
      trigger.append(node("span", "Review Trigger", "queue-field-label"), node("p", basis || "Not selected"));
      if (filter.recorded) {
        const outcome = node("div", undefined, "queue-decision"); outcome.append(node("span", "Decision", "queue-field-label"), node("strong", review.decision.outcome, "governance-chip"));
        const date = node("div", undefined, "queue-timing"), time = node("time", shortDate(review.decision.timestamp)); time.dateTime = review.decision.timestamp; time.title = dateTime(review.decision.timestamp);
        date.append(node("span", "Decision Date", "queue-field-label"), time);
        const primary = node("div", undefined, "queue-action"), button = action("View Decision", () => onOpen(review.id)); button.className = "queue-action-button";
        button.setAttribute("aria-label", `View Decision: ${review.project.ProjectDescription || review.project.Project} · ${dateTime(review.decision.timestamp)}`);
        primary.append(node("span", "Next Step", "queue-field-label"), button);
        grid.append(investment, trigger, outcome, date, primary); row.append(grid, sequence); queue.append(row); continue;
      }
      const findings = node("div", undefined, "queue-signals"); findings.append(node("span", "Findings", "queue-field-label"));
      const list = node("ul");
      for (const [count, label, tone] of [[signals.materialConcerns.length, "Material", "material"], [signals.attentionItems.length, "Emerging", "emerging"], [signals.evidenceGaps.length, "Evidence Gap", "gap"]]) {
        if (!count) continue;
        const signal = node("li", label === "Evidence Gap" ? countLabel(count, label) : `${count} ${label}`, "queue-signal"); signal.dataset.tone = tone;
        signal.title = findingHelp[tone]; signal.setAttribute("aria-label", `${signal.textContent}. ${findingHelp[tone]}`); list.append(signal);
      }
      if (!list.children.length) {
        const assessed = Object.entries(rules.ASSESSMENTS).every(([key, field]) => field.options.includes(review.assessment?.[key]) && review.assessment[key] !== field.missing);
        list.append(node("li", assessed ? "No concerns identified" : "Assessment in progress", "queue-signal"));
      }
      findings.append(list);
      const deadline = node("div", undefined, "queue-timing"); deadline.dataset.timing = timing.status;
      const time = node("time", `Due ${shortDate(timing.decisionTarget)}`); time.dateTime = timing.decisionTarget;
      deadline.append(node("span", "Decision Timing", "queue-field-label"));
      if (timing.status !== "Within decision window") deadline.append(node("strong", timing.status));
      deadline.append(time);
      const primary = node("div", undefined, "queue-action"), button = action(resumeLabel(review), () => onOpen(review.id)); button.className = "queue-action-button";
      button.setAttribute("aria-label", `${resumeLabel(review)}: ${review.project.ProjectDescription || review.project.Project}`); primary.append(node("span", "Next Step", "queue-field-label"), button);
      grid.append(investment, trigger, findings, deadline, primary); row.append(grid, sequence);
      queue.append(row);
    }
  }
  function renderReviewHistory(body, records, onOpen, storageAvailable) {
    body.replaceChildren();
    const labels = ["Decision Date", "Review Trigger", "Decision", "Decision Owner", "Next Review", "Next Step"];
    if (!records.length || !storageAvailable) {
      const row = node("tr"), cell = node("td", !storageAvailable ? "Decision storage unavailable." : "No completed reviews for this investment.", "empty");
      cell.colSpan = labels.length; row.append(cell); body.append(row); return;
    }
    for (const record of records) {
      const row = node("tr"); row.dataset.reviewId = record.id;
      const values = [shortDate(record.decision.timestamp), rules.normalizeBasis(record.reviewBasis) || "Not selected", record.decision.outcome, record.decision.owner, shortDate(record.decision.nextReviewDate)];
      values.forEach((value, index) => { const cell = node("td", value); cell.dataset.label = labels[index]; row.append(cell); });
      const outcomeCell = row.children[2]; outcomeCell.replaceChildren(node("span", record.decision.outcome, "governance-chip"));
      const cell = node("td"), button = action("View Decision", () => onOpen(record.id)); cell.dataset.label = "Next Step";
      button.setAttribute("aria-label", `View Decision: ${record.project.Project} · ${shortDate(record.decision.timestamp)}`);
      cell.append(button); row.append(cell); body.append(row);
    }
  }
  function details(project, evidence, records, capturedContext = false, storageAvailable = true, onOpen = () => {}) {
    el("detail-project-id").textContent = project.Project;
    el("detail-project-name").textContent = project.ProjectDescription || "Unnamed investment";
    const synthetic = app.services.showcase?.isShowcase(project);
    el("detail-source").textContent = synthetic ? "SHOWCASE" : "SAP SANDBOX"; el("detail-source").className = `source ${synthetic ? "showcase" : "sap"}`;
    investmentContext(project);
    el("technical-source").textContent = synthetic
      ? "Synthetic SAP-schema-compatible showcase payload. Governance context and seeded scenario assessments are separate from the SAP-shaped records. Not live SAP Sandbox or real DPE data."
      : "Real SAP Business Accelerator Hub Sandbox responses, not DPE production data. No showcase figures are added to this project.";
    el("connection-details").hidden = !!synthetic && !app.state?.sandboxRefreshError; el("showcase-project-payload").hidden = !synthetic;
    if (synthetic) el("raw-showcase-project").textContent = JSON.stringify(app.services.showcase.projectResponse(), null, 2);
    const context = el("investment-context"); context.replaceChildren();
    context.hidden = !!synthetic;
    pairs(context, [["Project dates", `${app.ui.formatDate(project.ProjectStartDate)} – ${app.ui.formatDate(project.ProjectEndDate)}`], ["Company", project.CompanyCode], ["Currency", project.ProjectCurrency]]);
    if (capturedContext) context.append(node("p", "Saved project context. Refresh evidence for current activity.", "hint"));
    const governance = portfolioState(project, records, storageAvailable), { active, latest } = governance;
    const timing = active ? rules.timing(active) : null;
    const status = el("detail-review-status"); status.replaceChildren(node("strong", governance.label, "detail-state")); status.dataset.state = governance.label.toLowerCase().replace(/ /g, "-");
    for (const line of [timing ? `${timing.status === "Within decision window" ? "Decision due" : timing.status + " · Due"} ${shortDate(timing.decisionTarget)}` : !latest && storageAvailable ? "No active review" : "",
      latest ? `Latest decision ${latest.decision.outcome} · ${shortDate(latest.decision.timestamp)}` : "",
      governance.nextReview ? `Next review ${shortDate(governance.nextReview)}` : ""]) if (line) status.append(node("span", line));
    el("start-review").disabled = !storageAvailable;
    el("start-review").textContent = active ? resumeLabel(active) : latest ? "Start New Review" : "Start Review";
    el("start-review").hidden = !active && latest?.decision.outcome === "Stop";
    el("view-last-decision").hidden = !storageAvailable || !latest;
    el("view-last-decision").textContent = !active && latest?.decision.outcome === "Stop" ? "View Decision" : "View Latest Decision";
    el("view-last-decision").className = !active && latest?.decision.outcome === "Stop" ? "" : "secondary";
    renderReviewHistory(el("investment-history-body"), completedReviews(records, project.ProjectUUID), onOpen, storageAvailable);
    overview(el("detail-lifecycle-overview"), "lifecycle", evidence, !!app.state?.elementController, false);
    overview(el("detail-financial-overview"), "gl", evidence, !!(app.state?.glController || app.state?.elementController), false);
    overview(el("detail-procurement-overview"), "po", evidence, !!(app.state?.poController || app.state?.elementController), false);
    const provenance = el("technical-evidence-context"); provenance.replaceChildren();
    for (const key of ["lifecycle", "gl", "po"]) {
      const part = node("section"); part.append(node("h4", key === "lifecycle" ? "Lifecycle provenance" : key === "gl" ? "Financial provenance" : "Procurement provenance"));
      for (const line of evidenceLines(key, evidence)) part.append(node("p", line)); provenance.append(part);
    }
    for (const [key, id] of [["lifecycle", "reload-lifecycle"], ["gl", "load-financial-evidence"], ["po", "load-po-evidence"]]) {
      el(id).hidden = !["error", "unavailable"].includes(evidence[key].status);
      el(id).textContent = "Retry";
    }
  }
  function assessment(record) {
    ownerRecord = record; populateOwners();
    el("review-basis").value = rules.normalizeBasis(record.reviewBasis);
    for (const [key, id] of Object.entries(assessmentIDs)) setChoice(id, record.assessment[key]);
    el("assessment-comments").value = record.assessment.comments; el("assessment-dependencies").value = record.assessment.keyRisks;
    overview(el("assessment-financial-evidence"), "gl", record.evidence, !!app.state?.glController, false);
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
    setChoice("decision-outcome", draft.outcome); el("decision-rationale").value = draft.rationale;
    ownerContext(el("decision-owner"), record.decisionOwnerSnapshot, record.decisionOwner);
    if (record.decisionOwnerId) el("decision-owner-help").textContent = "Decision Owner · selected in Assessment";
    else el("decision-owner-help").textContent = "Legacy saved owner text. Select a governed owner in Assessment before a new decision.";
    el("decision-action").value = draft.requiredAction; el("decision-action-owner").value = draft.actionOwner; el("decision-next-date").value = draft.nextReviewDate;
    const signals = rules.reviewSignals(record), counts = el("decision-context-counts");
    counts.replaceChildren(...[[signals.materialConcerns.length, "Material Concern"], [signals.attentionItems.length, "Emerging Concern"], [signals.evidenceGaps.length, "Evidence Gap"]]
      .map(([count, label]) => node("span", countLabel(count, label), "attention-count")));
    el("decision-rationale-help").hidden = signals.materialConcerns.length === 0;
    decisionRequirements();
    growTextareas();
  }
  function readDecision() {
    return { outcome: choiceValue("decision-outcome"), rationale: el("decision-rationale").value, owner: ownerRecord.decisionOwner,
      requiredAction: el("decision-action").value, actionOwner: el("decision-action-owner").value, nextReviewDate: choiceValue("decision-outcome") === "Stop" ? "" : el("decision-next-date").value };
  }
  function decisionRequirements() {
    const outcome = choiceValue("decision-outcome"); const required = rules.needsActions(outcome);
    const followUp = el("decision-follow-up");
    if (followUp.dataset.outcome !== outcome) followUp.open = required;
    followUp.dataset.outcome = outcome;
    el("decision-follow-up-title").textContent = required ? "Required follow-up action" : outcome ? "Optional follow-up action" : "Follow-up action";
    el("decision-requirements").textContent = required ? "Required action, action owner and next review date are required for this outcome." : outcome === "Stop"
      ? "Stop ends the continuation path; no next review is scheduled. Closure actions are optional. Rationale and decision owner remain required." : outcome
      ? "Action, action owner and next review date are optional for Continue. Rationale and decision owner remain required."
      : "Select a decision to see its follow-up requirements. Continue with Conditions, Modify and Pause require an action, action owner and next review date.";
    for (const id of ["decision-action", "decision-action-owner", "decision-next-date"]) {
      el(id).required = required;
      el(`${id}-required`).hidden = !required;
    }
    el("decision-next-review-field").hidden = outcome === "Stop";
    el("decision-next-date").disabled = outcome === "Stop";
    const date = el("decision-next-date").value;
    el("decision-next-date-help").textContent = rules.validDate(date)
      ? `Selected date: ${shortDate(date)}. Use the calendar to change it.`
      : "Use the calendar to choose a date, or enter it in your browser’s date format.";
  }
  function chrome(record, busy) {
    ownerRecord = record;
    el("current-review-project").textContent = `${record.project.Project} · ${record.project.ProjectDescription || "Continuation review"}`;
    el("current-review-project").append(sourceBadge(record.project));
    const basis = rules.normalizeBasis(record.reviewBasis);
    const trigger = el("review-trigger"); trigger.dataset.trigger = basis === "Material trigger" ? "material" : basis === "Scheduled stage-gate review" ? "scheduled" : "other";
    trigger.replaceChildren(node("strong", basis || "Select a Review Trigger"), node("span", `Decision due ${shortDate(rules.timing(record).decisionTarget)}`));
    if (app.services.showcase?.isShowcase(record.project)) trigger.append(node("p", app.services.showcase.governanceContext(record.project).reviewReason, "review-reason"));
    const readiness = rules.readiness(record);
    const eligible = app.services?.governanceDirectory?.eligible(record) ?? rules.ownerAssigned(record);
    if (eligible) el("governance-directory-status").textContent = "Prototype Governance Directory · Fictional roles, not SAP or real DPE employees.";
    el("proceed-decision").disabled = !readiness.ready || !eligible || busy;
    el("confirm-decision").disabled = busy;
    el("assessment-save-status").textContent = !el("storage-notice").hidden ? "Draft could not be saved." : "Draft saved";
  }
  function ownerContext(container, snapshot, legacy) {
    container.className = "accountability-context hint";
    container.replaceChildren(node("strong", snapshot?.name || legacy || "Not selected"), node("span", snapshot?.role || "Previously saved text owner"));
  }
  function signalMatrix(container, record) {
    container.append(node("h3", "Assessment at a Glance"));
    const matrix = node("div", undefined, "signal-matrix"); matrix.setAttribute("aria-label", "Six categorical reviewer assessments; no quantitative score");
    for (const [key, field] of Object.entries(rules.ASSESSMENTS)) {
      const value = record.assessment[key]; const tone = rules.classifyAssessment(key, value);
      const labels = { unassessed: "Not assessed", material: "Material Concern", gap: "Evidence Gap", emerging: "Emerging Concern", normal: "Normal / no concern identified" };
      const card = node("article", undefined, "assessment-signal"); card.dataset.dimension = key; card.dataset.tone = tone;
      card.append(node("h4", field.label), node("p", value || field.missing, "signal-value"), node("span", labels[tone], "semantic-label")); matrix.append(card);
    }
    container.append(matrix);
  }
  function executiveSnapshot(container, record) {
    const snapshot = node("section", undefined, "summary-assessment"); container.append(snapshot);
    const assessment = record.assessment;
    signalMatrix(snapshot, record);
    const signals = rules.reviewSignals(record);
    const hasSignals = signals.materialConcerns.length || signals.attentionItems.length || signals.evidenceGaps.length;
    const attention = node("section", undefined, hasSignals ? "management-attention" : ""); snapshot.append(attention);
    attention.append(node("h4", hasSignals ? "Management Attention Required" : "Management Attention"));
    attention.append(node("p", [countLabel(signals.materialConcerns.length, "material concern"), countLabel(signals.attentionItems.length, "emerging concern"), countLabel(signals.evidenceGaps.length, "evidence gap")].join(" · ")));
    for (const [title, items] of [["Material Concerns", signals.materialConcerns], ["Emerging Concerns", signals.attentionItems], ["Evidence Gaps", signals.evidenceGaps]]) {
      if (!items.length) continue;
      const group = node("section", undefined, "attention-group"); group.dataset.category = title.toLowerCase().replace(/ /g, "-"); const heading = node("h4", title);
      const list = node("ul"); for (const item of items) list.append(node("li", item)); group.append(heading, list); attention.append(group);
    }
    if (!hasSignals) attention.append(node("p", Object.entries(rules.ASSESSMENTS).every(([key, field]) => field.options.includes(assessment[key]) && assessment[key] !== field.missing)
      ? "No material concerns are identified from the completed reviewer assessment." : "Complete the reviewer assessment to identify management concerns."));
  }
  function reviewSummary(record) {
    const target = el("review-summary"); target.replaceChildren();
    const signals = rules.reviewSignals(record), control = rules.timing(record);
    const decisionOverview = el("summary-decision-overview");
    decisionOverview.dataset.tone = signals.materialConcerns.length ? "material" : signals.evidenceGaps.length ? "gap" : signals.attentionItems.length ? "emerging" : "neutral";
    decisionOverview.replaceChildren(node("p", signals.materialConcerns.length ? "Management Attention Required" : "Review Findings", "summary-context-label"),
      node("p", [countLabel(signals.materialConcerns.length, "material concern"), countLabel(signals.attentionItems.length, "emerging concern"), countLabel(signals.evidenceGaps.length, "evidence gap")].join(" · "), "summary-signal-counts"),
      node("p", `${control.status} · Decision due ${shortDate(control.decisionTarget)}`, "summary-deadline"),
      node("p", `Decision Owner: ${record.decisionOwnerSnapshot?.name || record.decisionOwner || "Not selected"}${record.decisionOwnerSnapshot?.role ? ` · ${record.decisionOwnerSnapshot.role}` : ""}`, "summary-owner"));
    executiveSnapshot(target, record);
    renderTiming(section(target, "Governance Timeline"), record);
    const evidence = section(target, "Evidence Reviewed");
    evidence.append(node("p", "Evidence availability describes retrieved records. Evidence Gap reflects the reviewer’s assessment of whether information is sufficient.", "hint"));
    for (const [key, title] of [["lifecycle", "Project Structure"], ["gl", "Financial Activity"], ["po", "Procurement Activity"]]) {
      const row = node("div", undefined, "evidence-row"); row.append(node("h4", title));
      const state = node("div"); overview(state, key, record.evidence, false, false);
      row.append(state); evidence.append(row);
    }
    const context = node("details", undefined, "optional-context"); context.append(node("summary", "Reviewer context"));
    const owner = node("div"); ownerContext(owner, record.decisionOwnerSnapshot, record.decisionOwner); context.append(node("h4", "Decision Owner"), owner);
    if (record.assessment.comments || record.assessment.keyRisks) pairs(context, [["Reviewer comments", record.assessment.comments], ["Key risks / dependencies", record.assessment.keyRisks]]);
    evidence.append(context);
    evidence.append(action(app.services.showcase?.isShowcase(record.project) ? "View Technical Details" : "View SAP Technical Details", () => technicalAction()));
  }
  function confirmation(record) {
    const target = el("confirmation-record"); target.replaceChildren(); const decision = record.decision;
    el("confirmation-outcome").textContent = decision.outcome;
    const hero = node("header", undefined, "decision-record-context");
    hero.append(node("h3", record.project.Project), node("p", record.project.ProjectDescription || "", "record-description"));
    hero.append(sourceBadge(record.project));
    if (app.services.showcase?.isHistorical(record)) hero.append(node("p", "Synthetic historical showcase decision", "hint"));
    const accountability = node("div"); ownerContext(accountability, decision.ownerSnapshot, decision.owner);
    hero.append(accountability, node("p", dateTime(decision.timestamp), "record-date")); target.append(hero);
    section(target, "Rationale").append(node("p", decision.rationale));
    if (decision.requiredAction || decision.actionOwner || decision.nextReviewDate) {
      const followUp = section(target, "Follow-up"); const fields = node("div", undefined, "record-actions");
      for (const [title, value] of [["Required Action", decision.requiredAction], ["Action Owner", decision.actionOwner], ["Next Review", decision.nextReviewDate]]) {
        if (!value) continue;
        const field = node("section"); field.append(node("h4", title), node("p", title === "Next Review" ? shortDate(value) : value)); fields.append(field);
      }
      followUp.append(fields);
    }
    const metadata = node("details"); metadata.append(node("summary", "Record context & timing")); target.append(metadata);
    if (!decision.ownerId) metadata.append(node("p", "Previously saved text owner — not verified against the prototype directory."));
    pairs(metadata, [["Record ID (SYSTEM CALCULATED)", record.id], ["Project", record.project.Project], ["ProjectUUID", record.project.ProjectUUID], ["Review Trigger (REVIEWER INPUT)", rules.normalizeBasis(record.reviewBasis) || "Not selected"],
      ["Decision (REVIEWER INPUT)", decision.outcome], ["Rationale (REVIEWER INPUT)", decision.rationale], ["Decision owner (REVIEWER INPUT)", decision.owner], ["Decision timestamp (SYSTEM CALCULATED)", dateTime(decision.timestamp)],
      ["Required action (REVIEWER INPUT)", decision.requiredAction], ["Action owner (REVIEWER INPUT)", decision.actionOwner], ["Next review date (REVIEWER INPUT)", decision.nextReviewDate || "Not specified"],
      ["Review opened (SYSTEM CALCULATED)", dateTime(record.reviewOpenedAt)], ["14-day target (SYSTEM CALCULATED)", dateTime(decision.decisionTarget)], ["30-day threshold (SYSTEM CALCULATED)", dateTime(decision.escalationThreshold)]]);
    const snapshot = node("details"); snapshot.append(node("summary", app.services.showcase?.isShowcase(record.project) ? "Saved assessment / synthetic showcase evidence" : "Saved assessment / SAP Sandbox evidence")); target.append(snapshot);
    const assessment = section(snapshot, "Assessment Snapshot"); pairs(assessment, [...Object.entries(rules.ASSESSMENTS).map(([key, field]) => [field.label, decision.assessmentSnapshot[key]]), ["Reviewer comments", decision.assessmentSnapshot.comments], ["Key risks / dependencies", decision.assessmentSnapshot.keyRisks]]);
    renderEvidence(snapshot, decision.evidenceSnapshot, record.project);
  }
  function showView(view, dashboardFilter = "active") {
    if (view === "dashboard") { selectedDashboardFilter = dashboardFilter === "recorded" ? "recorded" : "active"; renderDashboardQueue(); }
    if (view !== "dashboard") dismissMetricHelp();
    for (const name of views) el(`${name}-view`).hidden = name !== view;
    el("review-chrome").hidden = !["assessment", "summary", "decision"].includes(view);
    if (view === "detail") el("investment-technical-details").open = false;
    el("page-title").textContent = titles[view]; el("page-title").focus();
    el("page-eyebrow").hidden = view === "dashboard";
    el("dashboard-portfolio-count").hidden = view !== "dashboard";
    for (const name of ["dashboard", "investments"]) {
      const active = view === name || name === "investments" && ["detail", "assessment", "summary", "decision"].includes(view) || name === "dashboard" && view === "confirmation";
      if (active) el(`nav-${name}`).setAttribute("aria-current", "page"); else el(`nav-${name}`).removeAttribute("aria-current");
    }
    const step = ["assessment", "summary", "decision"].indexOf(view);
    [...el("review-steps").children].forEach((item, index) => {
      item.dataset.state = index < step ? "complete" : index === step ? "current" : "future";
      if (index === step) item.setAttribute("aria-current", "step"); else item.removeAttribute("aria-current");
      if (item.children[0]) { item.children[0].textContent = index < step ? "✓" : String(index + 1); item.children[0].setAttribute("aria-hidden", "true"); }
      item.setAttribute("aria-label", `${index + 1} ${["Assessment", "Summary", "Decision"][index]}${index < step ? ", completed" : index === step ? ", current step" : ", upcoming"}`);
    });
    el("workflow-message").hidden = true;
    el("decision-incomplete").hidden = true;
    document.querySelector("main").dataset.view = view;
    el("load-projects").hidden = view !== "investments";
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function growTextareas() { for (const input of document.querySelectorAll("textarea")) { if (input.offsetParent !== null) { input.style.height = "auto"; input.style.height = Math.max(110, input.scrollHeight + 2) + "px"; } } }
  let technicalAction = () => {};
  const metricHelpControls = [];
  function dismissMetricHelp() { for (const control of metricHelpControls) control.dismiss(); }
  function metricHelp(filter) {
    const wrapper = node("span", undefined, "metric-help-wrap"), trigger = node("button", "?", "metric-help"), text = node("span", lensHelp[filter.key], "metric-tooltip");
    trigger.id = `metric-help-${filter.key}`; trigger.type = "button"; text.id = `metric-tip-${filter.key}`; text.hidden = true; text.setAttribute("role", "tooltip");
    trigger.setAttribute("aria-label", `About ${filter.label}`); trigger.setAttribute("aria-describedby", text.id); trigger.setAttribute("aria-controls", text.id);
    let hovered = false, focused = false, pinned = false, dismissed = false;
    const position = () => {
      if (!trigger.getBoundingClientRect || text.hidden) return;
      const width = document.documentElement?.clientWidth || window.innerWidth, height = document.documentElement?.clientHeight || window.innerHeight;
      text.style.maxWidth = `${Math.max(0, width - 24)}px`;
      const rect = trigger.getBoundingClientRect(), tip = text.getBoundingClientRect();
      text.style.left = `${Math.max(12, Math.min(rect.left - 20, width - tip.width - 12))}px`;
      text.style.top = `${Math.max(12, rect.bottom + tip.height > height - 12 ? rect.top - tip.height : rect.bottom)}px`;
    };
    const update = () => { const open = !dismissed && (hovered || focused || pinned); text.hidden = !open; trigger.setAttribute("aria-expanded", String(open)); position(); };
    const control = {
      dismiss() { hovered = false; focused = false; pinned = false; dismissed = true; update(); }, position,
      contains(target) { return wrapper.contains?.(target) || false; },
      place() {
        const label = wrapper.parentElement?.children[0]?.children[0];
        if (label && Number.isFinite(label.offsetWidth)) {
          // Keep the separate help button beside the label's reserved 32px space, even after wrapping.
          wrapper.style.left = `${label.offsetLeft + label.offsetWidth - 32 + 8}px`;
          wrapper.style.top = `${label.offsetTop + (label.offsetHeight - 24) / 2}px`;
          wrapper.style.bottom = "auto";
        }
        position();
      }
    };
    const activate = () => { for (const other of metricHelpControls) if (other !== control) other.dismiss(); dismissed = false; };
    metricHelpControls.push(control);
    wrapper.addEventListener("mouseenter", () => { activate(); hovered = true; update(); });
    wrapper.addEventListener("mouseleave", () => { hovered = false; update(); });
    trigger.addEventListener("focus", () => { activate(); focused = true; update(); });
    trigger.addEventListener("blur", () => { focused = false; pinned = false; update(); });
    trigger.addEventListener("click", () => { if (!pinned) activate(); pinned = !pinned; dismissed = !pinned; update(); });
    document.addEventListener("keydown", event => { if (event.key === "Escape" && !text.hidden) { dismissed = true; pinned = false; update(); event.preventDefault(); } });
    wrapper.append(trigger, text); update(); return wrapper;
  }
  function bind(actions) {
    technicalAction = actions.technicalDetails || (() => {});
    el("retry-projects").addEventListener("click", actions.retryProjects);
    el("project-diagnostics").addEventListener("click", technicalAction);
    el("reset-showcase").addEventListener("click", actions.resetShowcase);
    window.addEventListener?.("resize", () => metricHelpControls.forEach(control => control.place()));
    window.addEventListener?.("scroll", () => metricHelpControls.forEach(control => control.position()), true);
    document.addEventListener("pointerdown", event => { for (const control of metricHelpControls) if (!control.contains(event.target)) control.dismiss(); });
    for (const [key, id] of Object.entries(assessmentIDs)) buildChoices(id, rules.ASSESSMENTS[key].options);
    buildChoices("decision-outcome", rules.OUTCOMES);
    for (const view of ["dashboard", "investments"]) el(`nav-${view}`).addEventListener("click", () => actions.navigate(view));
    el("start-review").addEventListener("click", actions.startReview);
    el("view-last-decision").addEventListener("click", actions.lastDecision);
    el("reload-lifecycle").addEventListener("click", actions.reloadLifecycle);
    el("load-review-evidence").addEventListener("click", actions.loadEvidence);
    for (const id of ["review-back-investment", "return-investment"]) el(id).addEventListener("click", actions.returnInvestment);
    el("back-dashboard").addEventListener("click", () => actions.backDashboard ? actions.backDashboard() : actions.navigate("dashboard"));
    el("assessment-form").addEventListener("submit", event => { event.preventDefault(); actions.summary(); });
    for (const event of ["input", "change"]) el("assessment-form").addEventListener(event, () => { el("workflow-message").hidden = true; actions.saveDraft(); });
    el("back-assessment").addEventListener("click", () => actions.reviewStep("assessment"));
    el("proceed-decision").addEventListener("click", () => actions.reviewStep("decision"));
    el("back-summary").addEventListener("click", () => actions.reviewStep("summary"));
    for (const event of ["input", "change"]) el("decision-form").addEventListener(event, () => { el("decision-incomplete").hidden = true; decisionRequirements(); actions.saveDraft(); });
    el("decision-form").addEventListener("submit", event => { event.preventDefault(); actions.confirm(); });
    options(el("review-basis"), rules.BASIS);
    for (const input of document.querySelectorAll("textarea")) input.addEventListener("input", growTextareas);
  }
  app.governanceUI = { bind, showView, details, renderDashboard, portfolioState, completedReviews, resumeLabel, assessment, readAssessment, decision, readDecision, chrome, reviewSummary, confirmation, evidenceStatus,
    setDirectory(people, error = "") { directoryPeople = people; directoryError = error; populateOwners(); },
    storageNotice(text) { el("storage-notice").hidden = !text; el("storage-notice").textContent = text; el("assessment-save-status").textContent = text ? "Draft could not be saved." : "Draft saved"; },
    error(text) { el("workflow-message").hidden = false; el("workflow-message").textContent = text; },
    incompleteAssessment(missing) { el("workflow-message").hidden = false; el("workflow-message").textContent = `Complete: ${missing.join(", ")}.`; el("workflow-message").focus(); },
    incompleteDecision(errors) { el("decision-incomplete").hidden = false; el("decision-incomplete").textContent = errors.join(" ").replace(/Review basis/g, "Review Trigger"); },
    openTechnical() { el("investment-technical-details").open = true; el("investment-technical-details").scrollIntoView({ block: "start" }); },
    financialSnapshot(record) { overview(el("assessment-financial-evidence"), "gl", record.evidence, !!app.state?.glController, false); },
    evidenceButton(enabled) { el("load-review-evidence").disabled = !enabled; }
  };
})();
