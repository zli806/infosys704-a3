const { test } = require('node:test');
const assert = require('node:assert/strict');
const { workspace } = require('./helpers/workspace');
const at = new Date('2026-10-15T12:00:00Z');
const tick = () => new Promise(resolve => setImmediate(resolve));
const descendants = el => [el, ...el.children.flatMap(descendants)];
const byClass = (el, name) => descendants(el).filter(child => (child.className || '').split(' ').includes(name));
const external = { Project: 'Unit unrelated review', ProjectUUID: '11111111-2222-3333-4444-555555555555' };

test('complete prototype convention classifies every explicit assessment; Not assessed/unknown is never a gap or positive assurance', () => {
  const w = workspace(), r = w.reviewRules;
  for (const [key, normal, emerging, material] of [
    ['strategicAlignment', 'High', 'Medium', 'Low'], ['expectedBenefits', 'Yes', 'Partially', 'No'], ['deliveryPerformance', 'On track', 'At risk', 'Off track'],
    ['costPosition', 'Within expectations', 'Minor variance', 'Material variance'], ['risk', 'Low', 'Medium', 'High'], ['futureEconomicValue', 'Positive', 'Uncertain', 'Negative']]) {
    for (const [value, category] of [[normal, 'normal'], [emerging, 'emerging'], [material, 'material'], ['Not assessed', 'unassessed'], ['UNKNOWN', 'unassessed']]) {
      assert.equal(r.classifyAssessment(key, value), category);
      const signals = r.reviewSignals({ assessment: { [key]: value } });
      assert.equal(signals.materialConcerns.length, category === 'material' ? 1 : 0); assert.equal(signals.attentionItems.length, category === 'emerging' ? 1 : 0); assert.equal(signals.evidenceGaps.length, 0);
    }
  }
  assert.equal(r.classifyAssessment('costPosition', 'Insufficient information'), 'gap');
  assert.equal(r.reviewSignals({ assessment: { costPosition: 'Insufficient information' } }).evidenceGaps.length, 1);
  assert(Object.isFrozen(r.SIGNAL_RULES)); assert(Object.isFrozen(r.SIGNAL_RULES.risk.Medium));
});

test('untouched seed derives 3 open, 1 decision, 3 material, 7 emerging, 1 gap, 1 overdue on the reference date', () => {
  const w = workspace(), s = w.services.showcase, store = w.services.reviewStore, r = w.reviewRules;
  const records = store.seedShowcase(), dashboard = r.dashboard(records, 5, at), signals = dashboard.open.map(r.reviewSignals);
  assert.equal(records.length, 4); assert.equal(dashboard.open.length, 3); assert.equal(dashboard.decisions.length, 1); assert.equal(dashboard.overdue, 1);
  assert.equal(signals.reduce((n, s) => n + s.materialConcerns.length, 0), 3); assert.equal(signals.reduce((n, s) => n + s.attentionItems.length, 0), 7); assert.equal(signals.reduce((n, s) => n + s.evidenceGaps.length, 0), 1);
  assert.deepEqual(Array.from(signals, s => [s.materialConcerns.length, s.attentionItems.length, s.evidenceGaps.length]), [[3, 2, 0], [0, 4, 0], [0, 1, 1]]);
  const infrastructure = s.projects()[3]; assert(!records.some(record => record.project.ProjectUUID === infrastructure.ProjectUUID)); assert.equal(r.projectStatus(records, infrastructure.ProjectUUID), 'No active review');
  assert.deepEqual(new Set(Array.from(r.needsAttention(records, at), item => item.review.id)), new Set(['SHOWCASE-ODP-REVIEW', 'SHOWCASE-CRM-REVIEW', 'SHOWCASE-DAT-REVIEW']));
  const historical = records.find(record => record.id === 'SHOWCASE-LRP-DECISION'); assert.equal(historical.decision.outcome, 'Stop'); assert.equal(historical.decision.timestamp, '2026-09-02T12:00:00.000Z'); assert.equal(r.reviewSignals(historical).materialConcerns.length, 6);
  assert.equal(r.decisionErrors(historical, historical.decision).length, 0);
  for (const record of dashboard.open) { assert.equal(record.decision, null); assert.equal(record.decisionDraft.outcome, ''); assert.equal(r.readiness(record).ready, true); assert.equal(record.sources.project, 'SHOWCASE'); }
});

