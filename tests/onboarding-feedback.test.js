const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { workspace, startReview } = require('./helpers/workspace');
const tick = () => new Promise(r => setImmediate(r));
const all = el => [el, ...el.children.flatMap(all)];
const byClass = (el, cls) => all(el).filter(el => (el.className || '').split(' ').includes(cls));
const click = (w, id) => w.document.getElementById(id).events.click[0]();
const edit = (w, id) => w.elements.get(id).events.input[0]();
function choose(w, id, value) { for (const input of w.elements.get(id).querySelectorAll('input')) input.checked = input.value === value; }
function readyReview(w) { click(w, 'nav-investments'); w.elements.get('projects-body').children[0].children[4].children[0].events.click[0](); }
async function newReview(w) { click(w, 'nav-investments'); w.elements.get('projects-body').children[3].children[4].children[0].events.click[0](); await tick(); startReview(w); }
function clock() {
  let id = 0; const jobs = new Map();
  return { jobs, setTimeout(fn, delay) { const token = ++id; jobs.set(token, { fn, delay }); return token; }, clearTimeout(token) { jobs.delete(token); }, fire() { const entry = jobs.entries().next().value; assert(entry, 'A timer must be scheduled'); jobs.delete(entry[0]); entry[1].fn(); } };
}
const sapProject = { ProjectUUID: '11111111-2222-3333-4444-555555555555', Project: 'UNIT-SAP', ProjectDescription: 'Unit Sandbox project' };

test('partially assessed review is Saved but not ready, and Summary freely previews the four missing dimensions', async () => {
  const w = workspace({ controller: true }); await newReview(w);
  choose(w, 'assessment-alignment', 'High'); choose(w, 'assessment-benefits', 'Yes'); w.elements.get('assessment-owner').value = 'GOV-001'; edit(w, 'assessment-form');
  const record = w.services.reviewStore.get(w.state.currentReviewID); assert.equal(w.reviewRules.readiness(record).ready, false); assert.equal(w.elements.get('review-save-status').textContent, '✓ Saved');
  assert.equal(w.elements.get('review-step-summary').disabled, false); click(w, 'review-step-summary'); assert.equal(w.state.view, 'summary');
  assert.match(w.elements.get('summary-readiness').textContent, /Assessment incomplete · 4 required items remaining/);
  assert.equal(byClass(w.elements.get('review-summary'), 'assessment-signal').filter(c => c.dataset.tone === 'unassessed').length, 4);
  assert.equal(byClass(w.elements.get('review-summary'), 'evidence-basis-item').length, 3); assert.equal(byClass(w.elements.get('review-summary'), 'timeline-step').length, 3);
  click(w, 'review-step-decision'); assert.equal(w.state.view, 'summary'); assert.equal(w.elements.get('decision-view').hidden, true); assert.match(w.elements.get('workflow-message').textContent, /Future Economic Value|Delivery Performance|Risk/);
  assert.equal(w.elements.get('review-step-decision').disabled, false); assert.equal(w.elements.get('review-step-decision').getAttribute('aria-disabled'), 'true');
  click(w, 'review-step-assessment'); assert.equal(w.governanceUI.readAssessment().assessment.strategicAlignment, 'High'); assert.equal(w.governanceUI.readAssessment().assessment.expectedBenefits, 'Yes');
});

test('busy evidence produces an accessible Decision gate explanation rather than a silent disabled step', () => {
  const w = workspace({ controller: true }); readyReview(w); const record = w.services.reviewStore.get(w.state.currentReviewID);
  w.state.glController = {}; w.governanceUI.chrome(record, true); assert.equal(w.elements.get('review-step-decision').disabled, false); assert.equal(w.elements.get('review-step-decision').getAttribute('aria-disabled'), 'true');
  click(w, 'review-step-decision'); assert.equal(w.state.view, 'summary'); assert.match(w.elements.get('workflow-message').textContent, /Finish the current evidence refresh/); assert.equal(w.elements.get('workflow-message').focused, true);
  w.state.glController = null; click(w, 'review-step-decision'); assert.equal(w.state.view, 'decision');
});

