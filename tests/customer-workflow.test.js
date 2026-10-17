const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { workspace } = require('./helpers/workspace');

// Controller-only in-memory fixtures, not SAP samples or app seed data.
const project = { Project: 'Unit-only context', ProjectUUID: '11111111-2222-3333-4444-555555555555' };
const tick = () => new Promise(resolve => setImmediate(resolve));
const descendants = el => [el, ...el.children.flatMap(descendants)];
const classes = (el, name) => descendants(el).filter(child => (child.className || '').split(' ').includes(name));
function services({ failProjects = false, elements } = {}) {
  const calls = [];
  return { calls, overrides: {
    projects: { validUUID: () => true, projectURL: () => new URL('https://example.invalid/unit'), elementURL: () => new URL('https://example.invalid/unit-elements'),
      loadProjects: async () => { calls.push('projects'); if (failProjects) throw new Error('Unit failure'); return { records: [project], httpStatus: 'HTTP 200 OK' }; },
      loadElements: elements || (async () => { calls.push('structure'); return { records: [{ WBSElementInternalID: 'UNIT-EXACT-ID' }], httpStatus: 'HTTP 200 OK', data: { d: {} } }; }) },
    gl: { projectID: () => '', load: async (p, ids) => { calls.push(['financial', ...ids]); return { records: [], linkMethod: 'WBS', message: 'Unit empty result' }; }, summarize: () => [] },
    po: { load: async ids => { calls.push(['procurement', ...ids]); return { records: [], data: {}, message: 'Unit empty result', integrity: {} }; }, logIntegrity() {} }
  } };
}
function selectFirst(w) { const index = w.state.projects.findIndex(p => p.ProjectUUID === project.ProjectUUID); w.elements.get('projects-body').children[index].children[4].children[0].events.click[0](); }

test('startup auto-loads projects without leaving Dashboard; owner options are immediately present with no fetch', async () => {
  const s = services(); let fetches = 0;
  const w = workspace({ controller: true, key: 'unit-only-key', serviceOverrides: s.overrides, fetchImpl: async () => { fetches++; throw new Error('No network in unit tests'); } });
  assert.equal(w.state.view, 'dashboard'); assert.deepEqual(s.calls, ['projects']);
  assert.equal(w.elements.get('assessment-owner').children.length, 4);
  assert.equal(w.elements.get('connection-status').textContent, 'Refreshing SAP data…');
  assert.equal(w.state.projects.length, 5); // Showcase is available before the live response.
  await tick(); assert.equal(w.state.projects.length, 6); assert.equal(w.elements.get('connection-status').hidden, true);
  assert.equal(fetches, 0); assert.equal(w.state.view, 'dashboard');
});

test('missing key makes no project request; project failure is concise and retries only on explicit action', async () => {
  const s = services({ failProjects: true });
  const missing = workspace({ controller: true, serviceOverrides: s.overrides }); await tick(); assert.equal(s.calls.length, 0);
  assert(missing.elements.get('connection-status').textContent.includes('not configured'));
  assert(!missing.elements.get('projects-body').textContent.includes('Refreshing'));
  const w = workspace({ controller: true, key: 'unit-only-key', serviceOverrides: s.overrides }); await tick();
  assert.equal(w.elements.get('project-refresh-error').hidden, false); assert.equal(w.elements.get('connection-status').hidden, true);
  assert.equal(s.calls.length, 1); await tick(); assert.equal(s.calls.length, 1);
  w.elements.get('retry-projects').events.click[0](); await tick(); assert.equal(s.calls.length, 2);
});

test('opening an investment automatically loads structure then financial and procurement evidence with exact IDs', async () => {
  const s = services(); const w = workspace({ controller: true, key: 'unit-only-key', serviceOverrides: s.overrides }); await tick(); selectFirst(w); await tick();
  assert.equal(w.state.view, 'detail');
  assert.deepEqual(s.calls, ['projects', 'structure', ['financial', 'UNIT-EXACT-ID'], ['procurement', 'UNIT-EXACT-ID']]);
  assert.equal(w.state.evidence.lifecycle.loaded, true); assert.equal(w.state.evidence.gl.attempted, true); assert.equal(w.state.evidence.po.attempted, true);
  assert(w.elements.get('detail-procurement-overview').textContent.includes('does not establish that procurement exposure is zero'));
  assert(!w.elements.get('detail-financial-overview').textContent.includes('HTTP'));
  assert(!w.elements.get('detail-financial-overview').textContent.includes('G/L'));
});