test('seeding is idempotent and never overwrites edited/completed versions; explicit decisions still require the human and owner rules', () => {
  const w = workspace(), store = w.services.reviewStore, records = store.seedShowcase(), hero = records.find(record => record.id === 'SHOWCASE-ODP-REVIEW');
  store.update(hero.id, { assessment: { ...hero.assessment, risk: 'Medium', comments: 'User revised judgement' } });
  const edited = w.map.get(store.STORAGE_KEY); store.seedShowcase(); assert.equal(w.map.get(store.STORAGE_KEY), edited);
  assert.throws(() => store.confirm(hero.id, { outcome: '', rationale: 'Unit' }), /Select a human/);
  assert.throws(() => store.confirm(hero.id, { outcome: 'Modify', rationale: 'Unit' }), /Required action/);
  const completed = store.confirm(hero.id, { outcome: 'Modify', rationale: 'Human-selected unit decision', owner: 'Spoofed owner', requiredAction: 'Review plan', actionOwner: 'Unit coordinator', nextReviewDate: '2026-11-01' });
  assert.equal(completed.decision.owner, 'Alex Lee'); assert.equal(completed.assessment.risk, 'Medium');
  const raw = w.map.get(store.STORAGE_KEY); store.seedShowcase(); assert.equal(w.map.get(store.STORAGE_KEY), raw);
  assert.equal(store.get(hero.id).decision.outcome, 'Modify'); assert.throws(() => store.update(hero.id, { reviewBasis: 'Other governance review' }));
});

test('Reset Showcase removes only registered showcase project records, reseeds defaults and preserves unrelated records', () => {
  const w = workspace(), store = w.services.reviewStore, s = w.services.showcase; store.seedShowcase();
  const own = store.start(external, w.reviewRules.emptyEvidence()); store.update(own.id, { assessment: { comments: 'Keep this unrelated work' } });
  const original = JSON.stringify(store.get(own.id));
  const infrastructure = store.start(s.projects()[3], s.evidence(s.projects()[3]));
  assert.equal(infrastructure.reviewBasis, ''); assert.equal(infrastructure.decisionDraft.outcome, ''); assert.equal(infrastructure.decisionOwner, '');
  assert(Object.keys(w.reviewRules.ASSESSMENTS).every(key => infrastructure.assessment[key] === 'Not assessed'));
  store.confirm('SHOWCASE-ODP-REVIEW', { outcome: 'Continue', rationale: 'Explicit unit judgement' });
  const reset = store.seedShowcase({ reset: true }); assert.equal(reset.length, 5); assert.equal(JSON.stringify(store.get(own.id)), original);
  assert.equal(store.get('SHOWCASE-ODP-REVIEW').status, 'in_progress'); assert.equal(store.get('SHOWCASE-ODP-REVIEW').decision, null);
  assert(!reset.some(record => record.project.ProjectUUID === s.projects()[3].ProjectUUID));
  assert.equal(store.get('SHOWCASE-LRP-DECISION').decision.outcome, 'Stop');
});

test('normal read-through trigger migration preserves legacy open and completed records, owners and raw storage until a write', () => {
  const w = workspace(), store = w.services.reviewStore;
  const record = store.start(external, w.reviewRules.emptyEvidence());
  const data = JSON.parse(w.map.get(store.STORAGE_KEY)); data.reviews[0].reviewBasis = 'Material trigger / concern';
  const original = JSON.stringify(data); w.map.set(store.STORAGE_KEY, original);
  const migrated = store.get(record.id); assert.equal(migrated.reviewBasis, 'Material trigger'); assert.equal(w.map.get(store.STORAGE_KEY), original);
  w.governanceUI.assessment(migrated); w.governanceUI.chrome(migrated, false); assert(!w.elements.get('review-trigger').textContent.includes('/ concern'));
  data.reviews[0].status = 'decision_recorded'; data.reviews[0].decision = { outcome: 'Stop', rationale: 'Legacy decision', owner: 'Legacy owner', timestamp: '2026-10-14T12:00:00Z' };
  w.map.set(store.STORAGE_KEY, JSON.stringify(data)); const completed = store.get(record.id); assert.equal(completed.reviewBasis, 'Material trigger'); assert.equal(completed.decision.owner, 'Legacy owner'); assert.equal(completed.decision.outcome, 'Stop');
  assert.equal(w.reviewRules.normalizeBasis('Scheduled governance review'), 'Scheduled stage-gate review');
});

