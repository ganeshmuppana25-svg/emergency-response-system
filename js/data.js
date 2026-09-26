/* ============================================================
   data.js — LocalStorage architecture, constants & demo data
   Emergency Response Management System - Phase 1
   ============================================================ */

const APP_KEYS = {
  USERS: 'ers_users',
  INCIDENTS: 'ers_incidents',
  TEAMS: 'ers_teams',
  SESSION: 'ers_session',
  SETTINGS: 'ers_settings',
  COUNTER: 'ers_incident_counter',
  CONTACTS: 'ers_contacts',           /* Phase 2: per-user emergency contacts */
  NOTIFICATIONS: 'ers_notifications', /* Phase 2: notification center state */
  SIM: 'ers_sim',                     /* Phase 2: simulated response-vehicle state */
  DEMO: 'ers_demo'                    /* Phase 2: isolated demo-mode dataset */
};

/* ---------- Incident lifecycle (Phase 1) ---------- */
const INCIDENT_STATUSES = {
  REPORTED: 'REPORTED',
  VERIFIED: 'VERIFIED',
  TEAM_ASSIGNED: 'TEAM ASSIGNED',
  ACCEPTED: 'ACCEPTED',
  DISPATCHED: 'DISPATCHED',
  ON_THE_WAY: 'ON THE WAY',
  ARRIVED: 'ARRIVED',
  HANDLING: 'HANDLING',
  RESOLVED: 'RESOLVED',
  REJECTED: 'REJECTED'
};

/* Valid forward transitions (prevents invalid status changes) */
const STATUS_FLOW = {
  REPORTED:      ['VERIFIED', 'REJECTED'],
  VERIFIED:      ['TEAM ASSIGNED'],
  'TEAM ASSIGNED': ['ACCEPTED'],
  ACCEPTED:      ['DISPATCHED'],
  DISPATCHED:    ['ON THE WAY'],
  'ON THE WAY':  ['ARRIVED'],
  ARRIVED:       ['HANDLING'],
  HANDLING:      ['RESOLVED'],
  RESOLVED:      [],
  REJECTED:      []
};

const ACTIVE_STATUSES = [
  'REPORTED', 'VERIFIED', 'TEAM ASSIGNED', 'ACCEPTED',
  'DISPATCHED', 'ON THE WAY', 'ARRIVED', 'HANDLING'
];

const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const EMERGENCY_TYPES = [
  'Medical', 'Fire', 'Road Accident', 'Security',
  'Flood', 'Electrical', 'Building Emergency', 'Emergency/SOS', 'Other'
];

const ROLES = {
  CITIZEN: 'citizen',
  OPERATOR: 'operator',
  TEAM: 'team',
  ADMIN: 'admin'
};

/* ---------- Demo nearby emergency services (static data, no paid API) ---------- */
const NEARBY_SERVICES = [
  { id: 'S-01', name: 'Central Hospital',     type: 'Hospital',    icon: '🏥', lat: 28.6240, lng: 77.2145 },
  { id: 'S-02', name: 'North Clinic',         type: 'Hospital',    icon: '🏥', lat: 28.6520, lng: 77.2280 },
  { id: 'S-03', name: 'City General Hospital', type: 'Hospital',   icon: '🏥', lat: 28.6018, lng: 77.1986 },
  { id: 'S-04', name: 'Eastside Medical Centre', type: 'Hospital', icon: '🏥', lat: 28.6085, lng: 77.2460 },
  { id: 'S-05', name: 'City Police HQ',        type: 'Police Station', icon: '🚓', lat: 28.6328, lng: 77.2160 },
  { id: 'S-06', name: 'Metro Police Post',     type: 'Police Station', icon: '🚓', lat: 28.6450, lng: 77.2210 },
  { id: 'S-07', name: 'Ward 4 Police Station', type: 'Police Station', icon: '🚓', lat: 28.6050, lng: 77.1840 },
  { id: 'S-08', name: 'Fire Station 1',        type: 'Fire Station',   icon: '🚒', lat: 28.6375, lng: 77.2030 },
  { id: 'S-09', name: 'Fire Station 2',        type: 'Fire Station',   icon: '🚒', lat: 28.5980, lng: 77.2490 },
  { id: 'S-10', name: 'Rescue Base',           type: 'Rescue Unit',    icon: '🚁', lat: 28.5980, lng: 77.2350 }
];