test('all ready stages freely round-trip Decision drafts; incomplete edits re-lock Decision without destroying the draft', () => {
  const w = workspace({ controller: true }); readyReview(w); click(w, 'review-step-decision'); choose(w, 'decision-outcome', 'Modify');
  for (const [id, value] of [['decision-rationale', 'Human draft'], ['decision-action', 'Reassess scope'], ['decision-action-owner', 'Unit coordinator'], ['decision-next-date', '2026-11-17']]) w.elements.get(id).value = value;
  edit(w, 'decision-form'); const id = w.state.currentReviewID, draft = JSON.stringify(w.services.reviewStore.get(id).decisionDraft);
  click(w, 'review-step-assessment'); w.elements.get('assessment-owner').value = ''; edit(w, 'assessment-form'); assert.equal(w.elements.get('review-save-status').textContent, '✓ Saved'); assert.equal(w.elements.get('review-step-decision').getAttribute('aria-disabled'), 'true');
  click(w, 'review-step-decision'); assert.equal(w.state.view, 'assessment'); assert.match(w.elements.get('workflow-message').textContent, /Decision Owner/);
  click(w, 'review-step-summary'); assert.equal(w.state.view, 'summary'); click(w, 'review-step-assessment'); w.elements.get('assessment-owner').value = 'GOV-001'; edit(w, 'assessment-form');
  click(w, 'review-step-decision'); assert.equal(w.state.view, 'decision'); assert.equal(JSON.stringify(w.services.reviewStore.get(id).decisionDraft), draft); assert.equal(w.governanceUI.readDecision().rationale, 'Human draft');
  click(w, 'nav-how-it-works'); assert.equal(w.state.view, 'how-it-works'); click(w, 'how-portfolio'); w.elements.get('projects-body').children[0].children[4].children[0].events.click[0](); assert.equal(w.state.view, 'summary'); click(w, 'review-step-decision');
  assert.equal(w.governanceUI.readDecision().outcome, 'Modify'); assert.equal(w.services.reviewStore.get(id).status, 'in_progress'); assert.equal(w.services.reviewStore.get(id).decision, null);
});

test('Assessment save failure preserves edits, blocks every exit, persists until Retry Save and only then removes beforeunload protection', () => {
  const w = workspace({ controller: true }); readyReview(w); click(w, 'review-step-assessment'); const store = w.services.reviewStore, original = store.update, before = w.map.get(store.STORAGE_KEY);
  store.update = () => { throw new Error('Unit storage write failure'); }; w.elements.get('assessment-comments').value = 'Keep this unsaved human note'; edit(w, 'assessment-form');
  assert.equal(w.elements.get('draft-save-error').hidden, false); assert.equal(w.elements.get('review-save-status').textContent, 'Couldn’t save changes'); assert.equal(w.map.get(store.STORAGE_KEY), before);
  for (const target of ['nav-dashboard', 'nav-investments', 'nav-how-it-works', 'workspace-tab-overview', 'workspace-tab-history', 'review-step-summary', 'review-step-decision']) { click(w, target); assert.equal(w.state.view, 'assessment'); assert.equal(w.elements.get('assessment-comments').value, 'Keep this unsaved human note'); }
  assert.equal(w.windowEvents.beforeunload.length, 1); let prevented = false; const event = { preventDefault() { prevented = true; }, returnValue: null }; w.windowEvents.beforeunload[0](event); assert(prevented); assert.equal(event.returnValue, '');
  w.governanceUI.storageNotice(''); w.governanceUI.autosaveStatus(true); assert.equal(w.elements.get('draft-save-error').hidden, false); assert.notEqual(w.elements.get('toast-region').hidden, false);
  store.update = original; click(w, 'retry-save'); assert.equal(w.elements.get('draft-save-error').hidden, true); assert.equal(w.elements.get('review-save-status').textContent, '✓ Saved'); assert.equal(w.windowEvents.beforeunload.length, 0);
  assert.equal(store.get(w.state.currentReviewID).assessment.comments, 'Keep this unsaved human note'); click(w, 'nav-how-it-works'); assert.equal(w.state.view, 'how-it-works');
});

