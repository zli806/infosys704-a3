const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { workspace } = require('./helpers/workspace');
const choose = (w, outcome) => {
  for (const radio of w.elements.get('decision-outcome').querySelectorAll('input')) radio.checked = radio.value === outcome;
  w.elements.get('decision-form').events.change[0]();
};
const draft = outcome => ({ outcome, rationale: 'Accountable test judgement', requiredAction: 'Complete follow-up', actionOwner: 'Unit coordinator', nextReviewDate: '2026-11-17' });

test('an active review suppresses the previous next-review date without changing the stored historical decision', () => {
  const w = workspace(), store = w.services.reviewStore; store.seedShowcase();
  const saved = store.confirm('SHOWCASE-ODP-REVIEW', draft('Modify')), snapshot = JSON.stringify(saved);
  let state = w.governanceUI.portfolioState(saved.project, store.list()); assert.equal(state.nextReview, '2026-11-17');
  const active = store.start(saved.project, saved.evidence, { reviewBasis: w.reviewRules.BASIS[0] });
  state = w.governanceUI.portfolioState(saved.project, store.list()); assert.equal(state.active.id, active.id); assert.equal(state.nextReview, null);
  w.ui.configureReviews(project => w.governanceUI.portfolioState(project, store.list())); w.ui.renderProjects([saved.project], null, () => {});
  const row = w.elements.get('projects-body').children[0]; assert.equal(row.children[3].textContent, '—'); assert.match(row.children[2].textContent, /Modify/);
  assert.equal(JSON.stringify(store.get(saved.id)), snapshot);
});

test('Stop hides and disables next review, never requires it, and changing back restores the date in the current form', () => {
  const w = workspace(), record = w.services.showcase.seededReviews()[0]; w.governanceUI.decision(record);
  w.elements.get('decision-next-date').value = '2026-11-17';
  choose(w, 'Modify'); assert.equal(w.elements.get('decision-next-review-field').hidden, false); assert.equal(w.elements.get('decision-next-date').required, true);
  choose(w, 'Stop'); assert.equal(w.elements.get('decision-next-review-field').hidden, true); assert.equal(w.elements.get('decision-next-date').disabled, true); assert.equal(w.elements.get('decision-next-date').required, false);
  assert.match(w.elements.get('decision-requirements').textContent, /no next review is scheduled/); assert.equal(w.governanceUI.readDecision().nextReviewDate, '');
  choose(w, 'Pause'); assert.equal(w.elements.get('decision-next-review-field').hidden, false); assert.equal(w.elements.get('decision-next-date').disabled, false); assert.equal(w.governanceUI.readDecision().nextReviewDate, '2026-11-17');
});

test('required asterisks mirror conditional native requirements for all five outcomes, with no default choice', () => {
  const w = workspace(); w.governanceUI.decision(w.services.showcase.seededReviews()[0]);
  const radios = w.elements.get('decision-outcome').querySelectorAll('input'); assert(radios.every(radio => radio.required && !radio.checked));
  for (const outcome of w.reviewRules.OUTCOMES) {
    choose(w, outcome); const required = w.reviewRules.needsActions(outcome);
    for (const id of ['decision-action', 'decision-action-owner', 'decision-next-date']) {
      assert.equal(w.elements.get(id).required, required); assert.equal(w.elements.get(`${id}-required`).hidden, !required);
    }
  }
  const html = readFileSync('index.html', 'utf8');
  assert.match(html, /Decision Rationale <span class="required-mark" aria-hidden="true">\*<\/span>/);
  assert.match(html, /id="decision-rationale"[^>]*required/); assert.match(html, /id="assessment-owner"[^>]*required/);
  assert.match(html, /<legend>Decision Outcome <span class="required-mark"/); assert(html.includes('(Required, selected in Assessment)'));
});

test('low-level store.start rejects latest Stop including UUID case variation and leaves records untouched', () => {
  const w = workspace(), store = w.services.reviewStore; store.seedShowcase();
  const stopped = store.get('SHOWCASE-LRP-DECISION'), before = w.map.get(store.STORAGE_KEY);
  for (const project of [stopped.project, { ...stopped.project, ProjectUUID: stopped.project.ProjectUUID.toUpperCase() }]) {
    assert.throws(() => store.start(project, stopped.evidence), /investment is stopped/);
  }
  assert.equal(w.map.get(store.STORAGE_KEY), before); assert.equal(w.reviewRules.activeReview(store.list(), stopped.project.ProjectUUID), null);
});

test('terminal guard uses latest decision timestamp rather than review-open time or any historical Stop', () => {
  const w = workspace(), store = w.services.reviewStore; store.seedShowcase();
  const seed = store.get('SHOWCASE-LRP-DECISION');
  const older = { ...seed, id: 'older-continue', reviewOpenedAt: '2026-10-01T00:00:00Z', decision: { ...seed.decision, outcome: 'Continue', timestamp: '2026-08-01T00:00:00Z' } };
  let raw = JSON.parse(w.map.get(store.STORAGE_KEY)); raw.reviews.push(older); w.map.set(store.STORAGE_KEY, JSON.stringify(raw));
  assert.throws(() => store.start(seed.project, seed.evidence), /investment is stopped/);
  raw = JSON.parse(w.map.get(store.STORAGE_KEY)); raw.reviews.find(r => r.id === older.id).decision.timestamp = '2026-10-01T00:00:00Z'; w.map.set(store.STORAGE_KEY, JSON.stringify(raw));
  const fresh = store.start(seed.project, seed.evidence, { reviewBasis: w.reviewRules.BASIS[0] }); assert.equal(fresh.status, 'in_progress'); assert.equal(store.start(seed.project, seed.evidence).id, fresh.id);
});

test('new Stop confirmations omit next review even from a direct service draft; old Stop snapshots are not rewritten', () => {
  const w = workspace(), store = w.services.reviewStore; store.seedShowcase();
  const raw = JSON.parse(w.map.get(store.STORAGE_KEY)); raw.reviews.find(r => r.id === 'SHOWCASE-LRP-DECISION').decision.nextReviewDate = '2026-12-01'; w.map.set(store.STORAGE_KEY, JSON.stringify(raw));
  const old = JSON.stringify(store.get('SHOWCASE-LRP-DECISION'));
  const saved = store.confirm('SHOWCASE-ODP-REVIEW', draft('Stop')); assert.equal(saved.decision.nextReviewDate, ''); assert.equal(saved.decisionDraft.nextReviewDate, '');
  assert.equal(JSON.stringify(store.get('SHOWCASE-LRP-DECISION')), old); assert.throws(() => store.start(saved.project, saved.evidence), /investment is stopped/);
  assert.throws(() => store.update(saved.id, {}), /cannot be edited/);
});
