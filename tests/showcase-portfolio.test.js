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
  store.captureContext(hero.id);
  const completed = store.confirm(hero.id, { outcome: 'Modify', rationale: 'Human-selected unit decision', owner: 'Spoofed owner', requiredAction: 'Review plan', actionOwner: 'Unit coordinator', nextReviewDate: '2026-11-01' });
  assert.equal(completed.decision.owner, 'Alex Lee'); assert.equal(completed.assessment.risk, 'Medium');
  const raw = w.map.get(store.STORAGE_KEY); store.seedShowcase(); assert.equal(w.map.get(store.STORAGE_KEY), raw);
  assert.equal(store.get(hero.id).decision.outcome, 'Modify'); assert.throws(() => store.update(hero.id, { reviewBasis: 'Other governance review' }));
});

test('Reset Showcase clears all local Showcase/SAP review cycles and drafts in one write, preserving other storage', () => {
  const w = workspace(), store = w.services.reviewStore, s = w.services.showcase; store.seedShowcase(); store.captureContext("SHOWCASE-ODP-REVIEW");
  const seed = store.get('SHOWCASE-ODP-REVIEW');
  const own = store.start(external, seed.evidence, { reviewBasis: w.reviewRules.BASIS[0] }); store.update(own.id, { assessment: seed.assessment, decisionOwnerId: seed.decisionOwnerId });
  store.confirm(own.id, { outcome: 'Continue', rationale: 'Local SAP decision for reset coverage' });
  const next = store.start(external, seed.evidence, { reviewBasis: w.reviewRules.BASIS[0] }); store.update(next.id, { assessment: { comments: 'Local SAP notes' }, decisionDraft: { outcome: 'Modify', rationale: 'Local SAP draft' } });
  w.map.set('other.application.preference', 'keep');
  const infrastructure = store.start(s.projects()[3], s.evidence(s.projects()[3]), { reviewBasis: w.reviewRules.BASIS[0] });
  assert.equal(infrastructure.reviewBasis, 'Scheduled stage-gate review'); assert.equal(infrastructure.decisionDraft.outcome, ''); assert.equal(infrastructure.decisionOwner, '');
  assert(Object.keys(w.reviewRules.ASSESSMENTS).every(key => infrastructure.assessment[key] === 'Not assessed'));
  store.confirm('SHOWCASE-ODP-REVIEW', { outcome: 'Continue', rationale: 'Explicit unit judgement' });
  const edited = w.map.get(store.STORAGE_KEY); store.seedShowcase(); assert.equal(w.map.get(store.STORAGE_KEY), edited); // Only explicit reset may clear saved work.
  let writes = 0; const set = w.map.set.bind(w.map); w.map.set = (key, value) => { if (key === store.STORAGE_KEY) writes++; return set(key, value); };
  const reset = store.seedShowcase({ reset: true }); assert.equal(reset.length, 4); assert.equal(store.get(own.id), null); assert.equal(store.get(next.id), null); assert.equal(writes, 1); assert.equal(w.map.get('other.application.preference'), 'keep');
  assert.equal(store.get('SHOWCASE-ODP-REVIEW').status, 'in_progress'); assert.equal(store.get('SHOWCASE-ODP-REVIEW').decision, null);
  assert(!reset.some(record => record.project.ProjectUUID === s.projects()[3].ProjectUUID));
  assert.equal(store.get('SHOWCASE-LRP-DECISION').decision.outcome, 'Stop');
  assert.equal(reset.filter(r => r.status === 'in_progress').length, 3); assert.equal(reset.filter(r => r.status === 'decision_recorded').length, 1);
  const baseline = w.map.get(store.STORAGE_KEY); store.seedShowcase({ reset: true }); assert.equal(w.map.get(store.STORAGE_KEY), baseline);
});

