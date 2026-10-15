const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { workspace } = require('./helpers/workspace');
const tick = () => new Promise(resolve => setImmediate(resolve));
const descendants = el => [el, ...el.children.flatMap(descendants)];
const byClass = (el, name) => descendants(el).filter(child => (child.className || '').split(' ').includes(name));
const click = (w, id) => w.elements.get(id).events.click.forEach(callback => callback());
const change = (w, form) => w.elements.get(form).events.change.forEach(callback => callback());
const submit = (w, form) => w.elements.get(form).events.submit[0]({ preventDefault() {} });
function choose(w, group, value) { for (const radio of w.elements.get(group).querySelectorAll('input')) radio.checked = radio.value === value; }
async function openInvestment(w, index) { click(w, 'nav-investments'); w.elements.get('projects-body').children[index].children[5].children[0].events.click[0](); await tick(); }
function reset(w) { w.confirmReset(true); click(w, 'reset-showcase'); }

test('ready hero CTA resumes Summary, exposes five unselected choices, records Modify, persists and resets through controller/DOM events', async () => {
  const w = workspace({ controller: true }); reset(w); await openInvestment(w, 0);
  assert.equal(w.elements.get('start-review').textContent, 'Review Summary & Decide');
  assert(w.elements.get('detail-review-status').textContent.includes('Assessment complete · Ready for governance decision'));
  click(w, 'start-review'); assert.equal(w.state.view, 'summary');
  assert(w.elements.get('review-summary').textContent.includes('3 material concerns · 2 emerging concerns'));
  click(w, 'proceed-decision'); assert.equal(w.state.view, 'decision');
  const radios = w.elements.get('decision-outcome').querySelectorAll('input');
  assert.deepEqual(radios.map(radio => radio.value), ['Continue', 'Continue with Conditions', 'Modify', 'Pause', 'Stop']);
  assert(radios.every(radio => !radio.checked && !radio.disabled));
  assert.deepEqual(w.elements.get('decision-context-counts').children.map(child => child.textContent), ['3 Material Concerns', '2 Emerging Concerns', '0 Evidence Gaps']);
  assert.equal(w.elements.get('decision-rationale-help').hidden, false);
  choose(w, 'decision-outcome', 'Modify'); change(w, 'decision-form');
  assert.equal(w.elements.get('decision-follow-up').open, true);
  submit(w, 'decision-form'); assert.equal(w.state.view, 'decision');
  for (const [id, value] of [['decision-rationale', 'Explicit unit-test human judgement'], ['decision-action', 'Revise delivery plan'], ['decision-action-owner', 'Unit coordinator'], ['decision-next-date', '2026-11-05']]) w.elements.get(id).value = value;
  change(w, 'decision-form'); submit(w, 'decision-form'); assert.equal(w.state.view, 'confirmation');
  assert.equal(w.elements.get('confirmation-outcome').textContent.toUpperCase(), 'MODIFY');
  assert(w.elements.get('confirmation-record').textContent.includes('Alex Lee')); assert(w.elements.get('confirmation-record').textContent.includes('Technology Portfolio Lead'));
  click(w, 'back-dashboard'); assert(!w.elements.get('dashboard-attention').textContent.includes('Digital Ordering Platform Modernisation'));
  assert.deepEqual(byClass(w.elements.get('dashboard-cards'), 'metric').map(card => card.children[1].textContent), ['2', '0', '1', '2']);
  const reloaded = workspace({ controller: true, storage: w.map });
  assert.equal(reloaded.services.reviewStore.get('SHOWCASE-ODP-REVIEW').decision.outcome, 'Modify');
  click(reloaded, 'nav-reviews');
  const row = reloaded.elements.get('reviews-body').children.find(row => row.children[0].textContent.includes('DPE-IT-ODP-01'));
  row.children[5].children[0].events.click[0](); assert.equal(reloaded.state.view, 'confirmation');
  reset(reloaded); assert.equal(reloaded.services.reviewStore.get('SHOWCASE-ODP-REVIEW').status, 'in_progress');
  assert.equal(reloaded.services.reviewStore.list().length, 4);
});

