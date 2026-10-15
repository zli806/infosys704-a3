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
  const shortDate = value => value && !Number.isNaN(Date.parse(value)) ? new Intl.DateTimeFormat("en-NZ", { year: "numeric", month: "short", day: "2-digit", timeZone: "UTC" }).format(new Date(value)) : "—";
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
    const grid = node("div", undefined, "investment-metrics");
    const variance = context.forecastVariance === null ? "Not validated" : `${compactAmount(context.forecastVariance, true)} (${Number(context.variancePercent) > 0 ? "+" : ""}${context.variancePercent}%)`;
    for (const [label, amount, display] of [["Approved Investment", context.approvedInvestment], ["Posted Financial Activity", context.postedFinancialActivity],
      [context.historical ? "Forecast before Stop" : "Forecast at Completion", context.forecastAtCompletion], ["Forecast Variance", context.forecastVariance, variance],
      [context.historical ? "Remaining Forecast Investment before Stop" : "Remaining Forecast Investment", context.remainingForecastInvestment],
      ["PO-linked Procurement Activity", context.procurementActivity], ["Not-finally-invoiced PO-linked amount", context.notFinallyInvoiced]]) {
      const metric = node("div"); const value = node("strong", display || compactAmount(amount));
      value.title = amount === null ? "Not validated; no numeric forecast inferred" : `AUD ${amount}`;
      metric.append(node("p", label), value); grid.append(metric);
    }
    const dates = node("p", `Planned completion ${shortDate(context.plannedCompletion)} · Forecast completion ${context.forecastCompletion ? shortDate(context.forecastCompletion) : "Not validated"}`, "hint");
    container.append(grid, dates, node("p", context.reviewReason, "context-reason"));
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
        if (key === "gl" && item.linkedRecordCount > 0) container.append(node("small", "Recorded activity, not complete project cost.", "evidence-note"));
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
  const signalCategories = [["material", "Material Concerns"], ["emerging", "Emerging Concerns"], ["gap", "Evidence Gaps"]];
  let selectedAttentionCategory = null;
  let chartButtons = [];
  function resumeLabel(record) { return rules.readiness(record).ready ? "Review Summary & Decide" : "Continue Assessment"; }
  function timingExplanation(record) {
    const timing = rules.timing(record);
    return `${timing.status} · Decision due ${shortDate(timing.decisionTarget)} · ${timing.daysOverdue} days overdue${timing.status === "Escalation threshold reached" ? ` · Escalation threshold ${shortDate(timing.escalationThreshold)}` : ""}`;
  }
  function appendAssessmentFindings(container, entries) {
    for (const [category, label] of signalCategories) {
      const matching = entries.filter(entry => entry.category === category); if (!matching.length) continue;
      const group = node("section", undefined, "attention-group"); group.dataset.category = label.toLowerCase().replace(/ /g, "-");
      const list = node("ul"); for (const entry of matching) list.append(node("li", `${entry.dimension} — ${entry.value}`));
      group.append(node("h4", label), list); container.append(group);
    }
  }
  function whyFlagged(review, expanded) {
    const details = node("details", undefined, "flag-explanation"); details.dataset.reviewId = review.id; details.open = expanded;
    details.append(node("summary", "Why is this flagged?"));
    appendAssessmentFindings(details, rules.signalBreakdown(review));
    if (rules.timing(review).status !== "Within decision window") details.append(node("h4", "Timing requires attention"), node("p", timingExplanation(review), "hint"));
    return details;
  }
  function renderAttentionBreakdown(records, storageAvailable) {
    const target = el("attention-breakdown"); target.replaceChildren();
    const category = selectedAttentionCategory;
    const groups = storageAvailable && category ? records.filter(record => record.status === "in_progress").map(review => ({ review,
      entries: category === "overdue" ? [] : rules.signalBreakdown(review).filter(entry => entry.category === category) }))
      .filter(group => category === "overdue" ? rules.timing(group.review).status !== "Within decision window" : group.entries.length) : [];
    if (!groups.length) selectedAttentionCategory = null;
    target.hidden = !groups.length;
    for (const button of chartButtons) button.setAttribute("aria-expanded", String(button.dataset.category === selectedAttentionCategory));
    if (!groups.length) return;
    const label = category === "overdue" ? "Overdue Reviews" : signalCategories.find(([key]) => key === category)[1];
    target.append(node("h4", label));
    const count = groups.reduce((sum, group) => sum + group.entries.length, 0);
    target.append(node("p", category === "overdue" ? `${countLabel(groups.length, "overdue open review")}`
      : `${countLabel(count, "assessment signal")} across ${countLabel(groups.length, "open review")}`, "hint"));
    for (const { review, entries } of groups) {
      const group = node("section", undefined, "drilldown-review"); group.append(node("h5", review.project.ProjectDescription || review.project.Project));
      if (category === "overdue") group.append(node("p", timingExplanation(review), "hint"));
      else { const list = node("ul"); for (const entry of entries) list.append(node("li", `${entry.dimension} — ${entry.value}`)); group.append(list); }
      target.append(group);
    }
    target.append(action("Close breakdown", () => {
      const previous = chartButtons.find(button => button.dataset.category === selectedAttentionCategory);
      selectedAttentionCategory = null; renderAttentionBreakdown(records, storageAvailable); previous?.focus();
    }));
  }
  function renderDashboard(records, count, onOpen, storageAvailable = true) {
    const result = rules.dashboard(records, count);
    const attention = el("dashboard-attention");
    const expanded = new Set(Array.from(attention.querySelectorAll("details[open]"), details => details.dataset.reviewId));
    attention.replaceChildren();
    if (!storageAvailable) attention.append(node("p", "Review storage unavailable; review signals cannot be refreshed."));
    else {
      const items = rules.needsAttention(records);
      if (!items.length) attention.append(node("p", "No open reviews currently flagged. Unfinished assessments may still need your input."));
      for (const { review, signals, timing } of items) {
        const row = node("article", undefined, "attention-item"); row.dataset.timing = timing.status;
        const context = node("div", undefined, "attention-item-context");
        const identity = node("p", review.project.Project, "hint"); identity.append(sourceBadge(review.project));
        context.append(node("h4", review.project.ProjectDescription || review.project.Project), identity, node("p", rules.normalizeBasis(review.reviewBasis) || "Review Trigger not selected", "attention-trigger"));
        const counts = node("div", undefined, "attention-counts");
        for (const [count, label, tone] of [[signals.materialConcerns.length, "material concern", "material"], [signals.attentionItems.length, "emerging concern", "attention"], [signals.evidenceGaps.length, "evidence gap", "gap"]]) {
          if (!count) continue;
          const indicator = node("span", countLabel(count, label), "attention-count"); indicator.dataset.tone = tone; counts.append(indicator);
        }
        if (!counts.children.length) counts.append(node("span", "Decision timing requires attention", "hint"));
        const timingText = node("p", timing.status === "Within decision window" ? `Decision due in ${timing.daysRemaining} days · ${shortDate(timing.decisionTarget)}` : `${timing.status} · ${timing.daysOverdue} days overdue`, "attention-timing");
        const button = action(resumeLabel(review), () => onOpen(review.id)); button.className = "attention-action";
        row.append(context, counts, timingText, whyFlagged(review, expanded.has(review.id)), button); attention.append(row);
      }
    }
    const cards = el("dashboard-cards"); cards.replaceChildren();
    const openSignals = result.open.map(review => rules.reviewSignals(review));
    const materialCount = openSignals.reduce((sum, signals) => sum + signals.materialConcerns.length, 0);
    const gapCount = openSignals.reduce((sum, signals) => sum + signals.evidenceGaps.length, 0);
    for (const [label, value] of [["Open Reviews", result.open.length], ["Material Concerns", materialCount], ["Evidence Gaps", gapCount], ["Decisions Recorded", result.decisions.length]]) {
      const card = node("div", undefined, "metric status-card"); card.append(node("p", label), node("strong", storageAvailable ? value : "Unavailable")); cards.append(card);
    }
    cards.append(node("p", `${result.projectCount} investments available`, "session-context"));
    const profile = el("attention-profile"); profile.replaceChildren();
    chartButtons = [];
    const values = [["material", "Material concerns", materialCount], ["emerging", "Emerging concerns", openSignals.reduce((sum, signals) => sum + signals.attentionItems.length, 0)], ["gap", "Evidence gaps", gapCount], ["overdue", "Overdue reviews", result.overdue]];
    if (!storageAvailable) profile.append(node("p", "Review storage unavailable."));
    else if (!values.some(([, , value]) => value)) profile.append(node("p", "No active review signals yet."));
    else {
      const chart = node("ul", undefined, "attention-chart"); chart.setAttribute("aria-label", "Governance Attention Profile — counts across open reviews");
      const max = Math.max(...values.map(([, , value]) => value));
      for (const [category, label, value] of values) {
        const item = node("li"), row = node("button", undefined, "chart-row chart-select"); row.type = "button"; row.dataset.category = category; row.disabled = value === 0;
        row.setAttribute("aria-controls", "attention-breakdown"); row.setAttribute("aria-label", `${label}: ${value}. Inspect breakdown`);
        row.addEventListener("click", () => { selectedAttentionCategory = selectedAttentionCategory === category ? null : category; renderAttentionBreakdown(records, storageAvailable); });
        chartButtons.push(row);
        const track = node("span", undefined, "chart-track"); track.setAttribute("aria-hidden", "true");
        const bar = node("span", undefined, "chart-bar"); bar.style.width = `${value / max * 100}%`; track.append(bar);
        row.append(node("span", label), track, node("strong", value)); item.append(row); chart.append(item);
      }
      profile.append(chart);
    }
    renderAttentionBreakdown(records, storageAvailable);
    const open = el("dashboard-open-reviews"); open.replaceChildren();
    const recent = el("dashboard-decisions"); recent.replaceChildren();
    if (!storageAvailable) { open.append(node("p", "Review storage unavailable.")); recent.append(node("p", "Decision records could not be read.")); return; }
    const flagged = new Set(rules.needsAttention(records).map(item => item.review.id));
    const other = result.open.filter(record => !flagged.has(record.id));
    if (!other.length) open.append(node("p", "No other open reviews."));
    for (const record of other) {
      const row = node("div", undefined, "review-item"); row.append(node("p", `${record.project.Project} · ${rules.timing(record).status}`), action(resumeLabel(record), () => onOpen(record.id))); open.append(row);
    }
    if (!result.decisions.length) recent.append(node("p", "No decisions recorded yet."));
    for (const record of result.decisions.slice(0, 5)) {
      const row = node("div", undefined, "review-item"); const identity = node("div");
      identity.append(node("strong", record.project.ProjectDescription || record.project.Project), sourceBadge(record.project), node("p", `${record.project.Project} · ${record.decision.outcome} · ${shortDate(record.decision.timestamp)}`));
      row.append(identity, action("View Decision", () => onOpen(record.id))); recent.append(row);
    }
  }
  function renderReviews(records, onOpen, storageAvailable = true) {
    const body = el("reviews-body"); body.replaceChildren();
    if (!records.length || !storageAvailable) { const row = node("tr"); const cell = node("td", storageAvailable ? "No reviews saved yet." : "Review storage unavailable.", "empty"); cell.colSpan = 6; row.append(cell); body.append(row); }
    if (!storageAvailable) return;
    for (const record of [...records].sort((a, b) => b.reviewOpenedAt.localeCompare(a.reviewOpenedAt))) {
      const control = rules.timing(record); const row = node("tr");
      for (const value of [record.project.Project, rules.normalizeBasis(record.reviewBasis) || "Not selected", dateTime(record.reviewOpenedAt), dateTime(control.decisionTarget), record.status === "decision_recorded" ? "Decision recorded" : control.status === "Within decision window" ? "In progress" : control.status]) row.append(node("td", value));
      row.children[0].append(sourceBadge(record.project));
      const cell = node("td"); cell.append(action(record.status === "decision_recorded" ? "View Decision" : resumeLabel(record), () => onOpen(record.id))); row.append(cell); body.append(row);
    }
  }
  function details(project, evidence, records, capturedContext = false, storageAvailable = true) {
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
    const active = rules.activeReview(records, project.ProjectUUID), timing = active ? rules.timing(active) : null;
    const recorded = records.some(record => record.project.ProjectUUID === project.ProjectUUID && record.status === "decision_recorded");
    const ready = active && rules.readiness(active).ready;
    el("detail-review-status").textContent = !storageAvailable ? "Review storage unavailable" : timing
      ? `${ready ? "Assessment complete · Ready for governance decision" : "Review in progress"} · ${timing.status === "Within decision window" ? "Decision due" : timing.status + " · Due"} ${shortDate(timing.decisionTarget)}` : rules.projectStatus(records, project.ProjectUUID);
    el("start-review").disabled = !storageAvailable;
    el("start-review").textContent = active ? resumeLabel(active) : "Start Review";
    el("start-review").hidden = !active && recorded;
    el("view-last-decision").hidden = !storageAvailable || !recorded;
    el("view-last-decision").className = active ? "secondary" : "";
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
    executiveSnapshot(target, record);
    renderTiming(section(target, "Governance Timeline"), record);
    const evidence = section(target, "Evidence Reviewed");
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
        const field = node("section"); field.append(node("h4", title), node("p", value)); fields.append(field);
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
  function showView(view) {
    for (const name of views) el(`${name}-view`).hidden = name !== view;
    el("review-chrome").hidden = !["assessment", "summary", "decision"].includes(view);
    if (view === "detail") el("investment-technical-details").open = false;
    el("page-title").textContent = titles[view]; el("page-title").focus();
    for (const name of ["dashboard", "investments", "reviews"]) {
      const active = view === name || name === "investments" && view === "detail" || name === "reviews" && ["assessment", "summary", "decision", "confirmation"].includes(view);
      if (active) el(`nav-${name}`).setAttribute("aria-current", "page"); else el(`nav-${name}`).removeAttribute("aria-current");
    }
    const step = ["assessment", "summary", "decision"].indexOf(view);
    [...el("review-steps").children].forEach((item, index) => { if (index === step) item.setAttribute("aria-current", "step"); else item.removeAttribute("aria-current"); });
    el("workflow-message").hidden = true;
    el("decision-incomplete").hidden = true;
    document.querySelector("main").dataset.view = view;
    el("load-projects").hidden = !["dashboard", "investments"].includes(view);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function growTextareas() { for (const input of document.querySelectorAll("textarea")) { if (input.offsetParent !== null) { input.style.height = "auto"; input.style.height = Math.max(110, input.scrollHeight + 2) + "px"; } } }
  let technicalAction = () => {};
  function bind(actions) {
    technicalAction = actions.technicalDetails || (() => {});
    el("retry-projects").addEventListener("click", actions.retryProjects);
    el("project-diagnostics").addEventListener("click", technicalAction);
    el("reset-showcase").addEventListener("click", actions.resetShowcase);
    for (const [key, id] of Object.entries(assessmentIDs)) buildChoices(id, rules.ASSESSMENTS[key].options);
    buildChoices("decision-outcome", rules.OUTCOMES);
    for (const view of ["dashboard", "investments", "reviews"]) el(`nav-${view}`).addEventListener("click", () => actions.navigate(view));
    el("dashboard-view-investments").addEventListener("click", () => actions.navigate("investments"));
    el("start-review").addEventListener("click", actions.startReview);
    el("view-last-decision").addEventListener("click", actions.lastDecision);
    el("reload-lifecycle").addEventListener("click", actions.reloadLifecycle);
    el("load-review-evidence").addEventListener("click", actions.loadEvidence);
    for (const id of ["review-back-investment", "return-investment"]) el(id).addEventListener("click", actions.returnInvestment);
    el("back-dashboard").addEventListener("click", () => actions.navigate("dashboard"));
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
  app.governanceUI = { bind, showView, details, renderDashboard, renderReviews, assessment, readAssessment, decision, readDecision, chrome, reviewSummary, confirmation, evidenceStatus,
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
