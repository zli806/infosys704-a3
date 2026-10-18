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
function assertPending(w) {
  for (const key of keys) {
    assert.equal(metric(w, key).disabled, false); assert.equal(metric(w, key).children[2].hidden, false);
    assert.equal(percentage(w, key), '—'); assert.equal(metric(w, key).children[2].children[0].style.background, 'none');
    assert.match(metric(w, key).getAttribute('aria-label'), /Percentage unavailable while the portfolio view is refreshing/);
    assert(!metric(w, key).getAttribute('aria-label').includes('percent of'));
  }
  assert.equal(count(w), '3');
  assert.equal(w.state.portfolioScopeResolved, false);
}
function assertResolved(w, representedCount) {
  for (const key of keys) {
    assert.equal(metric(w, key).disabled, false); assert.equal(metric(w, key).children[2].hidden, false);
    const expected = Math.round(Number(count(w, key)) / representedCount * 100);
    assert.equal(percentage(w, key), `${expected}%`); assert.equal(metric(w, key).children[2].children[0].style.background, `conic-gradient(var(--metric-tone) ${expected}%, transparent 0)`);
    assert.match(metric(w, key).getAttribute('aria-label'), /percent of the investments currently represented in the portfolio/);
    assert(!metric(w, key).getAttribute('aria-label').includes('Percentage unavailable'));
  }
  assert.equal(count(w), '3');
  assert.equal(w.state.portfolioScopeResolved, true);
}
function captureRenders(snapshots) {
  return (app, document) => {
    const render = app.governanceUI.renderDashboard;
    app.governanceUI.renderDashboard = (...args) => {
      const result = render(...args);
      snapshots.push(document.getElementById('dashboard-filter-active').children[2].children[1].textContent);
      return result;
    };
  };
}

test('configured startup keeps three active investment counts but no Showcase-only percentage before SAP resolves', async () => {
  const renders = [], { w, request } = pendingWorkspace({ beforeController: captureRenders(renders) });
  assert.equal(w.state.projects.length, 5); assert.equal(w.state.projectsRefreshing, true); assertPending(w);
  assert(renders.length > 0); assert(renders.every(p => p === '—'));
  assert.equal(w.elements.get('connection-status').textContent, 'SAP Sandbox · Refreshing…');
  request.resolve({ records: projects, httpStatus: 'HTTP 200 OK' }); await tick();
  assertResolved(w, 10); assert.equal(w.state.projects.length, 10); assert.equal(percentage(w), '30%');
  assert(renders.every(p => p === '—' || p === '30%')); assert.equal(renders.at(-1), '30%');
  assert.match(metric(w).getAttribute('aria-label'), /3 investments, 30 percent of the investments currently represented in the portfolio/);
  assert.equal(w.elements.get('connection-status').textContent, 'SAP Sandbox · Connected');
});

test('completed SAP failure resolves to usable Showcase percentages while connection issue remains truthful', async () => {
  const { w, request } = pendingWorkspace(); assertPending(w); request.reject(new Error('Unit maintenance failure')); await tick();
  assertResolved(w, 5); assert.equal(percentage(w), '60%'); assert.equal(w.state.projects.length, 5); assert.equal(w.elements.get('connection-status').textContent, 'SAP Sandbox · Connection issue');
  assert.equal(w.elements.get('toast-region').hidden, false); assert.match(w.elements.get('toast-message').textContent, /Showcase investments remain available/); w.ui.dismissToast();
  click(w, 'nav-investments'); w.elements.get('projects-body').children[3].children[4].children[0].events.click[0](); await tick();
  assert.equal(w.state.view, 'detail'); assert.equal(w.elements.get('detail-source').textContent, 'SHOWCASE'); assert.equal(w.state.evidence.lifecycle.loaded, true); assertResolved(w, 5);
});

test('missing key resolves Showcase to 60% on the first render, without an unresolved flicker, SAP request or failure toast', () => {
  const renders = []; let calls = 0; const w = workspace({ controller: true, beforeController: captureRenders(renders), serviceOverrides: { projects: { loadProjects: () => { calls++; throw new Error('Must not call SAP'); } } } });
  assert.equal(calls, 0); assertResolved(w, 5); assert.equal(percentage(w), '60%'); assert(renders.length > 0); assert(renders.every(p => p === '60%'));
  assert.equal(w.state.projects.length, 5); assert.equal(w.elements.get('connection-status').textContent, 'SAP Sandbox · Not connected'); assert.equal(w.elements.get('toast-region').hidden, true);
});

test('manual refresh pauses percentages, then failed refresh resolves the represented Showcase fallback to 60%', async () => {
  const { w, request } = pendingWorkspace(); request.resolve({ records: projects, httpStatus: 'HTTP 200 OK' }); await tick(); assert.equal(percentage(w), '30%');
  const refresh = deferred(); w.services.projects.loadProjects = () => refresh.promise;
  click(w, 'nav-investments'); click(w, 'load-projects'); assert.equal(w.state.projectsRefreshing, true); assertPending(w);
  click(w, 'nav-dashboard'); assertPending(w);
  refresh.reject(new Error('Unit failed refresh')); await tick(); assertResolved(w, 5); assert.equal(percentage(w), '60%'); assert.equal(w.state.projects.length, 5); assert.equal(w.elements.get('connection-status').dataset.state, 'issue'); w.ui.dismissToast();
});