test('structure failure leaves dependent evidence unavailable without calling the dependent services', async () => {
  const s = services({ elements: async () => { throw new Error('Unit structure error'); } });
  const w = workspace({ controller: true, key: 'unit-only-key', serviceOverrides: s.overrides }); await tick(); selectFirst(w); await tick();
  assert.deepEqual(s.calls, ['projects']); assert.equal(w.state.evidence.lifecycle.status, 'error');
  assert.equal(w.state.evidence.gl.status, 'unavailable'); assert.equal(w.state.evidence.po.status, 'unavailable');
  assert.equal(w.state.elementController, null); assert(!w.reviewRules.readiness({ evidence: w.state.evidence }).ready);
});

test('switching projects ignores late structure responses and starts dependent requests only for the current selection', async () => {
  const pending = []; const s = services({ elements: (selected, options) => new Promise(resolve => pending.push({ selected, options, resolve })) });
  const other = { ...project, Project: 'Second unit context', ProjectUUID: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' };
  s.overrides.projects.loadProjects = async () => ({ records: [project, other], httpStatus: 'HTTP 200 OK' });
  const w = workspace({ controller: true, key: 'unit-only-key', serviceOverrides: s.overrides }); await tick();
  selectFirst(w); w.elements.get('projects-body').children[6].children[4].children[0].events.click[0]();
  assert.equal(pending.length, 2); assert.equal(pending[0].options.controller.signal.aborted, true);
  pending[1].resolve({ records: [{ WBSElementInternalID: 'CURRENT-EXACT-ID' }], httpStatus: 'HTTP 200 OK', data: { d: {} } }); await tick();
  pending[0].resolve({ records: [{ WBSElementInternalID: 'STALE-ID' }], httpStatus: 'HTTP 200 OK', data: { d: {} } }); await tick();
  assert.equal(w.state.selectedProject.Project, other.Project);
  assert.deepEqual(Array.from(w.state.evidence.lifecycle.wbsIDs), ['CURRENT-EXACT-ID']);
  assert.deepEqual(s.calls, [['financial', 'CURRENT-EXACT-ID'], ['procurement', 'CURRENT-EXACT-ID']]);
});

test('executive pulse uses real open-review counts, includes escalated overdue decisions and excludes recorded reviews', () => {
  const w = workspace(); const r = w.reviewRules;
  const review = (id, assessment, opened = new Date().toISOString()) => ({ id, project, status: 'in_progress', reviewOpenedAt: opened, reviewBasis: r.BASIS[1], assessment });
  const records = [review('a', { risk: 'High', deliveryPerformance: 'At risk', costPosition: 'Insufficient information' }, '2020-01-01T00:00:00Z'), review('b', { risk: 'High' }), { ...review('c', { risk: 'High' }), status: 'decision_recorded', decision: { timestamp: new Date().toISOString(), outcome: 'Stop' } }];
  const before = JSON.stringify(records); w.governanceUI.renderDashboard(records, 5, () => {});
  const metrics = classes(w.elements.get('dashboard-cards'), 'pulse-metric');
  assert.deepEqual(metrics.map(metric => metric.children[1].textContent), ['2', '1', '1', '1', '1']);
  assert.equal(JSON.stringify(records), before); assert.equal(classes(w.elements.get('dashboard-attention'), 'decision-queue-row').length, 2);
  w.governanceUI.renderDashboard([], 0, () => {}); assert.equal(classes(w.elements.get('dashboard-attention'), 'decision-queue-row').length, 0); assert.match(w.elements.get('dashboard-attention').textContent, /No active reviews/);
  w.governanceUI.renderDashboard(records, 5, () => {}, false); assert(classes(w.elements.get('dashboard-cards'), 'pulse-metric').every(metric => metric.children[1].textContent === 'Unavailable'));
});

test('simplified form reports missing items only on request, retains human outcomes and store validation', () => {
  const w = workspace(); w.governanceUI.incompleteAssessment(['Risk', 'Cost Position', 'Decision Owner']);
  assert.equal(w.elements.get('workflow-message').textContent, 'Complete: Risk, Cost Position, Decision Owner.');
  assert.equal(w.elements.get('workflow-message').hidden, false);
  const html = readFileSync(join(__dirname, '../index.html'), 'utf8');
  const start = html.indexOf('<details id="investment-technical-details"');
  const technical = html.slice(start, html.indexOf('</details>', start));
  assert.equal((technical.match(/<details/g) || []).length, 1); assert(!technical.split('>')[0].includes(' open'));
  for (const id of ['elements-body', 'gl-body', 'po-body', 'raw-response', 'raw-gl-diagnostic', 'raw-po-response']) assert(technical.includes(`id="${id}"`));
  assert(!html.includes('readiness-missing')); assert(!html.includes('source-legend')); assert(!html.includes('HTTP 200'));
  assert(html.includes('<div id="decision-owner"')); assert(!html.includes('<input id="decision-owner"'));
});
