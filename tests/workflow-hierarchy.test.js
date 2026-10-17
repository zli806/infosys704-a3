const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { workspace } = require('./helpers/workspace');
const all = el => [el, ...el.children.flatMap(all)];
const byClass = (el, name) => all(el).filter(el => (el.className || '').split(' ').includes(name));
const keys = ['active', 'overdue', 'material', 'gap', 'recorded'];
const click = (w, id) => w.document.getElementById(id).events.click[0]();
const selected = w => byClass(w.elements.get('dashboard-cards'), 'pulse-metric').filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.filter);
const rows = w => byClass(w.elements.get('dashboard-attention'), 'decision-queue-row');
const helpCopy = [
  'Open review cycles awaiting assessment completion or a governance decision. Current-review lenses may overlap.',
  'Active reviews past the 14-day decision target, including reviews that have reached the 30-day escalation threshold.',
  'Active investments with at least one Material Concern identified during assessment. This number counts investments, not individual findings.',
  'Active investments where at least one assessment area has insufficient evidence for a reliable conclusion. This number counts investments, not individual gaps.',
  'Completed, immutable governance decisions. One investment may appear more than once when it has completed multiple review cycles.'
];

test('five concise independent helps are sibling controls, never nested in a metric button', () => {
  const w = workspace({ controller: true });
  assert.equal(byClass(w.elements.get('dashboard-cards'), 'metric-help').length, 5);
  keys.forEach((key, i) => {
    const metric = w.document.getElementById(`dashboard-filter-${key}`), help = w.document.getElementById(`metric-help-${key}`), tip = w.document.getElementById(`metric-tip-${key}`);
    assert.equal(help.tag, 'button'); assert.equal(help.type, 'button'); assert.equal(tip.textContent, helpCopy[i]); assert.equal(tip.getAttribute('role'), 'tooltip');
    assert.equal(help.getAttribute('aria-describedby'), tip.id); assert.equal(help.getAttribute('aria-controls'), tip.id); assert(help.getAttribute('aria-label').startsWith('About '));
    assert(!all(metric).includes(help)); assert.equal(help.parentElement.parentElement, metric.parentElement);
    assert.equal(tip.hidden, true); assert(!tip.textContent.includes('calibrated'));
  });
  const html = readFileSync('index.html', 'utf8'); for (const retired of ['queue-help', 'queue-help-trigger', 'signals-help']) assert(!html.includes(`id="${retired}"`));
});

test('every help supports hover, focus, tap pinning and Escape without selecting its lens', () => {
  const w = workspace({ controller: true });
  for (const key of keys) {
    const help = w.document.getElementById(`metric-help-${key}`), tip = w.document.getElementById(`metric-tip-${key}`), wrap = help.parentElement;
    wrap.events.mouseenter[0](); assert.equal(tip.hidden, false); wrap.events.mouseleave[0](); assert.equal(tip.hidden, true);
    help.events.focus[0](); assert.equal(tip.hidden, false); help.events.click[0](); assert.equal(help.getAttribute('aria-expanded'), 'true');
    help.events.click[0](); assert.equal(tip.hidden, true); help.events.blur[0]();
    help.events.focus[0](); let prevented = false; for (const callback of w.document.events.keydown) callback({ key: 'Escape', preventDefault() { prevented = true; } });
    assert(prevented); assert.equal(tip.hidden, true); help.events.blur[0](); assert.deepEqual(selected(w), ['active']);
  }
});

test('help focus/pinning survives metric data refresh and opening another help or leaving Dashboard dismisses it', () => {
  const w = workspace({ controller: true }), help = w.document.getElementById('metric-help-gap'), tip = w.document.getElementById('metric-tip-gap');
  help.events.focus[0](); help.events.click[0](); w.governanceUI.renderDashboard(w.state.reviews, 10, () => {});
  assert.equal(w.document.getElementById('metric-help-gap'), help); assert.equal(tip.hidden, false);
  w.document.getElementById('metric-help-recorded').events.focus[0](); assert.equal(tip.hidden, true);
  assert.equal(w.document.getElementById('metric-tip-recorded').hidden, false); click(w, 'nav-investments'); assert.equal(w.document.getElementById('metric-tip-recorded').hidden, true);
  click(w, 'nav-dashboard'); help.events.focus[0](); help.events.click[0](); assert.equal(tip.hidden, false);
  w.document.events.pointerdown[0]({ target: w.elements.get('nav-investments') }); assert.equal(tip.hidden, true);
});

