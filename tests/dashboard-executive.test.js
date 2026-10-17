const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { workspace } = require('./helpers/workspace');
const descendants = el => [el, ...el.children.flatMap(descendants)];
const byClass = (el, name) => descendants(el).filter(child => (child.className || '').split(' ').includes(name));
const pulse = w => byClass(w.elements.get('dashboard-cards'), 'pulse-metric').map(metric => metric.children[1].textContent);
const rows = w => byClass(w.elements.get('dashboard-attention'), 'decision-queue-row');
const openedAgo = days => new Date(Date.now() - days * 86400000).toISOString();
function record(rules, id, days, assessment = {}) {
  return { id, status: 'in_progress', project: { Project: id, ProjectUUID: `unit-${id}`, ProjectDescription: `Investment ${id}` },
    reviewOpenedAt: openedAgo(days), reviewBasis: rules.BASIS[0], assessment: { ...rules.defaultAssessment(), ...assessment }, evidence: rules.emptyEvidence() };
}

test('showcase pulse counts one material investment, not its three adverse signals; monitored count is dynamic', () => {
  const w = workspace(), records = w.services.reviewStore.seedShowcase();
  w.governanceUI.renderDashboard(records, 12, () => {});
  assert.deepEqual(pulse(w), ['3', String(w.reviewRules.dashboard(records, 12).overdue), '1', '1']);
  assert.equal(w.elements.get('dashboard-portfolio-count').textContent, '12 investments monitored');
  const hero = rows(w).find(row => row.dataset.reviewId === 'SHOWCASE-ODP-REVIEW');
  assert.deepEqual(byClass(hero, 'queue-signal').map(signal => signal.textContent), ['3 Material', '2 Emerging']);
  assert.equal(rows(w).length, 3); assert(!w.elements.get('dashboard-attention').textContent.includes('Legacy Reporting Consolidation'));
});

test('pulse independently counts active records, overdue reviews, distinct material identities and explicit evidence gaps', () => {
  const w = workspace(), r = w.reviewRules;
  const material = record(r, 'material', 20, { risk: 'High', costPosition: 'Material variance', deliveryPerformance: 'Off track' });
  const another = { ...record(r, 'another-record', 2, { risk: 'High' }), project: material.project };
  const gap = record(r, 'gap', 35, { costPosition: 'Insufficient information' });
  const unassessed = record(r, 'unassessed', 0);
  const completed = { ...material, id: 'closed', status: 'decision_recorded', decision: { outcome: 'Modify', timestamp: new Date().toISOString() } };
  const records = [material, another, gap, unassessed, completed], before = JSON.stringify(records);
  w.governanceUI.renderDashboard(records, 8, () => {});
  assert.deepEqual(pulse(w), ['4', '2', '1', '1']); assert.equal(JSON.stringify(records), before);
  assert.equal(rows(w).length, 4); assert(rows(w).some(row => row.dataset.reviewId === 'unassessed'));
});

test('queue includes unflagged open reviews and sorts escalation, overdue, due date, then stable project code and record ID', () => {
  const w = workspace(), r = w.reviewRules;
  const ordinary = record(r, 'ordinary', 0), soon = record(r, 'soon', 5), overdue = record(r, 'overdue', 20), escalated = record(r, 'escalated', 35);
  const tieA = record(r, 'tie-a', 5), tieB = record(r, 'tie-b', 5); tieA.reviewOpenedAt = soon.reviewOpenedAt; tieB.reviewOpenedAt = soon.reviewOpenedAt;
  tieA.project.Project = 'A'; tieB.project.Project = 'A'; soon.project.Project = 'B';
  const records = [ordinary, soon, tieB, overdue, tieA, escalated]; let selected;
  w.governanceUI.renderDashboard(records, 6, id => { selected = id; });
  assert.deepEqual(rows(w).map(row => row.dataset.reviewId), ['escalated', 'overdue', 'tie-a', 'tie-b', 'soon', 'ordinary']);
  w.governanceUI.renderDashboard([...records].reverse(), 6, id => { selected = id; });
  assert.deepEqual(rows(w).map(row => row.dataset.reviewId), ['escalated', 'overdue', 'tie-a', 'tie-b', 'soon', 'ordinary']);
  const fresh = rows(w).at(-1); assert.equal(byClass(fresh, 'flag-explanation').length, 0);
  assert(byClass(fresh, 'queue-signals')[0].textContent.includes('Assessment in progress'));
  byClass(fresh, 'queue-action')[0].children[1].events.click[0](); assert.equal(selected, ordinary.id);
});

