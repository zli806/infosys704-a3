const { test } = require('node:test');
const assert = require('node:assert/strict');
const { workspace } = require('./helpers/workspace');
const tick = () => new Promise(resolve => setImmediate(resolve));
const keys = ['active', 'overdue', 'material', 'gap', 'recorded'];
const metric = (w, key = 'active') => w.document.getElementById(`dashboard-filter-${key}`);
const count = (w, key = 'active') => metric(w, key).children[1].textContent;
const percentage = (w, key = 'active') => metric(w, key).children[2].children[1].textContent;
const click = (w, id) => w.document.getElementById(id).events.click[0]();
const projects = Array.from({ length: 5 }, (_, i) => ({ Project: `UNIT-SAP-${i + 1}`, ProjectUUID: `abc00000-2222-4333-8444-${String(i + 1).padStart(12, '0')}` }));
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function pendingWorkspace(options = {}) {
  const request = deferred();
  const w = workspace({ controller: true, key: 'unit-only-key', ...options, serviceOverrides: { projects: { loadProjects: () => request.promise } } });
  return { w, request };
}
function assertUnconfirmed(w) {
  assert.equal(w.state.portfolioUniverseConfirmed, false);
  for (const key of keys) {
    assert.equal(metric(w, key).disabled, false); assert.equal(metric(w, key).children[2].hidden, false);
    assert.equal(percentage(w, key), '—'); assert.equal(metric(w, key).children[2].children[0].style.background, 'none');
    assert.match(metric(w, key).getAttribute('aria-label'), /Percentage unavailable because the full investment universe is not currently confirmed/);
    assert(!metric(w, key).getAttribute('aria-label').includes('percent of'));
  }
  assert.equal(count(w), '3');
}

test('configured startup keeps three active investment counts but no Showcase-only percentage before SAP resolves', async () => {
  const { w, request } = pendingWorkspace();
  assert.equal(w.state.projects.length, 5); assert.equal(w.state.projectsRefreshing, true); assertUnconfirmed(w);
  assert.equal(w.elements.get('connection-status').textContent, 'SAP Sandbox · Refreshing…');
  request.resolve({ records: projects, httpStatus: 'HTTP 200 OK' }); await tick();
  assert.equal(w.state.portfolioUniverseConfirmed, true); assert.equal(w.state.projects.length, 10); assert.equal(count(w), '3'); assert.equal(percentage(w), '30%');
  assert.match(metric(w).getAttribute('aria-label'), /3 investments, 30 percent of the current investment universe/);
  assert.equal(w.elements.get('connection-status').textContent, 'SAP Sandbox · Connected');
});

test('SAP failure leaves counts and usable Showcase intact without claiming a five-investment percentage', async () => {
  const { w, request } = pendingWorkspace(); request.reject(new Error('Unit maintenance failure')); await tick();
  assertUnconfirmed(w); assert.equal(w.state.projects.length, 5); assert.equal(w.elements.get('connection-status').textContent, 'SAP Sandbox · Connection issue');
  assert.equal(w.elements.get('toast-region').hidden, false); assert.match(w.elements.get('toast-message').textContent, /Showcase investments remain available/); w.ui.dismissToast();
  click(w, 'nav-investments'); w.elements.get('projects-body').children[3].children[4].children[0].events.click[0](); await tick();
  assert.equal(w.state.view, 'detail'); assert.equal(w.elements.get('detail-source').textContent, 'SHOWCASE'); assert.equal(w.state.evidence.lifecycle.loaded, true); assertUnconfirmed(w);
});

test('missing key leaves percentages unavailable, not 60%, without hiding counts or raising a failure toast', () => {
  let calls = 0; const w = workspace({ controller: true, serviceOverrides: { projects: { loadProjects: () => { calls++; throw new Error('Must not call SAP'); } } } });
  assert.equal(calls, 0); assertUnconfirmed(w); assert.equal(w.state.projects.length, 5); assert.equal(w.elements.get('connection-status').textContent, 'SAP Sandbox · Not connected'); assert.equal(w.elements.get('toast-region').hidden, true);
});

test('manual refresh invalidates confirmed percentages immediately and a later failure never leaves stale 30% or false 60%', async () => {
  const { w, request } = pendingWorkspace(); request.resolve({ records: projects, httpStatus: 'HTTP 200 OK' }); await tick(); assert.equal(percentage(w), '30%');
  const refresh = deferred(); w.services.projects.loadProjects = () => refresh.promise;
  click(w, 'nav-investments'); click(w, 'load-projects'); assert.equal(w.state.projectsRefreshing, true); assertUnconfirmed(w);
  click(w, 'nav-dashboard'); assertUnconfirmed(w);
  refresh.reject(new Error('Unit failed refresh')); await tick(); assertUnconfirmed(w); assert.equal(w.elements.get('connection-status').dataset.state, 'issue'); w.ui.dismissToast();
});

