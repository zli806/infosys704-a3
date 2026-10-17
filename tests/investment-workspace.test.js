const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { workspace, startReview } = require('./helpers/workspace');
const tick = () => new Promise(r => setImmediate(r));
const all = el => [el, ...el.children.flatMap(all)];
const click = (w, id) => w.document.getElementById(id).events.click[0]();
const buttonIn = el => all(el).find(el => el.tag === 'button');
const historyRows = w => w.elements.get('investment-history-body').children.filter(row => row.dataset.reviewId);
function tab(w, name) {
  assert.equal(w.elements.get('workspace-view').hidden, false); assert.equal(w.elements.get('global-page-header').hidden, true);
  for (const key of ['overview', 'current', 'history']) assert.equal(w.elements.get(`workspace-tab-${key}`).getAttribute('aria-selected'), String(key === name));
  assert.equal(w.elements.get('nav-investments').getAttribute('aria-current'), 'page'); assert.equal(w.elements.get('nav-dashboard').getAttribute('aria-current'), null);
}
function openPortfolioRow(w, index) { click(w, 'nav-investments'); buttonIn(w.elements.get('projects-body').children[index]).events.click[0](); }
function choose(w, value) { for (const radio of w.elements.get('decision-outcome').querySelectorAll('input')) radio.checked = radio.value === value; }
function confirm(w, outcome = 'Modify') {
  click(w, 'proceed-decision'); choose(w, outcome);
  for (const [id, value] of [['decision-rationale', 'Human workspace judgement'], ['decision-action', 'Reassess scope'], ['decision-action-owner', 'Unit coordinator'], ['decision-next-date', '2026-11-17']]) w.elements.get(id).value = value;
  w.elements.get('decision-form').events.submit[0]({ preventDefault() {} }); assert.equal(w.state.view, 'confirmation'); tab(w, 'history');
}

test('workspace markup has one persistent investment header, three proper tabs, staged Current Review and one History record area', () => {
  const html = readFileSync('index.html', 'utf8');
  assert.equal((html.match(/id="workspace-view"/g) || []).length, 1); assert.equal((html.match(/id="detail-project-name"/g) || []).length, 1);
  for (const [name, panel] of [['overview', 'detail-view'], ['current', 'workspace-current'], ['history', 'workspace-history']]) {
    assert(html.includes(`id="workspace-tab-${name}" role="tab"`)); assert(html.includes(`aria-controls="${panel}"`));
    assert.match(html, new RegExp(`id="${panel}" role="tabpanel" aria-labelledby="workspace-tab-${name}"`));
  }
  assert(!html.includes('id="review-back-investment"')); assert(!html.includes('id="current-review-project"')); assert(!html.includes('id="return-investment"'));
  const overview = html.slice(html.indexOf('<section id="detail-view"'), html.indexOf('<section id="workspace-current"'));
  assert(!overview.includes('investment-history-body')); assert(!overview.includes('assessment-form'));
  const history = html.slice(html.indexOf('<section id="workspace-history"')); assert(history.includes('id="confirmation-view"')); assert(history.includes('id="investment-history-body"'));
});

test('unreviewed investment opens Overview; Current Review and History have truthful empties; Start Review opens Assessment', async () => {
  const w = workspace({ controller: true }); openPortfolioRow(w, 3); await tick(); tab(w, 'overview');
  assert.equal(w.elements.get('detail-review-status').children[0].textContent, 'Monitoring'); assert.equal(w.elements.get('start-review').textContent, 'Start Review');
  click(w, 'workspace-tab-current'); tab(w, 'current'); assert.match(w.elements.get('current-review-empty').textContent, /No active continuation review/); assert.equal(w.elements.get('assessment-view').hidden, true);
  click(w, 'workspace-tab-history'); tab(w, 'history'); assert.match(w.elements.get('investment-history-body').textContent, /No recorded decisions/); assert.equal(w.elements.get('confirmation-view').hidden, true);
  click(w, 'workspace-tab-overview'); await tick(); startReview(w); tab(w, 'current'); assert.equal(w.state.view, 'assessment');
  assert.equal(w.elements.get('detail-review-status').children[0].textContent, 'Assessment in progress');
});