test('normal read-through trigger migration preserves legacy open and completed records, owners and raw storage until a write', () => {
  const w = workspace(), store = w.services.reviewStore;
  const record = store.start(external, w.reviewRules.emptyEvidence(), { reviewBasis: w.reviewRules.BASIS[0] });
  const data = JSON.parse(w.map.get(store.STORAGE_KEY)); data.reviews[0].reviewBasis = 'Material trigger / concern';
  const original = JSON.stringify(data); w.map.set(store.STORAGE_KEY, original);
  const migrated = store.get(record.id); assert.equal(migrated.reviewBasis, 'Material trigger'); assert.equal(w.map.get(store.STORAGE_KEY), original);
  w.governanceUI.assessment(migrated); w.governanceUI.chrome(migrated, false); assert(!w.elements.get('review-trigger').textContent.includes('/ concern'));
  data.reviews[0].status = 'decision_recorded'; data.reviews[0].decision = { outcome: 'Stop', rationale: 'Legacy decision', owner: 'Legacy owner', timestamp: '2026-10-14T12:00:00Z' };
  w.map.set(store.STORAGE_KEY, JSON.stringify(data)); const completed = store.get(record.id); assert.equal(completed.reviewBasis, 'Material trigger'); assert.equal(completed.decision.owner, 'Legacy owner'); assert.equal(completed.decision.outcome, 'Stop');
  assert.equal(w.reviewRules.normalizeBasis('Scheduled governance review'), 'Scheduled stage-gate review');
});

test('showcase cards, financial context, source badges, seeded controls and historical confirmation share normal rendering', () => {
  const w = workspace(), s = w.services.showcase, records = w.services.reviewStore.seedShowcase(); w.services.reviewStore.captureContext("SHOWCASE-ODP-REVIEW");
  w.governanceUI.details(s.projects()[0], s.evidence(s.projects()[0]), records);
  const text = w.elements.get('showcase-investment-context').textContent;
  for (const value of ['A$8.40m', 'A$6.15m', 'A$9.35m', '+A$0.95m (+11.3%)', 'A$3.20m', 'A$1.48m', 'A$1.07m']) assert(text.includes(value), value);
  assert.equal(w.elements.get('detail-source').textContent, 'SHOWCASE'); assert(w.elements.get('technical-source').textContent.includes('Not live SAP Sandbox'));
  assert(w.elements.get('detail-lifecycle-overview').textContent.includes('5 project components')); assert(w.elements.get('detail-financial-overview').textContent.includes('10 linked accounting')); assert(w.elements.get('detail-procurement-overview').textContent.includes('4 linked purchase-order'));
  const hero = records.find(r => r.id === 'SHOWCASE-ODP-REVIEW'); w.governanceUI.assessment(hero); w.governanceUI.reviewSummary(hero); w.governanceUI.decision(hero);
  assert(!w.elements.get('decision-outcome').querySelectorAll('input').some(radio => radio.checked));
  assert(w.elements.get('summary-decision-overview').textContent.includes('3 Material · 2 Emerging')); assert(!w.elements.get('review-summary').textContent.includes('Attention item'));
  const gap = s.projects()[2]; w.governanceUI.details(gap, s.evidence(gap), records); assert(w.elements.get('showcase-investment-context').textContent.includes('Not validated'));
  w.governanceUI.details(external, w.reviewRules.emptyEvidence(), records); assert.equal(w.elements.get('showcase-investment-context').hidden, true); assert.equal(w.elements.get('showcase-investment-context').textContent, ''); assert.equal(w.elements.get('detail-source').textContent, 'SAP SANDBOX');
  w.governanceUI.confirmation(records.find(r => r.id === 'SHOWCASE-LRP-DECISION')); assert(w.elements.get('confirmation-record').textContent.includes('Synthetic historical showcase decision'));
  w.governanceUI.renderDashboard(records, w.services.showcase.projects(), () => {}); assert(!w.elements.get('dashboard-attention').textContent.includes('Legacy Reporting Consolidation'));
  w.document.getElementById('dashboard-filter-recorded').events.click[0](); assert(w.elements.get('dashboard-attention').textContent.includes('Legacy Reporting Consolidation'));
});