test('new Infrastructure review remains at Assessment until trigger, six judgements, owner and evidence are complete', async () => {
  const w = workspace({ controller: true }); reset(w); await openInvestment(w, 3);
  assert.equal(w.elements.get('start-review').textContent, 'Start Review'); click(w, 'start-review'); assert.equal(w.state.view, 'assessment');
  assert.equal(w.elements.get('start-review').textContent, 'Continue Assessment');
  assert.equal(w.elements.get('proceed-decision').disabled, true);
  click(w, 'proceed-decision'); assert.equal(w.state.view, 'assessment');
  submit(w, 'assessment-form'); assert.equal(w.state.view, 'assessment'); assert.match(w.elements.get('workflow-message').textContent, /^Complete:/);
  for (const [group, value] of [['assessment-alignment', 'High'], ['assessment-benefits', 'Yes'], ['assessment-delivery', 'On track'], ['assessment-cost', 'Within expectations'], ['assessment-risk', 'Low'], ['assessment-value', 'Positive']]) choose(w, group, value);
  change(w, 'assessment-form'); submit(w, 'assessment-form'); assert.equal(w.state.view, 'assessment');
  w.elements.get('review-basis').value = 'Scheduled stage-gate review'; change(w, 'assessment-form');
  submit(w, 'assessment-form'); assert.equal(w.state.view, 'assessment'); assert(w.elements.get('workflow-message').textContent.includes('Decision Owner'));
  w.elements.get('assessment-owner').value = 'GOV-003'; change(w, 'assessment-form');
  const store = w.services.reviewStore, id = w.state.currentReviewID, completeEvidence = store.get(id).evidence;
  // In-memory failure case only; the immutable showcase payloads are untouched.
  store.update(id, { evidence: { ...completeEvidence, lifecycle: { ...completeEvidence.lifecycle, loaded: false, status: 'error' } } });
  change(w, 'assessment-form'); submit(w, 'assessment-form'); assert.equal(w.state.view, 'assessment'); assert(w.elements.get('workflow-message').textContent.includes('Project Structure'));
  store.update(id, { evidence: completeEvidence }); change(w, 'assessment-form'); submit(w, 'assessment-form'); assert.equal(w.state.view, 'summary');
  click(w, 'proceed-decision'); assert.equal(w.state.view, 'decision'); assert.equal(w.elements.get('decision-rationale-help').hidden, true);
  assert(w.elements.get('decision-outcome').querySelectorAll('input').every(radio => !radio.checked));
  choose(w, 'decision-outcome', 'Continue'); w.elements.get('decision-rationale').value = 'Accountable unit rationale'; change(w, 'decision-form'); submit(w, 'decision-form');
  assert.equal(w.state.view, 'confirmation'); assert.equal(store.get(id).decision.outcome, 'Continue'); reset(w);
});

test('summary decision context follows the current review without stale concerns, owner or an automatic outcome', async () => {
  const w = workspace({ controller: true });
  await openInvestment(w, 0); click(w, 'start-review');
  const context = w.elements.get('summary-decision-overview');
  assert(context, 'Summary must expose the current decision context beside the decision action');
  assert(context.textContent.includes('3 material concerns'));
  assert(context.textContent.includes('2 emerging concerns'));
  assert(context.textContent.includes('0 evidence gaps'));
  assert(context.textContent.includes('Alex Lee'));
  assert.equal(w.elements.get('proceed-decision').disabled, false);
  const before = JSON.stringify(w.services.reviewStore.get('SHOWCASE-ODP-REVIEW'));
  w.governanceUI.reviewSummary(w.services.reviewStore.get('SHOWCASE-ODP-REVIEW'));
  assert.equal(JSON.stringify(w.services.reviewStore.get('SHOWCASE-ODP-REVIEW')), before);
  await openInvestment(w, 2); click(w, 'start-review');
  assert(context.textContent.includes('0 material concerns'));
  assert(context.textContent.includes('1 emerging concern'));
  assert(context.textContent.includes('1 evidence gap'));
  assert(!context.textContent.includes('3 material concerns'));
  assert(context.textContent.includes('Morgan Chen'));
  assert(!context.textContent.includes('Alex Lee'));
  assert(context.textContent.includes('26 Oct 2026'));
  click(w, 'proceed-decision');
  assert(w.elements.get('decision-outcome').querySelectorAll('input').every(radio => !radio.checked));
  reset(w);
});

