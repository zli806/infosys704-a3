const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { workspace, startReview } = require('./helpers/workspace');
const tick = () => new Promise(resolve => setImmediate(resolve));
const click = (w, id) => w.document.getElementById(id).events.click[0]();
const descendants = el => [el, ...el.children.flatMap(descendants)];
const buttonIn = el => descendants(el).find(el => el.tag === 'button');
const rows = (w, id) => w.elements.get(id).children.filter(row => row.dataset.reviewId);
const choose = (w, group, value) => { for (const radio of w.elements.get(group).querySelectorAll('input')) radio.checked = radio.value === value; };
function recordDecision(w, outcome = 'Modify') {
  click(w, 'proceed-decision'); choose(w, 'decision-outcome', outcome);
  for (const [id, value] of [['decision-rationale', 'Human continuation judgement'], ['decision-action', 'Inspect stage gate'], ['decision-action-owner', 'Unit coordinator'], ['decision-next-date', '2026-11-17']]) w.elements.get(id).value = value;
  w.elements.get('decision-form').events.submit[0]({ preventDefault() {} });
  assert.equal(w.state.view, 'confirmation');
}
const draft = outcome => ({ outcome, rationale: 'Accountable unit judgement', requiredAction: 'Reassess at checkpoint', actionOwner: 'Unit coordinator', nextReviewDate: '2026-11-17' });

test('navigation and Dashboard orientation use customer terminology without changing the four attention lenses', () => {
  const html = readFileSync('index.html', 'utf8');
  assert.match(html, /id="nav-dashboard"[^>]*>Dashboard/); assert.match(html, /id="nav-investments"[^>]*>Portfolio/); assert(!html.includes('nav-reviews'));
  assert.match(html, /class="queue-columns queue-grid"[^>]*><span>Investment<\/span><span>Review Trigger<\/span><span>Findings<\/span><span>Decision Timing<\/span><span>Next Step/);
  const w = workspace({ controller: true }); assert.match(w.document.getElementById('metric-tip-active').textContent, /Lenses may overlap; percentages are independent/);
  assert(!html.includes('Why is this flagged?'));
  click(w, 'nav-investments'); assert.equal(w.elements.get('nav-investments').getAttribute('aria-current'), 'page'); assert.equal(w.elements.get('nav-dashboard').getAttribute('aria-current'), null);
  buttonIn(w.elements.get('projects-body').children[0]).events.click[0](); assert.equal(w.state.view, 'summary'); assert.equal(w.elements.get('nav-investments').getAttribute('aria-current'), 'page');
});

test('Portfolio derives all eight governance cases and uses only stored decision dates without persisting a status', () => {
  const w = workspace(), seeds = w.services.showcase.seededReviews(), ready = seeds[0], project = ready.project;
  const incomplete = { ...ready, assessment: w.reviewRules.defaultAssessment() };
  for (const [records, expected, step] of [[[], 'Monitoring', 'Open Investment'], [[incomplete], 'Assessment in progress', 'Continue Review'], [[ready], 'Ready for decision', 'Continue Review']]) {
    const view = w.governanceUI.portfolioState(project, records); assert.equal(view.label, expected); assert.equal(view.nextStep, step); assert.equal(view.nextReview, null);
  }
  for (const [outcome, label, step] of [['Continue', 'Monitoring', 'Open Investment'], ['Continue with Conditions', 'Follow-up', 'Open Investment'], ['Modify', 'Follow-up', 'Open Investment'], ['Pause', 'Paused', 'Open Investment'], ['Stop', 'Stopped', 'View Decision']]) {
    const completed = { ...ready, status: 'decision_recorded', decision: { ...draft(outcome), timestamp: '2026-10-17T10:00:00Z' } }, before = JSON.stringify(completed);
    const view = w.governanceUI.portfolioState(project, [completed]); assert.equal(view.label, label); assert.equal(view.nextStep, step);
    assert.equal(view.nextReview, outcome === 'Stop' ? null : '2026-11-17'); assert.equal(JSON.stringify(completed), before);
    w.ui.configureReviews(p => w.governanceUI.portfolioState(p, [completed])); w.ui.renderProjects([project], null, () => {});
    const row = w.elements.get('projects-body').children[0]; assert.equal(row.children[1].textContent, label);
    assert.equal(row.children[2].children[0].textContent, outcome); assert.equal(row.children[2].children[1].textContent, w.ui.formatDate(completed.decision.timestamp));
    assert.equal(row.children[3].textContent, outcome === 'Stop' ? '—' : w.ui.formatDate('2026-11-17')); assert.equal(buttonIn(row).textContent, step);
    const active = w.governanceUI.portfolioState(project, [completed, incomplete]); assert.equal(active.label, 'Assessment in progress'); assert.equal(active.nextStep, 'Continue Review'); assert.equal(active.latest.id, completed.id);
    completed.decision.nextReviewDate = ''; assert.equal(w.governanceUI.portfolioState(project, [completed]).nextReview, null);
  }
});

