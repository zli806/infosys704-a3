const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');
const { workspace } = require('./helpers/workspace');
const spec = file => JSON.parse(readFileSync(join(__dirname, '../api', file), 'utf8'));
const config = { window: {} }; runInNewContext(readFileSync(join(__dirname, '../api-config.js'), 'utf8'), config);
const schemas = [
  ['project', spec('API_ENTERPRISE_PROJECT_SRV_0002.json').components.schemas['API_ENTERPRISE_PROJECT_SRV.A_EnterpriseProjectType'], config.window.SAP_API_CONFIG.projectFields],
  ['element', spec('API_ENTERPRISE_PROJECT_SRV_0002.json').components.schemas['API_ENTERPRISE_PROJECT_SRV.A_EnterpriseProjectElementType'], config.window.SAP_API_CONFIG.elementFields],
  ['gl', spec('API_GLACCOUNTLINEITEM.json').components.schemas['cds_api_glaccountlineitem.GLAccountLineItemType'], config.window.GL_API_CONFIG.fields],
  ['po', spec('CE_PURCHASEORDER_0001.json').components.schemas['com.sap.gateway.srvd_a2x.api_purchaseorder_2.v0001.PurchaseOrderAccountAssignment_Type'], config.window.PO_API_CONFIG.fields]
];
function verifyField(field, value, definition) {
  assert(definition, `Unsupported SAP field: ${field}`);
  if (value === null) { assert.equal(definition.nullable, true, field); return; }
  const allowed = definition.anyOf ? definition.anyOf.map(s => s.type) : [definition.type];
  assert(allowed.includes(typeof value), `${field} type`);
  if (definition.maxLength) assert(value.length <= definition.maxLength, `${field} maximum length`);
  if (definition.format === 'uuid') assert.match(value, /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i);
  if (definition.format === 'date') assert.match(value, /^\d{4}-\d{2}-\d{2}$/);
  if (definition.example?.startsWith?.('/Date(')) assert.match(value, /^\/Date\(-?\d+\)\/$/);
  if (definition.format === 'decimal') {
    assert.match(String(value), /^-?\d+(\.\d+)?$/);
    if (definition['x-sap-scale'] !== undefined) assert((String(value).split('.')[1] || '').length <= definition['x-sap-scale']);
    if (definition['x-sap-precision']) assert(String(value).replace(/[-.]/g, '').length <= definition['x-sap-precision']);
    if (definition.minimum !== undefined) assert(Number(value) >= definition.minimum, field);
    if (definition.maximum !== undefined) assert(Number(value) <= definition.maximum, field);
  }
}

test('every synthetic payload field/type/length/date/decimal conforms to the actual downloaded SAP read schema and configured select list', () => {
  const w = workspace(), d = w.fixtures;
  assert(Object.isFrozen(d)); assert(Object.isFrozen(d.enterpriseProjectResponse.d.results[0]));
  for (const [kind, schema, fields] of schemas) {
    const rows = kind === 'project' ? d.enterpriseProjectResponse.d.results : Object.values(d[kind === 'element' ? 'projectElementResponses' : kind === 'gl' ? 'glResponses' : 'poResponses']).flatMap(r => kind === 'po' ? r.value : r.d.results);
    assert(rows.length > 0);
    for (const row of rows) {
      assert.deepEqual(Object.keys(row).sort(), Array.from(fields).sort(), kind);
      for (const [field, value] of Object.entries(row)) verifyField(field, value, schema.properties[field]);
      assert(Object.isFrozen(row));
    }
  }
  assert.equal(w.services.showcase.validate(), true);
});

