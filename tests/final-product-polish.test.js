const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { workspace } = require('./helpers/workspace');
const all = el => [el, ...el.children.flatMap(all)];
const byClass = (el, cls) => all(el).filter(el => (el.className || '').split(' ').includes(cls));
const click = (w, id) => w.document.getElementById(id).events.click[0]();
const keys = ['active', 'overdue', 'material', 'gap', 'recorded'];
const metric = (w, key) => w.document.getElementById(`dashboard-filter-${key}`);
const counts = w => keys.map(key => metric(w, key).children[1].textContent);
const shares = w => keys.map(key => metric(w, key).children[2].children[1].textContent);
const rows = w => w.elements.get('dashboard-attention').children.filter(row => row.dataset.reviewId);
const action = row => byClass(row, 'queue-action-button')[0];
const ago = days => new Date(Date.now() - days * 86400000).toISOString();
function fixture(w) {
  const projects = Array.from({ length: 10 }, (_, i) => ({ ProjectUUID: `unit-investment-${i}`, Project: `UNIT-${i}`, ProjectDescription: `Unit investment ${i}` }));
  const records = projects.slice(0, 4).map((project, i) => ({ id: `active-${i}`, project, status: 'in_progress', reviewOpenedAt: ago(i === 0 ? 20 : 0), reviewBasis: w.reviewRules.BASIS[0], assessment: { ...w.reviewRules.defaultAssessment(), risk: i < 3 ? 'High' : 'Low', costPosition: i === 3 ? 'Insufficient information' : 'Within expectations' } }));
  for (const i of [0, 4]) records.push({ ...records[0], project: projects[i], id: `decision-${i}`, status: 'decision_recorded', decision: { outcome: i ? 'Continue' : 'Modify', timestamp: ago(3) } });
  return { projects, records };
}

