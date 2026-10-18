const { test } = require('node:test');
const assert = require('node:assert/strict');
const { workspace } = require('./helpers/workspace');
const all = el => [el, ...el.children.flatMap(all)];
const byClass = (el, cls) => all(el).filter(n => (n.className || '').split(' ').includes(cls));
const tones = ['continue', 'conditional', 'modify', 'pause', 'stop'];

test('five categorical choice tones retain exact outcomes, no default selection and explicit text labels', () => {
  const w = workspace(), choices = byClass(w.elements.get('decision-outcome'), 'choice-card');
  assert.deepEqual(choices.map(c => c.dataset.outcomeTone), tones); assert.deepEqual(choices.map(c => c.querySelectorAll('input')[0].value), Array.from(w.reviewRules.OUTCOMES));
  assert(choices.every(c => !c.querySelectorAll('input')[0].checked)); assert(choices.every(c => c.textContent.includes(c.querySelectorAll('input')[0].value)));
});

test('all recorded outcomes use the same category in ledger and hero; complete audit data stays read-only and long prose appears once', () => {
  for (const [index, outcome] of ['Continue', 'Continue with Conditions', 'Modify', 'Pause', 'Stop'].entries()) {
    const w = workspace(), store = w.services.reviewStore; store.seedShowcase(); const active = store.get('SHOWCASE-ODP-REVIEW');
    const rationale = `Human ${outcome} rationale ` + 'Traceable judgement with supporting context. '.repeat(30), required = w.reviewRules.needsActions(outcome);
    const action = required ? 'Specific follow-up with retained accountability.' : '';
    const saved = store.confirm(active.id, { outcome, rationale, requiredAction: action, actionOwner: required ? 'Unit coordinator' : '', nextReviewDate: required ? '2026-11-17' : '' });
    const before = w.map.get(store.STORAGE_KEY); w.governanceUI.details(saved.project, saved.evidence, [saved]); w.governanceUI.confirmation(saved);
    const target = w.elements.get('confirmation-record'), context = byClass(target, 'decision-record-context')[0], main = byClass(target, 'record-main')[0];
    assert.equal(w.elements.get('confirmation-view').dataset.outcomeTone, tones[index]); assert.equal(byClass(w.elements.get('investment-history-body'), 'governance-chip')[0].dataset.outcomeTone, tones[index]);
    assert.equal(target.textContent.split(rationale).length - 1, 1); assert(main.textContent.includes(rationale)); assert(context.textContent.includes(saved.decision.owner)); assert(context.textContent.includes(saved.reviewBasis)); assert(context.textContent.includes('UTC')); assert(byClass(context, 'source')[0].title.includes('Not live SAP'));
    if (required) { assert(main.textContent.includes(action)); assert.equal(target.textContent.split(action).length - 1, 1); } else assert(!main.children.some(n => n.textContent.startsWith('Follow-up')));
    for (const field of Object.values(w.reviewRules.ASSESSMENTS)) assert(target.textContent.includes(field.label));
    for (const label of ['Record ID', 'ProjectUUID', '14-day target', '30-day threshold', 'Assessment Snapshot', 'Saved assessment / synthetic showcase evidence']) assert(target.textContent.includes(label), label);
    assert.equal(w.map.get(store.STORAGE_KEY), before); assert.equal(JSON.stringify(store.get(saved.id)), JSON.stringify(saved));
  }
});

test('legacy historic owner and saved source summaries remain visible without identity inference or migration', () => {
  const w = workspace(), record = w.services.showcase.seededReviews()[3]; record.decision.ownerId = ''; record.decision.ownerSnapshot = null; record.decision.owner = 'Historic text-only owner';
  const before = JSON.stringify(record); w.governanceUI.confirmation(record); const text = w.elements.get('confirmation-record').textContent;
  assert(text.includes('Historic text-only owner')); assert(text.includes('not verified')); assert(text.includes('Evidence as of:')); assert.equal(JSON.stringify(record), before);
});