test('fully assessed normal review is still actionable without fabricating a flagged state or final decision', () => {
  const w = workspace(), s = w.services.showcase, store = w.services.reviewStore;
  store.seedShowcase(); let normal = store.start(s.projects()[3], s.evidence(s.projects()[3]));
  normal = store.update(normal.id, { reviewBasis: w.reviewRules.BASIS[0], decisionOwnerId: 'GOV-003', assessment: { strategicAlignment: 'High', expectedBenefits: 'Yes', deliveryPerformance: 'On track', costPosition: 'Within expectations', risk: 'Low', futureEconomicValue: 'Positive' } });
  w.governanceUI.renderDashboard([normal], 5, () => {});
  assert.equal(rows(w).length, 1); assert.equal(byClass(rows(w)[0], 'flag-explanation').length, 0);
  assert(rows(w)[0].textContent.includes('No concerns identified')); assert.equal(byClass(rows(w)[0], 'queue-action')[0].children[1].textContent, 'Review & Decide');
  assert.equal(store.get(normal.id).decision, null);
});

test('empty and unavailable queues/decisions are truthful, with no fabricated counts or stale rows', () => {
  const w = workspace(); w.governanceUI.renderDashboard([], 0, () => {});
  assert.deepEqual(pulse(w), ['0', '0', '0', '0']); assert.match(w.elements.get('dashboard-attention').textContent, /No active reviews/);
  assert.match(w.elements.get('dashboard-decisions').textContent, /No decisions recorded/);
  const records = w.services.reviewStore.seedShowcase(); w.governanceUI.renderDashboard(records, 5, () => {}); assert.equal(rows(w).length, 3);
  w.governanceUI.renderDashboard(records, 5, () => {}, false); assert.deepEqual(pulse(w), ['Unavailable', 'Unavailable', 'Unavailable', 'Unavailable']); assert.equal(rows(w).length, 0);
  assert.match(w.elements.get('dashboard-attention').textContent, /unavailable/); assert.match(w.elements.get('dashboard-decisions').textContent, /could not be read/);
});

test('question help opens on hover and focus, stays hoverable, is dismissible with Escape, supports touch and closes on navigation', () => {
  const w = workspace(), wrapper = w.elements.get('queue-help'), trigger = w.elements.get('queue-help-trigger'), text = w.elements.get('signals-help');
  assert.equal(text.hidden, true);
  wrapper.events.mouseenter[0](); assert.equal(text.hidden, false); assert.equal(trigger.getAttribute('aria-expanded'), 'true');
  wrapper.events.mouseleave[0](); assert.equal(text.hidden, true);
  trigger.events.focus[0](); assert.equal(text.hidden, false); wrapper.events.mouseleave[0](); assert.equal(text.hidden, false);
  let dismissed = false; w.document.events.keydown[0]({ key: 'Escape', preventDefault() { dismissed = true; } });
  assert(dismissed); assert.equal(text.hidden, true); trigger.events.blur[0]();
  // A real pointer/touch click can focus the button before click fires; it must not immediately close the help.
  trigger.events.focus[0](); trigger.events.click[0](); assert.equal(text.hidden, false); trigger.events.click[0](); assert.equal(text.hidden, true);
  wrapper.events.mouseenter[0](); assert.equal(text.hidden, false); w.governanceUI.showView('reviews'); assert.equal(text.hidden, true);
  w.governanceUI.showView('investments'); assert.equal(w.elements.get('page-title').textContent, 'Portfolio'); assert.equal(w.elements.get('nav-investments').getAttribute('aria-current'), 'page'); assert.equal(w.elements.get('dashboard-portfolio-count').hidden, true);
  w.governanceUI.showView('dashboard'); assert.equal(w.elements.get('page-title').textContent, 'Portfolio Governance'); assert.equal(w.elements.get('dashboard-portfolio-count').hidden, false);
});