test('ten-investment fixture produces independent investment-level 40/10/30/10/20 percentages with accessible button meaning', () => {
  const w = workspace(), { projects, records } = fixture(w), before = JSON.stringify({ projects, records });
  w.governanceUI.renderDashboard(records, projects, () => {});
  assert.deepEqual(counts(w), ['4', '1', '3', '1', '2']); assert.deepEqual(shares(w), ['40%', '10%', '30%', '10%', '20%']);
  for (const [index, key] of keys.entries()) {
    const button = metric(w, key), ring = button.children[2];
    assert.equal(ring.getAttribute('aria-hidden'), 'true'); assert.equal(ring.hidden, false); assert(!all(ring).some(el => el.tag === 'button'));
    assert.match(button.getAttribute('aria-label'), new RegExp(`${counts(w)[index]} investment.*${shares(w)[index].slice(0, -1)} percent of the current investment universe`));
    assert(!button.title); assert.match(ring.children[0].style.background, /conic-gradient\(var\(--metric-tone\)/);
    click(w, `dashboard-filter-${key}`); assert.equal(rows(w).length, Number(counts(w)[index]));
  }
  assert.equal(JSON.stringify({ projects, records }), before);
});

test('percentages round to whole numbers, count duplicate portfolio identities once and never add a denominator label', () => {
  const w = workspace(), { projects, records } = fixture(w);
  w.governanceUI.renderDashboard([records[0]], projects.slice(0, 3), () => {}); assert.equal(shares(w)[0], '33%');
  w.governanceUI.renderDashboard(records.slice(0, 2), projects.slice(0, 3), () => {}); assert.equal(shares(w)[0], '67%');
  w.governanceUI.renderDashboard([records[0]], [projects[0], { ...projects[0], ProjectUUID: projects[0].ProjectUUID.toUpperCase() }], () => {}); assert.equal(shares(w)[0], '100%');
  const ring = metric(w, 'active').children[2]; assert.equal(ring.textContent, '100%'); assert(!ring.textContent.match(/of|\//));
});

test('historical-only identities extend the represented universe consistently, without rewriting Portfolio or exceeding 100%', () => {
  const w = workspace(), { projects, records } = fixture(w), completed = records.filter(r => r.status === 'decision_recorded');
  w.governanceUI.renderDashboard(completed, [projects[0]], () => {}); assert.equal(shares(w)[4], '100%');
  w.governanceUI.renderDashboard(completed, [projects[9]], () => {}); assert.equal(shares(w)[4], '67%');
  w.governanceUI.renderDashboard([...completed, { ...completed[0], id: 'older-cycle' }], [], () => {}); assert.equal(counts(w)[4], '2'); assert.equal(shares(w)[4], '100%');
  assert.deepEqual(projects.map(p => p.Project), Array.from({ length: 10 }, (_, i) => `UNIT-${i}`));
  assert(shares(w).every(p => Number(p.slice(0, -1)) >= 0 && Number(p.slice(0, -1)) <= 100));
});

test('zero denominator has zero percentages with transparent arcs and selectable cards; unavailable is never fabricated zero', () => {
  const w = workspace(); w.governanceUI.renderDashboard([], [], () => {});
  assert.deepEqual(counts(w), ['0', '0', '0', '0', '0']); assert.deepEqual(shares(w), ['0%', '0%', '0%', '0%', '0%']);
  for (const key of keys) { assert.equal(metric(w, key).disabled, false); assert.equal(metric(w, key).children[2].children[0].style.background, 'conic-gradient(var(--metric-tone) 0%, transparent 0)'); click(w, `dashboard-filter-${key}`); assert.equal(rows(w).length, 0); }
  w.governanceUI.renderDashboard([], [], () => {}, false);
  assert.deepEqual(counts(w), Array(5).fill('Unavailable')); assert.deepEqual(shares(w), Array(5).fill(''));
  for (const key of keys) { assert.equal(metric(w, key).disabled, true); assert.equal(metric(w, key).children[2].hidden, true); assert.equal(metric(w, key).children[2].children[0].style.background, 'none'); assert(!metric(w, key).getAttribute('aria-label').includes('0 percent')); }
});

test('all four current lenses deduplicate investment identities, including UUID case, without deduplicating individual findings', () => {
  const w = workspace(), { projects, records } = fixture(w);
  const original = { ...records[0], assessment: { ...records[0].assessment, costPosition: 'Insufficient information', deliveryPerformance: 'Off track' } };
  const duplicate = { ...original, id: 'same-investment', project: { ...projects[0], ProjectUUID: projects[0].ProjectUUID.toUpperCase() } };
  w.governanceUI.renderDashboard([original, duplicate], projects, () => {});
  assert.deepEqual(counts(w).slice(0, 4), ['1', '1', '1', '1']);
  for (const key of keys.slice(0, 4)) { click(w, `dashboard-filter-${key}`); assert.equal(rows(w).length, 1); assert.match(rows(w)[0].textContent, /2 Material/); }
});

test('three immutable cycles collapse only on Dashboard, latest exact-record navigation survives a new active review', () => {
  const w = workspace({ controller: true }), store = w.services.reviewStore, project = w.services.showcase.projects()[0];
  const initial = store.get('SHOWCASE-ODP-REVIEW'), completed = [];
  let active = initial;
  for (const [i, outcome] of ['Continue', 'Modify', 'Pause'].entries()) {
    if (i) { active = store.start(project, initial.evidence, { reviewBasis: w.reviewRules.BASIS[0] }); active = store.update(active.id, { assessment: initial.assessment, decisionOwnerId: initial.decisionOwnerId }); }
    completed.push(store.confirm(active.id, { outcome, rationale: `Unit accountable cycle ${i}`, requiredAction: 'Unit follow-up', actionOwner: 'Unit owner', nextReviewDate: '2026-11-17' }));
  }
  // Give controlled distinct times to guarantee a latest decision independent of UUID tie breaks.
  const saved = JSON.parse(w.map.get(store.STORAGE_KEY)); completed.forEach((record, i) => { saved.reviews.find(r => r.id === record.id).decision.timestamp = `2026-10-${10 + i}T00:00:00Z`; }); w.map.set(store.STORAGE_KEY, JSON.stringify(saved));
  const history = JSON.stringify(store.list().filter(r => r.project.ProjectUUID === project.ProjectUUID));
  const newActive = store.start(project, initial.evidence, { reviewBasis: w.reviewRules.BASIS[0] });
  click(w, 'nav-dashboard'); assert(rows(w).some(r => r.dataset.reviewId === newActive.id)); action(rows(w).find(r => r.dataset.reviewId === newActive.id)).events.click[0](); assert.equal(w.state.view, 'assessment');
  click(w, 'nav-dashboard'); click(w, 'dashboard-filter-recorded'); assert.equal(counts(w)[4], '2'); // This investment plus the separate seeded Stop.
  const latest = completed[2], row = rows(w).find(r => r.dataset.reviewId === latest.id); assert(row); assert.equal(rows(w).filter(r => r.textContent.includes(project.ProjectDescription)).length, 1); assert.match(row.textContent, /Pause/); assert.equal(action(row).textContent, 'View Decision'); action(row).events.click[0]();
  assert.equal(w.state.view, 'confirmation'); assert.equal(w.state.currentReviewID, latest.id); assert.equal(w.elements.get('workspace-tab-history').getAttribute('aria-selected'), 'true');
  assert.deepEqual(w.elements.get('investment-history-body').children.map(r => r.dataset.reviewId), completed.slice().reverse().map(r => r.id));
  assert.equal(JSON.stringify(store.list().filter(r => r.project.ProjectUUID === project.ProjectUUID && r.status === 'decision_recorded')), history);
});

test('Monitoring stays in Portfolio, never becomes a sixth Dashboard card or a no-review-needed assertion', () => {
  const w = workspace({ controller: true }), monitoring = w.services.showcase.projects()[3];
  assert.equal(w.elements.get('dashboard-cards').children.length, 5); assert(!w.elements.get('dashboard-cards').textContent.match(/Monitoring|No Review Needed|Unreviewed/)); assert(!w.elements.get('dashboard-attention').textContent.includes(monitoring.ProjectDescription));
  click(w, 'nav-investments'); const row = w.elements.get('projects-body').children.find(r => r.textContent.includes(monitoring.ProjectDescription)); assert.match(row.textContent, /Monitoring/); assert.match(row.textContent, /Open Investment/); assert.equal(w.elements.get('projects-body').children.length, 5);
});

test('final supplied PNG is the only header identity, with meaningful heading/alt and preserved intrinsic ratio', () => {
  const html = readFileSync('index.html', 'utf8'), png = readFileSync('logo.png'), css = readFileSync('styles.css', 'utf8');
  assert.equal(png.subarray(1, 4).toString(), 'PNG'); assert.equal(png.readUInt32BE(16), 2172); assert.equal(png.readUInt32BE(20), 724);
  const header = html.slice(html.indexOf('<header class="app-header"'), html.indexOf('<main>'));
  assert.match(header, /<h1 class="brand"><img class="brand-logo" src="logo.png" width="2172" height="724" alt="Domino’s Investment Governance Hub"><\/h1>/); assert(!header.includes('dpe-mark.svg')); assert(!header.match(/brand-lockup|brand-name|subtitle|IT Portfolio Review/));
  assert.match(css, /\.brand-logo\s*\{[^}]*width:100%;[^}]*height:auto/); assert(!html.includes('dashboard-portfolio-count')); assert(!css.includes('.page-context'));
});

test('normal autosave is silent and takes no layout row; failure recovery, independent percentages and forced-colours selection remain explicit', () => {
  const w = workspace({ controller: true }), html = readFileSync('index.html', 'utf8'), css = readFileSync('styles.css', 'utf8');
  assert.equal(w.elements.get('review-save-status').textContent, ''); assert.equal(w.elements.get('review-save-status').dataset.state, 'saved');
  assert.match(html, /id="review-save-status" class="sr-only"[^>]*><\/p>/); assert(html.includes('Your edits are still on this screen. Retry before leaving this review.')); assert(!html.includes('✓ Saved'));
  assert.match(html, /Independent percentages may overlap and do not sum to 100 percent/);
  assert.match(css, /\.pulse-ring \{[^}]*width:62px; height:62px/); assert.match(css, /\.pulse-ring \{ width:50px; height:50px/);
  assert.match(css, /mask:radial-gradient\(farthest-side,transparent calc\(100% - 5px\),#000 0\)/); assert.match(css, /@media \(forced-colors:active\)\s*\{[\s\S]*\.pulse-ring-arc \{ display:none; \}/); assert.match(css, /pulse-metric\[aria-pressed="true"\] \{ outline:2px solid Highlight/); assert.match(css, /\.brand \{ background:#fff; forced-color-adjust:none; \}/);
  assert(!html.includes('page-eyebrow')); assert(!readFileSync('js/ui/governance.js', 'utf8').includes('Independent share of the represented investment universe.'));
});
