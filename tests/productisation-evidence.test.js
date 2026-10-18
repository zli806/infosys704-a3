const { test } = require('node:test');
const assert = require('node:assert/strict');
const { workspace } = require('./helpers/workspace');
const tick = () => new Promise(r => setImmediate(r));
const el = (w, id) => w.document.getElementById(id);
const click = (w, id) => el(w, id).events.click[0]();
const all = el => [el, ...el.children.flatMap(all)];
const byClass = (el, cls) => all(el).filter(n => (n.className || '').split(' ').includes(cls));

test('three Overview detail actions open the existing disclosure and focus their existing data sections without fetching or writing', async () => {
  let fetches = 0; const w = workspace({ controller: true, fetchImpl: async () => { fetches++; throw new Error('No network expected'); } }); click(w, 'nav-investments'); el(w, 'projects-body').children[3].children[4].children[0].events.click[0](); await tick();
  const before = w.map.get(w.services.reviewStore.STORAGE_KEY), records = JSON.stringify([w.state.projectElements, w.state.glRecords, w.state.poRecords]);
  for (const [button, title] of [['view-lifecycle-details', 'elements-detail-title'], ['view-financial-details', 'gl-detail-title'], ['view-procurement-details', 'po-detail-title']]) {
    el(w, 'investment-technical-details').open = false; click(w, button); assert.equal(el(w, 'investment-technical-details').open, true); assert.equal(el(w, title).focused, true); assert.equal(el(w, 'evidence-detail-notice').hidden, true); assert.equal(w.state.view, 'detail');
  }
  assert.equal(fetches, 0); assert.equal(w.map.get(w.services.reviewStore.STORAGE_KEY), before); assert.equal(JSON.stringify([w.state.projectElements, w.state.glRecords, w.state.poRecords]), records); assert.equal(el(w, 'detail-source').textContent, 'SHOWCASE');
});

test('hidden historical detail sections give a truthful focused fallback, not a new request or false evidence availability', () => {
  const w = workspace({ controller: true }), record = w.services.reviewStore.get('SHOWCASE-LRP-DECISION');
  w.state.selectedFromSnapshot = true; const evidence = JSON.parse(JSON.stringify(record.decision.evidenceSnapshot)); evidence.po.status = 'error';
  w.governanceUI.details(record.project, evidence, [record], true); el(w, 'po-panel').hidden = true; click(w, 'view-procurement-details');
  assert.equal(el(w, 'evidence-detail-notice').hidden, false); assert.equal(el(w, 'evidence-detail-notice').focused, true); assert.match(el(w, 'evidence-detail-notice').textContent, /Source status: Error/); assert.match(el(w, 'evidence-detail-notice').textContent, /summaries only; no fresh request/); assert.equal(el(w, 'load-po-evidence').hidden, false);
});

test('compact Summary statuses preserve all source-state semantics, qualifications and the existing Overview navigation action', () => {
  const w = workspace(), record = w.services.showcase.seededReviews()[0], before = JSON.stringify(record);
  w.governanceUI.reviewSummary(record); const status = byClass(el(w, 'review-summary'), 'summary-source-status')[0];
  assert(status); assert(status.textContent.startsWith('Evidence Status')); assert(!status.className.split(' ').includes('panel')); assert.equal(byClass(status, 'evidence-basis-item').length, 3); assert.match(status.textContent, /not evidence sufficiency or confirmation of human review/); assert.equal(JSON.stringify(record), before);
  for (const [value, count, expected] of [['success', 0, 'Limited evidence'], ['error', null, 'Error'], ['unavailable', null, 'Unavailable'], ['not_attempted', null, 'Unavailable']]) {
    record.evidence.gl = { ...record.evidence.gl, status: value, linkedRecordCount: count }; w.governanceUI.reviewSummary(record); assert.equal(byClass(el(w, 'review-summary'), 'evidence-basis-item')[1].children[1].textContent, expected);
  }
  w.state.glController = {}; w.governanceUI.reviewSummary(record); assert.equal(byClass(el(w, 'review-summary'), 'evidence-basis-item')[1].children[1].textContent, 'Loading');
});
