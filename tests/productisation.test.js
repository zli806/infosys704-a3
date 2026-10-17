const { test } = require('node:test');
const assert = require('node:assert/strict');
const { workspace, directory } = require('./helpers/workspace');

const project = { Project: 'Unit governance context', ProjectUUID: '11111111-2222-3333-4444-555555555555' };
function model(rules, assessment = {}) {
  return { id: 'unit-review', status: 'in_progress', project, reviewBasis: rules.BASIS[1], reviewOpenedAt: '2026-10-15T00:00:00Z',
    projectContextCapturedAt: '2026-10-15T00:00:00Z', assessment: { ...rules.defaultAssessment(), ...assessment }, evidence: rules.emptyEvidence(),
    decisionOwner: '', decisionOwnerId: '', decisionOwnerSnapshot: null, decisionDraft: { outcome: '', rationale: '', requiredAction: '', actionOwner: '', nextReviewDate: '' } };
}
function choose(element, value) { for (const radio of element.querySelectorAll('input[type="radio"]')) radio.checked = radio.value === value; }

test('immutable synthetic directory is available immediately without fetch or SAP key and validates owner schema/IDs', async () => {
  const calls = []; const w = workspace({ fetchImpl: async (url, options) => { calls.push({ url, options }); return { ok: true, json: async () => structuredClone(directory) }; } });
  const service = w.services.governanceDirectory;
  const [first, second] = await Promise.all([service.load(), service.load()]);
  assert.equal(first, second); assert.equal(calls.length, 0);
  assert.equal(service.people(), first); assert(Object.isFrozen(first)); assert(Object.isFrozen(first[0]));
  assert.equal(service.resolve('GOV-001').source, 'PROTOTYPE GOVERNANCE DIRECTORY');
  assert.throws(() => service.resolve('UNKNOWN'));
  assert.throws(() => service.validate({ ...directory, schemaVersion: 2 }));
  assert.throws(() => service.validate({ ...directory, disclaimer: 'Real SAP staff' }));
  assert.throws(() => service.validate({ ...directory, people: [directory.people[0], directory.people[0]] }));
  assert.throws(() => service.validate({ ...directory, people: [{ id: 'GOV-001', name: '', role: 'Role' }] }));
});

test('offline directory needs no network; an invalid/unavailable UI configuration never invents eligible owners', async () => {
  const w = workspace({ fetchImpl: async () => { throw new Error('offline'); } });
  assert.equal(w.services.governanceDirectory.people().length, 3);
  assert.equal((await w.services.governanceDirectory.load()).length, 3);
  w.governanceUI.setDirectory([], 'Directory unavailable');
  assert.equal(w.elements.get('assessment-owner').disabled, true);
  assert.match(w.elements.get('governance-directory-status').textContent, /unavailable/);
});

test('visible assessment choices retain exact enums and explicit unassessed defaults', () => {
  const w = workspace(); const review = model(w.reviewRules); w.governanceUI.assessment(review);
  const fields = { strategicAlignment: 'assessment-alignment', expectedBenefits: 'assessment-benefits', deliveryPerformance: 'assessment-delivery', risk: 'assessment-risk', futureEconomicValue: 'assessment-value', costPosition: 'assessment-cost' };
  for (const [key, id] of Object.entries(fields)) {
    const radios = w.elements.get(id).querySelectorAll('input[type="radio"]');
    assert.deepEqual(radios.map(radio => radio.value), Array.from(w.reviewRules.ASSESSMENTS[key].options));
    assert.equal(radios.filter(radio => radio.checked).length, 1);
    assert.equal(radios.find(radio => radio.checked).value, 'Not assessed');
    assert.equal(new Set(radios.map(radio => radio.name)).size, 1);
    choose(w.elements.get(id), w.reviewRules.ASSESSMENTS[key].options.find(value => value !== 'Not assessed'));
  }
  choose(w.elements.get('assessment-cost'), 'Insufficient information');
  assert.equal(w.governanceUI.readAssessment().assessment.costPosition, 'Insufficient information');
});