test('Portfolio retains every investment and follows contextual next steps rather than starting reviews from rows', async () => {
  const w = workspace({ controller: true }); click(w, 'nav-investments');
  assert.equal(w.elements.get('projects-body').children.length, w.state.projects.length);
  const body = w.elements.get('projects-body'); assert.equal(buttonIn(body.children[0]).textContent, 'Continue Review');
  assert(body.children[0].textContent.includes('Ready for decision')); assert(body.children[0].textContent.includes('SHOWCASE')); assert(body.children[0].textContent.includes('DPE-IT-ODP-01'));
  assert.equal(buttonIn(body.children[3]).textContent, 'Open Investment'); assert.equal(buttonIn(body.children[4]).textContent, 'View Decision'); assert(body.children[4].textContent.includes('Stopped'));
  assert(!body.textContent.includes('Start Review')); buttonIn(body.children[3]).events.click[0](); await tick(); assert.equal(w.state.view, 'detail'); assert.equal(w.elements.get('start-review').textContent, 'Start Review');
  startReview(w); assert.equal(w.state.view, 'assessment'); click(w, 'nav-investments');
  assert.equal(buttonIn(w.elements.get('projects-body').children[3]).textContent, 'Continue Review');
  buttonIn(w.elements.get('projects-body').children[3]).events.click[0](); assert.equal(w.state.view, 'assessment');
});

test('non-Stop decision stays immutable while Start New Review creates a fresh single active cycle through controller events', async () => {
  const w = workspace({ controller: true }), store = w.services.reviewStore;
  click(w, 'nav-investments'); buttonIn(w.elements.get('projects-body').children[0]).events.click[0](); assert.equal(w.state.view, 'summary');
  recordDecision(w); const oldID = w.state.currentReviewID, old = JSON.stringify(store.get(oldID));
  assert.throws(() => store.update(oldID, { assessment: w.reviewRules.defaultAssessment() }), /cannot be edited/);
  assert.throws(() => store.confirm(oldID, draft('Continue')), /already recorded/);
  click(w, 'workspace-tab-overview'); await tick(); assert.equal(w.state.view, 'detail');
  assert.equal(w.elements.get('start-review').textContent, 'Start New Review'); assert.equal(w.elements.get('start-review').hidden, false);
  assert.equal(w.elements.get('view-last-decision').textContent, 'View Latest Decision'); assert.equal(w.elements.get('view-last-decision').className, 'secondary');
  assert.equal(w.elements.get('detail-review-status').children[0].textContent, 'Follow-up'); assert.match(w.elements.get('workspace-review-context').textContent, /Latest decision: Modify/);
  assert.equal(rows(w, 'investment-history-body').length, 1); assert.equal(rows(w, 'investment-history-body')[0].dataset.reviewId, oldID);
  startReview(w); const id = w.state.currentReviewID; assert.notEqual(id, oldID); assert.equal(w.state.view, 'assessment');
  const fresh = store.get(id); assert.equal(fresh.status, 'in_progress'); assert.notEqual(fresh.reviewOpenedAt, store.get(oldID).reviewOpenedAt);
  assert.deepEqual(fresh.assessment, w.reviewRules.defaultAssessment()); assert.equal(fresh.reviewBasis, 'Scheduled stage-gate review'); assert.equal(fresh.decisionOwner, ''); assert.equal(fresh.decisionDraft.outcome, '');
  assert.equal(store.start(fresh.project, fresh.evidence).id, id); assert.equal(store.list().filter(r => r.project.ProjectUUID === fresh.project.ProjectUUID && r.status === 'in_progress').length, 1);
  assert.equal(JSON.stringify(store.get(oldID)), old); click(w, 'workspace-tab-overview'); await tick();
  assert.equal(w.elements.get('start-review').textContent, 'Continue Review'); assert.deepEqual(rows(w, 'investment-history-body').map(row => row.dataset.reviewId), [oldID]);
  click(w, 'nav-investments'); const portfolio = w.elements.get('projects-body').children[0]; assert(portfolio.textContent.includes('Assessment in progress')); assert(portfolio.textContent.includes('Modify')); assert.equal(buttonIn(portfolio).textContent, 'Continue Review');
  click(w, 'nav-dashboard'); click(w, 'dashboard-filter-recorded'); assert(rows(w, 'dashboard-attention').some(row => row.dataset.reviewId === oldID)); assert(!rows(w, 'dashboard-attention').some(row => row.dataset.reviewId === id));
  click(w, 'nav-dashboard'); const metric = w.document.getElementById('dashboard-filter-active'); assert.equal(metric.children[1].textContent, '3'); assert(w.elements.get('dashboard-attention').textContent.includes(fresh.project.ProjectDescription));
  const reloaded = workspace({ controller: true, storage: w.map }); assert.equal(reloaded.services.reviewStore.list().filter(r => r.project.ProjectUUID === fresh.project.ProjectUUID).length, 2); assert.equal(JSON.stringify(reloaded.services.reviewStore.get(oldID)), old);
});

