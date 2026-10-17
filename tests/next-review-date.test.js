const { test } = require('node:test');
const assert = require('node:assert/strict');
const { workspace } = require('./helpers/workspace');
function setup() {
  let now = '2026-10-17T10:00:00Z';
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return Date.parse(now); } }
  const w = workspace({ clock: Clock }); w.services.reviewStore.seedShowcase(); w.services.reviewStore.captureContext("SHOWCASE-ODP-REVIEW");
  return { w, store: w.services.reviewStore, setNow(value) { now = value; } };
}
const draft = (date, outcome = 'Continue with Conditions') => ({ outcome, rationale: 'Human decision', requiredAction: 'Review evidence', actionOwner: 'Test owner', nextReviewDate: date });
for (const date of ['2000-01-01', '2026-10-16', '2026-02-30']) test(`F01 rejects ${date} without changing storage`, () => {
  const {w, store} = setup(), before = w.map.get(store.STORAGE_KEY);
  assert.throws(() => store.confirm('SHOWCASE-ODP-REVIEW', draft(date)), /date/i);
  assert.equal(w.map.get(store.STORAGE_KEY), before);
});
for (const date of ['2026-10-17', '2026-10-18']) test(`F01 accepts ${date} using confirmation timestamp`, () => {
  const {store} = setup(), record = store.confirm('SHOWCASE-ODP-REVIEW', draft(date));
  assert.equal(record.decision.nextReviewDate, date); assert.equal(record.decision.timestamp, '2026-10-17T10:00:00.000Z');
});
test('F01 revalidates across UTC midnight and keeps historical decisions readable', () => {
  const {w, store, setNow} = setup();
  setNow('2026-10-17T23:59:59Z');
  w.governanceUI.decision(store.get('SHOWCASE-ODP-REVIEW'));
  assert.equal(w.elements.get('decision-next-date').min, '2026-10-17');
  setNow('2026-10-18T00:00:00Z');
  const before = w.map.get(store.STORAGE_KEY);
  assert.throws(() => store.confirm('SHOWCASE-ODP-REVIEW', draft('2026-10-17')), /date/i);
  assert.equal(w.map.get(store.STORAGE_KEY), before);
  store.confirm('SHOWCASE-ODP-REVIEW', draft('2026-10-18'));
  setNow('2027-01-01T00:00:00Z'); assert.equal(store.get('SHOWCASE-ODP-REVIEW').decision.nextReviewDate, '2026-10-18');
});
test('F01 Continue may omit date, Stop strips it, conditional outcomes still require follow-up', () => {
  for (const outcome of ['Continue', 'Stop']) {
    const {store} = setup(); assert.equal(store.confirm('SHOWCASE-ODP-REVIEW', draft(outcome === 'Stop' ? '2000-01-01' : '', outcome)).decision.nextReviewDate, '');
  }
  for (const outcome of ['Continue with Conditions', 'Modify', 'Pause']) {
    const {store} = setup(); assert.throws(() => store.confirm('SHOWCASE-ODP-REVIEW', draft('', outcome)), /date/i);
  }
  const {store} = setup(); assert.throws(() => store.confirm('SHOWCASE-ODP-REVIEW', draft('2000-01-01', 'Continue')), /date/i);
});