test('all five human outcomes remain valid with material concerns; every outcome still needs rationale and only the existing three need follow-up', () => {
  for (const outcome of ['Continue', 'Continue with Conditions', 'Modify', 'Pause', 'Stop']) {
    const w = workspace(), store = w.services.reviewStore; store.seedShowcase();
    const hero = store.get('SHOWCASE-ODP-REVIEW'); assert.equal(w.reviewRules.reviewSignals(hero).materialConcerns.length, 3);
    assert.throws(() => store.confirm(hero.id, { outcome, rationale: '' }), /Decision rationale is required/);
    const draft = { outcome, rationale: `Accountable explanation for ${outcome}`, requiredAction: '', actionOwner: '', nextReviewDate: '' };
    if (w.reviewRules.needsActions(outcome)) { assert.throws(() => store.confirm(hero.id, draft), /Required action/); Object.assign(draft, { requiredAction: 'Follow up', actionOwner: 'Unit coordinator', nextReviewDate: '2026-11-05' }); }
    assert.equal(store.confirm(hero.id, draft).decision.outcome, outcome);
  }
});

test('structured findings match the frozen signal convention and never read SAP/context or invent an unassessed evidence gap', () => {
  const w = workspace(), r = w.reviewRules;
  const record = { assessment: { risk: 'High', costPosition: 'Insufficient information', expectedBenefits: 'Partially', deliveryPerformance: 'Not assessed' }, get evidence() { throw new Error('No SAP'); }, get project() { throw new Error('No project context'); } };
  assert.deepEqual(JSON.parse(JSON.stringify(r.signalBreakdown(record))), [
    { dimension: 'Expected Benefits', value: 'Partially', category: 'emerging' }, { dimension: 'Cost Position', value: 'Insufficient information', category: 'gap' }, { dimension: 'Risk', value: 'High', category: 'material' }
  ]);
  for (const record of w.services.showcase.seededReviews()) {
    const entries = r.signalBreakdown(record), signals = r.reviewSignals(record);
    for (const [category, count] of [['material', signals.materialConcerns.length], ['emerging', signals.attentionItems.length], ['gap', signals.evidenceGaps.length]]) assert.equal(entries.filter(entry => entry.category === category).length, count);
  }
  assert.equal(r.signalBreakdown({ assessment: r.defaultAssessment() }).length, 0);
});

