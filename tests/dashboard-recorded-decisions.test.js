const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { workspace } = require('./helpers/workspace');
const click = (w, id) => w.document.getElementById(id).events.click[0]();
const all = el => [el, ...el.children.flatMap(all)];
const buttonIn = el => all(el).find(el => el.tag === 'button');
const rows = w => w.elements.get('dashboard-attention').children.filter(row => row.dataset.reviewId);
const metric = (w, key) => w.document.getElementById(`dashboard-filter-${key}`);
const count = (w, key) => Number(metric(w, key).children[1].textContent);
const selected = w => w.elements.get('dashboard-cards').children.filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.filter);
const columns = w => w.elements.get('dashboard-columns').children.map(c => c.textContent);
function recordModify(w) {
  buttonIn(rows(w).find(r => r.dataset.reviewId === 'SHOWCASE-ODP-REVIEW')).events.click[0]();
  assert.equal(w.state.view, 'summary'); click(w, 'proceed-decision');
  for (const radio of w.elements.get('decision-outcome').querySelectorAll('input')) radio.checked = radio.value === 'Modify';
  for (const [id, value] of [['decision-rationale', 'Human QA judgement'], ['decision-action', 'Reassess delivery'], ['decision-action-owner', 'Unit coordinator'], ['decision-next-date', '2026-11-17']]) w.elements.get(id).value = value;
  w.elements.get('decision-form').events.submit[0]({ preventDefault() {} }); assert.equal(w.state.view, 'confirmation');
}

test('five native metrics share one selected state and switch current/recorded columns in one list', () => {
  const w = workspace({ controller: true }), container = w.elements.get('dashboard-attention');
  assert.equal(w.elements.get('dashboard-cards').children.length, 5); assert.deepEqual(selected(w), ['active']);
  assert.deepEqual(columns(w), ['Investment', 'Review Trigger', 'Findings', 'Decision Timing', 'Next Step']);
  for (const key of ['recorded', 'gap', 'overdue', 'material', 'active', 'recorded']) {
    const button = metric(w, key); assert.equal(button.tag, 'button'); assert.equal(button.type, 'button'); assert.equal(button.getAttribute('aria-controls'), 'dashboard-attention'); assert(button.getAttribute('aria-label'));
    click(w, `dashboard-filter-${key}`); assert.deepEqual(selected(w), [key]); assert.equal(w.elements.get('dashboard-attention'), container); assert.equal(rows(w).length, count(w, key));
    assert.deepEqual(columns(w), ['Investment', 'Review Trigger', key === 'recorded' ? 'Decision' : 'Findings', key === 'recorded' ? 'Decision Date' : 'Decision Timing', 'Next Step']);
  }
  assert.equal(w.elements.get('decision-queue-title').textContent, 'Recorded Decisions'); assert.equal(w.elements.get('dashboard-filter-count').textContent, '1 decision'); assert.equal(container.dataset.mode, 'recorded');
  assert.match(metric(w, 'recorded').getAttribute('aria-label'), /completed decision records from all review cycles/);
});

test('one investment with three completed cycles contributes three records, alongside its separate current active review', () => {
  const w = workspace(), active = w.services.showcase.seededReviews()[0];
  const completed = [
    { ...active, id: 'feb', status: 'decision_recorded', reviewOpenedAt: '2026-02-01T00:00:00Z', decision: { outcome: 'Continue', timestamp: '2026-02-10T00:00:00Z' } },
    { ...active, id: 'jun', status: 'decision_recorded', reviewOpenedAt: '2026-01-01T00:00:00Z', decision: { outcome: 'Modify', timestamp: '2026-06-10T00:00:00Z' } },
    { ...active, id: 'oct', status: 'decision_recorded', reviewOpenedAt: '2025-12-01T00:00:00Z', decision: { outcome: 'Continue with Conditions', timestamp: '2026-10-10T00:00:00Z' } }
  ];
  const input = [completed[1], active, completed[0], completed[2]], before = JSON.stringify(input); let opened;
  w.governanceUI.renderDashboard(input, 1, id => { opened = id; }); assert.equal(count(w, 'recorded'), 3); assert.equal(count(w, 'active'), 1);
  click(w, 'dashboard-filter-recorded'); assert.deepEqual(rows(w).map(row => row.dataset.reviewId), ['oct', 'jun', 'feb']); assert.equal(w.elements.get('dashboard-filter-count').textContent, '3 decisions');
  for (const row of rows(w)) { assert(row.textContent.includes(active.project.ProjectDescription)); buttonIn(row).events.click[0](); assert.equal(opened, row.dataset.reviewId); }
  click(w, 'dashboard-filter-active'); assert.deepEqual(rows(w).map(row => row.dataset.reviewId), [active.id]); assert.equal(JSON.stringify(input), before);
});

