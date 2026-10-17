const { test } = require('node:test');
const assert = require('node:assert/strict');
const { workspace } = require('./helpers/workspace');
const now='2026-10-17T00:30:00';
function completed(w, date, outcome='Continue with Conditions') {
 const r=structuredClone(w.services.showcase.seededReviews()[0]);r.status='decision_recorded';r.decision={outcome,nextReviewDate:date,timestamp:'2026-10-16T00:00:00Z',owner:'Test owner'};return r;
}
test('G01 local yesterday/today/future checkpoints are distinct from active decision deadlines and never write storage', () => {
 const w=workspace(),before=JSON.stringify([...w.map]);
 for(const [date,status] of [['2026-10-16','overdue'],['2026-10-17','due'],['2026-10-18',null],['2026-02-30',null]]) {
  const r=completed(w,date),items=w.reviewRules.followUpDue([r],now);assert.equal(items[0]?.status||null,status);
  assert.equal(w.reviewRules.dashboard([r],1,now).overdue,0);
 }
 assert.equal(JSON.stringify([...w.map]),before);
});
test('G01 latest decision and canonical identity suppress stale checkpoints, active reviews and Stop', () => {
 const w=workspace(),old=completed(w,'2026-10-01'),latest={...completed(w,'2026-10-18'),id:'latest'}; latest.decision.timestamp='2026-10-17T00:00:00Z';
 assert.equal(w.reviewRules.followUpDue([old,latest],now).length,0);
 latest.decision.nextReviewDate='2026-10-17';assert.equal(w.reviewRules.followUpDue([old,latest],now).length,1);
 const active={...old,id:'active',status:'in_progress',project:{...old.project,ProjectUUID:old.project.ProjectUUID.toUpperCase()}};
 assert.equal(w.reviewRules.followUpDue([old,latest,active],now).length,0);
 latest.decision.outcome='Stop';assert.equal(w.reviewRules.followUpDue([old,latest],now).length,0);
});
test('G01 Portfolio and Overview expose checkpoint text while preserving manual Start New Review', () => {
 class Clock extends Date {constructor(...a){super(...(a.length?a:[now]));} static now(){return Date.parse(now);} }
 const w=workspace({clock:Clock}),r=completed(w,'2026-10-16');w.state.reviews=[r];w.state.projects=[r.project];
 w.ui.configureReviews(project => w.governanceUI.portfolioState(project,[r]));
 w.ui.renderProjects([r.project],null,()=>{});assert.match(w.elements.get('projects-body').textContent,/Follow-up date passed/);
 w.governanceUI.details(r.project,r.evidence,[r]);assert.match(w.elements.get('workspace-review-context').textContent,/Follow-up date passed/);
 assert.equal(w.elements.get('start-review').textContent,'Start New Review');
});
