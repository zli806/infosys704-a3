const { test } = require('node:test');
const assert = require('node:assert/strict');
const { workspace, directory } = require('./helpers/workspace');

// In-memory review/view models only: no API mocks, SAP transactions, persistent
// records or application seed data are introduced by these tests.
const plain = value => JSON.parse(JSON.stringify(value));
function record(rules, assessment = {}) {
  return {
    id: 'unit-review', status: 'in_progress',
    project: { Project: 'Unit view-model context', ProjectDescription: 'Rendering test, not SAP sample data' },
    reviewBasis: 'Material trigger', reviewOpenedAt: '2026-10-15T00:00:00Z', projectContextCapturedAt: '2026-10-15T00:00:00Z',
    assessment: { ...rules.defaultAssessment(), ...assessment }, evidence: rules.emptyEvidence(), decisionOwner: directory.people[0].name,
    decisionOwnerId: directory.people[0].id, decisionOwnerSnapshot: directory.people[0],
    decisionDraft: { outcome: '', rationale: '', requiredAction: '', actionOwner: '', nextReviewDate: '' }
  };
}
const descendants = element => [element, ...element.children.flatMap(descendants)];

test('review signals classify each explicit material concern, without a score or outcome', () => {
  const { reviewRules: rules } = workspace();
  for (const [field, value, label] of [
    ['strategicAlignment', 'Low', 'Strategic alignment is low'],
    ['expectedBenefits', 'No', 'Expected benefits are assessed as not achievable'],
    ['deliveryPerformance', 'Off track', 'Delivery is off track'],
    ['costPosition', 'Material variance', 'Cost position assessed as Material variance'],
    ['risk', 'High', 'High project risk'],
    ['futureEconomicValue', 'Negative', 'Future economic value is negative']
  ]) {
    assert.deepEqual(plain(rules.reviewSignals({ assessment: { [field]: value } })), { materialConcerns: [label], attentionItems: [], evidenceGaps: [] });
  }
});

test('softer attention and explicit evidence gaps stay separate from material concerns', () => {
  const { reviewRules: rules } = workspace();
  const result = rules.reviewSignals({ assessment: { expectedBenefits: 'Partially', deliveryPerformance: 'At risk', futureEconomicValue: 'Uncertain', costPosition: 'Insufficient information' } });
  assert.equal(result.materialConcerns.length, 0);
  assert.deepEqual(Array.from(result.attentionItems), ['Expected benefits are only partially achievable', 'Delivery is at risk', 'Future economic value is uncertain']);
  assert.deepEqual(Array.from(result.evidenceGaps), ['Cost position cannot yet be fully assessed']);
  assert.deepEqual(plain(rules.reviewSignals({ assessment: rules.defaultAssessment() })), { materialConcerns: [], attentionItems: [], evidenceGaps: [] });
});

test('signals ignore SAP evidence, unknown/missing answers and do not mutate reviewer input', () => {
  const { reviewRules: rules } = workspace();
  const review = Object.freeze({ assessment: Object.freeze({ risk: 'High', costPosition: 'Insufficient information' }),
    get evidence() { throw new Error('SAP evidence must not drive signals'); },
    get project() { throw new Error('SAP context must not drive signals'); } });
  const result = rules.reviewSignals(review);
  assert.equal(result.materialConcerns.length, 1); assert.equal(result.evidenceGaps.length, 1);
  assert.deepEqual(Object.keys(result).sort(), ['attentionItems', 'evidenceGaps', 'materialConcerns']);
  for (const value of [undefined, null, {}, { assessment: { risk: 'unrecognised', costPosition: 'Not assessed' } }]) {
    assert.deepEqual(plain(rules.reviewSignals(value)), { materialConcerns: [], attentionItems: [], evidenceGaps: [] });
  }
});

test('one categorical matrix leads Summary with a single headline, timeline and compact evidence basis', () => {
  const { reviewRules: rules, governanceUI: ui, elements } = workspace();
  const review = record(rules, { strategicAlignment: 'Medium', expectedBenefits: 'Partially', deliveryPerformance: 'Off track', costPosition: 'Insufficient information', risk: 'High', futureEconomicValue: 'Negative' });
  ui.reviewSummary(review);
  const target = elements.get('review-summary');
  assert.match(target.children[0].textContent, /^Assessment at a Glance/);
  assert.match(elements.get('summary-decision-overview').textContent, /3 Material · 2 Emerging · 1 Evidence Gap/);
  for (const value of ['Strategic Alignment', 'Expected Benefits', 'Delivery Performance', 'Risk', 'Future Economic Value', 'Insufficient information', 'Material Concern', 'Emerging Concern', 'Evidence Gap']) assert(target.children[0].textContent.includes(value), value);
  assert(!target.textContent.includes('Management Attention Required'));
  for (const title of ['Governance Timeline', 'Evidence Basis']) assert(target.children.some(child => child.textContent.startsWith(title)), title);
  assert.equal(target.children.length, 4); assert(target.textContent.includes('View evidence in Overview'));
  assert.equal(review.assessment.costPosition, 'Insufficient information');
  assert(!descendants(target.children[0]).some(child => child.className === 'source reviewer'));
});

