const { test } = require('node:test');
const assert = require('node:assert/strict');
const { workspace, startReview } = require('./helpers/workspace');
const tick = () => new Promise(r => setImmediate(r));
const el = (w, id) => w.document.getElementById(id);
const click = (w, id) => el(w, id).events.click[0]();
const submit = (w, id) => el(w, id).events.submit[0]({ preventDefault() {} });
const edit = (w, id) => el(w, id).events.input[0]();
function choose(w, id, value) { for (const input of el(w, id).querySelectorAll('input')) input.checked = input.value === value; }
function decision(w) { click(w, 'nav-investments'); el(w, 'projects-body').children[0].children[4].children[0].events.click[0](); click(w, 'review-step-decision'); }
async function overview(w) { click(w, 'nav-investments'); el(w, 'projects-body').children[3].children[4].children[0].events.click[0](); await tick(); }

test('untouched Decision is neutral; invalid Record focuses the first field and associates correctable errors without losing values', () => {
  const w = workspace({ controller: true }); el(w, 'decision-rationale').setAttribute('aria-describedby', 'decision-rationale-help'); decision(w); // Mirror the static HTML association in the lightweight DOM fixture.
  assert.equal(el(w, 'decision-outcome').getAttribute('aria-invalid'), null); assert.equal(el(w, 'decision-rationale').getAttribute('aria-invalid'), null);
  submit(w, 'decision-form'); assert.equal(w.state.view, 'decision');
  assert.equal(el(w, 'decision-outcome').getAttribute('aria-invalid'), 'true'); assert.equal(el(w, 'decision-outcome').querySelectorAll('input')[0].focused, true);
  assert.match(el(w, 'decision-rationale').getAttribute('aria-describedby'), /decision-rationale-help.*decision-rationale-error/); assert.match(el(w, 'decision-rationale-error').textContent, /Required:/);
  choose(w, 'decision-outcome', 'Continue'); edit(w, 'decision-form'); assert.equal(el(w, 'decision-outcome').getAttribute('aria-invalid'), null); assert.equal(el(w, 'decision-rationale').getAttribute('aria-invalid'), 'true');
  el(w, 'decision-rationale').value = 'Preserve accountable human judgement'; edit(w, 'decision-form'); assert.equal(el(w, 'decision-incomplete').hidden, true); assert.equal(el(w, 'decision-rationale').getAttribute('aria-invalid'), null); assert.equal(el(w, 'decision-rationale').getAttribute('aria-describedby'), 'decision-rationale-help');
  assert.equal(w.services.reviewStore.get(w.state.currentReviewID).status, 'in_progress');
});

test('conditional validation expands and focuses follow-up; all five choices retain draft values and unchanged requiredness', () => {
  const w = workspace({ controller: true }); decision(w); choose(w, 'decision-outcome', 'Modify'); el(w, 'decision-rationale').value = 'Human rationale'; submit(w, 'decision-form');
  assert.equal(el(w, 'decision-follow-up').open, true); assert.equal(el(w, 'decision-action').focused, true); assert.equal(el(w, 'decision-action-owner').getAttribute('aria-invalid'), 'true');
  for (const [id, value] of [['decision-action', 'Keep the entered action'], ['decision-action-owner', 'Accountable coordinator'], ['decision-next-date', '2026-11-17']]) el(w, id).value = value;
  edit(w, 'decision-form'); assert.equal(el(w, 'decision-incomplete').hidden, true);
  for (const outcome of w.reviewRules.OUTCOMES) {
    choose(w, 'decision-outcome', outcome); edit(w, 'decision-form');
    for (const id of ['decision-action', 'decision-action-owner', 'decision-next-date']) assert.equal(el(w, id).required, w.reviewRules.needsActions(outcome));
    assert.equal(el(w, 'decision-action').value, 'Keep the entered action'); assert.equal(el(w, 'decision-next-date').value, '2026-11-17'); assert.equal(el(w, 'decision-next-date').disabled, outcome === 'Stop');
  }
  assert.equal(el(w, 'decision-follow-up-title').textContent, 'Optional Closure Action'); assert.equal(el(w, 'decision-follow-up').open, true); assert.equal(w.governanceUI.readDecision().nextReviewDate, ''); assert.equal(w.services.reviewStore.get(w.state.currentReviewID).decision, null);
});