test('active incomplete/ready deep links and Current Review re-entry derive the safe stage without forward skipping', async () => {
  const w = workspace({ controller: true }); openPortfolioRow(w, 0); tab(w, 'current'); assert.equal(w.state.view, 'summary');
  const header = w.elements.get('detail-project-name'), identity = header.textContent;
  click(w, 'proceed-decision'); assert.equal(w.state.view, 'decision'); assert.equal(w.elements.get('detail-project-name'), header); assert.equal(header.textContent, identity);
  w.elements.get('decision-rationale').value = 'Draft survives a tab change'; choose(w, 'Modify');
  click(w, 'workspace-tab-history'); tab(w, 'history'); assert.equal(w.services.reviewStore.get('SHOWCASE-ODP-REVIEW').decisionDraft.rationale, 'Draft survives a tab change');
  click(w, 'workspace-tab-current'); tab(w, 'current'); assert.equal(w.state.view, 'summary');
  click(w, 'back-assessment'); assert.equal(w.state.view, 'assessment'); click(w, 'review-step-decision'); assert.equal(w.state.view, 'assessment');
  click(w, 'proceed-decision'); assert.equal(w.state.view, 'assessment'); // Hidden upcoming control cannot skip Summary either.
  w.elements.get('assessment-comments').value = 'Assessment draft survives Overview'; click(w, 'workspace-tab-overview'); await tick(); tab(w, 'overview');
  assert.equal(w.services.reviewStore.get('SHOWCASE-ODP-REVIEW').assessment.comments, 'Assessment draft survives Overview');
  click(w, 'workspace-tab-current'); assert.equal(w.state.view, 'summary');
  openPortfolioRow(w, 3); await tick(); startReview(w); click(w, 'workspace-tab-overview'); await tick(); click(w, 'workspace-tab-current'); assert.equal(w.state.view, 'assessment');
});

test('completed step controls navigate backward only, keeping decision drafts and the same workspace', () => {
  const w = workspace({ controller: true }); const steps = w.elements.get('review-steps');
  for (const stage of ['assessment', 'summary', 'decision']) { const row = w.document.createElement('li'), button = w.elements.get(`review-step-${stage}`); button.append(w.document.createElement('span')); row.append(button); steps.append(row); }
  openPortfolioRow(w, 0); assert.equal(w.elements.get('review-step-assessment').disabled, false); assert.equal(w.elements.get('review-step-decision').disabled, true);
  click(w, 'review-step-decision'); assert.equal(w.state.view, 'summary'); click(w, 'proceed-decision');
  assert.equal(w.elements.get('review-step-summary').disabled, false); choose(w, 'Pause'); w.elements.get('decision-rationale').value = 'Preserved decision draft';
  click(w, 'review-step-assessment'); assert.equal(w.state.view, 'assessment'); tab(w, 'current'); assert.equal(w.services.reviewStore.get('SHOWCASE-ODP-REVIEW').decisionDraft.rationale, 'Preserved decision draft');
  w.elements.get('assessment-form').events.submit[0]({ preventDefault() {} }); assert.equal(w.state.view, 'summary'); click(w, 'proceed-decision'); assert.equal(w.governanceUI.readDecision().outcome, 'Pause');
});

