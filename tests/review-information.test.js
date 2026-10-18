const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { workspace, startReview } = require('./helpers/workspace');
const tick = () => new Promise(r => setImmediate(r));
const all = el => [el, ...el.children.flatMap(all)];
const byClass = (el, name) => all(el).filter(el => (el.className || '').split(' ').includes(name));
const click = (w, id) => w.document.getElementById(id).events.click[0]();
const submit = (w, id) => w.elements.get(id).events.submit[0]({ preventDefault() {} });
const chooseTrigger = (w, value) => { for (const radio of w.elements.get('review-start-trigger').querySelectorAll('input')) radio.checked = radio.value === value; };
async function unreviewed(w) { click(w, 'nav-investments'); w.elements.get('projects-body').children[3].children[4].children[0].events.click[0](); await tick(); }
const normal = { strategicAlignment: 'High', expectedBenefits: 'Yes', futureEconomicValue: 'Positive', deliveryPerformance: 'On track', costPosition: 'Within expectations', risk: 'Low' };

test('review-start dialog requires an explicit trigger and Cancel/Escape never create a review', async () => {
  const w = workspace({ controller: true }); await unreviewed(w); const before = w.map.get(w.services.reviewStore.STORAGE_KEY);
  click(w, 'start-review'); assert.equal(w.elements.get('review-start-dialog').open, true); assert.equal(w.state.view, 'detail');
  assert.deepEqual(w.elements.get('review-start-trigger').querySelectorAll('input').map(r => r.value), ['Scheduled stage-gate review', 'Material trigger']);
  assert(w.elements.get('review-start-trigger').querySelectorAll('input').every(r => !r.checked && r.required));
  submit(w, 'review-start-form'); assert.equal(w.elements.get('review-start-error').hidden, false); assert.equal(w.map.get(w.services.reviewStore.STORAGE_KEY), before);
  click(w, 'review-start-cancel'); assert.equal(w.elements.get('review-start-dialog').open, false); assert.equal(w.elements.get('start-review').focused, true);
  click(w, 'start-review'); chooseTrigger(w, 'Material trigger'); w.elements.get('review-start-dialog').events.cancel[0]({ preventDefault() {} });
  assert.equal(w.elements.get('review-start-dialog').open, false); assert.equal(w.map.get(w.services.reviewStore.STORAGE_KEY), before);
});

test('review creation writes trigger and new cycle atomically; neither Dashboard nor source evidence infers it', async () => {
  const w = workspace({ controller: true }); await unreviewed(w); const store = w.services.reviewStore, before = store.list().length;
  const writes = [], original = w.map.set.bind(w.map); w.map.set = (key, value) => { if (key === store.STORAGE_KEY) writes.push(JSON.parse(value)); return original(key, value); };
  click(w, 'start-review'); assert.equal(writes.length, 0); chooseTrigger(w, 'Material trigger'); submit(w, 'review-start-form');
  const record = store.get(w.state.currentReviewID); assert.equal(w.state.view, 'assessment'); assert.equal(record.reviewBasis, 'Material trigger'); assert.equal(store.list().length, before + 1);
  assert.equal(writes.length, 1); assert.equal(writes[0].reviews.find(r => r.id === record.id).reviewBasis, 'Material trigger');
  assert.equal(w.reviewRules.reviewSignals(record).materialConcerns.length, 0); assert(w.elements.get('workspace-review-context').textContent.includes('Material trigger'));
  click(w, 'nav-dashboard'); const row = w.elements.get('dashboard-attention').children.find(r => r.dataset.reviewId === record.id); assert(row.textContent.includes('Material trigger')); assert(!row.textContent.includes('1 Material'));
});

test('store rejects missing/invalid trigger before allocating a new record but reuses an existing active cycle without changing its trigger', () => {
  const w = workspace(), store = w.services.reviewStore, project = w.services.showcase.projects()[3], evidence = w.services.showcase.evidence(project);
  const before = w.map.get(store.STORAGE_KEY);
  for (const options of [undefined, {}, { reviewBasis: '' }, { reviewBasis: 'SAP detected concern' }]) assert.throws(() => store.start(project, evidence, options), /Select a Review Trigger/);
  assert.equal(w.map.get(store.STORAGE_KEY), before);
  const record = store.start(project, evidence, { reviewBasis: 'Scheduled stage-gate review' }), saved = JSON.stringify(record);
  assert.equal(store.start(project, evidence, { reviewBasis: 'Material trigger' }).id, record.id); assert.equal(JSON.stringify(store.get(record.id)), saved);
});