test('missing Trigger has linked invalid radios and focus; storage failure is distinct and survives changing a valid trigger', async () => {
  const w = workspace({ controller: true }); await overview(w); click(w, 'start-review'); submit(w, 'review-start-form');
  const group = el(w, 'review-start-trigger'), first = group.querySelectorAll('input')[0]; assert.equal(group.getAttribute('aria-invalid'), 'true'); assert.equal(first.focused, true); assert.match(first.getAttribute('aria-describedby'), /review-start-error/);
  choose(w, 'review-start-trigger', 'Material trigger'); group.events.change[0](); assert.equal(group.getAttribute('aria-invalid'), null); assert.equal(el(w, 'review-start-error').hidden, true);
  const before = w.map.get(w.services.reviewStore.STORAGE_KEY), set = w.map.set.bind(w.map); w.map.set = () => { throw new Error('Unit storage failure'); }; submit(w, 'review-start-form');
  assert.equal(el(w, 'review-start-error').dataset.kind, 'storage'); assert.equal(group.getAttribute('aria-invalid'), null); group.events.change[0](); assert.equal(el(w, 'review-start-error').hidden, false); assert.equal(w.map.get(w.services.reviewStore.STORAGE_KEY), before); w.map.set = set;
});

test('incomplete Summary preview stays available and Decision gate gives blue actionable Assessment guidance, not red validation', async () => {
  const w = workspace({ controller: true }); await overview(w); startReview(w); choose(w, 'assessment-alignment', 'High'); choose(w, 'assessment-benefits', 'Yes'); edit(w, 'assessment-form');
  submit(w, 'assessment-form'); assert.equal(w.state.view, 'summary'); assert.match(el(w, 'summary-readiness').textContent, /Assessment incomplete/); click(w, 'review-step-decision');
  assert.equal(w.state.view, 'summary'); assert.equal(el(w, 'workflow-message').dataset.kind, 'gate'); assert.equal(el(w, 'assessment-risk').getAttribute('aria-invalid'), null); assert.equal(el(w, 'assessment-risk-error').dataset.tone, 'info');
  click(w, 'review-step-assessment'); assert.equal(el(w, 'assessment-risk-error').hidden, false); el(w, 'assessment-owner').value = 'GOV-001'; edit(w, 'assessment-form'); assert.equal(el(w, 'assessment-owner-error').hidden, true);
  assert.equal(w.governanceUI.readAssessment().assessment.strategicAlignment, 'High'); assert.equal(w.services.reviewStore.get(w.state.currentReviewID).decision, null);
});

test('persistent recording and draft-write failures are not cleared by unrelated edits or validation correction', () => {
  const w = workspace({ controller: true }); decision(w); choose(w, 'decision-outcome', 'Continue'); el(w, 'decision-rationale').value = 'Human rationale'; const store = w.services.reviewStore, confirm = store.confirm;
  store.confirm = () => { throw new Error('Unit record failure'); }; submit(w, 'decision-form'); assert.equal(el(w, 'decision-incomplete').dataset.kind, 'record'); assert.equal(el(w, 'decision-incomplete').focused, true); el(w, 'decision-action').value = 'Optional edit'; edit(w, 'decision-form'); assert.equal(el(w, 'decision-incomplete').hidden, false); store.confirm = confirm;
  const update = store.update; store.update = () => { throw new Error('Unit draft failure'); }; el(w, 'decision-rationale').value = 'Keep this in-memory change'; edit(w, 'decision-form'); assert.equal(el(w, 'draft-save-error').hidden, false); edit(w, 'decision-form'); assert.equal(el(w, 'draft-save-error').hidden, false); assert.equal(el(w, 'decision-incomplete').hidden, false); store.update = update;
});