test('Decision autosave failure retains all entered fields and Retry saves a draft, never an immutable decision', () => {
  const w = workspace({ controller: true }); readyReview(w); click(w, 'review-step-decision'); const store = w.services.reviewStore, original = store.update, id = w.state.currentReviewID;
  store.update = () => { throw new Error('Unit write blocked'); }; choose(w, 'decision-outcome', 'Modify');
  for (const [field, value] of [['decision-rationale', 'Retain rationale'], ['decision-action', 'Retain action'], ['decision-action-owner', 'Retain owner'], ['decision-next-date', '2026-11-17']]) w.elements.get(field).value = value;
  edit(w, 'decision-form'); click(w, 'review-step-assessment'); assert.equal(w.state.view, 'decision'); assert.equal(w.governanceUI.readDecision().rationale, 'Retain rationale'); assert.equal(w.elements.get('draft-save-error').hidden, false);
  store.update = original; click(w, 'retry-save'); const record = store.get(id); assert.equal(record.decisionDraft.outcome, 'Modify'); assert.equal(record.decisionDraft.requiredAction, 'Retain action'); assert.equal(record.decisionDraft.nextReviewDate, '2026-11-17'); assert.equal(record.status, 'in_progress'); assert.equal(record.decision, null);
  click(w, 'review-step-summary'); click(w, 'review-step-decision'); assert.equal(w.governanceUI.readDecision().actionOwner, 'Retain owner');
});

test('actual localStorage write failure is atomic and survives background renders; recovered drafts also survive reload', () => {
  class Storage extends Map { set(key, value) { if (this.fail) throw new Error('QuotaExceededError'); return super.set(key, value); } }
  const storage = new Storage(), w = workspace({ controller: true, storage }); readyReview(w); click(w, 'review-step-assessment');
  const key = w.services.reviewStore.STORAGE_KEY, before = storage.get(key); storage.fail = true;
  w.elements.get('assessment-comments').value = 'Actual storage failure retains this note'; w.elements.get('assessment-dependencies').value = 'Retain dependencies too'; edit(w, 'assessment-form');
  assert.equal(storage.get(key), before); assert.equal(w.elements.get('draft-save-error').hidden, false); assert.equal(w.elements.get('storage-notice').hidden, true);
  w.governanceUI.chrome(w.services.reviewStore.get(w.state.currentReviewID), false, true); assert.equal(w.elements.get('review-step-decision').dataset.gate, 'Save unavailable');
  click(w, 'nav-investments'); assert.equal(w.state.view, 'assessment'); assert.equal(w.elements.get('review-save-status').textContent, 'Couldn’t save changes');
  storage.fail = false; click(w, 'retry-save'); assert.equal(w.elements.get('review-step-assessment').focused, true); assert.equal(w.elements.get('draft-save-error').hidden, true);
  const reloaded = workspace({ controller: true, storage }); readyReview(reloaded); click(reloaded, 'review-step-assessment');
  assert.equal(reloaded.elements.get('assessment-comments').value, 'Actual storage failure retains this note'); assert.equal(reloaded.elements.get('assessment-dependencies').value, 'Retain dependencies too'); assert.equal(reloaded.elements.get('review-save-status').textContent, '✓ Saved');
});

test('actual immutable-record localStorage failure leaves the saved draft and prior History byte-for-byte intact', () => {
  class Storage extends Map { set(key, value) { if (this.fail) throw new Error('QuotaExceededError'); return super.set(key, value); } }
  const storage = new Storage(), w = workspace({ controller: true, storage }); readyReview(w); click(w, 'review-step-decision'); choose(w, 'decision-outcome', 'Continue'); w.elements.get('decision-rationale').value = 'Draft already saved before the formal recording attempt'; edit(w, 'decision-form');
  const before = storage.get(w.services.reviewStore.STORAGE_KEY); storage.fail = true; w.elements.get('decision-form').events.submit[0]({ preventDefault() {} });
  assert.equal(w.state.view, 'decision'); assert.equal(storage.get(w.services.reviewStore.STORAGE_KEY), before); assert.match(w.elements.get('decision-incomplete').textContent, /Couldn’t record decision/); assert.equal(w.elements.get('decision-rationale').value, 'Draft already saved before the formal recording attempt');
  assert.equal(w.services.reviewStore.get(w.state.currentReviewID).status, 'in_progress'); assert.equal(w.elements.get('review-save-status').textContent, '✓ Saved'); assert.equal(w.elements.get('toast-region').hidden, true);
});

