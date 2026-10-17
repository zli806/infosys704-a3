const { test } = require('node:test');
const assert = require('node:assert/strict');
const { workspace } = require('./helpers/workspace');
const UUID = 'abcdefab-1234-4234-8234-abcdefabcdef';
const project = { ProjectUUID: UUID, Project: 'IDENTITY-TEST', ProjectDescription: 'Identity test' };
const start = (w, p = project) => w.services.reviewStore.start(p, w.reviewRules.emptyEvidence(), { reviewBasis: 'Material trigger' });
function seededVariant(w, status = 'in_progress') {
  const record = JSON.parse(JSON.stringify(w.services.showcase.seededReviews()[0]));
  record.project = { ...record.project, ...project }; record.id = 'identity-a'; record.status = status;
  if (status === 'decision_recorded') record.decision = { outcome: 'Stop', rationale: 'Terminal', owner: record.decisionOwner, timestamp: '2026-10-17T00:00:00Z', nextReviewDate: '', assessmentSnapshot: record.assessment, evidenceSnapshot: record.evidence };
  return record;
}
function write(w, records) { w.map.set(w.services.reviewStore.STORAGE_KEY, JSON.stringify({version:1,reviews:records})); }
test('F02 mixed-case UUID start returns same active review, preserving raw ID and separating other investments', () => {
  const w = workspace(), first = start(w);
  assert.equal(start(w, {...project, ProjectUUID: UUID.toUpperCase()}).id, first.id);
  assert.equal(w.services.reviewStore.list().length, 1);
  assert.equal(w.services.reviewStore.get(first.id).project.ProjectUUID, UUID);
  assert.notEqual(start(w, {...project, ProjectUUID: 'bbbbbbbb-1234-4234-8234-abcdefabcdef'}).id, first.id);
});
test('F02 lookups, History and Portfolio agree across UUID case', () => {
  const w = workspace(), active = seededVariant(w), done = seededVariant(w,'decision_recorded'); done.id = 'history';
  assert.equal(w.reviewRules.activeReview([active], UUID.toUpperCase()).id, active.id);
  assert.equal(w.reviewRules.latestReview([done], UUID.toUpperCase()).id, done.id);
  assert.equal(w.reviewRules.projectStatus([done], UUID.toUpperCase()), 'Decision recorded');
  assert.equal(w.governanceUI.completedReviews([done], UUID.toUpperCase()).length, 1);
  assert.equal(w.governanceUI.portfolioState({...project, ProjectUUID:UUID.toUpperCase()}, [done]).label, 'Stopped');
});
test('F02 canonical duplicate active storage rejects reads/writes without changing raw JSON', () => {
  const w = workspace(), a = seededVariant(w), b = structuredClone(a); b.id = 'identity-b'; b.project.ProjectUUID = UUID.toUpperCase(); write(w,[a,b]);
  const before = w.map.get(w.services.reviewStore.STORAGE_KEY);
  for (const operation of [() => w.services.reviewStore.list(), () => start(w), () => w.services.reviewStore.update(a.id, {}), () => w.services.reviewStore.confirm(a.id,{})]) assert.throws(operation, /duplicate active/i);
  assert.equal(w.map.get(w.services.reviewStore.STORAGE_KEY), before);
});
test('F02 service rejects confirmation of stale case-variant active after latest Stop', () => {
  const w = workspace(), active = seededVariant(w), stop = seededVariant(w,'decision_recorded'); stop.id = 'stop'; stop.project.ProjectUUID = UUID.toUpperCase(); write(w,[active,stop]);
  const before = w.map.get(w.services.reviewStore.STORAGE_KEY);
  assert.throws(() => w.services.reviewStore.confirm(active.id,{outcome:'Continue',rationale:'Stale attempt'}), /stopped/i);
  assert.equal(w.map.get(w.services.reviewStore.STORAGE_KEY), before);
});
test('F02 invalid or missing UUIDs never share an identity', () => {
  const w = workspace();
  for (const id of [undefined, '', 'invalid']) assert.equal(w.reviewRules.activeReview([{project:{ProjectUUID:id}, status:'in_progress'}],id),null);
  assert.throws(() => start(w, {Project:'invalid'}), /UUID|invalid/i);
});
test('F02 fixed numeric Showcase UUID keeps provider and original source classification', () => {
  const w = workspace(), original = w.services.showcase.projects()[0], variant = {...original, ProjectUUID:original.ProjectUUID.toUpperCase()};
  assert.equal(w.services.showcase.isShowcase(variant), true);
  assert.deepEqual(w.services.showcase.evidence(variant), w.services.showcase.evidence(original));
});