test('each completed outcome drives Overview, Current Review empty state and latest History record without reopening it', async () => {
  for (const [outcome, expected] of [['Continue', 'Monitoring'], ['Continue with Conditions', 'Follow-up'], ['Modify', 'Follow-up'], ['Pause', 'Paused'], ['Stop', 'Stopped']]) {
    const w = workspace({ controller: true }); openPortfolioRow(w, 0); confirm(w, outcome); const id = w.state.currentReviewID, saved = JSON.stringify(w.services.reviewStore.get(id));
    assert.equal(w.elements.get('workspace-recorded-notice').hidden, false); assert.equal(w.elements.get('confirmation-view').hidden, false); assert.equal(historyRows(w)[0].dataset.reviewId, id);
    assert.equal(buttonIn(historyRows(w)[0]).getAttribute('aria-expanded'), 'true');
    click(w, 'workspace-tab-overview'); await tick(); tab(w, 'overview'); assert.equal(w.elements.get('detail-review-status').children[0].textContent, expected);
    assert.equal(w.elements.get('start-review').hidden, outcome === 'Stop'); assert.equal(w.elements.get('view-last-decision').textContent, 'View Latest Record');
    if (outcome !== 'Stop') assert.equal(w.elements.get('start-review').textContent, 'Start New Review');
    click(w, 'workspace-tab-current'); assert.match(w.elements.get('current-review-empty').textContent, outcome === 'Stop' ? /investment is stopped/ : /started from Overview/);
    click(w, 'workspace-tab-overview'); await tick(); click(w, 'view-last-decision'); tab(w, 'history'); assert.equal(w.state.currentReviewID, id); assert.equal(w.elements.get('workspace-recorded-notice').hidden, true);
    assert.equal(JSON.stringify(w.services.reviewStore.get(id)), saved);
    if (outcome !== 'Stop') { click(w, 'workspace-tab-overview'); await tick(); startReview(w); tab(w, 'current'); assert.equal(w.state.view, 'assessment'); assert.notEqual(w.state.currentReviewID, id); assert.deepEqual(historyRows(w).map(r => r.dataset.reviewId), [id]); }
    else assert.throws(() => w.services.reviewStore.start(w.state.selectedProject, w.state.evidence), /stopped/);
  }
});

test('History has all completed cycles newest first, never current work, and only one exact record can be expanded', () => {
  const source = workspace(), store = source.services.reviewStore; store.seedShowcase(); const record = store.get('SHOWCASE-LRP-DECISION');
  const raw = JSON.parse(source.map.get(store.STORAGE_KEY)); const project = raw.reviews[0].project;
  for (const [id, outcome, timestamp] of [['feb', 'Continue', '2026-02-01T10:00:00Z'], ['jun', 'Continue with Conditions', '2026-06-01T10:00:00Z'], ['oct', 'Modify', '2026-10-01T10:00:00Z']]) raw.reviews.push({ ...record, id, project, decision: { ...record.decision, outcome, timestamp } });
  source.map.set(store.STORAGE_KEY, JSON.stringify(raw)); const w = workspace({ controller: true, storage: source.map }); openPortfolioRow(w, 0); click(w, 'workspace-tab-history');
  assert.deepEqual(historyRows(w).map(r => r.dataset.reviewId), ['oct', 'jun', 'feb']); assert.equal(w.elements.get('confirmation-view').hidden, true);
  for (const id of ['feb', 'oct']) { buttonIn(historyRows(w).find(r => r.dataset.reviewId === id)).events.click[0](); tab(w, 'history'); assert.equal(w.state.currentReviewID, id); assert.equal(historyRows(w).filter(r => r.dataset.selected === 'true').length, 1); }
  buttonIn(historyRows(w).find(r => r.dataset.reviewId === 'oct')).events.click[0](); assert.equal(w.elements.get('confirmation-view').hidden, true); assert.equal(w.state.view, 'history');
});

test('historical snapshot absent from live state is readable in History and clearly labelled read-only in Overview without network calls', async () => {
  const source = workspace(), store = source.services.reviewStore; store.seedShowcase();
  const original = store.get('SHOWCASE-LRP-DECISION'), missing = { ...original, id: 'absent-project', project: { ...original.project, ProjectUUID: '11111111-2222-3333-4444-555555555555', Project: 'PAST', ProjectDescription: 'Historical investment snapshot' } };
  const raw = JSON.parse(source.map.get(store.STORAGE_KEY)); raw.reviews.push(missing); source.map.set(store.STORAGE_KEY, JSON.stringify(raw)); let calls = 0;
  const w = workspace({ controller: true, storage: source.map, fetchImpl: async () => { calls++; throw new Error('No network'); } });
  click(w, 'dashboard-filter-recorded'); const row = w.elements.get('dashboard-attention').children.find(r => r.dataset.reviewId === missing.id); buttonIn(row).events.click[0](); tab(w, 'history');
  assert.equal(w.state.selectedFromSnapshot, true); assert.equal(w.state.currentReviewID, missing.id); assert.equal(w.elements.get('workspace-snapshot-notice').hidden, false);
  click(w, 'workspace-tab-overview'); await tick(); tab(w, 'overview'); assert.equal(calls, 0); assert.equal(w.elements.get('load-review-evidence').disabled, true); assert.equal(w.state.evidence.lifecycle.loaded, missing.decision.evidenceSnapshot.lifecycle.loaded);
});