test('every completed non-Stop outcome allows a new cycle, whereas latest Stop exposes only View Latest Decision', () => {
  for (const outcome of ['Continue', 'Continue with Conditions', 'Modify', 'Pause', 'Stop']) {
    const w = workspace(), store = w.services.reviewStore; store.seedShowcase(); store.captureContext("SHOWCASE-ODP-REVIEW"); const completed = store.confirm('SHOWCASE-ODP-REVIEW', draft(outcome));
    const before = JSON.stringify(completed); w.governanceUI.details(completed.project, completed.evidence, store.list());
    assert.equal(w.elements.get('start-review').hidden, outcome === 'Stop'); assert.equal(w.elements.get('view-last-decision').hidden, false);
    if (outcome !== 'Stop') { assert.equal(w.elements.get('start-review').textContent, 'Start New Review'); assert.notEqual(store.start(completed.project, completed.evidence, { reviewBasis: w.reviewRules.BASIS[0] }).id, completed.id); }
    assert.equal(JSON.stringify(store.get(completed.id)), before);
  }
});

test('Stop controller guard prevents accidental restart even if the hidden start handler is invoked', async () => {
  const w = workspace({ controller: true }); click(w, 'nav-investments'); buttonIn(w.elements.get('projects-body').children[4]).events.click[0]();
  assert.equal(w.state.view, 'confirmation'); click(w, 'workspace-tab-overview'); await tick();
  assert.equal(w.elements.get('start-review').hidden, true); assert.equal(w.elements.get('view-last-decision').textContent, 'View Latest Decision'); assert.match(w.elements.get('detail-review-status').textContent, /^Stopped/);
  const before = w.map.get(w.services.reviewStore.STORAGE_KEY); click(w, 'start-review'); assert.equal(w.state.view, 'confirmation'); assert.equal(w.map.get(w.services.reviewStore.STORAGE_KEY), before);
});

test('Dashboard selects each latest decision while complete investment history retains timestamp ordering and deterministic ties', () => {
  const w = workspace(), ready = w.services.showcase.seededReviews()[0], other = w.services.showcase.seededReviews()[1];
  const make = (id, timestamp, opened, project = ready.project) => ({ ...ready, id, project, reviewOpenedAt: opened, status: 'decision_recorded', decision: { ...draft('Continue'), timestamp, owner: 'Unit owner' } });
  const older = make('old', '2026-09-01T10:00:00Z', '2026-08-28T10:00:00Z'), latest = make('latest', '2026-10-17T10:00:00Z', '2026-08-01T10:00:00Z');
  const tie = { ...latest, id: 'tie' }, unrelated = make('unrelated', '2026-10-10T10:00:00Z', '2026-10-01T10:00:00Z', other.project);
  const input = [ready, older, unrelated, tie, latest], before = JSON.stringify(input); let opened;
  w.governanceUI.renderDashboard(input, [ready.project, other.project], id => { opened = id; }); click(w, 'dashboard-filter-recorded'); assert.deepEqual(rows(w, 'dashboard-attention').map(row => row.dataset.reviewId), ['latest', 'unrelated']);
  for (const row of rows(w, 'dashboard-attention')) { assert.equal(row.children[0].children.length, 5); buttonIn(row).events.click[0](); assert.equal(opened, row.dataset.reviewId); }
  w.governanceUI.details(ready.project, ready.evidence, input, false, true, id => { opened = id; });
  assert.deepEqual(rows(w, 'investment-history-body').map(row => row.dataset.reviewId), ['latest', 'tie', 'old']);
  for (const row of rows(w, 'investment-history-body')) { assert.equal(row.children.length, 6); buttonIn(row).events.click[0](); assert.equal(opened, row.dataset.reviewId); }
  assert.equal(w.governanceUI.portfolioState(ready.project, input).latest.id, 'latest'); assert.equal(JSON.stringify(input), before);
  const differentOffset = make('offset', '2026-10-17T23:30:00-10:00', '2026-08-01T10:00:00Z');
  assert.equal(w.governanceUI.completedReviews([latest, differentOffset])[0].id, 'offset');
  w.governanceUI.renderDashboard([ready], [ready.project], () => {}); assert.match(w.elements.get('dashboard-attention').textContent, /No investments have a recorded governance decision/);
  w.governanceUI.details(other.project, other.evidence, [ready]); assert.match(w.elements.get('investment-history-body').textContent, /No recorded decisions/);
});

