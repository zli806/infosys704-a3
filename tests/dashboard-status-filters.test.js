const { test } = require('node:test');
const assert = require('node:assert/strict');
const { workspace } = require('./helpers/workspace');
const descendants = el => [el, ...el.children.flatMap(descendants)];
const byClass = (el, cls) => descendants(el).filter(child => (child.className || '').split(' ').includes(cls));
const buttons = w => byClass(w.elements.get('dashboard-cards'), 'pulse-metric');
const rows = w => byClass(w.elements.get('dashboard-attention'), 'decision-queue-row');
const button = (w, key) => buttons(w).find(button => button.dataset.filter === key);
const select = (w, key) => button(w, key).events.click[0]();
const selected = w => buttons(w).filter(button => button.getAttribute('aria-pressed') === 'true').map(button => button.dataset.filter);
const count = (w, key) => Number(button(w, key).children[1].textContent);
const openedAgo = days => new Date(Date.now() - days * 86400000).toISOString();
function review(r, id, days, assessment = {}) {
  return { id, status: 'in_progress', project: { ProjectUUID: `unit-${id}`, Project: id, ProjectDescription: `Unit ${id}` }, reviewBasis: r.BASIS[0],
    reviewOpenedAt: openedAgo(days), assessment: { ...r.defaultAssessment(), ...assessment }, evidence: r.emptyEvidence() };
}

test('default Active Reviews and every selected metric show exactly their matching investment count in one shared list', () => {
  const w = workspace(), records = w.services.reviewStore.seedShowcase(); const before = JSON.stringify(records);
  w.governanceUI.showView('dashboard'); w.governanceUI.renderDashboard(records, w.services.showcase.projects(), () => {});
  assert.deepEqual(selected(w), ['active']); assert.equal(rows(w).length, 3);
  assert.deepEqual(buttons(w).map(b => b.children[0].textContent), ['Active Reviews', 'Overdue', 'Material Concerns', 'Evidence Gaps', 'Reviewed Investments']);
  assert(buttons(w).every(b => b.tag === 'button' && b.type === 'button' && b.getAttribute('aria-controls') === 'dashboard-attention'));
  const list = w.elements.get('dashboard-attention');
  for (const [key, heading] of [['active', 'Active Reviews'], ['overdue', 'Overdue Decisions'], ['material', 'Investments with Material Concerns'], ['gap', 'Investments with Evidence Gaps'], ['recorded', 'Reviewed Investments']]) {
    select(w, key); assert.deepEqual(selected(w), [key]); assert.equal(w.elements.get('dashboard-attention'), list);
    assert.equal(rows(w).length, count(w, key)); assert.equal(w.elements.get('decision-queue-title').textContent, heading);
    const n = rows(w).length; assert.equal(w.elements.get('dashboard-filter-count').textContent, `${n} investment${n === 1 ? '' : 's'}`);
    assert(rows(w).every(row => key === 'recorded' ? row.dataset.reviewId === 'SHOWCASE-LRP-DECISION' : row.dataset.reviewId !== 'SHOWCASE-LRP-DECISION'));
  }
  select(w, 'gap'); assert.deepEqual(selected(w), ['gap']); // Selecting the active control cannot leave the group unselected.
  assert.equal(JSON.stringify(records), before); assert.equal(w.state.view, 'dashboard');
});

test('several material signals and even duplicate investment references count as one material investment and one displayed row', () => {
  const w = workspace(), r = w.reviewRules;
  const material = review(r, 'first', 20, { risk: 'High', costPosition: 'Material variance', deliveryPerformance: 'Off track' });
  const duplicate = { ...review(r, 'duplicate', 1, { risk: 'High' }), project: material.project };
  w.governanceUI.renderDashboard([duplicate, material], [], () => {});
  assert.equal(count(w, 'active'), 1); assert.equal(count(w, 'overdue'), 1); assert.equal(count(w, 'material'), 1);
  select(w, 'material'); assert.equal(rows(w).length, 1); assert.equal(rows(w)[0].dataset.reviewId, material.id);
  assert(byClass(rows(w)[0], 'queue-signals')[0].textContent.includes('3 Material'));
});

test('multiple evidence-gap signals still produce one gap investment, while the row retains the detailed signal count', () => {
  const w = workspace(), r = w.reviewRules, originalSignals = r.reviewSignals;
  // UI shape regression only: current frozen classification has one gap dimension.
  // Simulate a returned two-gap signal array without editing any rule map or fixture.
  r.reviewSignals = record => { const signals = originalSignals(record); return { ...signals, evidenceGaps: signals.evidenceGaps.length ? ['First assessed gap', 'Second assessed gap'] : [] }; };
  const gap = review(r, 'gap', 2, { costPosition: 'Insufficient information' });
  const duplicate = { ...gap, id: 'duplicate-gap' };
  const unassessed = review(r, 'unassessed', 0);
  w.governanceUI.renderDashboard([duplicate, unassessed, gap], [], () => {});
  assert.equal(count(w, 'gap'), 1); select(w, 'gap'); assert.equal(rows(w).length, 1);
  assert(byClass(rows(w)[0], 'queue-signals')[0].textContent.includes('2 Evidence Gaps'));
  assert(!w.elements.get('dashboard-attention').textContent.includes('Unit unassessed'));
});