test('unchanged or reverted inputs do not create false unsaved warnings when no new persistence is needed', () => {
  const w = workspace({ controller: true }); readyReview(w); click(w, 'review-step-assessment'); const original = w.services.reviewStore.update;
  w.services.reviewStore.update = () => { throw new Error('Unit write blocked'); };
  click(w, 'nav-how-it-works'); assert.equal(w.state.view, 'how-it-works'); assert.equal((w.windowEvents.beforeunload || []).length, 0);
  click(w, 'how-portfolio'); w.elements.get('projects-body').children[0].children[4].children[0].events.click[0](); click(w, 'review-step-assessment');
  const saved = w.services.reviewStore.get(w.state.currentReviewID).assessment.comments; w.elements.get('assessment-comments').value = 'Temporary unsaved edit'; edit(w, 'assessment-form'); assert.equal(w.elements.get('draft-save-error').hidden, false);
  w.elements.get('assessment-comments').value = saved; edit(w, 'assessment-form'); assert.equal(w.elements.get('draft-save-error').hidden, true); assert.equal(w.elements.get('review-save-status').textContent, '✓ Saved'); assert.equal(w.windowEvents.beforeunload.length, 0);
  w.services.reviewStore.update = original;
});

test('Record Decision service failure stays on Decision with persistent local feedback, no success record and no toast', () => {
  const w = workspace({ controller: true }); readyReview(w); click(w, 'review-step-decision'); choose(w, 'decision-outcome', 'Continue'); w.elements.get('decision-rationale').value = 'Human intent to continue';
  const original = w.services.reviewStore.confirm; w.services.reviewStore.confirm = () => { throw new Error('Unit immutable-record write failure'); };
  w.elements.get('decision-form').events.submit[0]({ preventDefault() {} }); assert.equal(w.state.view, 'decision'); assert.equal(w.elements.get('decision-incomplete').hidden, false); assert.match(w.elements.get('decision-incomplete').textContent, /Couldn’t record decision/); assert.equal(w.elements.get('toast-region').hidden, true);
  assert.equal(w.services.reviewStore.get(w.state.currentReviewID).status, 'in_progress'); assert.equal(w.elements.get('review-save-status').textContent, '✓ Saved'); w.services.reviewStore.confirm = original;
  w.elements.get('decision-rationale').value = 'A later draft edit does not imply recording succeeded'; edit(w, 'decision-form'); assert.equal(w.elements.get('decision-incomplete').hidden, false); assert.match(w.elements.get('decision-incomplete').textContent, /Couldn’t record decision/);
});