test('failed atomic review save leaves the dialog open and does not expose a partial active review', async () => {
  const w = workspace({ controller: true }); await unreviewed(w); const store = w.services.reviewStore, before = w.map.get(store.STORAGE_KEY), original = w.map.set.bind(w.map);
  click(w, 'start-review'); chooseTrigger(w, 'Scheduled stage-gate review'); w.map.set = () => { throw new Error('Unit quota failure'); };
  submit(w, 'review-start-form'); assert.equal(w.elements.get('review-start-dialog').open, true); assert.equal(w.elements.get('review-start-error').hidden, false); assert.equal(w.state.view, 'detail');
  assert.equal(w.map.get(store.STORAGE_KEY), before); assert.equal(w.reviewRules.activeReview(store.list(), w.state.selectedProject.ProjectUUID), null); w.map.set = original;
});

test('new non-Stop cycle uses the same dialog and preserves the previous immutable record; seeded active reviews never prompt', async () => {
  const w = workspace({ controller: true }), store = w.services.reviewStore;
  click(w, 'nav-investments'); w.elements.get('projects-body').children[0].children[4].children[0].events.click[0]();
  assert.equal(w.state.view, 'summary'); assert.notEqual(w.elements.get('review-start-dialog').open, true);
  store.confirm('SHOWCASE-ODP-REVIEW', { outcome: 'Continue', rationale: 'Human continuation judgement' }); const before = JSON.stringify(store.get('SHOWCASE-ODP-REVIEW'));
  click(w, 'workspace-tab-overview'); await tick(); assert.equal(w.elements.get('start-review').textContent, 'Start New Review');
  startReview(w, 'Scheduled stage-gate review'); const record = store.get(w.state.currentReviewID);
  assert.notEqual(record.id, 'SHOWCASE-ODP-REVIEW'); assert.equal(record.reviewBasis, 'Scheduled stage-gate review'); assert.equal(JSON.stringify(store.get('SHOWCASE-ODP-REVIEW')), before);
});

test('legacy missing trigger is explicitly recovered without resetting review ID/opened time or touching history', () => {
  const source = workspace(), store = source.services.reviewStore; store.seedShowcase(); const raw = JSON.parse(source.map.get(store.STORAGE_KEY)); raw.reviews.find(r => r.id === 'SHOWCASE-ODP-REVIEW').reviewBasis = ''; source.map.set(store.STORAGE_KEY, JSON.stringify(raw));
  const w = workspace({ controller: true, storage: source.map }), before = w.services.reviewStore.get('SHOWCASE-ODP-REVIEW'), history = JSON.stringify(w.services.reviewStore.get('SHOWCASE-LRP-DECISION'));
  click(w, 'nav-investments'); w.elements.get('projects-body').children[0].children[4].children[0].events.click[0](); assert.equal(w.state.view, 'assessment'); assert.equal(w.elements.get('review-trigger').hidden, false);
  submit(w, 'assessment-form'); assert.equal(w.state.view, 'summary'); click(w, 'review-step-decision'); assert.equal(w.state.view, 'summary'); assert.match(w.elements.get('workflow-message').textContent, /Review Trigger/);
  click(w, 'set-review-trigger'); assert.equal(w.elements.get('review-start-title').textContent, 'Set Review Trigger'); chooseTrigger(w, 'Material trigger'); submit(w, 'review-start-form');
  const after = w.services.reviewStore.get(before.id); assert.equal(after.id, before.id); assert.equal(after.reviewOpenedAt, before.reviewOpenedAt); assert.equal(after.reviewBasis, 'Material trigger'); assert.equal(w.state.view, 'summary'); assert.equal(w.elements.get('review-trigger').hidden, true);
  assert.equal(JSON.stringify(w.services.reviewStore.get('SHOWCASE-LRP-DECISION')), history);
});

test('Assessment owns judgements/owner/notes: missing remains internal, Insufficient information is visible and dimension help reuses rule questions', () => {
  const w = workspace(), seed = w.services.showcase.seededReviews()[0]; w.governanceUI.assessment({ ...seed, assessment: w.reviewRules.defaultAssessment() });
  const fields = { strategicAlignment: 'assessment-alignment', expectedBenefits: 'assessment-benefits', futureEconomicValue: 'assessment-value', deliveryPerformance: 'assessment-delivery', costPosition: 'assessment-cost', risk: 'assessment-risk' };
  for (const [key, id] of Object.entries(fields)) {
    const radios = w.elements.get(id).querySelectorAll('input'); assert(!radios.some(r => r.value === 'Not assessed')); assert(radios.every(r => !r.checked)); assert.equal(w.governanceUI.readAssessment().assessment[key], 'Not assessed');
    assert.equal(w.document.getElementById(`context-tip-${id}`).textContent, w.reviewRules.ASSESSMENTS[key].question);
  }
  assert(w.elements.get('assessment-cost').querySelectorAll('input').some(r => r.value === 'Insufficient information'));
  assert(!Object.hasOwn(w.governanceUI.readAssessment(), 'reviewBasis'));
  const completeGap = { ...seed, assessment: { ...normal, costPosition: 'Insufficient information' } }; assert.equal(w.reviewRules.readiness(completeGap).ready, true); assert.equal(w.reviewRules.reviewSignals(completeGap).evidenceGaps.length, 1);
  const html = readFileSync('index.html', 'utf8'), assessment = html.slice(html.indexOf('<form id="assessment-form"'), html.indexOf('<section id="summary-view"'));
  assert(!assessment.includes('review-basis')); assert(!assessment.includes('Financial evidence considered')); assert(!assessment.includes('assessment-financial-evidence')); assert(assessment.includes('Optional Review Notes')); assert.match(assessment, /id="assessment-owner"[^>]*required/);
});

