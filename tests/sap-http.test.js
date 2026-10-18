const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');
const { test } = require('node:test');
const assert = require('node:assert/strict');

function setup(proxy) {
  const calls = [];
  const context = { window: { APP_CONFIG: { SAP_PROXY_BASE_URL: proxy }, location: { origin: 'http://127.0.0.1:8786' } },
    URL, setTimeout, clearTimeout,
    fetch: async (url, options) => {
      calls.push({ url: url.href, options });
      return { status: 200, statusText: 'OK', text: async () => '{"d":{"results":[]}}' };
    } };
  for (const file of ['js/core/utils.js', 'js/services/sap-http.js']) {
    runInNewContext(readFileSync(join(__dirname, '..', file), 'utf8'), context);
  }
  return { http: context.window.DPEApp.http, calls };
}

test('local proxy preserves SAP paths, OData queries, credentials and diagnostic URLs', async () => {
  const { http, calls } = setup('/sap-proxy');
  for (const path of [
    '/s4hanacloud/sap/opu/odata/sap/API_ENTERPRISE_PROJECT_SRV;v=0002/A_EnterpriseProject',
    "/s4hanacloud/sap/opu/odata/sap/API_ENTERPRISE_PROJECT_SRV;v=0002/A_EnterpriseProject(guid'12345678-1234-1234-1234-123456789abc')/to_EnterpriseProjectElement",
    '/s4hanacloud/sap/opu/odata/sap/API_GLACCOUNTLINEITEM/GLAccountLineItem',
    '/s4hanacloud/sap/opu/odata4/sap/api_purchaseorder_2/srvd_a2x/sap/purchaseorder/0001/PurchaseOrderAccountAssignment'
  ]) {
    const url = new URL(`https://sandbox.api.sap.com${path}`);
    url.searchParams.set('$filter', "WBSElementInternalID eq '89'");
    url.searchParams.set('$select', 'ProjectUUID,Project');
    const controller = new AbortController();
    const result = await http.read(url, 'unit-test-key', controller);
    const call = calls.at(-1);
    assert.equal(call.url, `http://127.0.0.1:8786/sap-proxy${url.pathname}${url.search}`);
    assert.equal(call.options.method, 'GET');
    assert.equal(call.options.headers.APIKey, 'unit-test-key');
    assert.equal(call.options.headers.Accept, 'application/json');
    assert.equal(call.options.credentials, 'omit');
    assert.equal(call.options.signal, controller.signal);
    assert.equal(result.url, url.href);
    assert.equal(result.data.d.results.length, 0);
  }
});

test('ordinary static hosting keeps the direct SAP transport', async () => {
  const { http, calls } = setup(undefined);
  const url = new URL('https://sandbox.api.sap.com/resource?$top=5');
  await http.read(url, 'unit-test-key', new AbortController());
  assert.equal(calls[0].url, url.href);
});

test('proxy routing only accepts the fixed local route and exact SAP origin', async () => {
  for (const proxy of ['https://example.com', '//example.com', '/different-proxy']) {
    const { http, calls } = setup(proxy);
    const url = new URL('https://sandbox.api.sap.com/resource');
    await http.read(url, 'unit-test-key', new AbortController());
    assert.equal(calls[0].url, url.href);
  }
  const { http, calls } = setup('/sap-proxy');
  const url = new URL('https://example.com/resource');
  await http.read(url, 'unit-test-key', new AbortController());
  assert.equal(calls[0].url, url.href);
});