/* Default personal emergency contacts for citizens (copy of national helplines) */
function defaultContacts() {
  return [
    { id: 'C-1', name: 'Police',        relation: 'Helpline', number: '100',  icon: '🚓' },
    { id: 'C-2', name: 'Ambulance',     relation: 'Helpline', number: '108',  icon: '🚑' },
    { id: 'C-3', name: 'Fire',          relation: 'Helpline', number: '101',  icon: '🚒' }
  ];
}

/* Safe LocalStorage helpers (handles quota / disabled storage errors) */
function storageGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('[Storage] read failed for key: ' + key, e);
    return fallback;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn('[Storage] write failed for key: ' + key, e);
    if (typeof UI !== 'undefined' && UI.toast) {
      UI.toast('Storage Error', 'Could not save data. LocalStorage may be full or disabled.', 'error');
    }
    return false;
  }
}

function storageRemove(key) {
  try { localStorage.removeItem(key); return true; }
  catch (e) { return false; }
}

/* ---------- Demo users (passwords kept only for demo login) ---------- */
function defaultUsers() {
  return [
    { id: 'U-001', name: 'Rahul Sharma',   email: 'citizen@demo.com',  password: 'demo123', role: ROLES.CITIZEN,  phone: '+91 98765 43210', registeredAt: '2026-01-05T09:00:00' },
    { id: 'U-002', name: 'Priya Verma',    email: 'priya@demo.com',    password: 'demo123', role: ROLES.CITIZEN,  phone: '+91 98123 45670', registeredAt: '2026-01-08T11:30:00' },
    { id: 'U-003', name: 'Control Operator', email: 'operator@demo.com', password: 'demo123', role: ROLES.OPERATOR, phone: '+91 90000 11111', shift: 'Day Shift', registeredAt: '2026-01-01T07:00:00' },
    { id: 'U-004', name: 'Ambulance 01 Crew', email: 'team@demo.com',  password: 'demo123', role: ROLES.TEAM,     teamId: 'T-01', shift: 'Day Shift', registeredAt: '2026-01-01T07:00:00' },
    { id: 'U-005', name: 'System Admin',   email: 'admin@demo.com',    password: 'demo123', role: ROLES.ADMIN,    registeredAt: '2026-01-01T00:00:00' }
  ];
}

/* ---------- Demo response teams ---------- */
function defaultTeams() {
  return [
    { id: 'T-01', name: 'Ambulance 01',  department: 'Medical',  icon: '🚑', phone: '+91 90010 20001', members: 3,  status: 'Available', currentIncident: null, base: 'Central Hospital', baseLat: 28.6240, baseLng: 77.2145 },
    { id: 'T-02', name: 'Ambulance 02',  department: 'Medical',  icon: '🚑', phone: '+91 90010 20002', members: 3,  status: 'Busy',      currentIncident: 'ER-2026-0001', base: 'North Clinic', baseLat: 28.6520, baseLng: 77.2280 },
    { id: 'T-03', name: 'Fire Unit 01',  department: 'Fire',     icon: '🚒', phone: '+91 90010 20003', members: 6,  status: 'Available', currentIncident: null, base: 'Fire Station 1', baseLat: 28.6375, baseLng: 77.2030 },
    { id: 'T-04', name: 'Police Unit 01', department: 'Security', icon: '🚓', phone: '+91 90010 20004', members: 4,  status: 'Busy', currentIncident: 'ER-2026-0004', base: 'City Police HQ', baseLat: 28.6328, baseLng: 77.2160 },
    { id: 'T-05', name: 'Rescue Unit 01', department: 'Rescue',  icon: '🚁', phone: '+91 90010 20005', members: 5,  status: 'Available', currentIncident: null, base: 'Rescue Base', baseLat: 28.5980, baseLng: 77.2350 }
  ];
}