test('recorded list includes all completed records without the old five-record cap and resolves timestamp ties deterministically', () => {
  const w = workspace(), seed = w.services.showcase.seededReviews()[3];
  const input = Array.from({ length: 8 }, (_, i) => ({ ...seed, id: `history-${i}`, decision: { ...seed.decision, timestamp: i > 5 ? '2026-10-17T00:00:00Z' : `2026-09-0${i + 1}T00:00:00Z` } }));
  w.governanceUI.renderDashboard(input.slice().reverse(), 1, () => {}); click(w, 'dashboard-filter-recorded');
  assert.equal(count(w, 'recorded'), 8); assert.equal(rows(w).length, 8); assert.deepEqual(rows(w).slice(0, 2).map(row => row.dataset.reviewId), ['history-6', 'history-7']);
  w.governanceUI.renderDashboard(input, 1, () => {}); assert.deepEqual(rows(w).slice(0, 2).map(row => row.dataset.reviewId), ['history-6', 'history-7']);
});

test('recorded rows are compact historical records, not findings, urgency or expanded rationale', () => {
  const w = workspace({ controller: true }); click(w, 'dashboard-filter-recorded'); const row = rows(w)[0], record = w.services.reviewStore.get(row.dataset.reviewId);
  assert.equal(row.dataset.urgent, 'false'); assert.equal(row.dataset.timing, undefined); assert.equal(row.children[0].children.length, 5);
  assert(row.textContent.includes('Legacy Reporting Consolidation')); assert(row.textContent.includes('SHOWCASE')); assert(row.textContent.includes('Stop')); assert(row.textContent.includes(w.ui.formatDate(record.decision.timestamp)));
  assert(!row.textContent.includes(record.decision.rationale)); assert(!row.textContent.includes('Decision overdue')); assert(!all(row).some(el => el.className === 'queue-signals'));
  const action = buttonIn(row); assert.equal(action.textContent, 'View Decision'); assert.match(action.getAttribute('aria-label'), /Legacy Reporting Consolidation/);
  action.events.click[0](); assert.equal(w.state.view, 'confirmation'); assert.equal(w.state.currentReviewID, record.id);
  click(w, 'back-dashboard'); assert.deepEqual(selected(w), ['active']); // A historical visit is not a newly recorded decision.
});

test('new decision updates both counts and Back to Dashboard selects recorded once; later navigation and reload default active', () => {
  const w = workspace({ controller: true }), before = { active: count(w, 'active'), recorded: count(w, 'recorded') };
  recordModify(w); const id = w.state.currentReviewID, snapshot = JSON.stringify(w.services.reviewStore.get(id));
  assert.equal(count(w, 'active'), before.active - 1); assert.equal(count(w, 'recorded'), before.recorded + 1);
  click(w, 'back-dashboard'); assert.deepEqual(selected(w), ['recorded']); assert.equal(rows(w)[0].dataset.reviewId, id); assert(rows(w)[0].textContent.includes('Modify'));
  w.governanceUI.renderDashboard(w.state.reviews, w.state.projects.length, () => {}); assert.deepEqual(selected(w), ['recorded']);
  click(w, 'nav-dashboard'); assert.deepEqual(selected(w), ['active']); assert(!rows(w).some(row => row.dataset.reviewId === id));
  click(w, 'dashboard-filter-recorded'); click(w, 'nav-dashboard'); assert.deepEqual(selected(w), ['active']);
  click(w, 'dashboard-filter-recorded'); buttonIn(rows(w).find(row => row.dataset.reviewId === id)).events.click[0]();
  assert.equal(w.state.view, 'confirmation');
  click(w, 'back-dashboard'); assert.deepEqual(selected(w), ['active']); assert.equal(JSON.stringify(w.services.reviewStore.get(id)), snapshot);
  const reloaded = workspace({ controller: true, storage: w.map }); assert.deepEqual(selected(reloaded), ['active']); assert.equal(count(reloaded, 'recorded'), before.recorded + 1);
});

test('leaving fresh Confirmation for Portfolio consumes the one-time Dashboard context', () => {
  const w = workspace({ controller: true }); recordModify(w); const id = w.state.currentReviewID;
  click(w, 'nav-investments'); assert.equal(w.elements.get('projects-body').children.length, w.state.projects.length);
  click(w, 'nav-dashboard'); click(w, 'dashboard-filter-recorded'); buttonIn(rows(w).find(row => row.dataset.reviewId === id)).events.click[0]();
  click(w, 'back-dashboard'); assert.deepEqual(selected(w), ['active']);
});

test('retired navigation, page, recent section, rendering hooks and styles are removed rather than merely hidden', () => {
  const html = readFileSync('index.html', 'utf8'), css = readFileSync('styles.css', 'utf8'), ui = readFileSync('js/ui/governance.js', 'utf8'), controller = readFileSync('app.js', 'utf8');
  const nav = html.match(/<nav class="app-nav"[\s\S]*?<\/nav>/)[0]; assert.deepEqual([...nav.matchAll(/>(Dashboard|Portfolio|Decisions)<\/button>/g)].map(m => m[1]), ['Dashboard', 'Portfolio']);
  for (const retired of ['nav-reviews', 'reviews-view', 'reviews-body', 'dashboard-decisions', 'recent-decisions-title', 'Recent Decisions']) assert(!html.includes(retired));
  assert(!ui.includes('renderReviews')); assert(!controller.includes('renderReviews')); assert(!css.includes('.recent-')); assert(!css.includes('.decision-register'));
  assert.equal((html.match(/id="dashboard-attention"/g) || []).length, 1);
});