test('successful refresh uses its actual distinct project set, not a fixed denominator', async () => {
  const { w, request } = pendingWorkspace(); request.resolve({ records: projects, httpStatus: 'HTTP 200 OK' }); await tick(); assert.equal(percentage(w), '30%');
  const refresh = deferred(); w.services.projects.loadProjects = () => refresh.promise; click(w, 'nav-investments'); click(w, 'load-projects'); assertUnconfirmed(w);
  const one = projects[0]; refresh.resolve({ records: [one, { ...one, ProjectUUID: one.ProjectUUID.toUpperCase() }, ...w.services.showcase.projects()], httpStatus: 'HTTP 200 OK' }); await tick();
  assert.equal(w.state.projects.length, 6); assert.equal(w.state.portfolioUniverseConfirmed, true); assert.equal(count(w), '3'); assert.equal(percentage(w), '50%'); w.ui.dismissToast();
});

test('a successful empty SAP response confirms its represented universe; source completion is not inferred from project count', async () => {
  const { w, request } = pendingWorkspace(); assertUnconfirmed(w);
  request.resolve({ records: [], httpStatus: 'HTTP 200 OK' }); await tick();
  assert.equal(w.state.projects.length, 5); assert.equal(w.state.portfolioUniverseConfirmed, true); assert.equal(percentage(w), '60%'); // Valid only after the source confirms zero returned SAP projects.
});

test('saved-only history extends a confirmed denominator but cannot make an unconfirmed percentage authoritative', async () => {
  const source = workspace(), store = source.services.reviewStore; store.seedShowcase();
  const saved = JSON.parse(source.map.get(store.STORAGE_KEY)), historical = JSON.parse(JSON.stringify(saved.reviews.find(r => r.status === 'decision_recorded')));
  historical.id = 'UNIT-SAVED-ONLY'; historical.project = { ...historical.project, Project: 'UNIT-HISTORY', ProjectUUID: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' }; saved.reviews.push(historical); source.map.set(store.STORAGE_KEY, JSON.stringify(saved));
  const { w, request } = pendingWorkspace({ storage: source.map }); assertUnconfirmed(w); assert.equal(count(w, 'recorded'), '2');
  request.resolve({ records: projects, httpStatus: 'HTTP 200 OK' }); await tick();
  assert.equal(w.state.projects.length, 10); assert.equal(percentage(w), '27%'); assert.equal(percentage(w, 'recorded'), '18%');
  assert.equal(w.services.reviewStore.get(historical.id).decision.timestamp, historical.decision.timestamp);
});

test('confirmation is runtime-only and resets on reload even when governance records are already saved', async () => {
  const { w, request } = pendingWorkspace(); request.resolve({ records: projects, httpStatus: 'HTTP 200 OK' }); await tick();
  const before = w.map.get(w.services.reviewStore.STORAGE_KEY); assert.equal(percentage(w), '30%');
  const reloaded = pendingWorkspace({ storage: w.map }); assertUnconfirmed(reloaded.w); assert.equal(reloaded.w.map.get(w.services.reviewStore.STORAGE_KEY), before);
  assert(!before.includes('portfolioUniverseConfirmed'));
});

test('unconfirmed empty universe is not 0%; confirmed zero stays 0%, and storage unavailable never fabricates a percentage', () => {
  const w = workspace(); w.governanceUI.renderDashboard([], [], () => {}, true, false);
  assert.equal(count(w), '0'); assert.equal(percentage(w), '—'); assert.equal(metric(w).children[2].children[0].style.background, 'none'); assert.match(metric(w).getAttribute('aria-label'), /Percentage unavailable/);
  w.governanceUI.renderDashboard([], [], () => {}, true, true); assert.equal(percentage(w), '0%'); assert.equal(metric(w).children[2].children[0].style.background, 'conic-gradient(var(--metric-tone) 0%, transparent 0)');
  w.governanceUI.renderDashboard([], [], () => {}, false, true); assert.equal(count(w), 'Unavailable'); assert.equal(percentage(w), ''); assert.equal(metric(w).children[2].hidden, true); assert.equal(metric(w).children[2].children[0].style.background, 'none'); assert.match(metric(w).getAttribute('aria-label'), /Percentage unavailable/);
});