test('showcase cards, financial context, source badges, seeded controls and historical confirmation share normal rendering', () => {
  const w = workspace(), s = w.services.showcase, records = w.services.reviewStore.seedShowcase();
  w.governanceUI.details(s.projects()[0], s.evidence(s.projects()[0]), records);
  const text = w.elements.get('showcase-investment-context').textContent;
  for (const value of ['A$8.40m', 'A$6.15m', 'A$9.35m', '+A$0.95m (+11.3%)', 'A$3.20m', 'A$1.48m', 'A$1.07m']) assert(text.includes(value), value);
  assert.equal(w.elements.get('detail-source').textContent, 'SHOWCASE'); assert(w.elements.get('technical-source').textContent.includes('Not live SAP Sandbox'));
  assert(w.elements.get('detail-lifecycle-overview').textContent.includes('5 project components')); assert(w.elements.get('detail-financial-overview').textContent.includes('10 linked accounting')); assert(w.elements.get('detail-procurement-overview').textContent.includes('4 linked purchase-order'));
  const hero = records.find(r => r.id === 'SHOWCASE-ODP-REVIEW'); w.governanceUI.assessment(hero); w.governanceUI.reviewSummary(hero); w.governanceUI.decision(hero);
  assert(!w.elements.get('decision-outcome').querySelectorAll('input').some(radio => radio.checked));
  assert(w.elements.get('review-summary').textContent.includes('3 material concerns · 2 emerging concerns')); assert(!w.elements.get('review-summary').textContent.includes('Attention item'));
  const gap = s.projects()[2]; w.governanceUI.details(gap, s.evidence(gap), records); assert(w.elements.get('showcase-investment-context').textContent.includes('Not validated'));
  w.governanceUI.details(external, w.reviewRules.emptyEvidence(), records); assert.equal(w.elements.get('showcase-investment-context').hidden, true); assert.equal(w.elements.get('showcase-investment-context').textContent, ''); assert.equal(w.elements.get('detail-source').textContent, 'SAP SANDBOX');
  w.governanceUI.confirmation(records.find(r => r.id === 'SHOWCASE-LRP-DECISION')); assert(w.elements.get('confirmation-record').textContent.includes('Synthetic historical showcase decision'));
  w.governanceUI.renderDashboard(records, 5, () => {}); assert(w.elements.get('dashboard-decisions').textContent.includes('Legacy Reporting Consolidation')); assert(!w.elements.get('dashboard-attention').textContent.includes('Legacy Reporting Consolidation'));
});

test('showcase is immediately usable without key/network; live failure does not replace it and duplicates cannot override it', async () => {
  let calls = 0;
  const offline = workspace({ controller: true, fetchImpl: async () => { calls++; throw new Error('No network'); } }); await tick();
  assert.equal(calls, 0); assert.equal(offline.state.projects.length, 5); assert.equal(offline.state.reviews.length, 4);
  offline.elements.get('projects-body').children[0].children[4].children[0].events.click[0]();
  assert.equal(offline.state.view, 'summary'); offline.elements.get('review-back-investment').events.click[0](); await tick();
  assert.equal(calls, 0); assert.equal(offline.state.glRecords.length, 10); assert.equal(offline.state.poRecords.length, 4);
  const failed = workspace({ controller: true, key: 'unit-only-key', serviceOverrides: { projects: { loadProjects: async () => { throw new Error('Unit outage'); } } } }); await tick();
  assert.equal(failed.state.projects.length, 5); assert.equal(failed.elements.get('projects-body').children.length, 5); assert.equal(failed.elements.get('project-refresh-error').hidden, false);
  failed.elements.get('project-diagnostics').events.click[0](); await tick();
  assert.equal(failed.elements.get('investment-technical-details').open, true); assert.equal(failed.elements.get('connection-details').hidden, false);
  assert.equal(failed.state.glRecords.length, 10); // Inspection does not need to fabricate or retry live data.
  const merged = workspace({ controller: true, key: 'unit-only-key', serviceOverrides: { projects: { loadProjects: async () => ({ records: [external, external, { ...offline.services.showcase.projects()[0], ProjectDescription: 'Must not override synthetic source' }], httpStatus: 'HTTP 200 OK' }) } } }); await tick();
  assert.equal(merged.state.projects.length, 6); assert.equal(merged.state.projects[0].ProjectDescription, 'Digital Ordering Platform Modernisation'); assert.equal(merged.state.projects[5].ProjectUUID, external.ProjectUUID);
});

test('reset UI requires confirmation and retains the live list/configuration and unrelated reviews', async () => {
  const w = workspace({ controller: true }); await tick(); const store = w.services.reviewStore;
  const own = store.start(external, w.reviewRules.emptyEvidence()); const projects = JSON.stringify(w.state.projects);
  store.update('SHOWCASE-ODP-REVIEW', { assessment: { ...store.get('SHOWCASE-ODP-REVIEW').assessment, comments: 'User edit to retain on cancel' } });
  const reset = w.elements.get('reset-showcase').events.click[0]; const before = w.map.get(store.STORAGE_KEY); reset(); assert.equal(w.map.get(store.STORAGE_KEY), before);
  w.confirmReset(true); reset(); assert(!store.get('SHOWCASE-ODP-REVIEW').assessment.comments.includes('User edit')); assert(store.get(own.id)); assert.equal(JSON.stringify(w.state.projects), projects);
  assert.equal(w.state.view, 'dashboard');
});

test('invalid browser storage is never overwritten by automatic seeding or reset', () => {
  const map = new Map([['dpeA3.reviews.v1', '{broken']]); const w = workspace({ storage: map });
  assert.throws(() => w.services.reviewStore.seedShowcase(), /malformed/); assert.throws(() => w.services.reviewStore.seedShowcase({ reset: true }), /malformed/);
  assert.equal(map.get('dpeA3.reviews.v1'), '{broken');
});
