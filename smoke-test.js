/* Node smoke test for core workflow (no DOM needed) */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// localStorage stub
const store = {};
global.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; }
};
global.window = global;
global.document = { addEventListener: () => {}, getElementById: () => null, querySelector: () => null, createElement: () => ({ classList: { add(){} }, addEventListener(){}, style: {} }), body: { appendChild(){} } };
global.console.warn = () => {};
// App stub (full app.js requires DOM; only the data hook is needed here)
global.App = { notifyDataChanged: () => {}, activeMap: null };


const ctx = vm.createContext(global);
const load = (f) => vm.runInContext(fs.readFileSync(path.join(__dirname, 'js', f), 'utf8'), ctx, { filename: f });

['data.js','auth.js','notifications.js','helpers.js','map.js','incidents.js','teams.js','simulation.js','analytics.js'].forEach(load);

let pass = 0, fail = 0;
const t = (name, cond) => {
  if (cond) { pass++; console.log('  PASS', name); }
  else { fail++; console.log('  FAIL', name); }
};

console.log('--- Initialization ---');
vm.runInContext('initData();', ctx);
t('demo users loaded', vm.runInContext('getUsers().length', ctx) === 5);
t('demo teams loaded', vm.runInContext('getTeams().length', ctx) === 5);
t('demo incidents loaded (4)', vm.runInContext('Incidents.getAll().length', ctx) === 4);

console.log('--- Auth ---');
t('bad login rejected', vm.runInContext(`Auth.login('citizen@demo.com','wrong').ok`, ctx) === false);
t('good citizen login', vm.runInContext(`Auth.login('citizen@demo.com','demo123').ok`, ctx) === true);
t('role dashboard mapping', vm.runInContext(`Auth.dashboardFor('operator')`, ctx) === 'operator-dashboard');
t('cross-role guard: citizen cannot open operator', vm.runInContext(`
  (function(){
    Auth.login('citizen@demo.com','demo123');
    return Auth.requireRole('operator').allowed;
  })()
`, ctx) === false);

console.log('--- SOS incident creation ---');
const sos = vm.runInContext(`
  (function(){
    Auth.login('citizen@demo.com','demo123');
    return Incidents.create({
      reporter: 'Rahul Sharma (citizen@demo.com)',
      reporterId: 'U-001',
      type: 'Emergency/SOS',
      description: 'SOS test',
      latitude: 28.6, longitude: 77.2,
      locationName: 'Test location',
      contact: '+91 98765 43210',
      priority: 'HIGH',
      source: 'SOS'
    });
  })()
`, ctx);
t('incident ID format ER-2026-0005', sos.id === 'ER-2026-0005');
t('status REPORTED', sos.status === 'REPORTED');
t('priority HIGH', sos.priority === 'HIGH');
t('timeline has 1 entry', sos.timeline.length === 1);

console.log('--- Lifecycle: verify -> assign -> accept -> ... -> resolve ---');
vm.runInContext(`Auth.login('operator@demo.com','demo123');`, ctx);
t('invalid transition blocked (REPORTED -> ACCEPTED)', vm.runInContext(`Incidents.updateStatus('${sos.id}','ACCEPTED').ok`, ctx) === false);
t('verify ok', vm.runInContext(`Incidents.verify('${sos.id}','Operator').ok`, ctx) === true);
t('assign before verify ok', vm.runInContext(`Incidents.assignTeam('${sos.id}','T-01','Operator').ok`, ctx) === true);
t('T-01 now Busy', vm.runInContext(`Teams.getById('T-01').status`, ctx) === 'Busy');
t('T-01 currentIncident set', vm.runInContext(`Teams.getById('T-01').currentIncident`, ctx) === sos.id);
t('duplicate assignment blocked', vm.runInContext(`Incidents.assignTeam('${sos.id}','T-03','Operator').ok`, ctx) === false);
t('assign busy team blocked', vm.runInContext(`Incidents.updateStatus('${sos.id}','TEAM ASSIGNED').ok`, ctx) === false);

vm.runInContext(`Auth.login('team@demo.com','demo123');`, ctx);
t('accept ok (TEAM ASSIGNED -> ACCEPTED)', vm.runInContext(`Incidents.acceptAssignment('${sos.id}','Ambulance 01').ok`, ctx) === true);
['DISPATCHED','ON THE WAY','ARRIVED','HANDLING'].forEach(next => {
  t(`transition to ${next}`, vm.runInContext(`Incidents.updateStatus('${sos.id}','${next}').ok`, ctx) === true);
});
t('resolve without notes blocked', vm.runInContext(`Incidents.resolve('${sos.id}','').ok`, ctx) === false);
const resolved = vm.runInContext(`Incidents.resolve('${sos.id}','Patient transferred to hospital.','Ambulance 01',null)`, ctx);
t('resolve ok', resolved.ok === true);
t('final status RESOLVED', resolved.incident.status === 'RESOLVED');
t('team freed after resolve', vm.runInContext(`Teams.getById('T-01').status`, ctx) === 'Available');
t('resolution notes stored', vm.runInContext(`Incidents.getById('${sos.id}').resolutionNotes`, ctx) === 'Patient transferred to hospital.');
t('timeline complete (9 entries)', vm.runInContext(`Incidents.getById('${sos.id}').timeline.length`, ctx) === 9);