test('showcase is immediately usable without key/network; live failure does not replace it and duplicates cannot override it', async () => {
  let calls = 0;
  const offline = workspace({ controller: true, fetchImpl: async () => { calls++; throw new Error('No network'); } }); await tick();
  assert.equal(calls, 0); assert.equal(offline.state.projects.length, 5); assert.equal(offline.state.reviews.length, 4);
  offline.elements.get('projects-body').children[0].children[4].children[0].events.click[0]();
  assert.equal(offline.state.view, 'summary'); offline.elements.get('workspace-tab-overview').events.click[0](); await tick();
  assert.equal(calls, 0); assert.equal(offline.state.glRecords.length, 10); assert.equal(offline.state.poRecords.length, 4);
  const failed = workspace({ controller: true, key: 'unit-only-key', serviceOverrides: { projects: { loadProjects: async () => { throw new Error('Unit outage'); } } } }); await tick();
  assert.equal(failed.state.projects.length, 5); assert.equal(failed.elements.get('projects-body').children.length, 5); assert.equal(failed.elements.get('toast-region').hidden, false);
  failed.document.getElementById('toast-details').events.click[0](); await tick();
  assert.equal(failed.elements.get('investment-technical-details').open, true); assert.equal(failed.elements.get('connection-details').hidden, false);
  assert.equal(failed.state.glRecords.length, 10); // Inspection does not need to fabricate or retry live data.
  const merged = workspace({ controller: true, key: 'unit-only-key', serviceOverrides: { projects: { loadProjects: async () => ({ records: [external, external, { ...offline.services.showcase.projects()[0], ProjectDescription: 'Must not override synthetic source' }], httpStatus: 'HTTP 200 OK' }) } } }); await tick();
  assert.equal(merged.state.projects.length, 6); assert.equal(merged.state.projects[0].ProjectDescription, 'Digital Ordering Platform Modernisation'); assert.equal(merged.state.projects[5].ProjectUUID, external.ProjectUUID);
});

test('reset UI explains all-local scope, cancellation retains six active reviews, confirmation restores three and keeps SAP projects/configuration', async () => {
  const liveProjects = [external, { ...external, Project: 'Unit SAP 2', ProjectUUID: '22222222-2222-3333-4444-555555555555' }, { ...external, Project: 'Unit SAP 3', ProjectUUID: '33333333-2222-3333-4444-555555555555' }];
  const w = workspace({ controller: true, key: 'unit-only-key', serviceOverrides: { projects: { loadProjects: async () => ({ records: liveProjects, httpStatus: 'HTTP 200 OK' }) } } }); await tick(); const store = w.services.reviewStore;
  const own = liveProjects.map(project => store.start(project, w.reviewRules.emptyEvidence(), { reviewBasis: w.reviewRules.BASIS[0] })); const projects = JSON.stringify(w.state.projects);
  w.elements.get('nav-dashboard').events.click[0](); assert.equal(w.document.getElementById('dashboard-filter-active').children[1].textContent, '6');
  store.update('SHOWCASE-ODP-REVIEW', { assessment: { ...store.get('SHOWCASE-ODP-REVIEW').assessment, comments: 'User edit to retain on cancel' } });
  const reset = w.elements.get('reset-showcase').events.click[0]; const before = w.map.get(store.STORAGE_KEY); reset(); assert.equal(w.map.get(store.STORAGE_KEY), before);
  assert.match(w.confirmations[0], /all local reviews and decision records/i); assert.match(w.confirmations[0], /Showcase and SAP Sandbox/); assert.match(w.confirmations[0], /cannot be undone/i);
  w.confirmReset(true); reset(); assert(!store.get('SHOWCASE-ODP-REVIEW').assessment.comments.includes('User edit')); assert(own.every(r => store.get(r.id) === null)); assert.equal(JSON.stringify(w.state.projects), projects); assert.equal(w.http.apiKey(), 'unit-only-key');
  assert.equal(w.state.view, 'dashboard');
  assert.equal(w.document.getElementById('dashboard-filter-active').children[1].textContent, '3'); assert.equal(w.document.getElementById('dashboard-filter-recorded').children[1].textContent, '1');
  assert.equal(w.elements.get('toast-message').textContent, 'Showcase resetAll local reviews and decisions reset. Default showcase restored.'); w.ui.dismissToast();
});