test('Dashboard reveals exact dimensional reasons, four native category drill-downs and truthful signal-versus-review counts without navigation', () => {
  const w = workspace(), ui = w.governanceUI, records = w.services.reviewStore.seedShowcase(); const before = JSON.stringify(records);
  ui.renderDashboard(records, 5, () => {});
  const attention = w.elements.get('dashboard-attention'), explanations = byClass(attention, 'flag-explanation');
  assert.equal(explanations.length, 3); assert(explanations.every(details => !details.open));
  assert(explanations[0].textContent.includes('Delivery Performance — Off track')); assert(explanations[0].textContent.includes('Cost Position — Material variance')); assert(explanations[0].textContent.includes('Risk — High'));
  explanations[0].open = true; ui.renderDashboard(records, 5, () => {}); assert.equal(byClass(attention, 'flag-explanation')[0].open, true);
  const buttons = byClass(w.elements.get('attention-profile'), 'chart-select'); assert(buttons.every(button => button.tag === 'button' && button.type === 'button' && button.getAttribute('aria-controls') === 'attention-breakdown'));
  const target = w.elements.get('attention-breakdown'); assert.equal(target.hidden, true);
  for (const [category, expected] of [['material', '3 assessment signals across 1 open review'], ['emerging', '7 assessment signals across 3 open reviews'], ['gap', '1 assessment signal across 1 open review'], ['overdue', 'Decision due']]) {
    const button = buttons.find(button => button.dataset.category === category); assert(!button.disabled); button.events.click[0]();
    assert.equal(target.hidden, false); assert(target.textContent.includes(expected)); assert.equal(button.getAttribute('aria-expanded'), 'true');
    assert(!target.textContent.includes('Legacy Reporting Consolidation')); assert(!target.textContent.includes('Store Technology Infrastructure Refresh'));
  }
  const close = descendants(target).find(el => el.tag === 'button'); close.events.click[0](); assert.equal(target.hidden, true); assert.equal(buttons.find(button => button.dataset.category === 'overdue').focused, true);
  assert.equal(w.state.view, 'dashboard'); assert.equal(JSON.stringify(records), before);
});

test('timing-only flags do not invent concerns; zero categories are disabled and refreshed data clears stale explanations', () => {
  const w = workspace(), r = w.reviewRules, ui = w.governanceUI;
  const record = { id: 'timing-only', project: { Project: 'Unit timing context' }, status: 'in_progress', reviewOpenedAt: '2020-01-01T00:00:00Z', assessment: r.defaultAssessment() };
  ui.renderDashboard([record], 1, () => {});
  const why = byClass(w.elements.get('dashboard-attention'), 'flag-explanation')[0]; assert(why.textContent.includes('Timing requires attention')); assert(why.textContent.includes('Escalation threshold reached'));
  for (const label of ['Material Concerns', 'Emerging Concerns', 'Evidence Gaps']) assert(!why.textContent.includes(label));
  const buttons = byClass(w.elements.get('attention-profile'), 'chart-select'); assert(buttons.filter(button => button.disabled).length === 3);
  buttons.find(button => button.dataset.category === 'overdue').events.click[0](); assert.equal(w.elements.get('attention-breakdown').hidden, false);
  ui.renderDashboard([], 0, () => {}); assert.equal(w.elements.get('attention-breakdown').hidden, true); assert.equal(w.elements.get('attention-breakdown').textContent, '');
  const records = w.services.reviewStore.seedShowcase(); ui.renderDashboard(records, 5, () => {}); byClass(w.elements.get('attention-profile'), 'chart-select')[0].events.click[0]();
  ui.renderDashboard(records, 5, () => {}, false); assert.equal(w.elements.get('attention-breakdown').hidden, true);
});

test('static guidance remains progressive and explicit about human judgement, with no classification hints beside assessment inputs', () => {
  const html = readFileSync(join(__dirname, '../index.html'), 'utf8');
  assert.match(html, /id="proceed-decision"[^>]*>Make Governance Decision/);
  assert(html.includes('Select one outcome. Assessment signals inform this decision but do not determine it.'));
  assert(html.includes('These signals support governance judgement; they do not automatically select an outcome.'));
  assert(html.includes('This review contains material concerns. Explain how the selected outcome addresses them.'));
  assert.match(html, /<details id="signals-help"[^>]*><summary>How signals work/); assert(!html.match(/<details id="signals-help"[^>]*\bopen\b/));
  const assessment = html.slice(html.indexOf('<section id="assessment-view"'), html.indexOf('<section id="summary-view"'));
  assert(!assessment.includes('SIGNAL_RULES')); assert(!assessment.includes('Material Concern')); assert(!assessment.includes('Emerging Concern'));
  for (const word of ['Recommended outcome', 'Suggested decision', 'Auto-decision', 'Override decision']) assert(!html.includes(word));
});