console.log('--- Citizen visibility ---');
t('citizen sees their incidents (demo 0001 + new SOS)', vm.runInContext(`Incidents.forCitizen('U-001').length`, ctx) >= 2);
t('resolved count for citizen includes new SOS', vm.runInContext(`Incidents.resolved(Incidents.forCitizen('U-001')).some(i=>i.id==='${sos.id}')`, ctx) === true);

console.log('--- Search & filters ---');
t('filter by status TEAM ASSIGNED', vm.runInContext(`Incidents.filter({status:'TEAM ASSIGNED'}).every(i=>i.status==='TEAM ASSIGNED')`, ctx) === true);
t('search by type "fire"', vm.runInContext(`Incidents.filter({search:'fire'}).some(i=>i.type==='Fire')`, ctx) === true);
t('sort: CRITICAL first', vm.runInContext(`Incidents.filter({})[0].priority`, ctx) === 'CRITICAL');

/* Phase 2 tests appended below */
console.log('--- Phase 2: Simulation ---');
const simInit = vm.runInContext(`(function(){var inc=Incidents.getById('${sos.id}');var s=Simulation.init(inc);return s&&s.totalKm>0&&s.remainingKm===s.totalKm&&s.phase==='idle';})()`, ctx);
t('Simulation.init creates state anchored at team base', simInit === true);
const simStart = vm.runInContext(`(function(){var r=Simulation.start('${sos.id}');return r.ok===true&&Simulation.get('${sos.id}').running===true;})()`, ctx);
t('Simulation.start begins movement', simStart === true);
const simSnap = vm.runInContext(`(function(){var s=Simulation.snapshot('${sos.id}');return s&&typeof s.distanceKm==='number'&&typeof s.etaMin==='number'&&typeof s.progress==='number';})()`, ctx);
t('Simulation.snapshot returns distance/eta/progress', simSnap === true);
const simPause = vm.runInContext(`(function(){Simulation.pause('${sos.id}');return Simulation.get('${sos.id}').running===false&&Simulation.get('${sos.id}').paused===true;})()`, ctx);
t('Simulation.pause stops movement', simPause === true);
const simReset = vm.runInContext(`(function(){Simulation.reset('${sos.id}');var s=Simulation.get('${sos.id}');return s.running===false&&s.progress===0&&s.remainingKm===s.totalKm;})()`, ctx);
t('Simulation.reset returns to start', simReset === true);

console.log('--- Phase 2: Analytics ---');
const analytics = vm.runInContext(`(function(){var A=Analytics.compute();return A&&A.total>=4&&A.byType.length>0&&A.byPriority.length>0&&A.trend.length===14&&A.teamWorkload.length===5;})()`, ctx);
t('Analytics.compute returns full statistics', analytics === true);
const analyticsCharts = vm.runInContext(`(function(){var A=Analytics.compute();return typeof Analytics.hbarChart(A.byType)==='string'&&typeof Analytics.trendChart(A.trend)==='string'&&typeof Analytics.statusStrip(A)==='string'&&Analytics.hbarChart(A.byType).indexOf('chart-bar')>-1;})()`, ctx);
t('Analytics chart renderers produce HTML', analyticsCharts === true);

console.log('--- Phase 2: Emergency contacts ---');
const contacts = vm.runInContext(`(function(){var list=getContacts('U-001');return Array.isArray(list)&&list.length===3&&list[0].number==='100';})()`, ctx);
t('getContacts returns default helplines', contacts === true);
const contactsSave = vm.runInContext(`(function(){saveContacts('U-001',[{id:'X1',name:'Test',relation:'Family',number:'+91 99999 99999',icon:'🧑'}]);var list=getContacts('U-001');return list.length===1&&list[0].name==='Test';})()`, ctx);
t('saveContacts persists per-user list', contactsSave === true);

console.log('--- Phase 2: Advanced filters ---');
const filterTeam = vm.runInContext(`(function(){return Incidents.filter({team:'T-02'}).every(i=>i.assignedTeam==='T-02');})()`, ctx);
t('filter by assigned team', filterTeam === true);
const filterSource = vm.runInContext(`(function(){return Incidents.filter({source:'SOS'}).length>=1;})()`, ctx);
t('filter by source SOS', filterSource === true);
const sortNewest = vm.runInContext(`(function(){var list=Incidents.filter({sortBy:'newest'});return list.length===Incidents.getAll().length;})()`, ctx);
t('sort newest returns all incidents', sortNewest === true);

console.log('--- Phase 2: Admin team status control ---');
const setStatus = vm.runInContext(`(function(){var r=Teams.setStatus('T-01','Offline');return r.ok===true&&Teams.getById('T-01').status==='Offline';})()`, ctx);
t('Teams.setStatus changes status', setStatus === true);
const setStatusInvalid = vm.runInContext(`(function(){return Teams.setStatus('T-01','Broken').ok===false;})()`, ctx);
t('Teams.setStatus rejects invalid status', setStatusInvalid === true);

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