test('owner selected in Assessment is authoritative through Summary, Decision and saved record', async () => {
  const w = workspace(); const people = await w.services.governanceDirectory.load(); w.governanceUI.setDirectory(people);
  const store = w.services.reviewStore; let review = store.start(project, w.reviewRules.emptyEvidence());
  w.governanceUI.assessment(review);
  assert.equal(w.elements.get('assessment-owner').value, '');
  assert.equal(w.elements.get('assessment-owner').children.length, people.length + 1);
  w.elements.get('assessment-owner').value = 'GOV-002';
  const patch = w.governanceUI.readAssessment(); assert.equal(patch.decisionOwnerId, 'GOV-002');
  const evidence = w.reviewRules.emptyEvidence(); evidence.lifecycle = { ...evidence.lifecycle, attempted: true, loaded: true, status: 'success', elementCount: 0 };
  evidence.gl.attempted = true; evidence.po.attempted = true;
  const assessment = w.reviewRules.defaultAssessment(); for (const [key, field] of Object.entries(w.reviewRules.ASSESSMENTS)) assessment[key] = field.options.find(value => value !== 'Not assessed'); assessment.costPosition = 'Insufficient information';
  review = store.update(review.id, { ...patch, reviewBasis: w.reviewRules.BASIS[0], assessment, evidence });
  assert(w.reviewRules.readiness(review).ready); assert.equal(review.decisionOwner, 'Morgan Chen'); assert.equal(review.decisionOwnerSnapshot.role, 'Executive Sponsor');
  w.governanceUI.reviewSummary(review); assert(w.elements.get('review-summary').textContent.includes('Morgan Chen')); assert(w.elements.get('review-summary').textContent.includes('Executive Sponsor'));
  w.governanceUI.decision(review); assert.equal(w.governanceUI.readDecision().outcome, '');
  assert(w.elements.get('decision-owner').textContent.includes('Morgan Chen'));
  w.elements.get('decision-owner').value = 'Independent override';
  assert.equal(w.governanceUI.readDecision().owner, 'Morgan Chen');
  const saved = store.confirm(review.id, { outcome: 'Modify', rationale: 'Explicit unit choice', owner: 'Spoofed owner', requiredAction: 'Follow up', actionOwner: 'Any action coordinator', nextReviewDate: '2026-11-01' });
  assert.equal(saved.decision.owner, 'Morgan Chen'); assert.equal(saved.decision.ownerId, 'GOV-002'); assert.equal(saved.decision.ownerSnapshot.role, 'Executive Sponsor'); assert.equal(saved.decision.actionOwner, 'Any action coordinator');
  w.governanceUI.confirmation(saved); assert.equal(w.elements.get('confirmation-outcome').textContent, 'Modify'); assert(w.elements.get('confirmation-record').textContent.includes('Morgan Chen')); assert(w.elements.get('confirmation-record').textContent.includes('Executive Sponsor'));
  assert.throws(() => store.update(saved.id, { decisionOwnerId: 'GOV-001' }));
});

test('legacy text-only saved owners remain readable, are not inferred as directory members, and can be explicitly replaced', async () => {
  const w = workspace(); const s = w.services.reviewStore;
  const legacy = model(w.reviewRules); delete legacy.decisionOwnerId; delete legacy.decisionOwnerSnapshot; legacy.decisionOwner = 'Previously entered owner';
  const raw = JSON.stringify({ version: 1, reviews: [legacy] }); w.map.set(s.STORAGE_KEY, raw);
  let review = s.get(legacy.id); assert.equal(w.map.get(s.STORAGE_KEY), raw); assert.equal(review.decisionOwner, 'Previously entered owner'); assert.equal(review.decisionOwnerId, '');
  const people = await w.services.governanceDirectory.load(); w.governanceUI.setDirectory(people); w.governanceUI.assessment(review);
  assert.equal(w.elements.get('assessment-owner').value, '__legacy__'); assert.match(w.elements.get('governance-directory-status').textContent, /preserved/);
  assert(!w.reviewRules.readiness(review).ready);
  assert.throws(() => s.confirm(review.id, { outcome: 'Continue', rationale: 'Unit', owner: review.decisionOwner }), /eligible Decision Owner/);
  review = s.update(review.id, { decisionOwnerId: 'GOV-003' }); assert.equal(review.decisionOwnerSnapshot.id, 'GOV-003');
  const oldDecision = { ...legacy, status: 'decision_recorded', decision: { outcome: 'Stop', rationale: 'Previously recorded rationale', owner: 'Historic text owner', timestamp: '2026-10-15T01:00:00Z', assessmentSnapshot: legacy.assessment, evidenceSnapshot: legacy.evidence } };
  w.map.set(s.STORAGE_KEY, JSON.stringify({ version: 1, reviews: [oldDecision] }));
  const saved = s.get(legacy.id); w.governanceUI.confirmation(saved);
  assert(w.elements.get('confirmation-record').textContent.includes('Historic text owner')); assert(w.elements.get('confirmation-record').textContent.includes('not verified'));
});

