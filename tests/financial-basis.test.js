const { test } = require('node:test');
const assert = require('node:assert/strict');
const { workspace } = require('./helpers/workspace');
const draft = {outcome:'Continue',rationale:'Human decision'};
function setup() { const w=workspace(); w.services.reviewStore.seedShowcase(); return w; }
test('A01 new review captures whitelisted precise context, preserving unknowns and source/capture times', () => {
 const w=setup(), s=w.services.showcase, p=s.projects()[2];
 const record=w.services.reviewStore.captureContext('SHOWCASE-DAT-REVIEW');
 const c=record.investmentContextSnapshot;
 assert.equal(c.version,1); assert.equal(c.source,'SHOWCASE CONTEXT'); assert.equal(c.forecastAtCompletion,null);
 assert.equal(c.sourceAsOf,s.financialContext(p).evidenceAsOf); assert(c.capturedAt); assert(!('businessNarrative' in c));
 const started=w.services.reviewStore.start(s.projects()[3],s.evidence(s.projects()[3]),{reviewBasis:'Material trigger'});
 assert.equal(started.investmentContextSnapshot.approvedInvestment,s.financialContext(s.projects()[3]).approvedInvestment);
});
test('A01 confirmation freezes the context seen in Summary; provider changes and legacy reads cannot rewrite History', () => {
 const w=setup(), store=w.services.reviewStore, record=store.captureContext('SHOWCASE-ODP-REVIEW');
 w.governanceUI.reviewSummary(record); const original=JSON.stringify(record.investmentContextSnapshot);
 w.services.showcase.financialContext=()=>{throw new Error('Must not reread provider');};
 const done=store.confirm(record.id,draft); assert.equal(JSON.stringify(done.decision.investmentContextSnapshot),original);
 w.governanceUI.confirmation(done); assert.match(w.elements.get('confirmation-record').textContent,/8400000.000/);
 const legacy=store.get('SHOWCASE-LRP-DECISION'); assert.equal(legacy.decision.investmentContextSnapshot,null);
 w.governanceUI.confirmation(legacy); assert.match(w.elements.get('confirmation-record').textContent,/not saved/i);
});
test('A01 legacy active capture failure preserves original JSON; unknown/extra snapshot fields are filtered', () => {
 const w=setup(),store=w.services.reviewStore,before=w.map.get(store.STORAGE_KEY),set=w.map.set.bind(w.map);
 w.map.set=()=>{throw Error('quota');}; assert.throws(()=>store.captureContext('SHOWCASE-ODP-REVIEW'),/save/); assert.equal(w.map.get(store.STORAGE_KEY),before); w.map.set=set;
 let record=store.captureContext('SHOWCASE-ODP-REVIEW'); const raw=JSON.parse(w.map.get(store.STORAGE_KEY)),r=raw.reviews.find(r=>r.id===record.id);
 r.investmentContextSnapshot.secret='exclude'; r.investmentContextSnapshot.forecastAtCompletion=null; w.map.set(store.STORAGE_KEY,JSON.stringify(raw));
 record=store.get(record.id); assert.equal(record.investmentContextSnapshot.forecastAtCompletion,null); assert(!('secret' in record.investmentContextSnapshot));
});
test('U01 Summary uses stored evidence without fetch, preserving currencies, partial/error/zero-match limitations', () => {
 const w=setup(), store=w.services.reviewStore, record=store.captureContext('SHOWCASE-ODP-REVIEW');
 w.governanceUI.reviewSummary(record); let text=w.elements.get('review-summary').textContent;
 for(const phrase of ['Financial Basis','8400000.000','9350000.000','SHOWCASE CONTEXT','Source as of','Captured']) assert(text.includes(phrase),phrase);
 const sap={...record,project:{Project:'SAP-TEST',ProjectUUID:'abcdefab-1234-4234-8234-abcdefabcdef'},investmentContextSnapshot:null,evidence:{...record.evidence,gl:{status:'success',attempted:true,linkedRecordCount:2,hasMore:true,capturedAt:'2026-10-17T00:00:00Z',summaryLines:['AUD 10.000 returned non-commitment activity','EUR 20.000 returned non-commitment activity']},po:{status:'success',attempted:true,linkedRecordCount:0,summaryLines:[],capturedAt:null}}};
 w.governanceUI.reviewSummary(sap); text=w.elements.get('review-summary').textContent;
 for(const phrase of ['AUD 10.000','EUR 20.000','Limited evidence','not complete project cost','not zero exposure','not saved']) assert(text.includes(phrase),phrase);
 assert(!text.includes('8400000'));
 sap.evidence.gl.status='error';sap.evidence.gl.summaryLines=[];w.governanceUI.reviewSummary(sap);assert(w.elements.get('review-summary').textContent.includes('Error'));
});
test('U01 currency amounts stay visible while verbose calculation notes use a disclosure', () => {
 const w=setup(),r=w.services.reviewStore.captureContext('SHOWCASE-ODP-REVIEW');w.governanceUI.reviewSummary(r);
 const all=e=>[e,...e.children.flatMap(all)],part=w.elements.get('review-summary').children.find(e=>e.textContent.startsWith('Financial Basis'));
 const details=all(part).filter(e=>e.tag==='details');assert.equal(details.length,2);assert(details.every(e=>!e.open));
 const direct=all(part).filter(e=>e.tag==='section').flatMap(e=>e.children.filter(c=>c.tag==='p').map(c=>c.textContent));
 assert(direct.some(t=>/^AUD:/.test(t)));assert(!direct.some(t=>t.includes('ledger deduplication')));
});
test('A01 direct confirmation cannot record legacy active review without saved context', () => {
 const w=setup(),s=w.services.reviewStore,before=w.map.get(s.STORAGE_KEY);
 assert.throws(()=>s.confirm('SHOWCASE-ODP-REVIEW',draft),/context/i);
 assert.equal(w.map.get(s.STORAGE_KEY),before);
});