test('no signals is qualified, not assurance of safe continuation; outcome stays human-selected', () => {
  const { reviewRules: rules, governanceUI: ui, elements } = workspace();
  const review = record(rules);
  ui.reviewSummary(review); ui.decision(review);
  const snapshot = elements.get('review-summary').children[0].textContent;
  assert(snapshot.includes('Not assessed'));
  assert(!snapshot.includes('Safe to continue')); assert(!snapshot.includes('recommendation'));
  assert.equal(elements.get('decision-outcome').value, '');
  assert(rules.decisionErrors(review, ui.readDecision()).includes('Select a human governance decision.'));
});

test('stored Review Trigger is visible in compact header and historical record without inference', () => {
  const { reviewRules: rules, governanceUI: ui, elements } = workspace();
  const review = record(rules);
  ui.decision(review); ui.chrome(review, false); ui.details(review.project, review.evidence, [review]);
  assert.equal(elements.get('review-trigger').hidden, true); assert(elements.get('workspace-review-context').textContent.includes('Due') && elements.get('workspace-review-context').textContent.includes(review.reviewBasis));
  review.status = 'decision_recorded';
  review.decision = { outcome: 'Pause', rationale: 'Explicit unit-test reviewer choice', owner: 'Unit reviewer', timestamp: '2026-10-15T01:00:00Z', requiredAction: 'Follow up', actionOwner: 'Unit owner', nextReviewDate: '2026-11-01', decisionTarget: rules.calendarTarget(review.reviewOpenedAt, 14), escalationThreshold: rules.calendarTarget(review.reviewOpenedAt, 30), assessmentSnapshot: review.assessment, evidenceSnapshot: review.evidence };
  ui.confirmation(review);
  const text = elements.get('confirmation-record').textContent;
  for (const label of ['Review Trigger (REVIEWER INPUT)', review.reviewBasis, 'Decision (REVIEWER INPUT)', 'Rationale (REVIEWER INPUT)', 'Decision owner (REVIEWER INPUT)', 'Required action (REVIEWER INPUT)', 'Action owner (REVIEWER INPUT)', 'Next review date (REVIEWER INPUT)']) assert(text.includes(label), label);
});

test('saved-only investments remain represented in percentages without a monitored sentence or data mutation', () => {
  const { reviewRules: rules, governanceUI: ui, elements } = workspace();
  const reviews = [record(rules)]; const before = JSON.stringify(reviews);
  ui.renderDashboard(reviews, [], () => {}, true, true);
  assert.equal(descendants(elements.get('dashboard-cards')).find(el => el.id === 'dashboard-filter-active').children[2].children[1].textContent, '100%');
  assert(!elements.get('dashboard-cards').textContent.includes('Load SAP Projects'));
  assert.equal(JSON.stringify(reviews), before);
  ui.renderDashboard(reviews, Array.from({ length: 5 }, (_, i) => ({ ProjectUUID: `other-${i}` })), () => {}, true, true);
  assert.equal(descendants(elements.get('dashboard-cards')).find(el => el.id === 'dashboard-filter-active').children[2].children[1].textContent, '17%');
  assert(!elements.get('dashboard-cards').textContent.includes('refresh the current portfolio view'));
  ui.renderDashboard([], [], () => {});
  assert(!elements.get('dashboard-cards').textContent.includes('refresh the current portfolio view'));
});

test('business evidence wording distinguishes zero matches, failure, unavailable, unrequested and loading', () => {
  const { reviewRules: rules, governanceUI: ui, elements } = workspace();
  const review = record(rules);
  function summary(status, linkedRecordCount = null) {
    review.evidence.po = { ...rules.emptyEvidence().po, attempted: status !== 'not_attempted', status, linkedRecordCount };
    ui.details(review.project, review.evidence, [review]);
    return elements.get('detail-procurement-overview').textContent;
  }
  assert(summary('success', 0).includes('This does not establish that procurement exposure is zero.'));
  assert(summary('error').includes('Could not refresh this evidence'));
  assert(summary('unavailable').includes('current project information'));
  assert(summary('not_attempted').includes('Waiting for project structure'));
  assert(!summary('success', 2).includes('No linked Purchase Order account assignments were found'));
  review.evidence.gl = { ...rules.emptyEvidence().gl, attempted: true, status: 'success', linkedRecordCount: 0 };
  ui.details(review.project, review.evidence, [review]);
  assert(elements.get('detail-financial-overview').textContent.includes('This does not establish that project cost is zero.'));
  // Pending controller is UI runtime state, not a new SAP evidence state.
  const loaded = workspace(); loaded.runtime.state = { poController: {} };
  loaded.governanceUI.details(review.project, review.evidence, [review]);
  const pending = loaded.elements.get('detail-procurement-overview').textContent;
  assert(pending.includes('Loading') && pending.includes('Refreshing evidence'));
  assert(!pending.includes('validated linked records'));
  assert.equal(ui.evidenceStatus(review.evidence.po, true).label, 'Loading');
});