test('historical investment missing from live portfolio remains readable through Dashboard and history callbacks', async () => {
  const source = workspace(), store = source.services.reviewStore; store.seedShowcase(); store.captureContext("SHOWCASE-ODP-REVIEW");
  const original = store.get('SHOWCASE-LRP-DECISION'), missing = JSON.parse(JSON.stringify(original)); missing.id = 'missing-history';
  missing.project = { ...original.project, ProjectUUID: '11111111-2222-3333-4444-555555555555', Project: 'HISTORICAL-ONLY', ProjectDescription: 'Historical snapshot' };
  const raw = JSON.parse(source.map.get(store.STORAGE_KEY)); raw.reviews.push(missing); source.map.set(store.STORAGE_KEY, JSON.stringify(raw));
  const w = workspace({ controller: true, storage: source.map }); click(w, 'dashboard-filter-recorded'); buttonIn(rows(w, 'dashboard-attention').find(row => row.dataset.reviewId === missing.id)).events.click[0]();
  assert.equal(w.state.view, 'confirmation'); assert.equal(w.state.currentReviewID, missing.id); assert.equal(w.state.selectedFromSnapshot, true); assert(w.elements.get('confirmation-record').textContent.includes('HISTORICAL-ONLY'));
  click(w, 'workspace-tab-overview'); await tick(); assert.equal(w.state.view, 'detail'); assert.deepEqual(rows(w, 'investment-history-body').map(row => row.dataset.reviewId), [missing.id]);
  buttonIn(rows(w, 'investment-history-body')[0]).events.click[0](); assert.equal(w.state.currentReviewID, missing.id); assert.equal(w.state.view, 'confirmation');
});

test('unavailable storage never claims Monitoring or empty history and cannot create a review', async () => {
  const storage = { get() { throw new Error('Storage unavailable'); }, set() { throw new Error('Storage unavailable'); } };
  const w = workspace({ controller: true, storage }); click(w, 'nav-investments');
  assert.equal(w.elements.get('projects-body').children.length, 5); assert(w.elements.get('projects-body').textContent.includes('Governance status unavailable'));
  buttonIn(w.elements.get('projects-body').children[3]).events.click[0](); await tick(); assert.equal(w.state.view, 'detail');
  assert.equal(w.elements.get('start-review').disabled, true); assert.equal(w.elements.get('view-last-decision').hidden, true); assert.match(w.elements.get('investment-history-body').textContent, /Decision history unavailable/);
  click(w, 'start-review'); assert.equal(w.state.view, 'detail'); click(w, 'nav-dashboard'); w.governanceUI.showView('dashboard', 'recorded'); assert.match(w.elements.get('dashboard-attention').textContent, /storage unavailable/);
});

test('a past recorded Next Review checkpoint does not automatically create another review', () => {
  const w = workspace(), store = w.services.reviewStore; store.seedShowcase(); store.captureContext("SHOWCASE-ODP-REVIEW");
  // Load a legacy decision instead of creating an invalid new past-dated decision.
  const raw = JSON.parse(w.map.get(store.STORAGE_KEY));
  const completed = raw.reviews.find(r => r.id === 'SHOWCASE-ODP-REVIEW');
  completed.status = 'decision_recorded';
  completed.decision = { ...draft('Modify'), owner: completed.decisionOwner, timestamp: '2020-01-01T00:00:00Z', nextReviewDate: '2020-01-01', assessmentSnapshot: completed.assessment, evidenceSnapshot: completed.evidence };
  w.map.set(store.STORAGE_KEY, JSON.stringify(raw));
  const reloaded = workspace({ controller: true, storage: w.map });
  assert.equal(reloaded.reviewRules.activeReview(reloaded.state.reviews, completed.project.ProjectUUID), null);
  click(reloaded, 'nav-investments'); assert.equal(buttonIn(reloaded.elements.get('projects-body').children[0]).textContent, 'Open Investment');
  assert.equal(reloaded.services.reviewStore.list().filter(r => r.project.ProjectUUID === completed.project.ProjectUUID).length, 1);
});
