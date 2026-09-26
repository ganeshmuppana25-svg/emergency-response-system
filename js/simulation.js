/* ============================================================
   simulation.js — Response-vehicle simulation + Dynamic ETA
   + isolated DEMO MODE showcase (Phase 2)
   ------------------------------------------------------------
   Honest simulation model:
   - There is NO backend / cross-device realtime.
   - The response vehicle moves stepwise on a straight path
     between its base and the incident (clearly labelled).
   - ETA = remaining distance / configured average speed
     (labelled "Simulated ETA" — NOT a traffic prediction).
   ============================================================ */

const Simulation = {
  TICK_MS: 1400,   /* vehicle position update interval */
  _timers: {},

  get(incidentId) {
    const s = getSimState();
    return incidentId ? s[incidentId] || null : null;
  },

  save(sim) {
    const s = getSimState();
    s[sim.incidentId] = sim;
    saveSimState(s);
    return sim;
  },

  clear(incidentId) {
    this._stopTimer(incidentId);
    removeSimState(incidentId);
  },

  /* Build a sim record anchored at the assigned team's base */
  init(incident) {
    const team = incident && incident.assignedTeam ? Teams.getById(incident.assignedTeam) : null;
    let startLat, startLng, icon = '🚑', teamName = 'Response Team';
    if (team && team.baseLat != null && team.baseLng != null) {
      startLat = team.baseLat; startLng = team.baseLng;
      icon = team.icon || icon; teamName = team.name;
    } else {
      startLat = incident.latitude + 0.012; startLng = incident.longitude + 0.012;
    }
    const totalKm = haversineKm(startLat, startLng, incident.latitude, incident.longitude);
    return {
      incidentId: incident.id,
      startLat, startLng,
      destLat: incident.latitude, destLng: incident.longitude,
      vehicleLat: startLat, vehicleLng: startLng,
      totalKm, remainingKm: totalKm,
      progress: 0,
      speedKmh: (getSettings().avgResponseSpeedKmh || 40),
      running: false, paused: false,
      phase: 'idle',           /* idle | moving | arrived */
      startedAt: null,
      lastUpdate: new Date().toISOString(),
      icon, teamName
    };
  },

  start(incidentId) {
    let sim = this.get(incidentId);
    const inc = Incidents.getById(incidentId);
    if (!inc) return { ok: false, error: 'Incident not found.' };
    if (!sim) { sim = this.init(inc); this.save(sim); }
    if (sim.phase === 'arrived') return { ok: false, error: 'Vehicle already at the scene.' };
    sim.speedKmh = getSettings().avgResponseSpeedKmh || 40;
    sim.running = true; sim.paused = false; sim.phase = 'moving';
    if (!sim.startedAt) sim.startedAt = new Date().toISOString();
    sim.lastUpdate = new Date().toISOString();
    this.save(sim);
    this._startTimer(incidentId);
    return { ok: true, sim };
  },

  pause(incidentId) {
    const sim = this.get(incidentId);
    if (!sim) return { ok: false, error: 'Simulation not found.' };
    sim.running = false; sim.paused = true;
    sim.lastUpdate = new Date().toISOString();
    this.save(sim);
    this._stopTimer(incidentId);
    return { ok: true, sim };
  },

  resume(incidentId) {
    return this.start(incidentId);
  },

  reset(incidentId) {
    const sim = this.get(incidentId);
    if (!sim) return { ok: false, error: 'Simulation not found.' };
    sim.vehicleLat = sim.startLat; sim.vehicleLng = sim.startLng;
    sim.remainingKm = sim.totalKm; sim.progress = 0;
    sim.running = false; sim.paused = false; sim.phase = 'idle';
    sim.startedAt = null; sim.lastUpdate = new Date().toISOString();
    this.save(sim);
    this._stopTimer(incidentId);
    return { ok: true, sim };
  },

  /* Read-only snapshot for tracking views */
  snapshot(incidentId) {
    const sim = this.get(incidentId);
    if (!sim) return null;
    return {
      incidentId,
      vehicleLat: sim.vehicleLat, vehicleLng: sim.vehicleLng,
      distanceKm: sim.remainingKm,
      etaMin: (sim.remainingKm / (sim.speedKmh || 40)) * 60,
      progress: sim.progress, running: sim.running, paused: sim.paused,
      phase: sim.phase, lastUpdate: sim.lastUpdate,
      icon: sim.icon, teamName: sim.teamName, startedAt: sim.startedAt
    };
  },

  /* ETA / distance display helper */
  etaAndDistance(incidentId) {
    const sim = this.get(incidentId);
    if (!sim) return null;
    return {
      distanceKm: sim.remainingKm,
      etaMin: sim.phase === 'arrived' ? 0 : (sim.remainingKm / (sim.speedKmh || 40)) * 60,
      progress: sim.progress,
      phase: sim.phase,
      lastUpdate: sim.lastUpdate
    };
  },

  /* Vehicle movement step (pure logic + storage; no DOM) */
  _tick(incidentId) {
    const sim = this.get(incidentId);
    if (!sim || !sim.running || sim.phase === 'arrived') { this._stopTimer(incidentId); return; }
    const inc = Incidents.getById(incidentId);
    if (!inc) { this.clear(incidentId); return; }
    /* Stop driving if the incident already moved past the travel stage */
    if (!['ON THE WAY', 'DISPATCHED'].includes(inc.status)) {
      sim.running = false; sim.paused = true;
      this.save(sim); this._stopTimer(incidentId);
      return;
    }
    const distPerTick = (sim.speedKmh || 40) * (this.TICK_MS / 3600000);
    sim.remainingKm = Math.max(0, sim.remainingKm - distPerTick);
    const t = sim.totalKm > 0 ? 1 - (sim.remainingKm / sim.totalKm) : 1;
    sim.vehicleLat = sim.startLat + (sim.destLat - sim.startLat) * t;
    sim.vehicleLng = sim.startLng + (sim.destLng - sim.startLng) * t;
    sim.progress = Math.min(100, t * 100);
    sim.lastUpdate = new Date().toISOString();

    if (sim.remainingKm <= 0.05) {
      sim.vehicleLat = sim.destLat; sim.vehicleLng = sim.destLng;
      sim.remainingKm = 0; sim.progress = 100;
      sim.running = false; sim.phase = 'arrived';
      this.save(sim); this._stopTimer(incidentId);
      Simulation.onArrival(incidentId, sim);
      return;
    }
    this.save(sim);
  },

  /* Arrival handling: auto-advance the (valid) lifecycle transition */
  onArrival(incidentId, sim) {
    const inc = Incidents.getById(incidentId);
    if (!inc) return;
    if (typeof document !== 'undefined' && !document.hidden && typeof UI !== 'undefined') {
      UI.toast('📍 Team Arrived (Simulated)', `${sim.teamName} has reached the emergency location.`, 'success');
    }
    if (inc.status === INCIDENT_STATUSES.ON_THE_WAY) {
      Incidents.updateStatus(incidentId, INCIDENT_STATUSES.ARRIVED,
        'Response vehicle arrived at the scene', '📍', sim.teamName);
    }
  },

  _startTimer(id) {
    this._stopTimer(id);
    this._timers[id] = setInterval(() => this._tick(id), this.TICK_MS);
  },
  _stopTimer(id) {
    if (this._timers[id]) { clearInterval(this._timers[id]); delete this._timers[id]; }
  },
  stopAll() {
    Object.keys(this._timers).forEach(id => this._stopTimer(id));
  }
};

