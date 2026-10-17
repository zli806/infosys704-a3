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
  'Distinct investments with an active continuation review awaiting assessment completion or a governance decision. Lenses may overlap; percentages are independent and do not sum to 100%.',
  'Investments whose active review is past the 14-day decision target, including reviews that have reached the 30-day escalation threshold.',
  'Active investments with at least one Material Concern identified during assessment. This number counts investments, not individual findings.',
  'Active investments where at least one assessment area has insufficient evidence for a reliable conclusion. This number counts investments, not individual gaps.',
  'Investments with at least one completed governance decision. Each investment is counted once; full review-cycle history remains available in the investment History tab.'
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
  help.events.focus[0](); help.events.click[0](); w.governanceUI.renderDashboard(w.state.reviews, w.state.projects, () => {});
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
  assert.match(html, /id="assessment-save-summary"[^>]*>Review Summary →/);
  const summary = html.slice(html.indexOf('<section id="summary-view"'), html.indexOf('<section id="decision-view"'));
  const strip = summary.match(/<section class="summary-decision-strip"[\s\S]*?<\/section>/)[0]; assert(!strip.includes('<button'));
  assert.match(summary, /class="form-footer workflow-actions"[\s\S]*id="back-assessment" class="secondary"[^>]*>← Assessment[\s\S]*id="proceed-decision"[^>]*>Governance Decision →/);
  assert(!html.includes('id="review-back-investment"')); assert(html.includes('id="workspace-tab-overview"'));
  assert(!html.includes('Make Governance Decision')); assert(!html.includes('Return to Investment'));
  const confirmation = html.slice(html.indexOf('<section id="confirmation-view"'));
  assert(!confirmation.includes('id="return-investment"')); assert.match(html, /id="back-dashboard" type="button">Back to Dashboard/);
});

test('workspace stepper derives availability from readiness and preserves focusable back/continue handlers', () => {
  const w = workspace({ controller: true }), steps = w.document.getElementById('review-steps');
  for (const name of ['assessment', 'summary', 'decision']) { const step = w.document.createElement('li'), button = w.document.getElementById(`review-step-${name}`); button.append(w.document.createElement('span')); step.append(button); steps.append(step); }
  const record = w.services.reviewStore.get('SHOWCASE-ODP-REVIEW');
  w.governanceUI.showView('summary'); w.governanceUI.chrome(record, false); assert.deepEqual(steps.children.map(step => step.dataset.state), ['complete', 'current', 'available']);
  assert.equal(steps.children[0].children[0].children[0].textContent, '✓'); assert.equal(steps.children[1].getAttribute('aria-current'), 'step'); assert.equal(w.elements.get('review-step-decision').disabled, false);
  w.governanceUI.showView('decision'); w.governanceUI.chrome(record, false); assert.deepEqual(steps.children.map(step => step.dataset.state), ['complete', 'available', 'current']);
  assert.match(readFileSync('index.html', 'utf8'), /id="back-summary"[^>]*>← Review Summary/);
  click(w, 'nav-dashboard'); const ready = rows(w).find(row => row.dataset.reviewId === 'SHOWCASE-ODP-REVIEW'); byClass(ready, 'queue-action-button')[0].events.click[0]();
  assert.equal(w.state.view, 'summary'); click(w, 'proceed-decision'); assert.equal(w.state.view, 'decision'); click(w, 'back-summary'); assert.equal(w.state.view, 'summary'); click(w, 'back-assessment'); assert.equal(w.state.view, 'assessment');
});