test('recent recorded outcome/date/action uses the normal callback without duplicating a portfolio CTA', () => {
  const w = workspace(), records = w.services.reviewStore.seedShowcase(); let selected;
  w.governanceUI.renderDashboard(records, 5, id => { selected = id; });
  const recent = byClass(w.elements.get('dashboard-decisions'), 'recent-decision-row'); assert.equal(recent.length, 1);
  assert(recent[0].textContent.includes('Legacy Reporting Consolidation')); assert.equal(byClass(recent[0], 'recent-outcome')[0].textContent, 'Stop');
  assert.equal(recent[0].children[2].dateTime, '2026-09-02T12:00:00.000Z'); recent[0].children[3].events.click[0](); assert.equal(selected, 'SHOWCASE-LRP-DECISION');
});

test('all row actions share the same style while timing retains urgency and callbacks', () => {
  const w = workspace(), r = w.reviewRules;
  const ordinary = record(r, 'ordinary', 0, { risk: 'High' }), overdue = record(r, 'overdue', 20), escalation = record(r, 'escalation', 35);
  let selected; w.governanceUI.renderDashboard([ordinary, overdue, escalation], 3, id => { selected = id; });
  assert.deepEqual(rows(w).map(row => row.dataset.urgent), ['true', 'true', 'false']);
  assert.equal(byClass(w.elements.get('dashboard-attention'), 'queue-action-button').length, 3);
  byClass(rows(w)[0], 'queue-action-button')[0].events.click[0](); assert.equal(selected, escalation.id);
  w.governanceUI.renderDashboard([ordinary], 1, () => {}); assert.equal(byClass(w.elements.get('dashboard-attention'), 'queue-action-button').length, 1);
  assert.equal(ordinary.decision, undefined);
});

test('shared shell and Dashboard contain only the requested navigation, regions and retained source explanations', () => {
  const html = readFileSync(join(__dirname, '../index.html'), 'utf8'), css = readFileSync(join(__dirname, '../styles.css'), 'utf8');
  assert.match(html, /id="nav-investments"[^>]*>Portfolio/);
  assert(!html.includes('class="sidebar"')); assert(!html.includes('Evidence. Judgement.'));
  for (const id of ['attention-profile', 'attention-breakdown', 'dashboard-open-reviews', 'dashboard-view-investments']) assert(!html.includes(`id="${id}"`));
  for (const selector of ['.sidebar', '.chart-row', '.attention-chart', '.dashboard-columns', '.other-reviews', '.status-card']) assert(!css.includes(selector));
  assert.match(html, /id="queue-help-trigger"[^>]*aria-label="[^"]+"[^>]*aria-describedby="signals-help"/); assert.match(html, /id="signals-help"[^>]*role="tooltip"[^>]*hidden/);
  const dashboard = html.slice(html.indexOf('<section id="dashboard-view"'), html.indexOf('<section id="investments-view"'));
  assert(!dashboard.includes('Decisions Recorded')); assert(!dashboard.includes('Governance Attention Profile')); assert(!dashboard.includes('Needs Attention'));
  for (const label of ['Active Reviews', 'Recent Decisions', 'Material Concern', 'Emerging Concern', 'Evidence Gap', 'calibrated with DPE']) assert(dashboard.includes(label));
  assert(!dashboard.includes('Portfolio Pulse')); assert(dashboard.includes('class="queue-columns queue-grid"'));
  const w = workspace(); w.governanceUI.renderDashboard(w.services.reviewStore.seedShowcase(), 5, () => {});
  assert(!w.elements.get('dashboard-attention').textContent.includes('Why is this flagged?')); assert(!css.includes('.flag-explanation'));
  const svg = readFileSync(join(__dirname, '../assets/dpe-mark.svg'), 'utf8');
  assert(html.includes('src="assets/dpe-mark.svg"')); assert(svg.includes('#E31837') && svg.includes('#006491')); assert(svg.includes('not an official'));
  assert(css.includes('--color-danger:#9a352b')); assert.match(css, /\.queue-signal\[data-tone="material"\][^}]*var\(--queue-material\)/);
  assert(!css.match(/\.queue-signal[^}]*var\(--color-brand-red\)/));
});
