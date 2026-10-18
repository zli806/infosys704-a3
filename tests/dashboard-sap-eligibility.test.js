const { test } = require('node:test');
const assert = require('node:assert/strict');
const { workspace } = require('./helpers/workspace');

const tick = () => new Promise(resolve => setImmediate(resolve));
const click = (w, id) => w.document.getElementById(id).events.click[0]();
const metric = (w, key) => Number(w.document.getElementById(`dashboard-filter-${key}`).children[1].textContent);
const rows = w => w.elements.get('dashboard-attention').children.filter(row => row.dataset.reviewId);
const keys = ['active', 'overdue', 'material', 'gap', 'recorded'];
const project = { ProjectUUID: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', Project: 'UNIT-SAP', ProjectDescription: 'Unit SAP investment',
  ProjectEndDate: '/Date(946684800000)/', ProcessingStatus: '20' };
const other = { ...project, ProjectUUID: '11111111-2222-4333-8444-555555555555', Project: 'UNIT-SAP-CLOSED' };

test('qualifying SAP reviews appear in every matching Dashboard block, exactly like Showcase reviews', () => {
  const w = workspace(), seeds = w.services.showcase.seededReviews();
  const active = { ...seeds[0], id: 'UNIT-SAP-REVIEW', project,
    reviewOpenedAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    assessment: { ...w.reviewRules.defaultAssessment(), risk: 'High', costPosition: 'Insufficient information' } };
  const completed = { ...seeds[3], id: 'UNIT-SAP-DECISION', project: other };
  const unrelated = { ...project, ProjectUUID: '22222222-3333-4444-8555-666666666666', Project: 'UNIT-SAP-NO-REVIEW' };
  const records = [active, completed], before = JSON.stringify(records); let opened;
  w.governanceUI.renderDashboard(records, [project, other, unrelated], id => { opened = id; }, true, true);
  for (const key of keys) {
    assert.equal(metric(w, key), 1);
    click(w, `dashboard-filter-${key}`);
    assert.equal(rows(w).length, 1);
    const expected = key === 'recorded' ? completed : active;
    assert.equal(rows(w)[0].dataset.reviewId, expected.id);
    assert.match(rows(w)[0].textContent, /SAP SANDBOX/);
    assert(!rows(w)[0].textContent.includes('UNIT-SAP-NO-REVIEW'));
    rows(w)[0].children[0].children[4].children[1].events.click[0]();
    assert.equal(opened, expected.id);
  }
  const showcaseRecords = records.map((record, index) => ({ ...record, project: seeds[index].project }));
  w.governanceUI.renderDashboard(showcaseRecords, w.services.showcase.projects(), () => {}, true, true);
  assert.deepEqual(keys.map(key => metric(w, key)), [1, 1, 1, 1, 1]);
  assert.equal(JSON.stringify(records), before);
});

test('raw SAP dates, status and unavailable evidence never invent review eligibility or assessment findings', () => {
  const w = workspace();
  w.governanceUI.renderDashboard([], [project], () => {}, true, true);
  for (const key of keys) {
    click(w, `dashboard-filter-${key}`);
    assert.equal(metric(w, key), 0);
    assert.equal(rows(w).length, 0);
  }
  const seed = w.services.showcase.seededReviews()[0];
  const review = { ...seed, id: 'UNIT-UNASSESSED-SAP', project,
    reviewOpenedAt: new Date().toISOString(), assessment: w.reviewRules.defaultAssessment(), evidence: w.reviewRules.emptyEvidence() };
  review.evidence.gl = { ...review.evidence.gl, attempted: true, status: 'error' };
  w.governanceUI.renderDashboard([review], [project], () => {}, true, true);
  assert.deepEqual(keys.map(key => metric(w, key)), [1, 0, 0, 0, 0]);
});

test('startup loads SAP automatically and preserves a saved eligible SAP review in Dashboard without creating new reviews', async () => {
  const source = workspace(), store = source.services.reviewStore;
  store.seedShowcase();
  const review = store.start(project, source.reviewRules.emptyEvidence(), { reviewBasis: source.reviewRules.BASIS[0] });
  store.update(review.id, { assessment: { ...source.reviewRules.defaultAssessment(), risk: 'High', costPosition: 'Insufficient information' } });
  const before = source.map.get(store.STORAGE_KEY); let calls = 0;
  const w = workspace({ controller: true, storage: source.map, key: 'unit-only-key', serviceOverrides: {
    projects: { loadProjects: async () => { calls++; return { records: [project, other], httpStatus: 'HTTP 200 OK' }; } }
  } });
  await tick();
  assert.equal(calls, 1); assert.equal(w.state.view, 'dashboard');
  assert.equal(w.elements.get('connection-status').textContent, 'SAP Sandbox · Connected');
  assert.equal(w.state.projects.length, 7);
  assert.equal(w.elements.get('projects-body').children.length, 7);
  for (const key of ['active', 'material', 'gap']) {
    click(w, `dashboard-filter-${key}`);
    assert(rows(w).some(row => row.dataset.reviewId === review.id));
    assert(!w.elements.get('dashboard-attention').textContent.includes('UNIT-SAP-CLOSED'));
  }
  assert.equal(source.map.get(store.STORAGE_KEY), before);
  const separateOrigin = workspace({ controller: true, key: 'unit-only-key', serviceOverrides: {
    projects: { loadProjects: async () => ({ records: [project, other], httpStatus: 'HTTP 200 OK' }) }
  } });
  await tick();
  assert.equal(separateOrigin.state.projects.length, 7);
  assert.equal(metric(separateOrigin, 'active'), 3);
  assert(!rows(separateOrigin).some(row => row.dataset.reviewId === review.id));
});