test('Summary has exactly one headline, one six-dimensional matrix, the real timeline and three compact Evidence Status states', () => {
  const w = workspace(), record = w.services.showcase.seededReviews()[0], before = JSON.stringify(record); w.governanceUI.reviewSummary(record);
  assert.equal(byClass(w.elements.get('summary-decision-overview'), 'summary-signal-counts').length, 1); assert.match(w.elements.get('summary-decision-overview').textContent, /3 Material · 2 Emerging · 0 Evidence Gaps/);
  assert(!w.elements.get('summary-decision-overview').textContent.includes('Due')); assert.equal(byClass(w.elements.get('review-summary'), 'assessment-signal').length, 6);
  assert.equal(byClass(w.elements.get('review-summary'), 'management-attention').length, 0); assert.equal(byClass(w.elements.get('review-summary'), 'attention-group').length, 0);
  assert.equal(byClass(w.elements.get('review-summary'), 'timeline-step').length, 3); assert.equal(byClass(w.elements.get('review-summary'), 'evidence-basis-item').length, 3);
  assert(!w.elements.get('review-summary').textContent.includes('linked accounting entries')); assert(!w.elements.get('review-summary').textContent.includes('Decision Owner'));
  const notes = byClass(w.elements.get('review-summary'), 'optional-context')[0]; assert.equal(notes.open, false); assert.match(notes.textContent, /^Reviewer Context/); assert.equal(JSON.stringify(record), before);
});

test('Evidence Status reuses source status truthfully without treating availability as sufficient or confirmed human review', () => {
  const w = workspace(), record = w.services.showcase.seededReviews()[2];
  for (const [status, count, label] of [['success', 0, 'Limited evidence'], ['error', null, 'Error'], ['unavailable', null, 'Unavailable'], ['not_attempted', null, 'Unavailable'], ['success', 2, 'Available']]) {
    record.evidence.po = { ...record.evidence.po, status, linkedRecordCount: count }; w.governanceUI.reviewSummary(record);
    const items = byClass(w.elements.get('review-summary'), 'evidence-basis-item'); assert.equal(items[2].children[1].textContent, label);
    assert(w.elements.get('review-summary').textContent.includes('not evidence sufficiency or confirmation of human review')); assert.equal(w.reviewRules.reviewSignals(record).evidenceGaps.length, 1);
  }
});

test('View evidence action goes to Overview evidence, while Decision retains only outcome/rationale/accountability/follow-up', async () => {
  const w = workspace({ controller: true }); click(w, 'nav-investments'); w.elements.get('projects-body').children[0].children[4].children[0].events.click[0]();
  const button = all(w.elements.get('review-summary')).find(el => el.tag === 'button' && el.textContent.startsWith('View evidence in Overview')); button.events.click[0](); await tick();
  assert.equal(w.state.view, 'detail'); assert.equal(w.elements.get('overview-evidence-title').focused, true); assert.equal(w.elements.get('investment-technical-details').open, false);
  click(w, 'workspace-tab-current'); click(w, 'proceed-decision'); const radios = w.elements.get('decision-outcome').querySelectorAll('input'); assert.deepEqual(radios.map(r => r.value), Array.from(w.reviewRules.OUTCOMES)); assert(radios.every(r => !r.checked));
  const html = readFileSync('index.html', 'utf8'); assert(!html.includes('id="decision-context-counts"')); assert.match(html, /id="decision-rationale"[^>]*required/); assert(html.includes('id="decision-owner"')); assert(html.includes('id="decision-follow-up"'));
});

test('stage width and compact header are explicit layout contracts rather than a narrower 1120px current-review column', () => {
  const css = readFileSync('styles.css', 'utf8'), html = readFileSync('index.html', 'utf8');
  assert.match(css, /\.customer-review\s*\{[^}]*width:100%;[^}]*max-width:none/);
  assert(!css.match(/\.current-review-heading\s*\{[^}]*max-width:1120px/)); assert(!css.match(/\.workspace-empty\s*\{[^}]*max-width:1120px/));
  const header = html.slice(html.indexOf('<header class="workspace-header"'), html.indexOf('<div class="workspace-tabs"')); assert(!header.includes('class="eyebrow"'));
  assert.match(html, /class="current-review-heading sr-only"/); assert.match(html, /<dialog id="review-start-dialog" aria-labelledby="review-start-title" aria-describedby="review-start-help"/);
});