/* ============================================================
   DEMO MODE — fully isolated showcase dataset (ers_demo).
   Never reads or writes the real incident / team / notification
   data, so it cannot corrupt the actual demo dataset.
   ============================================================ */
const DemoSim = {
  _timer: null,
  _timeouts: [],

  steps: [
    { key: 'sos',      icon: '🔴', title: 'SOS Activated',        msg: 'Citizen holds the SOS button for 3 seconds.' },
    { key: 'gps',      icon: '📍', title: 'GPS Location Received', msg: 'Live GPS coordinates captured on the citizen device.' },
    { key: 'created',  icon: '🆘', title: 'Incident Created',      msg: 'Emergency reported to the control room.' },
    { key: 'verified', icon: '✅', title: 'Incident Verified',     msg: 'Verified by the Emergency Operator.' },
    { key: 'assigned', icon: '🚑', title: 'Team Assigned',         msg: 'Ambulance 01 assigned to the incident.' },
    { key: 'dispatched', icon: '🚀', title: 'Team Dispatched',     msg: 'Response team has left the base.' },
    { key: 'moving',   icon: '🚗', title: 'Vehicle Moving',        msg: 'Response vehicle travelling to the scene.' },
    { key: 'eta',      icon: '⏱', title: 'ETA Updating',          msg: 'Simulated ETA updates as the vehicle moves.' },
    { key: 'arrived',  icon: '📍', title: 'Team Arrived',          msg: 'Vehicle reached the emergency location.' },
    { key: 'handling', icon: '🛠', title: 'Incident Handling',     msg: 'Team is handling the emergency.' },
    { key: 'resolved', icon: '✅', title: 'Incident Resolved',     msg: 'Incident marked as resolved.' }
  ],

  state() { return getDemoState(); },
  save(d) { return saveDemoState(d); },

  makeIncident() {
    return {
      id: 'DEMO-' + String(Date.now()).slice(-5),
      reporter: 'Demo Citizen (demo@demo.com)',
      reporterId: 'demo-user',
      type: 'Road Accident',
      description: 'Demo: two-vehicle collision reported via Emergency SOS.',
      latitude: 28.6139, longitude: 77.2090,
      locationName: 'Main Market Junction, Connaught Place (Demo)',
      contact: '+91 90000 00000',
      priority: 'HIGH',
      status: INCIDENT_STATUSES.REPORTED,
      assignedTeam: null,
      source: 'SOS (Demo)',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timeline: [{ time: new Date().toISOString(), title: 'Emergency reported', detail: 'SOS activated by citizen (DEMO)', icon: '📞' }]
    };
  },

  reset() {
    this.stop();
    const d = getDemoState();
    d.incidents = [];
    d.sims = {};
    d.running = false;
    d.paused = false;
    d.step = 0;
    d.vehicleProgress = 0;
    this.save(d);
    if (typeof DemoView !== 'undefined') DemoView.update();
    return d;
  },

  start() {
    let d = this.state();
    if (d.running && !d.paused) return d;
    if (!d.incidents.length) {
      d.incidents = [this.makeIncident()];
      d.step = 0;
    }
    if (d.step >= this.steps.length) { d.step = 0; d.vehicleProgress = 0; }
    d.running = true;
    d.paused = false;
    this.save(d);
    this._drive();
    return d;
  },

  pause() {
    const d = this.state();
    d.running = false;
    d.paused = true;
    this.save(d);
    this.stop();
    if (typeof DemoView !== 'undefined') DemoView.update();
    return d;
  },

  resume() {
    return this.start();
  },

  stop() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    this._timeouts.forEach(t => clearTimeout(t));
    this._timeouts = [];
  },

  /* Drive the next scripted step; 'moving' runs a compact ticker */
  _drive() {
    this.stop();
    const d = this.state();
    if (!d.running) return;
    const step = this.steps[d.step];
    if (!step) {
      d.running = false; d.paused = false;
      this.save(d);
      if (typeof DemoView !== 'undefined') DemoView.update();
      return;
    }

    const inc = d.incidents[0];
    inc.updatedAt = new Date().toISOString();
    if (step.key === 'verified') inc.status = INCIDENT_STATUSES.VERIFIED;
    else if (step.key === 'assigned') { inc.status = INCIDENT_STATUSES.TEAM_ASSIGNED; inc.assignedTeam = 'T-01'; }
    else if (step.key === 'dispatched') inc.status = INCIDENT_STATUSES.DISPATCHED;
    else if (step.key === 'moving') inc.status = INCIDENT_STATUSES.ON_THE_WAY;
    else if (step.key === 'arrived') { inc.status = INCIDENT_STATUSES.ARRIVED; d.vehicleProgress = 1; }
    else if (step.key === 'handling') inc.status = INCIDENT_STATUSES.HANDLING;
    else if (step.key === 'resolved') { inc.status = INCIDENT_STATUSES.RESOLVED; inc.resolvedAt = new Date().toISOString(); }
    inc.timeline.push({ time: new Date().toISOString(), title: step.title, detail: step.msg, icon: step.icon });
    this.save(d);
    if (typeof DemoView !== 'undefined') DemoView.update();

    if (step.key === 'moving' && (d.vehicleProgress || 0) < 1) return; /* moveTicker drives */

    this._timeouts.push(setTimeout(() => {
      const d2 = getDemoState();
      if (!d2.running) return;
      d2.step += 1;
      this.save(d2);
      DemoSim._drive();
    }, step.key === 'moving' ? 200 : 1150));
  },

  /* Continuous vehicle movement ticker for the 'moving' step */
  moveTicker() {
    if (this._timer) clearInterval(this._timer);
    this._timer = setInterval(() => {
      const d = getDemoState();
      if (!d.running || this.steps[d.step]?.key !== 'moving') {
        clearInterval(this._timer); this._timer = null; return;
      }
      d.vehicleProgress = Math.min(1, (d.vehicleProgress || 0) + 0.085);
      this.save(d);
      if (typeof DemoView !== 'undefined') DemoView.update();
      if (d.vehicleProgress >= 1) {
        clearInterval(this._timer);
        this._timer = null;
        setTimeout(() => {
          const d2 = getDemoState();
          if (d2.running) { d2.step += 1; this.save(d2); DemoSim._drive(); }
        }, 600);
      }
    }, 380);
  }
};