test('decision radio cards have no default outcome; conditional follow-up remains required and optional details retain values', () => {
  const w = workspace(); const review = model(w.reviewRules); w.governanceUI.decision(review);
  const group = w.elements.get('decision-outcome'); const cards = group.querySelectorAll('input[type="radio"]');
  assert.deepEqual(cards.map(radio => radio.value), Array.from(w.reviewRules.OUTCOMES)); assert(!cards.some(radio => radio.checked));
  w.elements.get('decision-action').value = 'Retained optional action';
  w.elements.get('decision-action-owner').value = 'Retained action owner';
  // Dispatch the same change listener registered by the production binding.
  for (const outcome of w.reviewRules.OUTCOMES) {
    choose(group, outcome); for (const callback of w.elements.get('decision-form').events.change) callback();
    const required = w.reviewRules.needsActions(outcome);
    for (const id of ['decision-action', 'decision-action-owner', 'decision-next-date']) assert.equal(w.elements.get(id).required, required);
    assert.equal(w.elements.get('decision-follow-up').open, required);
  }
  assert.equal(w.governanceUI.readDecision().outcome, 'Stop');
  assert.equal(w.governanceUI.readDecision().requiredAction, 'Retained optional action');
  assert.equal(w.governanceUI.readDecision().actionOwner, 'Retained action owner');
});

test('Needs Attention derives only open explicit signals/timing, never completed decisions or an outcome', () => {
  const w = workspace(); const r = w.reviewRules; const now = new Date('2026-10-20T00:00:00Z');
  const mild = model(r, { expectedBenefits: 'Partially' }); mild.id = 'mild';
  const gap = model(r, { costPosition: 'Insufficient information' }); gap.id = 'gap';
  const overdue = model(r); overdue.id = 'overdue'; overdue.reviewOpenedAt = '2026-10-01T00:00:00Z';
  const escalated = model(r); escalated.id = 'escalated'; escalated.reviewOpenedAt = '2026-09-01T00:00:00Z';
  const complete = { ...gap, id: 'recorded', status: 'decision_recorded', decision: { outcome: 'Pause', timestamp: '2026-10-19T00:00:00Z' } };
  const unassessed = model(r); unassessed.id = 'unassessed';
  const list = [mild, gap, overdue, escalated, complete, unassessed]; const before = JSON.stringify(list);
  const items = r.needsAttention(list, now); assert.deepEqual(new Set(Array.from(items, item => item.review.id)), new Set(['mild', 'gap', 'overdue', 'escalated']));
  assert.equal(items[0].timing.status, 'Escalation threshold reached'); assert.equal(JSON.stringify(list), before);
  w.governanceUI.renderDashboard([model(r, { risk: 'High' })], 0, () => {}); assert(w.elements.get('dashboard-attention').textContent.includes('1 Material')); assert(w.elements.get('dashboard-attention').textContent.includes(r.BASIS[1]));
  w.governanceUI.renderDashboard([], 0, () => {}); assert(w.elements.get('dashboard-attention').textContent.includes('No active reviews'));
  w.governanceUI.renderDashboard([], 0, () => {}, false); assert(w.elements.get('dashboard-attention').textContent.includes('unavailable'));
});