test('wrappers stay V2/V4-specific and every transaction joins the exact parent project/WBS, without unrelated rows', () => {
  const w = workspace(), d = w.fixtures, ids = new Set();
  assert.deepEqual(Object.keys(d.enterpriseProjectResponse), ['d']);
  for (const [index, project] of Array.from(d.enterpriseProjectResponse.d.results).entries()) {
    assert.equal(project.ProjectInternalID, `0704000${index + 1}`);
    assert.equal(project.ProjectUUID, `7040000${index + 1}-0000-4000-8000-00000000000${index + 1}`);
    const structure = d.projectElementResponses[project.ProjectUUID]; assert.deepEqual(Object.keys(structure), ['d']);
    const wbs = new Set(structure.d.results.map(e => e.WBSElementInternalID));
    assert.equal(wbs.size, structure.d.results.length);
    for (const e of structure.d.results) {
      assert.equal(e.ProjectUUID, project.ProjectUUID); assert(!ids.has(e.WBSElementInternalID)); ids.add(e.WBSElementInternalID);
      assert.equal(e.IsMainMilestone, e.IsProjectMilestone === 'X');
    }
    const financial = d.glResponses[project.ProjectUUID]; assert.deepEqual(Object.keys(financial), ['d']);
    for (const row of financial.d.results) { assert.equal(row.ProjectInternalID, project.ProjectInternalID); assert(wbs.has(row.WBSElementInternalID)); assert.equal(row.IsCommitment, false); assert.equal(row.IsReversal, false); assert.equal(row.IsReversed, false); }
    const procurement = d.poResponses[project.ProjectUUID]; assert.deepEqual(Object.keys(procurement), ['value']);
    for (const row of procurement.value) { assert(wbs.has(row.WBSElementInternalID)); assert.equal(row.IsDeleted, false); }
  }
  assert.equal(ids.size, 21);
  const hero = d.projectElementResponses[d.enterpriseProjectResponse.d.results[0].ProjectUUID].d.results;
  assert.deepEqual(Array.from(hero, e => e.WBSElementInternalID), ['74010001', '74010002', '74010003', '74010004', '74010005']);
  assert.equal(hero.at(-1).IsProjectMilestone, 'X'); assert.equal(hero.at(-1).IsMainMilestone, true);
});

test('provider rejects wrong wrappers, unsupported fields, invalid dates/decimals/booleans, schema overflows and cross-project joins', () => {
  const w = workspace(), s = w.services.showcase, original = JSON.stringify(w.fixtures), id = s.projects()[0].ProjectUUID;
  const edits = [
    d => { d.enterpriseProjectResponse = { value: [] }; },
    d => { d.poResponses[id] = { d: { results: [] } }; },
    d => { d.enterpriseProjectResponse.d.results[0].ApprovedBudget = '100'; },
    d => { d.enterpriseProjectResponse.d.results[0].ProjectInternalID = '123456789'; },
    d => { d.enterpriseProjectResponse.d.results[0].ProjectUUID = 'not-a-uuid'; },
    d => { d.projectElementResponses[id].d.results[0].IsProjectMilestone = true; },
    d => { d.projectElementResponses[id].d.results[0].IsMainMilestone = 'true'; },
    d => { d.projectElementResponses[id].d.results[0].PlannedStartDate = '2026-01-01'; },
    d => { d.projectElementResponses[id].d.results[0].WBSElementInternalID = '123456789'; },
    d => { d.glResponses[id].d.results[0].ProjectInternalID = '07040002'; },
    d => { d.glResponses[id].d.results[0].WBSElementInternalID = '74020001'; },
    d => { d.glResponses[id].d.results[0].AmountInCompanyCodeCurrency = 850000; },
    d => { d.glResponses[id].d.results[0].AmountInCompanyCodeCurrency = '850000.0009'; },
    d => { d.glResponses[id].d.results[0].DocumentItemText = 'x'.repeat(51); },
    d => { d.glResponses[id].d.results[0].IsReversed = 'false'; },
    d => { d.poResponses[id].value[0].WBSElementInternalID = '74020001'; },
    d => { d.poResponses[id].value[0].CreationDate = '/Date(1)/'; },
    d => { d.poResponses[id].value[0].IsFinallyInvoiced = ''; },
    d => { d.poResponses[id].value[0].MultipleAcctAssgmtDistrPercent = '100.0'; },
    d => { d.poResponses[id].value[0].DocumentCurrency = 'AUDX'; }
  ];
  for (const edit of edits) { const bad = JSON.parse(original); edit(bad); assert.throws(() => s.validate(bad), /Invalid synthetic showcase data/); }
  assert.equal(JSON.stringify(w.fixtures), original);
});