test('successful refresh uses its actual distinct project set, not a fixed denominator', async () => {
  const { w, request } = pendingWorkspace(); request.resolve({ records: projects, httpStatus: 'HTTP 200 OK' }); await tick(); assert.equal(percentage(w), '30%');
  const refresh = deferred(); w.services.projects.loadProjects = () => refresh.promise; click(w, 'nav-investments'); click(w, 'load-projects'); assertPending(w);
  const one = projects[0]; refresh.resolve({ records: [one, { ...one, ProjectUUID: one.ProjectUUID.toUpperCase() }, ...w.services.showcase.projects()], httpStatus: 'HTTP 200 OK' }); await tick();
  assert.equal(w.state.projects.length, 6); assertResolved(w, 6); assert.equal(percentage(w), '50%'); w.ui.dismissToast();
});

test('a successful empty SAP response resolves to the represented Showcase portfolio and 60%', async () => {
  const { w, request } = pendingWorkspace(); assertPending(w);
  request.resolve({ records: [], httpStatus: 'HTTP 200 OK' }); await tick();
  assert.equal(w.state.projects.length, 5); assertResolved(w, 5); assert.equal(percentage(w), '60%');
});

test('saved-only identities extend resolved success, failure and missing-key portfolios without changing History', async () => {
  const source = workspace(), store = source.services.reviewStore; store.seedShowcase();
  const saved = JSON.parse(source.map.get(store.STORAGE_KEY)), historical = JSON.parse(JSON.stringify(saved.reviews.find(r => r.status === 'decision_recorded')));
  historical.id = 'UNIT-SAVED-ONLY'; historical.project = { ...historical.project, Project: 'UNIT-HISTORY', ProjectUUID: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' }; saved.reviews.push(historical); source.map.set(store.STORAGE_KEY, JSON.stringify(saved));
  const { w, request } = pendingWorkspace({ storage: source.map }); assertPending(w); assert.equal(count(w, 'recorded'), '2');
  request.resolve({ records: projects, httpStatus: 'HTTP 200 OK' }); await tick();
  assert.equal(w.state.projects.length, 10); assertResolved(w, 11); assert.equal(percentage(w), '27%'); assert.equal(percentage(w, 'recorded'), '18%');
  const failed = pendingWorkspace({ storage: source.map }); assertPending(failed.w); failed.request.reject(new Error('Unit SAP failure')); await tick();
  assertResolved(failed.w, 6); assert.equal(percentage(failed.w), '50%'); assert.equal(percentage(failed.w, 'recorded'), '33%'); failed.w.ui.dismissToast();
  const missing = workspace({ controller: true, storage: source.map }); assertResolved(missing, 6); assert.equal(percentage(missing), '50%');
  assert.equal(w.services.reviewStore.get(historical.id).decision.timestamp, historical.decision.timestamp);
});

test('resolved scope is runtime-only and becomes pending on configured reload even with saved governance records', async () => {
  const { w, request } = pendingWorkspace(); request.resolve({ records: projects, httpStatus: 'HTTP 200 OK' }); await tick();
  const before = w.map.get(w.services.reviewStore.STORAGE_KEY); assert.equal(percentage(w), '30%');
  const reloaded = pendingWorkspace({ storage: w.map }); assertPending(reloaded.w); assert.equal(reloaded.w.map.get(w.services.reviewStore.STORAGE_KEY), before);
  assert(!before.includes('portfolioScopeResolved'));
});

test('a missing key encountered during refresh resolves immediately without making another SAP request', async () => {
  const { w, request } = pendingWorkspace(); request.resolve({ records: projects, httpStatus: 'HTTP 200 OK' }); await tick(); assert.equal(percentage(w), '30%');
  w.http.apiKey = () => ''; let calls = 0; w.services.projects.loadProjects = () => { calls++; throw new Error('Must not request without a key'); };
  click(w, 'nav-investments'); click(w, 'load-projects'); assertResolved(w, 5); assert.equal(percentage(w), '60%'); assert.equal(calls, 0); assert.equal(w.state.projectsRefreshing, false); assert.equal(w.elements.get('connection-status').dataset.state, 'disconnected');
});

test('pending empty scope is not 0%; resolved zero stays 0%, and storage unavailable never fabricates a percentage', () => {
  const w = workspace(); w.governanceUI.renderDashboard([], [], () => {}, true, false);
  assert.equal(count(w), '0'); assert.equal(percentage(w), '—'); assert.equal(metric(w).children[2].children[0].style.background, 'none'); assert.match(metric(w).getAttribute('aria-label'), /Percentage unavailable/);
  w.governanceUI.renderDashboard([], [], () => {}, true, true); assert.equal(percentage(w), '0%'); assert.equal(metric(w).children[2].children[0].style.background, 'conic-gradient(var(--metric-tone) 0%, transparent 0)');
  w.governanceUI.renderDashboard([], [], () => {}, false, true); assert.equal(count(w), 'Unavailable'); assert.equal(percentage(w), ''); assert.equal(metric(w).children[2].hidden, true); assert.equal(metric(w).children[2].children[0].style.background, 'none'); assert.match(metric(w).getAttribute('aria-label'), /Percentage unavailable/);
});
