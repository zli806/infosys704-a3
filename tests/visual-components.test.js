const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { workspace, directory } = require('./helpers/workspace');

const descendants = element => [element, ...element.children.flatMap(descendants)];
const byClass = (element, name) => descendants(element).filter(child => (child.className || '').split(' ').includes(name));
function record(rules, assessment = {}) {
  return { id: 'presentation-only-review', status: 'in_progress',
    project: { Project: 'Unit presentation context', ProjectDescription: 'In-memory UI test; not SAP sample data' },
    reviewOpenedAt: '2026-01-01T00:00:00.000Z', projectContextCapturedAt: '2026-01-01T00:00:00.000Z', reviewBasis: rules.BASIS[1],
    assessment: { ...rules.defaultAssessment(), ...assessment }, evidence: rules.emptyEvidence(),
    decisionOwner: directory.people[0].name, decisionOwnerId: directory.people[0].id, decisionOwnerSnapshot: directory.people[0],
    decisionDraft: { outcome: '', rationale: '', requiredAction: '', actionOwner: '', nextReviewDate: '' } };
}

test('dashboard uses governance metrics, separate session context and actionable attention anatomy', () => {
  const w = workspace(); const first = record(w.reviewRules, { risk: 'High' });
  const second = { ...record(w.reviewRules, { costPosition: 'Insufficient information', futureEconomicValue: 'Negative' }), id: 'second' };
  const completed = { ...first, id: 'closed', status: 'decision_recorded', decision: { outcome: 'Modify', timestamp: '2026-01-02T00:00:00Z' } };
  let opened;
  w.governanceUI.renderDashboard([first, second, completed], 5, id => { opened = id; });
  const cards = byClass(w.elements.get('dashboard-cards'), 'status-card');
  assert.deepEqual(cards.map(card => card.children[0].textContent), ['Open Reviews', 'Material Concerns', 'Evidence Gaps', 'Decisions Recorded']);
  assert.deepEqual(cards.map(card => card.children[1].textContent), ['2', '2', '1', '1']);
  assert.equal(byClass(w.elements.get('dashboard-cards'), 'session-context').length, 1);
  const items = byClass(w.elements.get('dashboard-attention'), 'attention-item'); assert.equal(items.length, 2);
  assert.equal(byClass(items[0], 'attention-count').length, 1);
  assert(items[0].textContent.includes(first.reviewBasis) && items[0].textContent.includes('days overdue'));
  byClass(items[0], 'attention-action')[0].events.click[0](); assert.equal(opened, first.id);
});

test('six-dimension matrix uses explicit input and existing categorical signals, not numeric scoring', () => {
  const w = workspace(); const review = record(w.reviewRules, { strategicAlignment: 'High', expectedBenefits: 'Partially', deliveryPerformance: 'At risk', costPosition: 'Material variance', risk: 'High', futureEconomicValue: 'Negative' });
  const before = JSON.stringify(review); w.governanceUI.reviewSummary(review);
  const matrix = byClass(w.elements.get('review-summary'), 'signal-matrix')[0];
  const cards = byClass(matrix, 'assessment-signal'); assert.equal(cards.length, 6);
  assert.deepEqual(cards.map(card => card.dataset.dimension), Object.keys(w.reviewRules.ASSESSMENTS));
  assert.deepEqual(cards.map(card => card.dataset.tone), ['normal', 'emerging', 'emerging', 'material', 'material', 'material']);
  for (const card of cards) { assert(card.textContent.includes(review.assessment[card.dataset.dimension])); assert.equal(byClass(card, 'semantic-label').length, 1); }
  assert.equal(JSON.stringify(review), before);
  w.governanceUI.reviewSummary(record(w.reviewRules));
  assert(byClass(w.elements.get('review-summary'), 'assessment-signal').every(card => card.dataset.tone === 'unassessed'));
});

