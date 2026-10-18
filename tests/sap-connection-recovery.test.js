const { test } = require('node:test');
const assert = require('node:assert/strict');
const { workspace } = require('./helpers/workspace');

const tick = () => new Promise(resolve => setImmediate(resolve));
const location = { protocol: 'http:', hostname: '127.0.0.1', port: '8789' };
function failedPreview(options = {}) {
  return workspace({ controller: true, key: 'unit-only-key', location,
    serviceOverrides: { projects: { loadProjects: async () => { throw new Error('Unit network failure'); } } }, ...options });
}

test('a local static server failure shows the correct current-port proxy command in the toast and persistent details', async () => {
  const w = failedPreview(); await tick();
  assert.equal(w.elements.get('connection-status').textContent, 'SAP Sandbox · Connection issue');
  for (const text of [w.elements.get('toast-message').textContent, w.elements.get('message').textContent, w.elements.get('connection-status').title]) {
    assert.match(text, /python scripts\/serve\.py --port 8789/);
    assert.match(text, /instead of python -m http\.server/);
    assert(!text.includes('--port 8786'));
  }
  w.ui.dismissToast();
  assert.match(w.elements.get('message').textContent, /--port 8789/);
  assert.equal(w.state.projects.length, 5);
});

test('an already enabled proxy or a hosted site is not misdiagnosed as the wrong localhost server', async () => {
  for (const options of [{ config: { SAP_PROXY_BASE_URL: '/sap-proxy' } }, { location: { protocol: 'https:', hostname: 'example.com', port: '' } }]) {
    const w = failedPreview(options); await tick();
    assert(!w.elements.get('message').textContent.includes('Stop the static server'));
    assert(!w.elements.get('toast-message').textContent.includes('scripts/serve.py'));
    assert.match(w.elements.get('message').textContent, /No HTTP response/);
    w.ui.dismissToast();
  }
});

test('real SAP HTTP failures preserve their diagnostics instead of prescribing a server restart', async () => {
  const w = failedPreview({ serviceOverrides: { projects: { loadProjects: async () => {
    const error = new Error('HTTP 403 Forbidden'); error.sap = { response: { status: 403 } }; throw error;
  } } } });
  await tick();
  assert.match(w.elements.get('message').textContent, /HTTP 403 Forbidden/);
  assert(!w.elements.get('message').textContent.includes('scripts/serve.py'));
  w.ui.dismissToast();
});