test('row indexes re-sequence every selected subset while count stays accessible and emerging finding meaning stays available', () => {
  const w = workspace({ controller: true }), stored = w.map.get(w.services.reviewStore.STORAGE_KEY);
  for (const key of keys) {
    click(w, `dashboard-filter-${key}`); const list = rows(w);
    assert.deepEqual(list.map(row => byClass(row, 'queue-sequence')[0].textContent), list.map((_, index) => String(index + 1).padStart(2, '0')));
    assert(list.every(row => byClass(row, 'queue-sequence')[0].getAttribute('aria-hidden') === 'true'));
    assert.equal(list.length, Number(w.document.getElementById(`dashboard-filter-${key}`).children[1].textContent));
  }
  click(w, 'dashboard-filter-active'); const emerging = byClass(w.elements.get('dashboard-attention'), 'queue-signal').find(chip => chip.dataset.tone === 'emerging');
  assert.match(emerging.title, /not currently classified as material/); assert(emerging.getAttribute('aria-label').includes(emerging.title));
  const html = readFileSync('index.html', 'utf8'); assert.match(html, /id="dashboard-filter-count" class="sr-only"/); assert.match(html, /role="status" aria-live="polite" aria-atomic="true"/);
  assert.equal(w.map.get(w.services.reviewStore.STORAGE_KEY), stored);
});

test('workflow markup has exactly one primary forward action per step and Summary overview is information only', () => {
  const html = readFileSync('index.html', 'utf8'), css = readFileSync('styles.css', 'utf8');
  assert.match(html, /id="assessment-save-summary"[^>]*>Continue to Summary →/);
  const summary = html.slice(html.indexOf('<section id="summary-view"'), html.indexOf('<section id="decision-view"'));
  const strip = summary.match(/<section class="summary-decision-strip"[\s\S]*?<\/section>/)[0]; assert(!strip.includes('<button'));
  assert.match(summary, /class="form-footer workflow-actions"[\s\S]*id="back-assessment" class="secondary"[^>]*>← Back to Assessment[\s\S]*id="proceed-decision"[^>]*>Continue to Decision →/);
  assert.match(html, /id="review-back-investment"[^>]*>← Back to Investment/);
  assert.match(css, /\.review-header > button\s*\{[^}]*border:1px solid/);
  assert(!html.includes('Make Governance Decision')); assert(!html.includes('Return to Investment'));
  const confirmation = html.slice(html.indexOf('<section id="confirmation-view"'));
  assert.match(confirmation, /id="return-investment" class="secondary"[^>]*>View Investment/); assert.match(confirmation, /id="back-dashboard" type="button">Back to Dashboard/);
});

test('stepper distinguishes completed/current/future without adding navigation, and back/continue handlers preserve workflow', () => {
  const w = workspace({ controller: true }), steps = w.document.getElementById('review-steps');
  for (let i = 0; i < 3; i++) { const step = w.document.createElement('li'); step.append(w.document.createElement('span')); steps.append(step); }
  w.governanceUI.showView('summary'); assert.deepEqual(steps.children.map(step => step.dataset.state), ['complete', 'current', 'future']);
  assert.equal(steps.children[0].children[0].textContent, '✓'); assert.equal(steps.children[1].getAttribute('aria-current'), 'step'); assert(steps.children.every(step => !step.events.click));
  w.governanceUI.showView('decision'); assert.deepEqual(steps.children.map(step => step.dataset.state), ['complete', 'complete', 'current']);
  assert.match(readFileSync('index.html', 'utf8'), /id="back-summary"[^>]*>← Back to Summary/);
  click(w, 'nav-dashboard'); const ready = rows(w).find(row => row.dataset.reviewId === 'SHOWCASE-ODP-REVIEW'); byClass(ready, 'queue-action-button')[0].events.click[0]();
  assert.equal(w.state.view, 'summary'); click(w, 'proceed-decision'); assert.equal(w.state.view, 'decision'); click(w, 'back-summary'); assert.equal(w.state.view, 'summary'); click(w, 'back-assessment'); assert.equal(w.state.view, 'assessment');
});
