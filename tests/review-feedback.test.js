const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');

// In-memory review/view models only: no API mocks, SAP transactions, persistent
// records or application seed data are introduced by these tests.
function workspace() {
  class Element {
    constructor(tag = 'div') { this.tag = tag; this.children = []; this.dataset = {}; this.attributes = {}; this.value = ''; this._text = ''; }
    set textContent(value) { this._text = String(value); this.children = []; }
    get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
    append(...children) { this.children.push(...children); }
    appendChild(child) { this.append(child); return child; }
    replaceChildren(...children) { this._text = ''; this.children = children; }
    setAttribute(name, value) { this.attributes[name] = value; }
    removeAttribute(name) { delete this.attributes[name]; }
    addEventListener() {}
  }
  const elements = new Map();
  const document = {
    getElementById(id) { if (!elements.has(id)) { const element = new Element(); element.id = id; elements.set(id, element); } return elements.get(id); },
    createElement(tag) { return new Element(tag); },
    querySelectorAll() { return []; }
  };
  const context = { window: {}, document, Intl, Date };
  for (const file of ['js/core/utils.js', 'js/core/review-rules.js', 'js/ui/renderers.js', 'js/ui/governance.js']) {
    runInNewContext(readFileSync(join(__dirname, '..', file), 'utf8'), context, { filename: file });
  }
  return { ...context.window.DPEApp, elements, runtime: context.window.DPEApp };
}
const plain = value => JSON.parse(JSON.stringify(value));
function record(rules, assessment = {}) {
  return {
    id: 'unit-review', status: 'in_progress',
    project: { Project: 'Unit view-model context', ProjectDescription: 'Rendering test, not SAP sample data' },
    reviewBasis: 'Material trigger / concern', reviewOpenedAt: '2026-10-15T00:00:00Z', projectContextCapturedAt: '2026-10-15T00:00:00Z',
    assessment: { ...rules.defaultAssessment(), ...assessment }, evidence: rules.emptyEvidence(), decisionOwner: 'Unit reviewer',
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
  assert.deepEqual(Array.from(result.evidenceGaps), ['Cost position cannot be fully assessed']);
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

test('executive snapshot leads Summary, shows mixed indicators and retains detailed SAP sections', () => {
  const { reviewRules: rules, governanceUI: ui, elements } = workspace();
  const review = record(rules, { strategicAlignment: 'Medium', expectedBenefits: 'Partially', deliveryPerformance: 'Off track', costPosition: 'Insufficient information', risk: 'High', futureEconomicValue: 'Negative' });
  ui.reviewSummary(review);
  const target = elements.get('review-summary');
  assert.match(target.children[0].textContent, /^Executive Review Snapshot/);
  assert.match(target.children[0].textContent, /3 material concerns · 1 attention item · 1 evidence gap/);
  for (const value of ['Review Basis', review.reviewBasis, 'Strategic Alignment', 'Expected Benefits', 'Delivery Performance', 'Risk', 'Future Economic Value', 'Decision Target', 'Management Attention', 'High project risk', 'Delivery is off track', 'Future economic value is negative', 'Cost position cannot be fully assessed']) assert(target.children[0].textContent.includes(value), value);
  for (const title of ['Project Context', 'Lifecycle / WBS', 'G/L Financial Evidence', 'Purchase Order Evidence', 'Reviewer Assessment', 'Governance Timing']) assert(target.children.some(child => child.textContent.startsWith(title)), title);
  assert(target.textContent.includes('Evidence gap identified: cost position assessed as Insufficient information.'));
  assert.equal(review.assessment.costPosition, 'Insufficient information');
  assert(descendants(target.children[0]).some(child => child.className === 'source reviewer' && child.textContent === 'REVIEWER INPUT'));
});

test('no signals is qualified, not assurance of safe continuation; outcome stays human-selected', () => {
  const { reviewRules: rules, governanceUI: ui, elements } = workspace();
  const review = record(rules);
  ui.reviewSummary(review); ui.decision(review);
  const snapshot = elements.get('review-summary').children[0].textContent;
  assert(snapshot.includes('No material concerns identified from the current reviewer assessment.'));
  assert(snapshot.includes('not scores, weights, recommendations or assurance that the investment is safe to continue'));
  assert(snapshot.includes('Unassessed categories are not classified'));
  assert.equal(elements.get('decision-outcome').value, '');
  assert(rules.decisionErrors(review, ui.readDecision()).includes('Select a human governance decision.'));
});

test('Review Basis is visible in header and saved confirmation without trigger inference', () => {
  const { reviewRules: rules, governanceUI: ui, elements } = workspace();
  const review = record(rules);
  ui.decision(review); ui.chrome(review, false);
  assert(elements.get('current-review-project').textContent.includes('Review Basis: ' + review.reviewBasis));
  review.status = 'decision_recorded';
  review.decision = { outcome: 'Pause', rationale: 'Explicit unit-test reviewer choice', owner: 'Unit reviewer', timestamp: '2026-10-15T01:00:00Z', requiredAction: 'Follow up', actionOwner: 'Unit owner', nextReviewDate: '2026-11-01', decisionTarget: rules.calendarTarget(review.reviewOpenedAt, 14), escalationThreshold: rules.calendarTarget(review.reviewOpenedAt, 30), assessmentSnapshot: review.assessment, evidenceSnapshot: review.evidence };
  ui.confirmation(review);
  const text = elements.get('confirmation-record').textContent;
  for (const label of ['Review Basis (REVIEWER INPUT)', review.reviewBasis, 'Decision (REVIEWER INPUT)', 'Rationale (REVIEWER INPUT)', 'Decision owner (REVIEWER INPUT)', 'Required action (REVIEWER INPUT)', 'Action owner (REVIEWER INPUT)', 'Next review date (REVIEWER INPUT)']) assert(text.includes(label), label);
});

test('session project count explains saved records after refresh without loading or clearing anything', () => {
  const { reviewRules: rules, governanceUI: ui, elements } = workspace();
  const reviews = [record(rules)]; const before = JSON.stringify(reviews);
  ui.renderDashboard(reviews, 0, () => {});
  assert(elements.get('dashboard-cards').textContent.includes('SAP Projects Loaded This Session'));
  assert(elements.get('dashboard-cards').textContent.includes('Load SAP Projects to refresh the current portfolio view.'));
  assert.equal(JSON.stringify(reviews), before);
  ui.renderDashboard(reviews, 5, () => {});
  assert(!elements.get('dashboard-cards').textContent.includes('refresh the current portfolio view'));
  ui.renderDashboard([], 0, () => {});
  assert(!elements.get('dashboard-cards').textContent.includes('refresh the current portfolio view'));
});

test('business evidence wording distinguishes zero matches, failure, unavailable, unrequested and loading', () => {
  const { reviewRules: rules, governanceUI: ui, elements } = workspace();
  const review = record(rules);
  function summary(status, linkedRecordCount = null) {
    review.evidence.po = { ...rules.emptyEvidence().po, attempted: status !== 'not_attempted', status, linkedRecordCount };
    ui.reviewSummary(review);
    return elements.get('review-summary').children.find(child => child.textContent.startsWith('Purchase Order Evidence')).textContent;
  }
  assert(summary('success', 0).includes('This does not establish that procurement exposure is zero.'));
  assert(summary('error').includes('attempted but failed technically'));
  assert(summary('unavailable').includes('current identifiers or configuration'));
  assert(summary('not_attempted').includes('not yet been requested'));
  assert(!summary('success', 2).includes('No linked Purchase Order account assignments were found'));
  review.evidence.gl = { ...rules.emptyEvidence().gl, attempted: true, status: 'success', linkedRecordCount: 0 };
  ui.reviewSummary(review);
  assert(elements.get('review-summary').textContent.includes('This does not establish that project cost is zero.'));
  // Pending controller is UI runtime state, not a new SAP evidence state.
  const loaded = workspace(); loaded.runtime.state = { poController: {} };
  loaded.governanceUI.details(review.project, review.evidence, [review]);
  const pending = loaded.elements.get('detail-procurement-overview').textContent;
  assert(pending.includes('Loading') && pending.includes('Please wait'));
  assert(!pending.includes('validated linked records'));
  assert.equal(ui.evidenceStatus(review.evidence.po, true).label, 'Loading');
});