test('project source badges have distinct strong classes and truthful titles across renderer/workspace/record components', () => {
  const w = workspace({ controller: true }), synthetic = w.ui.sourceBadge(w.document.createElement('span'), w.services.showcase.projects()[0]), sandbox = w.ui.sourceBadge(w.document.createElement('span'), sapProject);
  assert.equal(synthetic.className, 'source showcase'); assert.equal(sandbox.className, 'source sap'); assert.match(synthetic.title, /Synthetic SAP-schema-compatible/); assert.match(synthetic.title, /Not live SAP/); assert.match(sandbox.title, /SAP Business Accelerator Hub Sandbox/); assert.match(sandbox.title, /Not DPE production/);
  readyReview(w); assert.equal(w.elements.get('detail-source').title, synthetic.title); w.governanceUI.confirmation(w.services.reviewStore.get('SHOWCASE-LRP-DECISION')); assert(byClass(w.elements.get('confirmation-record'), 'source').every(b => b.title === synthetic.title));
  const css = readFileSync('styles.css', 'utf8'); assert.match(css, /\.source\.showcase\s*\{[^}]*color:#fff;[^}]*background:#6c4aa0/); assert.match(css, /\.source\.sap\s*\{[^}]*color:#fff;[^}]*background:#006491/);
});

test('Dashboard/Portfolio use business CTAs while History keeps View Record and Overview View Latest Decision', () => {
  const w = workspace({ controller: true }); assert(byClass(w.elements.get('dashboard-attention'), 'queue-action-button').every(b => b.textContent === 'Continue Review'));
  click(w, 'dashboard-filter-recorded'); const action = byClass(w.elements.get('dashboard-attention'), 'queue-action-button')[0]; assert.equal(action.textContent, 'View Decision'); action.events.click[0](); assert.equal(w.state.currentReviewID, 'SHOWCASE-LRP-DECISION');
  assert.equal(w.elements.get('investment-history-body').children[0].children[5].children[0].textContent, 'View Record'); assert.equal(w.elements.get('view-last-decision').textContent, 'View Latest Decision');
  click(w, 'nav-investments'); const rows = w.elements.get('projects-body').children; assert.equal(rows[0].children[4].children[0].textContent, 'Continue Review'); assert.equal(rows[3].children[4].children[0].textContent, 'Open Investment'); assert.equal(rows[4].children[4].children[0].textContent, 'View Decision');
});

test('missing SAP key is neutral, keeps Showcase rendered and never raises an initial failure toast', () => {
  let fetches = 0; const w = workspace({ controller: true, fetchImpl: async () => { fetches++; throw new Error('No network'); } });
  assert.equal(fetches, 0); assert.equal(w.elements.get('projects-body').children.length, 5); assert.equal(w.elements.get('connection-status').textContent, 'SAP Sandbox · Not connected'); assert.match(w.elements.get('connection-status').title, /Showcase remains available/);
  assert.equal(w.elements.get('toast-region').hidden, true); assert.equal(w.elements.get('portfolio-tools').hidden, true); assert.equal(w.elements.get('load-projects').disabled, true);
  click(w, 'nav-investments'); assert.equal(w.elements.get('portfolio-tools').hidden, false); assert.notEqual(w.elements.get('message').dataset.kind, 'error');
});

test('SAP connection progresses Refreshing to Connected and successful manual refresh is quiet and preserves both sources', async () => {
  const timers = clock(); let finish, calls = 0;
  const w = workspace({ controller: true, key: 'unit-key', timers, serviceOverrides: { projects: { loadProjects: () => { calls++; return new Promise(r => { finish = r; }); } } } });
  assert.equal(w.elements.get('connection-status').textContent, 'SAP Sandbox · Refreshing…'); assert.equal(w.elements.get('projects-body').children.length, 5);
  finish({ records: [sapProject], httpStatus: 'HTTP 200 OK' }); await tick(); assert.equal(w.elements.get('connection-status').textContent, 'SAP Sandbox · Connected'); assert.equal(w.state.projects.length, 6); assert.equal(w.elements.get('toast-region').hidden, true);
  click(w, 'nav-investments'); click(w, 'load-projects'); assert.equal(calls, 2); finish({ records: [sapProject], httpStatus: 'HTTP 200 OK' }); await tick(); assert.equal(w.elements.get('toast-message').textContent, 'SAP Sandbox refreshed'); assert.equal(w.elements.get('toast-region').dataset.kind, 'neutral'); w.ui.dismissToast();
});

test('SAP refresh failure is a dismissible retryable toast; connection issue and Showcase survive dismissal', async () => {
  const timers = clock(); let calls = 0;
  const w = workspace({ controller: true, key: 'unit-key', timers, serviceOverrides: { projects: { loadProjects: async () => { if (++calls === 1) throw new Error('Unit SAP issue'); return { records: [sapProject], httpStatus: 'HTTP 200 OK' }; } } } });
  await tick(); assert.equal(w.state.projects.length, 5); assert.equal(w.elements.get('connection-status').dataset.state, 'issue'); assert.equal(w.elements.get('toast-region').hidden, false); assert.deepEqual(w.elements.get('toast-actions').children.map(b => b.textContent), ['Retry', 'Details', 'Dismiss']);
  click(w, 'toast-dismiss'); assert.equal(w.elements.get('toast-region').hidden, true); assert.equal(w.elements.get('connection-status').dataset.state, 'issue'); assert.equal(w.elements.get('connection-issue-details').hidden, false); assert.equal(w.elements.get('projects-body').children.length, 5);
  w.ui.projectFailure('Unit retryable issue'); click(w, 'toast-retry'); await tick(); assert.equal(calls, 2); assert.equal(w.state.projects.length, 6); assert.equal(w.elements.get('connection-status').dataset.state, 'connected'); w.ui.dismissToast();
});

test('SAP toast Details opens the separate live connection diagnostics without relabelling Showcase evidence', async () => {
  const timers = clock(), w = workspace({ controller: true, key: 'unit-key', timers, serviceOverrides: { projects: { loadProjects: async () => { throw new Error('Unit connection issue'); } } } });
  await tick(); click(w, 'toast-details'); await tick(); assert.equal(w.state.view, 'detail'); assert.equal(w.elements.get('investment-technical-details').open, true); assert.equal(w.elements.get('connection-details').hidden, false); assert.equal(w.elements.get('detail-source').textContent, 'SHOWCASE'); assert.equal(w.state.projects.length, 5);
});

test('toast timer pauses for hover and keyboard focus, supports internal focus movement and resumes only after leaving', () => {
  const timers = clock(), w = workspace({ controller: true, timers }), region = w.elements.get('toast-region'); region.append(w.document.getElementById('toast-actions'));
  w.ui.toast({ title: 'Unit connection feedback', duration: 9000, actions: [{ id: 'unit-toast-action', label: 'Retry', onClick() {} }] });
  assert.equal(timers.jobs.size, 1); assert.equal([...timers.jobs.values()][0].delay, 9000);
  region.events.mouseenter[0](); assert.equal(timers.jobs.size, 0); region.events.focusin[0](); region.events.mouseleave[0](); assert.equal(timers.jobs.size, 0);
  region.events.focusout[0]({ relatedTarget: w.document.getElementById('unit-toast-action') }); assert.equal(timers.jobs.size, 0);
  region.events.focusout[0]({ relatedTarget: null }); assert.equal(timers.jobs.size, 1); timers.fire(); assert.equal(region.hidden, true); assert.equal(w.elements.get('connection-status').dataset.state, 'disconnected');
});

test('How It Works is separate utility navigation with the whole model, provenance and non-mutating Dashboard/Portfolio actions', () => {
  const w = workspace({ controller: true }), before = w.map.get(w.services.reviewStore.STORAGE_KEY), html = readFileSync('index.html', 'utf8');
  assert.match(html, /<nav class="app-nav"[\s\S]*?Dashboard[\s\S]*?Portfolio<\/button><\/nav><nav class="utility-nav"/);
  click(w, 'nav-how-it-works'); assert.equal(w.state.view, 'how-it-works'); assert.equal(w.elements.get('nav-how-it-works').getAttribute('aria-current'), 'page'); assert.equal(w.elements.get('nav-investments').getAttribute('aria-current'), null);
  const page = html.slice(html.indexOf('<section id="how-it-works-view"'), html.indexOf('<section id="workspace-view"'));
  for (const copy of ['Monitor', 'Review', 'Decide', 'Record', 'Portfolio evidence', 'Human assessment', 'Strategic Alignment', 'Expected Benefits', 'Delivery Performance', 'Cost Position', 'Risk', 'Future Economic Value', 'Review Summary', 'Governance Decision', 'Decision Record', 'A Material Trigger does not automatically mean a Material Concern.', 'Neither source represents DPE production data.', 'Human judgement remains authoritative.']) assert(page.includes(copy), copy);
  assert.equal((page.match(/class="how-number"/g) || []).length, 4); click(w, 'how-dashboard'); assert.equal(w.state.view, 'dashboard'); click(w, 'nav-how-it-works'); click(w, 'how-portfolio'); assert.equal(w.state.view, 'investments'); assert.equal(w.map.get(w.services.reviewStore.STORAGE_KEY), before);
  const assessment = html.slice(html.indexOf('<form id="assessment-form"'), html.indexOf('<section id="summary-view"')), decision = html.slice(html.indexOf('<form id="decision-form"'), html.indexOf('<section id="workspace-history"'));
  assert(!assessment.match(/>Save(?: Draft)?<\/button>/)); assert(!decision.match(/>Save(?: Draft)?<\/button>/));
});