/* ---------- Demo incidents (realistic but fictional) ---------- */
function defaultIncidents() {
  const now = new Date();
  const h = (n) => new Date(now.getTime() - n * 3600000).toISOString();

  return [
    {
      id: 'ER-2026-0001',
      reporter: 'Rahul Sharma (citizen@demo.com)',
      reporterId: 'U-001',
      type: 'Medical',
      description: 'Elderly man collapsed at home, unconscious and breathing heavily. Needs immediate medical attention.',
      latitude: 28.6139, longitude: 77.2090,
      locationName: 'H-45, Green Park, New Delhi',
      contact: '+91 98765 43210',
      priority: 'HIGH',
      status: INCIDENT_STATUSES.TEAM_ASSIGNED,
      assignedTeam: 'T-02',
      createdAt: h(3.2), updatedAt: h(2.6),
      resolutionNotes: null, resolvedAt: null,
      timeline: [
        { time: h(3.2), title: 'Emergency reported', detail: 'Reported via citizen dashboard', icon: '📞' },
        { time: h(3.0), title: 'Incident verified', detail: 'Verified by Control Operator', icon: '✅' },
        { time: h(2.8), title: 'Priority set to HIGH', detail: 'Set by Control Operator', icon: '⚠️' },
        { time: h(2.6), title: 'Team assigned — Ambulance 02', detail: 'Assigned by Control Operator', icon: '🚑' }
      ],
      attachments: []
    },
    {
      id: 'ER-2026-0002',
      reporter: 'Priya Verma (priya@demo.com)',
      reporterId: 'U-002',
      type: 'Road Accident',
      description: 'Two vehicles collided at the main intersection. Minor injuries, traffic blocked.',
      latitude: 28.6304, longitude: 77.2177,
      locationName: 'Main Market Junction, Connaught Place',
      contact: '+91 98123 45670',
      priority: 'MEDIUM',
      status: INCIDENT_STATUSES.RESOLVED,
      assignedTeam: 'T-04',
      createdAt: h(9), updatedAt: h(6.5),
      resolutionNotes: 'Both drivers treated for minor injuries at the scene. Roadway cleared and traffic restored. Police report filed.',
      resolvedAt: h(6.5),
      timeline: [
        { time: h(9),   title: 'Emergency reported', detail: 'Reported via citizen report form', icon: '📞' },
        { time: h(8.6), title: 'Incident verified', detail: 'Verified by Control Operator', icon: '✅' },
        { time: h(8.4), title: 'Team assigned — Police Unit 01', detail: 'Assigned by Control Operator', icon: '🚓' },
        { time: h(8.1), title: 'Assignment accepted', detail: 'Police Unit 01', icon: '🤝' },
        { time: h(8.0), title: 'Team dispatched', detail: 'Police Unit 01', icon: '🚀' },
        { time: h(7.8), title: 'Team on the way', detail: 'Police Unit 01', icon: '🛣️' },
        { time: h(7.4), title: 'Team arrived on scene', detail: 'Police Unit 01', icon: '📍' },
        { time: h(7.2), title: 'Handling in progress', detail: 'Police Unit 01', icon: '🔧' },
        { time: h(6.5), title: 'Incident resolved', detail: 'Both drivers treated; road cleared.', icon: '✔️' }
      ],
      attachments: []
    },
    {
      id: 'ER-2026-0003',
      reporter: 'Amit Kumar (amit.k@demo.com)',
      reporterId: null,
      type: 'Fire',
      description: 'Short-circuit fire in ground-floor electrical panel of an office building. Building evacuated.',
      latitude: 28.6240, longitude: 77.1990,
      locationName: 'Spaze Tower, Sector 47, Gurugram',
      contact: '+91 98220 33445',
      priority: 'CRITICAL',
      status: INCIDENT_STATUSES.VERIFIED,
      assignedTeam: null,
      createdAt: h(1.4), updatedAt: h(1.1),
      resolutionNotes: null, resolvedAt: null,
      timeline: [
        { time: h(1.4), title: 'Emergency reported', detail: 'Reported via emergency hotline', icon: '📞' },
        { time: h(1.1), title: 'Incident verified', detail: 'Verified by Control Operator', icon: '✅' }
      ],
      attachments: []
    },
    {
      id: 'ER-2026-0004',
      reporter: 'Anonymous Tip',
      reporterId: null,
      type: 'Security',
      description: 'Suspicious unattended bag reported near the metro station entrance.',
      latitude: 28.6450, longitude: 77.2210,
      locationName: 'Metro Station Gate 3, Rajiv Chowk',
      contact: '+91 90000 55555',
      priority: 'HIGH',
      status: INCIDENT_STATUSES.TEAM_ASSIGNED,
      assignedTeam: 'T-04',
      createdAt: h(2.0), updatedAt: h(1.6),
      resolutionNotes: null, resolvedAt: null,
      timeline: [
        { time: h(2.0), title: 'Emergency reported', detail: 'Reported via emergency hotline', icon: '📞' },
        { time: h(1.9), title: 'Incident verified', detail: 'Verified by Control Operator', icon: '✅' },
        { time: h(1.6), title: 'Team assigned — Police Unit 01', detail: 'Assigned by Control Operator', icon: '🚓' }
      ],
      attachments: []
    }
  ];
}