test('governance timeline keeps actual dates/text and positions the recorded milestone in date order', () => {
  const w = workspace(); const review = record(w.reviewRules);
  w.governanceUI.reviewSummary(review);
  const timing = w.elements.get('review-summary'); let steps = byClass(timing, 'timeline-step');
  assert.equal(steps.length, 3);
  assert.deepEqual(steps.map(step => step.children[1].dateTime), [review.reviewOpenedAt, w.reviewRules.calendarTarget(review.reviewOpenedAt, 14), w.reviewRules.calendarTarget(review.reviewOpenedAt, 30)]);
  assert.equal(byClass(timing, 'timing-status')[0].textContent, w.reviewRules.timing(review).status);
  assert(steps.every(step => step.children[1].getAttribute('aria-label').includes('UTC')));
  review.status = 'decision_recorded'; review.decision = { timestamp: '2026-01-10T12:00:00.000Z' };
  w.governanceUI.reviewSummary(review); steps = byClass(timing, 'timeline-step');
  assert.equal(steps.length, 4); assert.equal(steps[1].dataset.state, 'recorded');
  assert.equal(byClass(timing, 'timing-status')[0].textContent, 'Decision recorded');
});

test('trigger treatment reflects only the selected basis, with a neutral scheduled variant', () => {
  const w = workspace(); const review = record(w.reviewRules); w.governanceUI.decision(review); w.governanceUI.chrome(review, false);
  assert.equal(w.elements.get('review-trigger').dataset.trigger, 'material');
  assert(w.elements.get('review-trigger').textContent.includes('Decision due'));
  review.reviewBasis = 'Scheduled governance review'; w.governanceUI.chrome(review, false);
  assert.equal(w.elements.get('review-trigger').dataset.trigger, 'scheduled');
});

test('decision cards have neutral descriptions and a non-colour selected marker without choosing an outcome', () => {
  const w = workspace(); const group = w.elements.get('decision-outcome');
  const cards = byClass(group, 'choice-card'); assert.equal(cards.length, 5);
  assert(cards.every(card => byClass(card, 'choice-description').length === 1));
  assert(cards.every(card => byClass(card, 'choice-selected')[0].textContent === 'Selected'));
  assert(!group.querySelectorAll('input[type="radio"]').some(radio => radio.checked));
  assert(cards[2].textContent.includes('Change scope, plan or investment approach before continuing.'));
  w.governanceUI.decision(record(w.reviewRules)); assert.equal(w.governanceUI.readDecision().outcome, '');
});

test('record context presents project, owner name/role and date before grouped details', () => {
  const w = workspace(); const review = record(w.reviewRules); review.status = 'decision_recorded';
  review.decision = { outcome: 'Modify', rationale: 'Human unit-test rationale', owner: review.decisionOwner,
    ownerId: review.decisionOwnerId, ownerSnapshot: review.decisionOwnerSnapshot, timestamp: '2026-01-10T12:00:00Z',
    requiredAction: 'Follow up', actionOwner: 'Unit owner', nextReviewDate: '2026-02-01',
    decisionTarget: w.reviewRules.calendarTarget(review.reviewOpenedAt, 14), escalationThreshold: w.reviewRules.calendarTarget(review.reviewOpenedAt, 30), assessmentSnapshot: review.assessment, evidenceSnapshot: review.evidence };
  w.governanceUI.confirmation(review);
  assert.equal(w.elements.get('confirmation-outcome').textContent, 'Modify');
  const context = w.elements.get('confirmation-record').children[0]; assert.equal(context.className, 'decision-record-context');
  for (const text of [review.project.ProjectDescription, review.decisionOwner, review.decisionOwnerSnapshot.role, 'UTC']) assert(context.textContent.includes(text));
});

test('three evidence cards retain original technical/raw hooks, and the categorical matrix stays responsive without chart libraries', () => {
  const html = readFileSync(join(__dirname, '../index.html'), 'utf8');
  const css = readFileSync(join(__dirname, '../styles.css'), 'utf8');
  assert.equal((html.match(/<section class="evidence-status-card">/g) || []).length, 3);
  for (const id of ['raw-response', 'raw-elements-response', 'raw-gl-response', 'raw-gl-diagnostic', 'raw-po-response', 'elements-body', 'gl-body', 'po-body']) assert(html.includes(`id="${id}"`));
  assert(html.includes('decision-record-hero'));
  assert(css.includes('.signal-matrix { display:grid; grid-template-columns:repeat(2,minmax(0,1fr))'));
  assert(css.includes('.signal-matrix,.decision-choices .choice-options { grid-template-columns:1fr; }'));
  assert(css.includes('.choice-card:has(input:checked) .choice-selected { display:block; }'));
  assert(!html.includes('<canvas'));
});