test('all filters preserve escalation/overdue/nearest-due ordering with deterministic tie breaks and no closed records', () => {
  const w = workspace(), r = w.reviewRules, assessment = { risk: 'High', costPosition: 'Insufficient information' };
  const fresh = review(r, 'fresh', 0, assessment), due = review(r, 'due', 10, assessment), overdue = review(r, 'overdue', 20, assessment), escalation = review(r, 'escalation', 35, assessment);
  const tie = review(r, 'tie', 10, assessment); tie.reviewOpenedAt = due.reviewOpenedAt; tie.project.Project = due.project.Project;
  const closed = { ...overdue, id: 'closed', status: 'decision_recorded', decision: { outcome: 'Stop', timestamp: new Date().toISOString() } };
  const input = [fresh, tie, closed, overdue, due, escalation], before = JSON.stringify(input);
  w.governanceUI.renderDashboard(input, [], () => {});
  for (const key of ['active', 'material', 'gap']) {
    select(w, key); assert.deepEqual(rows(w).map(row => row.dataset.reviewId), ['escalation', 'overdue', 'due', 'tie', 'fresh']); assert.equal(count(w, key), 5);
  }
  select(w, 'overdue'); assert.deepEqual(rows(w).map(row => row.dataset.reviewId), ['escalation', 'overdue']); assert.equal(count(w, 'overdue'), 2);
  assert.equal(JSON.stringify(input), before);
});

test('selection persists through help interactions and data refresh; empty filters stay selected rather than showing unrelated records', () => {
  const w = workspace(), records = w.services.reviewStore.seedShowcase(); w.governanceUI.showView('dashboard');
  w.governanceUI.renderDashboard(records, w.services.showcase.projects(), () => {}); select(w, 'gap');
  const help = w.document.getElementById('metric-help-gap'); help.events.focus[0](); help.events.blur[0](); assert.deepEqual(selected(w), ['gap']);
  w.document.activeElement = button(w, 'gap');
  const focused = button(w, 'gap'); w.governanceUI.renderDashboard(records, w.services.showcase.projects(), () => {}); assert.deepEqual(selected(w), ['gap']); assert.equal(button(w, 'gap'), focused); assert.equal(rows(w).length, 1);
  const withoutGap = records.filter(record => record.id !== 'SHOWCASE-DAT-REVIEW'); w.governanceUI.renderDashboard(withoutGap, w.services.showcase.projects(), () => {});
  assert.deepEqual(selected(w), ['gap']); assert.equal(count(w, 'gap'), 0); assert.equal(rows(w).length, 0); assert.equal(w.elements.get('dashboard-filter-count').textContent, '0 investments');
  assert.match(w.elements.get('dashboard-attention').textContent, /No active investments with evidence gaps/); assert.equal(button(w, 'gap').disabled, false);
});

test('returning from Portfolio defaults to Active Reviews and browsing all lenses never changes persisted records', () => {
  const w = workspace({ controller: true }); const before = w.map.get(w.services.reviewStore.STORAGE_KEY);
  for (const key of ['material', 'gap', 'overdue', 'recorded', 'active']) { select(w, key); assert.equal(w.map.get(w.services.reviewStore.STORAGE_KEY), before); }
  select(w, 'gap'); w.elements.get('nav-investments').events.click[0](); assert.equal(w.state.view, 'investments');
  assert.equal(w.elements.get('projects-body').children.length, w.state.projects.length); assert.equal(w.elements.get('page-eyebrow').hidden, false);
  w.elements.get('nav-dashboard').events.click[0](); assert.equal(w.state.view, 'dashboard'); assert.deepEqual(selected(w), ['active']); assert.equal(rows(w).length, 3); assert.equal(w.elements.get('page-eyebrow').hidden, true);
  assert.equal(w.map.get(w.services.reviewStore.STORAGE_KEY), before);
});

test('storage failure shows unavailable metrics with one selected state, without claiming a zero-match result', () => {
  const w = workspace(); w.governanceUI.renderDashboard([], w.services.showcase.projects(), () => {}, false);
  assert.deepEqual(selected(w), ['active']); assert(buttons(w).every(b => b.disabled && b.children[1].textContent === 'Unavailable'));
  assert.equal(rows(w).length, 0); assert.equal(w.elements.get('dashboard-filter-count').textContent, 'Records unavailable');
});