test('storage unavailable has unknown state in all tabs and no false no-review/no-history claims', async () => {
  const storage = { get() { throw new Error('Unavailable'); }, set() { throw new Error('Unavailable'); } };
  const w = workspace({ controller: true, storage }); openPortfolioRow(w, 3); await tick(); tab(w, 'overview'); assert.equal(w.elements.get('detail-review-status').children[0].textContent, 'Governance status unavailable'); assert.equal(w.elements.get('start-review').disabled, true);
  click(w, 'workspace-tab-current'); tab(w, 'current'); assert.equal(w.elements.get('current-review-empty').textContent, 'Review status unavailable.');
  click(w, 'workspace-tab-history'); tab(w, 'history'); assert.equal(w.elements.get('investment-history-body').textContent, 'Decision history unavailable.'); assert.equal(w.elements.get('confirmation-view').hidden, true);
});

test('a live SAP investment with no review keeps its own evidence/context, opens Overview and has no showcase governance history', async () => {
  const project = { ProjectUUID: '11111111-2222-3333-4444-555555555555', Project: 'UNIT-SAP', ProjectDescription: 'Unit sandbox investment' };
  const w = workspace({ controller: true, key: 'unit-key', serviceOverrides: { projects: { loadProjects: async () => ({ records: [project], httpStatus: 'HTTP 200 OK' }), loadElements: async () => ({ records: [], httpStatus: 'HTTP 200 OK', data: { d: {} } }) } } });
  await tick(); openPortfolioRow(w, 5); await tick(); tab(w, 'overview'); assert.equal(w.elements.get('detail-source').textContent, 'SAP SANDBOX'); assert.equal(w.elements.get('showcase-investment-context').hidden, true);
  assert.equal(w.elements.get('detail-review-status').children[0].textContent, 'Monitoring'); assert.equal(w.elements.get('start-review').textContent, 'Start Review'); assert.equal(historyRows(w).length, 0);
});

test('workspace tabs support arrow/Home/End activation and failed draft saves prevent leaving Current Review', () => {
  const w = workspace({ controller: true }); openPortfolioRow(w, 0); const event = key => ({ key, preventDefault() {} });
  w.elements.get('workspace-tab-current').events.keydown[0](event('ArrowRight')); tab(w, 'history');
  w.elements.get('workspace-tab-history').events.keydown[0](event('Home')); tab(w, 'overview');
  click(w, 'workspace-tab-current'); click(w, 'proceed-decision');
  const original = w.services.reviewStore.update; w.services.reviewStore.update = () => { throw new Error('Cannot save draft'); };
  click(w, 'workspace-tab-history'); tab(w, 'current'); assert.equal(w.state.view, 'decision');
  w.elements.get('workspace-tab-history').focused = false; w.elements.get('workspace-tab-current').events.keydown[0](event('ArrowRight'));
  tab(w, 'current'); assert.equal(w.elements.get('workspace-tab-history').focused, false); w.services.reviewStore.update = original;
});

test('stored Review Trigger help is shared by Dashboard/header, while Findings help is absent in recorded mode', () => {
  const w = workspace({ controller: true }); const text = w.document.getElementById('context-tip-dashboard-trigger').textContent;
  assert.match(text, /trigger is not itself a review finding/);
  openPortfolioRow(w, 0); assert.equal(w.document.getElementById('context-tip-workspace-trigger').textContent, text);
  click(w, 'nav-dashboard'); assert.equal(w.document.getElementById('context-help-dashboard-findings').parentElement.hidden, false);
  click(w, 'dashboard-filter-recorded'); assert.equal(w.document.getElementById('context-help-dashboard-findings').parentElement.hidden, true);
});