/* ============================================================
   DemoView — full-screen demo showcase (route: "demo")
   ============================================================ */
const DemoView = {
  DEMO_START: [28.6240, 77.2145],   /* Ambulance 01 base (demo) */
  _api: null,
  _bound: false,

  render(container) {
    container.innerHTML = `
      <div class="demo-page" id="demoPage">
        <div class="demo-head">
          <div class="demo-brand">
            <span class="demo-badge">▶ DEMO MODE</span>
            <div>
              <h2>🚨 Run Emergency Demo</h2>
              <p>A guided end-to-end emergency-response simulation — all data is isolated and cannot affect your real demo data.</p>
            </div>
          </div>
          <div class="demo-controls">
            <button class="btn btn-primary" data-act="demo-start">▶ Start Demo</button>
            <button class="btn btn-warning" data-act="demo-pause">⏸ Pause</button>
            <button class="btn btn-outline" data-act="demo-reset">↺ Reset Demo</button>
            <button class="btn btn-ghost" data-act="demo-exit">✕ Exit</button>
          </div>
        </div>

        <div class="demo-grid">
          <div class="demo-steps card" id="demoSteps">
            <div class="card-head"><h3>🔄 Response Sequence</h3></div>
            <div class="card-body">
              ${DemoSim.steps.map((s, i) => `
                <div class="demo-step" data-step="${i}">
                  <span class="ds-dot">${s.icon}</span>
                  <div class="ds-body">
                    <div class="ds-title">${s.title}</div>
                    <div class="ds-msg">${s.msg}</div>
                  </div>
                  <span class="ds-state"></span>
                </div>`).join('')}
            </div>
          </div>

          <div class="card">
            <div class="card-head">
              <h3>🗺 Live Demonstration Map</h3>
              <span class="muted" id="demoEta"></span>
            </div>
            <div class="card-body"><div id="demoMap"></div></div>
          </div>
        </div>

        <div class="grid grid-3 demo-stats" id="demoStats"></div>
      </div>`;

    if (!container.dataset.demoBound) {
      container.dataset.demoBound = '1';
      container.addEventListener('click', (e) => {
        const act = e.target.closest('[data-act]')?.dataset.act;
        if (!act) return;
        if (act === 'demo-start') { DemoSim.running(); }
        else if (act === 'demo-pause') { DemoSim.paused(); }
        else if (act === 'demo-reset') { DemoSim.reset(); }
        else if (act === 'demo-exit') {
          DemoSim.reset();
          App.navTo(Auth.getSession() ? Auth.dashboardFor(Auth.getSession().role) : 'landing');
        }
      });
    }

    this._api = null;
    this._buildMap();
    this.update();
  },

  /* Isolated demo incident placeholder used to draw the map before start */
  _placeholder() {
    return {
      id: 'DEMO-README',
      type: 'Road Accident',
      latitude: 28.6139, longitude: 77.2090,
      locationName: 'Main Market Junction, Connaught Place (Demo)',
      priority: 'HIGH', status: 'REPORTED',
      timeline: [{ time: new Date().toISOString(), title: 'Demo ready', detail: 'Demo incident initialized.', icon: '🆘' }]
    };
  },

  _buildMap() {
    const d = DemoSim.state();
    const inc = d.incidents[0] || this._placeholder();
    const vp = d.vehicleProgress || 0;
    const v = {
      lat: this.DEMO_START[0] + (inc.latitude - this.DEMO_START[0]) * vp,
      lng: this.DEMO_START[1] + (inc.longitude - this.DEMO_START[1]) * vp,
      icon: '🚑', label: 'Ambulance 01 (Demo)'
    };
    this._api = ERSMap.showTrackingMap('demoMap', { incident: inc, vehicle: v, services: true, legend: true, locate: false });
  },

  update() {
    const page = document.getElementById('demoPage');
    if (!page) return;
    const d = DemoSim.state();
    const stepIdx = Math.min(d.step, DemoSim.steps.length - 1);
    const inc = d.incidents[0] || this._placeholder();

    page.querySelectorAll('.demo-step').forEach(el => {
      const i = parseInt(el.dataset.step, 10);
      el.classList.toggle('done', i < stepIdx && i < d.step);
      el.classList.toggle('current', i === d.step && d.running);
      const st = el.querySelector('.ds-state');
      if (i < d.step) st.textContent = '✓';
      else if (i === d.step) st.textContent = d.running ? '●' : (d.paused ? '⏸' : '');
      else st.textContent = '';
    });

    const vp = d.vehicleProgress || 0;
    const etaEl = page.querySelector('#demoEta');
    if (etaEl) {
      const total = haversineKm(this.DEMO_START[0], this.DEMO_START[1], inc.latitude, inc.longitude);
      const rem = Math.max(0, total * (1 - vp));
      const etaMin = (rem / (getSettings().avgResponseSpeedKmh || 40)) * 60;
      etaEl.innerHTML = `Distance: <strong>${fmtDist(rem)}</strong> · Simulated ETA: <strong>${fmtEta(etaMin)}</strong>`;
    }

    if (this._api && this._api.vehicleMarker) {
      const vlat = this.DEMO_START[0] + (inc.latitude - this.DEMO_START[0]) * vp;
      const vlng = this.DEMO_START[1] + (inc.longitude - this.DEMO_START[1]) * vp;
      this._api.moveVehicle(vlat, vlng);
    }

    const statsEl = page.querySelector('#demoStats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="stat-card"><div class="stat-icon ic-red">🆘</div><div><div class="stat-value">${esc(inc.id)}</div><div class="stat-label">Incident</div></div></div>
        <div class="stat-card"><div class="stat-icon ic-blue">🚑</div><div><div class="stat-value">${esc(inc.status)}</div><div class="stat-label">Current Status</div></div></div>
        <div class="stat-card"><div class="stat-icon ic-green">⏱</div><div><div class="stat-value">${inc.timeline.length}</div><div class="stat-label">Timeline Events</div></div></div>`;
    }
  }
};

/* Start demo from any view without full route render */
DemoSim.running = function () {
  DemoSim.start();
  setTimeout(() => DemoSim.moveTicker(), 120);
};
DemoSim.paused = function () { DemoSim.pause(); };