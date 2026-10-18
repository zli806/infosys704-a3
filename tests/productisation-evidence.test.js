const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { workspace } = require('./helpers/workspace');
const el = (w, id) => w.document.getElementById(id);
const all = el => [el, ...el.children.flatMap(all)];
const byClass = (el, cls) => all(el).filter(n => (n.className || '').split(' ').includes(cls));

test('Overview has one native Technical Details disclosure, with no duplicate card actions or dead drill-down bindings', () => {
  const html = readFileSync('index.html', 'utf8'), script = readFileSync('js/ui/governance.js', 'utf8'), w = workspace();
  assert.equal((html.match(/id="investment-technical-details"/g) || []).length, 1);
  assert.match(html, /<summary id="technical-details-summary">Technical Details<\/summary>/);
  for (const id of ['view-lifecycle-details', 'view-financial-details', 'view-procurement-details', 'evidence-detail-notice', 'elements-detail-title', 'gl-detail-title', 'po-detail-title']) {
    assert(!html.includes(`id="${id}"`)); assert(!script.includes(id)); assert.equal(w.elements.has(id), false);
  }
  assert(!script.includes('viewEvidenceDetails')); assert(!html.includes('evidence-detail-action'));
});

test('Overview re-entry closes the native disclosure and resets its scroll without fetching or writing', () => {
  let requests = 0; const w = workspace({ fetchImpl: async () => { requests++; throw new Error('Unexpected request'); } });
  const before = JSON.stringify(w.state.evidence), storage = JSON.stringify([...w.map]);
  el(w, 'investment-technical-details').open = true; el(w, 'technical-details-body').scrollTop = 200;
  w.governanceUI.showView('detail');
  assert.equal(el(w, 'investment-technical-details').open, false); assert.equal(el(w, 'technical-details-body').scrollTop, 0);
  assert.equal(requests, 0); assert.equal(JSON.stringify(w.state.evidence), before); assert.equal(JSON.stringify([...w.map]), storage);
});

test('existing connection-diagnostic entry point can still open the shared disclosure without a card selection or data mutation', () => {
  let requests = 0; const w = workspace({ fetchImpl: async () => { requests++; throw new Error('Unexpected request'); } });
  const before = JSON.stringify(w.state.evidence), storage = JSON.stringify([...w.map]);
  el(w, 'technical-details-body').scrollTop = 200; el(w, 'raw-response').textContent = 'Preserved diagnostic payload';
  w.governanceUI.openTechnical();
  assert.equal(el(w, 'investment-technical-details').open, true); assert.equal(el(w, 'technical-details-body').scrollTop, 0); assert.equal(el(w, 'raw-response').textContent, 'Preserved diagnostic payload');
  assert.equal(requests, 0); assert.equal(JSON.stringify(w.state.evidence), before); assert.equal(JSON.stringify([...w.map]), storage);
});

test('historical unavailable/error evidence retains truthful card status, provenance and Retry without fabricated detailed records', () => {
  let requests = 0; const w = workspace({ controller: true, fetchImpl: async () => { requests++; throw new Error('Unexpected request'); } });
  const record = w.services.reviewStore.get('SHOWCASE-LRP-DECISION'), before = w.map.get(w.services.reviewStore.STORAGE_KEY);
  w.state.selectedFromSnapshot = true;
  for (const [status, label] of [['error', 'Error'], ['unavailable', 'Unavailable']]) {
    const evidence = JSON.parse(JSON.stringify(record.decision.evidenceSnapshot)); evidence.po.status = status; evidence.po.note = 'Historical source qualification retained';
    el(w, 'po-panel').hidden = true; el(w, 'raw-po-response').textContent = 'No fresh query sent';
    w.governanceUI.details(record.project, evidence, [record], true);
    assert(el(w, 'detail-procurement-overview').textContent.includes(label)); assert(el(w, 'technical-evidence-context').textContent.includes(evidence.po.note));
    assert.equal(el(w, 'load-po-evidence').hidden, false); assert.equal(el(w, 'po-panel').hidden, true); assert.equal(el(w, 'raw-po-response').textContent, 'No fresh query sent');
  }
  assert.equal(requests, 0); assert.equal(w.map.get(w.services.reviewStore.STORAGE_KEY), before);
});

test('expanded native Technical Details has one labelled keyboard-scrollable bounded region with original tables and payloads retained', () => {
  const html = readFileSync('index.html', 'utf8'), css = readFileSync('styles.css', 'utf8');
  assert.match(html, /id="technical-details-body"[^>]*role="region"[^>]*aria-labelledby="technical-details-summary"[^>]*tabindex="0"/);
  const body = html.split('id="technical-details-body"')[1].split('</details>')[0];
  for (const id of ['elements-panel', 'gl-panel', 'po-panel', 'technical-evidence-context', 'raw-elements-response', 'raw-gl-response', 'raw-po-response']) assert(body.includes(`id="${id}"`), id);
  assert.match(css, /\.technical-details-body \{[^}]*height:min\(60vh,640px\)[^}]*overflow:auto/);
  assert.match(css, /\.technical-details-body:focus-visible/); assert.match(css, /\.technical-details-body pre \{ max-height:none; overflow:visible; \}/);
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