test('all five exact amounts are derived through the same GL/PO aggregators and technical summarisation logic', () => {
  const w = workspace(), s = w.services.showcase;
  const targets = [[6150000, 1480000, 1070000, '11.3'], [2400000, 920000, 520000, '3.1'], [3100000, 650000, 350000, null], [3600000, 720000, 220000, '-2.9'], [2850000, 350000, 150000, '14.7']];
  for (const [i, project] of Array.from(s.projects()).entries()) {
    const [posted, po, notFinal, percent] = targets[i], financial = s.gl(project).records, procurement = s.po(project).records;
    assert.equal(financial.length, [10, 6, 6, 5, 5][i]); assert.equal(procurement.length, [4, 3, 2, 3, 2][i]);
    const glUnits = w.services.gl.aggregate(financial).totals.get('AUD'), group = w.services.po.aggregate(procurement).totals.get('AUD');
    assert.equal(glUnits, BigInt(posted) * 1000n);
    assert.equal(w.utils.decimalUnits(w.utils.displayPODecimal(group.total)), BigInt(po) * 1000n);
    assert.equal(w.utils.decimalUnits(w.utils.displayPODecimal(group.notFinal)), BigInt(notFinal) * 1000n);
    assert(w.services.gl.summarize(financial).includes(`AUD: ${posted}.000`));
    assert(w.services.po.summarize(procurement).includes(`AUD — PO-linked procurement amount: ${po}.000 · Not-finally-invoiced PO-linked amount: ${notFinal}.000`));
    const context = s.financialContext(project);
    assert.equal(context.postedFinancialActivity, `${posted}.000`); assert.equal(context.procurementActivity, `${po}.000`); assert.equal(context.notFinallyInvoiced, `${notFinal}.000`); assert.equal(context.variancePercent, percent);
    assert(!Object.hasOwn(s.governanceContext(project), 'postedFinancialActivity'));
  }
  const hero = s.financialContext(s.projects()[0]); assert.equal(hero.forecastVariance, '950000.000'); assert.equal(hero.remainingForecastInvestment, '3200000.000');
  assert.equal(hero.plannedCompletion, '2026-09-30'); assert.equal(hero.forecastCompletion, '2026-11-15');
  const milestone = s.elements(s.projects()[0]).records.at(-1);
  assert.equal(milestone.PlannedEndDate, `/Date(${Date.parse('2026-09-30T00:00:00Z')})/`); assert.equal(milestone.ForecastedEndDate, `/Date(${Date.parse('2026-11-15T00:00:00Z')})/`);
  const gap = s.financialContext(s.projects()[2]); for (const field of ['forecastAtCompletion', 'forecastVariance', 'variancePercent', 'remainingForecastInvestment']) assert.equal(gap[field], null);
});

test('shared aggregators retain strict flags, signed amounts, invalid exclusions and separate currencies', () => {
  const w = workspace();
  assert.equal(w.utils.redact('Local provider failure', ''), 'Local provider failure');
  const accounting = [{ IsCommitment: false, IsReversal: true, CompanyCodeCurrency: 'AUD', AmountInCompanyCodeCurrency: '-20.125' },
    { IsCommitment: false, CompanyCodeCurrency: 'NZD', AmountInCompanyCodeCurrency: '5.000' },
    { IsCommitment: true, CompanyCodeCurrency: 'AUD', AmountInCompanyCodeCurrency: '100.000' },
    { IsCommitment: 'false', CompanyCodeCurrency: 'AUD', AmountInCompanyCodeCurrency: '100.000' },
    { IsCommitment: false, CompanyCodeCurrency: 'AUD', AmountInCompanyCodeCurrency: 'invalid' }];
  const gl = w.services.gl.aggregate(accounting); assert.equal(gl.totals.get('AUD'), -20125n); assert.equal(gl.totals.get('NZD'), 5000n); assert.equal(gl.excluded, 1); assert.equal(gl.unknown, 1);
  const purchase = [{ IsDeleted: false, IsFinallyInvoiced: false, DocumentCurrency: 'AUD', PurgDocNetAmount: '20.125', Quantity: '10', MultipleAcctAssgmtDistrPercent: '50.0' },
    { IsDeleted: false, IsFinallyInvoiced: true, DocumentCurrency: 'AUD', PurgDocNetAmount: '3.000' },
    { IsDeleted: true, IsFinallyInvoiced: false, DocumentCurrency: 'AUD', PurgDocNetAmount: '100.000' },
    { IsDeleted: false, IsFinallyInvoiced: null, DocumentCurrency: 'NZD', PurgDocNetAmount: '2.000' }];
  const po = w.services.po.aggregate(purchase); assert.equal(w.utils.displayPODecimal(po.totals.get('AUD').total), '23.125'); assert.equal(w.utils.displayPODecimal(po.totals.get('AUD').notFinal), '20.125'); assert.equal(po.totals.size, 2);
});