/* ---------- Settings & initialization ---------- */
function defaultSettings() {
  return {
    appName: 'Emergency Response Management System',
    version: 'Phase 2',
    city: 'Demo City',
    initAt: new Date().toISOString(),
    lastResetAt: null,
    darkMode: true,
    avgResponseSpeedKmh: 40,   /* Simulated average response-vehicle speed (ETA base) */
    emergencyContacts: [
      { name: 'Police',           number: '100',  icon: '🚓' },
      { name: 'Ambulance',        number: '108',  icon: '🚑' },
      { name: 'Fire',             number: '101',  icon: '🚒' },
      { name: 'Disaster Helpline', number: '1078', icon: '🆘' }
    ]
  };
}

/* Initialize all LocalStorage data on first launch (survives refresh) */
function initData() {
  if (!storageGet(APP_KEYS.USERS))     storageSet(APP_KEYS.USERS, defaultUsers());
  if (!storageGet(APP_KEYS.TEAMS))     storageSet(APP_KEYS.TEAMS, defaultTeams());
  if (!storageGet(APP_KEYS.INCIDENTS)) storageSet(APP_KEYS.INCIDENTS, defaultIncidents());
  if (!storageGet(APP_KEYS.SETTINGS))  storageSet(APP_KEYS.SETTINGS, defaultSettings());
  if (!storageGet(APP_KEYS.COUNTER))   storageSet(APP_KEYS.COUNTER, 4); // last used serial number
  /* Phase 2 keys are initialised lazily by their accessors */
}

/* Complete demo data reset (admin action) */
function resetDemoData() {
  try {
    storageSet(APP_KEYS.USERS, defaultUsers());
    storageSet(APP_KEYS.TEAMS, defaultTeams());
    storageSet(APP_KEYS.INCIDENTS, defaultIncidents());
    storageSet(APP_KEYS.COUNTER, 4);
    const s = defaultSettings();
    s.lastResetAt = new Date().toISOString();
    s.initAt = storageGet(APP_KEYS.SETTINGS, s).initAt || s.initAt;
    storageSet(APP_KEYS.SETTINGS, s);
    storageRemove(APP_KEYS.SESSION);
    storageRemove(APP_KEYS.CONTACTS);
    storageRemove(APP_KEYS.NOTIFICATIONS);
    storageRemove(APP_KEYS.SIM);
    storageRemove(APP_KEYS.DEMO);
    return true;
  } catch (e) {
    console.error('[Data] reset failed', e);
    return false;
  }
}

/* ---------- Accessors ---------- */
function getUsers()     { initData(); return storageGet(APP_KEYS.USERS, []); }
function getTeams()     { initData(); return storageGet(APP_KEYS.TEAMS, []); }
function saveTeams(t)   { return storageSet(APP_KEYS.TEAMS, t); }
function getSettings()  { initData(); return Object.assign(defaultSettings(), storageGet(APP_KEYS.SETTINGS, {})); }
function saveSettings(s){ return storageSet(APP_KEYS.SETTINGS, s); }

/* ---------- Phase 2 accessors (lazy init, always return valid defaults) ---------- */

/* Per-user personal emergency contacts: ers_contacts = { [userId]: [ {id,name,relation,number,icon} ] } */
function getContacts(userId) {
  const all = storageGet(APP_KEYS.CONTACTS, {});
  if (!Array.isArray(all[userId])) {
    all[userId] = defaultContacts();
    storageSet(APP_KEYS.CONTACTS, all);
  }
  return all[userId];
}
function saveContacts(userId, list) {
  const all = storageGet(APP_KEYS.CONTACTS, {});
  all[userId] = list;
  return storageSet(APP_KEYS.CONTACTS, all);
}

/* Notification center per user: ers_notifications = { [userId]: [notif] } */
function getNotifState()    { return storageGet(APP_KEYS.NOTIFICATIONS, {}); }
function saveNotifState(s)  { return storageSet(APP_KEYS.NOTIFICATIONS, s); }

/* Simulated response-vehicle state per incident: ers_sim = { [incidentId]: simState } */
function getSimState()      { return storageGet(APP_KEYS.SIM, {}); }
function saveSimState(s)    { return storageSet(APP_KEYS.SIM, s); }
function removeSimState(id) { const s = getSimState(); delete s[id]; storageSet(APP_KEYS.SIM, s); }

/* Isolated demo-mode dataset: ers_demo = { incidents, sims, running, paused, ... } */
function getDemoState() {
  const d = storageGet(APP_KEYS.DEMO, null);
  return d && typeof d === 'object' ? d : { incidents: [], sims: {}, running: false, paused: false, tickMs: 900 };
}
function saveDemoState(d)   { return storageSet(APP_KEYS.DEMO, d); }


