const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');

function presentation() {
  const context = { window: {}, document: { getElementById: () => null }, Intl, Date };
  for (const file of ['js/core/utils.js', 'js/core/review-rules.js', 'js/ui/renderers.js', 'js/ui/governance.js']) {
    runInNewContext(readFileSync(join(__dirname, '..', file), 'utf8'), context, { filename: file });
  }
  return context.window.DPEApp;
}

test('a zero-result SAP request is distinct from unrequested or failed evidence', () => {
  const { governanceUI: ui } = presentation();
  assert.equal(typeof ui.evidenceStatus, 'function');
  assert.equal(ui.evidenceStatus({ status: 'success', linkedRecordCount: 0 }).label, 'No matching records');
  assert.equal(ui.evidenceStatus({ status: 'not_attempted', linkedRecordCount: null }).label, 'Not loaded');
  assert.equal(ui.evidenceStatus({ status: 'error', linkedRecordCount: null }).label, 'Request failed');
});

test('loading takes precedence over a saved success snapshot', () => {
  const { governanceUI: ui } = presentation();
  assert.equal(typeof ui.evidenceStatus, 'function');
  assert.equal(ui.evidenceStatus({ status: 'success', linkedRecordCount: 2 }, true).label, 'Loading');
});

test('partial results and unavailable identifiers are not presented as complete evidence', () => {
  const { governanceUI: ui } = presentation();
  assert.equal(typeof ui.evidenceStatus, 'function');
  assert.equal(ui.evidenceStatus({ status: 'success', hasMore: true, linkedRecordCount: 2 }).label, 'Loaded · partial page');
  assert.equal(ui.evidenceStatus({ status: 'unavailable' }).label, 'Unavailable');
});

test('English display dates preserve UTC date-only values and unknown source text', () => {
  const { ui } = presentation();
  assert.equal(typeof ui.formatDate, 'function');
  assert.equal(ui.formatDate('/Date(1486339200000)/'), '06 Feb 2017');
  assert.equal(ui.formatDate('2017-02-06T23:00:00-12:00'), '07 Feb 2017');
  assert.equal(ui.formatDate(null), '—');
  assert.equal(ui.formatDate('source date unknown'), 'source date unknown');
});