test('confirmed reset leaves a live SAP review, clears selected cycle, cancels evidence and does not resurrect the deleted review', async () => {
  const w = workspace({ controller: true, key: 'unit-only-key', serviceOverrides: { projects: { loadProjects: async () => ({ records: [external], httpStatus: 'HTTP 200 OK' }) } } }); await tick();
  const store = w.services.reviewStore, own = store.start(external, w.reviewRules.emptyEvidence(), { reviewBasis: w.reviewRules.BASIS[0] });
  w.elements.get('nav-dashboard').events.click[0](); const row = w.elements.get('dashboard-attention').children.find(r => r.dataset.reviewId === own.id); byClass(row, 'queue-action-button')[0].events.click[0](); assert.equal(w.state.view, 'assessment');
  const controllers = ['elementController', 'glController', 'poController'].map(key => w.state[key] = new AbortController());
  const ids = [w.state.elementRequestID, w.state.glRequestID, w.state.poRequestID];
  w.confirmReset(true); w.elements.get('reset-showcase').events.click[0]();
  assert.equal(w.state.view, 'dashboard'); assert.equal(w.state.selectedProject, null); assert.equal(w.state.currentReviewID, null); assert.equal(store.get(own.id), null); assert(controllers.every(c => c.signal.aborted));
  assert.deepEqual([w.state.elementRequestID, w.state.glRequestID, w.state.poRequestID], ids.map(n => n + 1));
  w.elements.get('nav-investments').events.click[0](); const live = w.elements.get('projects-body').children[5]; assert(live.textContent.includes('Monitoring')); assert(live.textContent.includes('Open Investment')); assert.equal(store.get(own.id), null); w.ui.dismissToast();
});

test('failed reset preserves the previous complete storage value and current review, with persistent error not success', () => {
  const w = workspace({ controller: true }), store = w.services.reviewStore;
  w.elements.get('nav-investments').events.click[0](); w.elements.get('projects-body').children[0].children[4].children[0].events.click[0]();
  const before = w.map.get(store.STORAGE_KEY), selected = w.state.currentReviewID, set = w.map.set.bind(w.map); w.map.set = () => { throw new Error('Unit reset write failure'); };
  w.confirmReset(true); w.elements.get('reset-showcase').events.click[0](); assert.equal(w.map.get(store.STORAGE_KEY), before); assert.equal(w.state.view, 'summary'); assert.equal(w.state.currentReviewID, selected); assert.equal(w.elements.get('storage-notice').hidden, false); assert.equal(w.elements.get('toast-region').hidden, true); w.map.set = set;
});

test('expanded reset still honours failed-draft protection and never silently discards unsaved form edits', () => {
  const w = workspace({ controller: true }), store = w.services.reviewStore;
  w.elements.get('nav-investments').events.click[0](); w.elements.get('projects-body').children[0].children[4].children[0].events.click[0](); w.elements.get('review-step-assessment').events.click[0]();
  const before = w.map.get(store.STORAGE_KEY), update = store.update; store.update = () => { throw new Error('Unit draft save failure'); };
  w.elements.get('assessment-comments').value = 'Keep my unsaved governance note'; w.elements.get('assessment-form').events.input[0]();
  w.confirmReset(true); w.elements.get('reset-showcase').events.click[0](); assert.equal(w.state.view, 'assessment'); assert.equal(w.map.get(store.STORAGE_KEY), before); assert.equal(w.elements.get('assessment-comments').value, 'Keep my unsaved governance note'); assert.equal(w.elements.get('draft-save-error').hidden, false); assert.equal(w.elements.get('toast-region').hidden, true); store.update = update;
});

test('invalid browser storage is never overwritten by automatic seeding or reset', () => {
  const map = new Map([['dpeA3.reviews.v1', '{broken']]); const w = workspace({ storage: map });
  assert.throws(() => w.services.reviewStore.seedShowcase(), /malformed/); assert.throws(() => w.services.reviewStore.seedShowcase({ reset: true }), /malformed/);
  assert.equal(map.get('dpeA3.reviews.v1'), '{broken');
});
