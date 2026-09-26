/* ============================================================
   citizen.js — Citizen dashboard, SOS & emergency reporting
   ============================================================ */

const CitizenView = {
  /* ============ DASHBOARD ============ */
  dashboard(container) {
    const s = Auth.getSession();
    const mine = Incidents.forCitizen(s.userId);
    const active = Incidents.active(mine);
    const resolved = Incidents.resolved(mine);
    const recent = mine.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 4);
    const current = active.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
    const contacts = getContacts(s.userId);

    container.innerHTML = `
      <div class="page-head">
        <div>
          <h2>Welcome, ${esc(s.name.split(' ')[0])} 👋</h2>
          <p>Your personal emergency safety dashboard. We're here to help you, 24 × 7.</p>
        </div>
        <div class="actions-bar">
          ${UI.sysChips({ updatedAt: mine[0]?.updatedAt || null })}
          <button class="btn btn-primary" data-route="citizen-report">📝 Report Emergency</button>
          <button class="btn btn-outline" data-route="citizen-incidents">📋 My Incidents</button>
        </div>
      </div>

      ${current ? `
      <div class="card" style="border-left: 4px solid var(--danger);">
        <div class="card-body" style="display:flex; align-items:center; gap:14px; flex-wrap:wrap;">
          <span style="font-size:26px;">🆘</span>
          <div style="flex:1; min-width:220px;">
            <strong style="font-size:14px;">Current emergency in progress — ${esc(current.id)}</strong>
            <div style="font-size:12.5px; color:var(--text-2);">${esc(current.type)} · ${esc(current.locationName)}</div>
          </div>
          ${UI.statusBadge(current.status)}
          <button class="btn btn-danger btn-sm" data-incident="${esc(current.id)}" data-role="open-incident">Track Live →</button>
        </div>
      </div>` : ''}

      <div class="sos-panel">
        <h3>🚨 Emergency SOS</h3>
        <p>In immediate danger? Hold the button to alert emergency services with your location.</p>
        <button class="sos-btn" id="sosBtn">SOS</button>
        <div class="sos-progress" style="display:none;" id="sosProgress"><div class="bar" id="sosBar"></div></div>
        <div class="hint-text" style="color: rgba(255,255,255,.75); margin-top:12px;">
          Hold for 3 seconds to activate Emergency SOS
        </div>
      </div>

      <div class="grid grid-3">
        <div class="stat-card"><div class="stat-icon ic-red">🔥</div><div><div class="stat-value">${active.length}</div><div class="stat-label">Active Incidents</div></div></div>
        <div class="stat-card"><div class="stat-icon ic-green">✅</div><div><div class="stat-value">${resolved.length}</div><div class="stat-label">Resolved Incidents</div></div></div>
        <div class="stat-card"><div class="stat-icon ic-blue">📋</div><div><div class="stat-value">${mine.length}</div><div class="stat-label">Total Reports</div></div></div>
      </div>

      <div class="grid grid-2">
        <div class="card">
          <div class="card-head"><h3>🕒 Recent Incidents</h3>
            <button class="btn btn-ghost btn-sm" data-route="citizen-incidents">View all →</button>
          </div>
          <div class="card-body" style="padding:12px;">
            ${recent.length ? recent.map(i => UI.incidentCard(i)).join('')
              : UI.emptyState('📭', 'No incidents yet', 'You have not reported any emergencies. We hope you stay safe!')}
          </div>
        </div>

        <div class="card" id="gpsCard">
          <div class="card-head"><h3>📍 GPS Status</h3><span class="muted" id="gpsUpdated"></span></div>
          <div class="card-body">
            <div class="gps-live">
              <div class="gps-big"><span class="gps-dot pending" id="gpsDot"></span><span id="gpsLabel">Acquiring GPS…</span></div>
              <div class="gps-coords" id="gpsCoords">Lat: —<br>Lng: —</div>
              <div class="gps-meta" id="gpsMeta">Waiting for your location…</div>
              <div class="gps-accuracy-note">GPS accuracy depends on your device, browser and environment — positions are approximate, not mathematically exact.</div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-2">
        <div class="card">
          <div class="card-head">
            <h3>☎️ Emergency Contacts</h3>
            <div class="actions-bar">
              <a class="btn btn-danger btn-sm" href="tel:112">📞 112</a>
              <button class="btn btn-ghost btn-sm" data-route="citizen-contacts">Manage →</button>
            </div>
          </div>
          <div class="card-body">
            <div class="contact-grid">
              ${contacts.map(c => `
                <a class="contact-item" href="tel:${esc(c.number)}" title="Call ${esc(c.name)}">
                  <div class="ci-icon ic-red">${c.icon || '📞'}</div>
                  <div>
                    <div class="ci-num">${esc(c.number)}</div>
                    <div class="ci-name">${esc(c.name)}</div>
                  </div>
                </a>
              `).join('')}
            </div>
            <p class="hint-text">☎️ Tap any contact to start a call. Your personal contacts are stored only in this browser.</p>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h3>🏥 Nearby Emergency Services</h3></div>
          <div class="card-body">
            <div class="contact-grid">
              ${NEARBY_SERVICES.slice(0, 6).map(sv => `
                <div class="contact-item">
                  <div class="ci-icon ic-blue">${sv.icon}</div>
                  <div>
                    <div class="ci-num" style="font-size:12.5px;">${esc(sv.name)}</div>
                    <div class="ci-name">${esc(sv.type)}</div>
                  </div>
                </div>
              `).join('')}
            </div>
            <p class="hint-text">Static demo locations around Demo City — also shown as markers on every tracking map.</p>
          </div>
        </div>
      </div>
    `;

    container.querySelectorAll('[data-route]').forEach(b =>
      b.addEventListener('click', () => App.navTo(b.dataset.route)));

    this.bindSOSHold();
    this.bindGpsPanel();
  },

  /* Live GPS status card on the citizen dashboard */
  bindGpsPanel() {
    const card = document.getElementById('gpsCard');
    if (!card) return;
    const dotEl = card.querySelector('#gpsDot');
    const labelEl = card.querySelector('#gpsLabel');
    const coordsEl = card.querySelector('#gpsCoords');
    const metaEl = card.querySelector('#gpsMeta');
    const updatedEl = card.querySelector('#gpsUpdated');

    const render = () => {
      const g = ERSMap.gpsStatus();
      if (g.active && g.lat != null) {
        dotEl.className = 'gps-dot active';
        labelEl.textContent = '🟢 GPS ACTIVE';
        coordsEl.innerHTML = `Lat: ${g.lat.toFixed(5)}<br>Lng: ${g.lng.toFixed(5)}`;
        metaEl.textContent = `Accuracy: ±${Math.round(g.accuracy || 0)} m`;
      } else if (g.error) {
        dotEl.className = 'gps-dot error';
        labelEl.textContent = '🔴 GPS UNAVAILABLE';
        coordsEl.textContent = g.error;
        metaEl.textContent = '';
      } else {
        dotEl.className = 'gps-dot pending';
        labelEl.textContent = '🟡 ACQUIRING GPS…';
        coordsEl.innerHTML = 'Lat: —<br>Lng: —';
        metaEl.textContent = 'Waiting for your location…';
      }
      updatedEl.textContent = g.lastUpdate ? `Updated ${timeAgo(g.lastUpdate)}` : '';
    };

    ERSMap.watchLocation({ onUpdate: render, onError: render, timeout: 12000 });
    render();
    App.interval(render, 2000);
  },

  /* ============ SOS STEP 1 — hold for 3 seconds ============ */
  bindSOSHold() {
    const btn = document.getElementById('sosBtn');
    const progress = document.getElementById('sosProgress');
    const bar = document.getElementById('sosBar');
    if (!btn) return;

    const HOLD_MS = 3000;
    let timer = null, start = 0;

    const tick = () => {
      const pct = Math.min(100, ((Date.now() - start) / HOLD_MS) * 100);
      bar.style.width = pct + '%';
      if (pct >= 100) {
        cancel();
        btn._sosDone = true;
        btn.classList.remove('holding');
        btn.classList.add('loading');
        btn.textContent = '…';
        this.sosLocationStep();
      }
    };

    const begin = (e) => {
      if (btn._sosDone) return;
      e.preventDefault();
      start = Date.now();
      btn.classList.add('holding');
      progress.style.display = '';
      timer = setInterval(tick, 60);
    };

    const cancel = () => {
      if (btn._sosDone) return;
      clearInterval(timer);
      timer = null;
      btn.classList.remove('holding');
      progress.style.display = 'none';
      bar.style.width = '0%';
    };

    btn.addEventListener('pointerdown', begin);
    btn.addEventListener('pointerup', cancel);
    btn.addEventListener('pointerleave', cancel);
    btn.addEventListener('pointercancel', cancel);
  },

  /* ============ SOS STEP 2 — capture location with live GPS ============ */
  async sosLocationStep() {
    /* Cancellation flag — prevents stale geolocation callbacks from creating SOS */
    let cancelled = false;
    let loc = null;

    const modal = UI.modal({
      title: 'Getting Your Location',
      icon: '📍',
      bodyHTML: `
        <div style="text-align:center; padding: 18px 0;">
          <div class="spinner" id="sosGpsSpinner" style="margin: 0 auto 14px;"></div>
          <div id="sosGpsStatus" class="gps-status-box">
            <div class="gps-status-header">
              <span class="gps-dot" id="sosGpsDot"></span>
              <span id="sosGpsLabel">Acquiring GPS...</span>
            </div>
            <div class="gps-coords" id="sosGpsCoords">Waiting for location...</div>
            <div class="gps-meta" id="sosGpsMeta"></div>
          </div>
          <p class="hint-text" style="margin-top:12px;">
            If your browser asks for location permission, please allow it.<br>
            <span style="font-size:11px; opacity:.7;">GPS accuracy depends on your device and environment.</span>
          </p>
        </div>
      `,
      footHTML: `<button class="btn btn-outline" data-act="cancel-sos">Cancel SOS</button>`
    });

    /* Closing the modal in ANY way (Cancel button, ✕, backdrop click) must abort
       the GPS watch and cancel the flow — otherwise a late location fix would
       create a "ghost" SOS incident after the user dismissed the dialog. */
    const origClose = modal.close.bind(modal);
    modal.close = () => {
      cancelled = true;
      ERSMap.stopWatch();
      origClose();
      this.sosResetButton();
    };

    const statusEl = modal.overlay.querySelector('#sosGpsStatus');
    const dotEl = modal.overlay.querySelector('#sosGpsDot');
    const labelEl = modal.overlay.querySelector('#sosGpsLabel');
    const coordsEl = modal.overlay.querySelector('#sosGpsCoords');
    const metaEl = modal.overlay.querySelector('#sosGpsMeta');
    const spinnerEl = modal.overlay.querySelector('#sosGpsSpinner');

    /* Update GPS status display */
    const updateGpsUI = (gps) => {
      if (cancelled) return;
      if (gps.active && gps.lat != null) {
        dotEl.className = 'gps-dot active';
        labelEl.textContent = '🟢 GPS ACTIVE';
        coordsEl.innerHTML = `Lat: ${gps.lat.toFixed(5)}<br>Lng: ${gps.lng.toFixed(5)}`;
        metaEl.textContent = `Accuracy: ±${Math.round(gps.accuracy || 0)} m · Updated: ${fmtTime(gps.lastUpdate)}`;
        spinnerEl.style.display = 'none';
      } else if (gps.error) {
        dotEl.className = 'gps-dot error';
        labelEl.textContent = '🔴 GPS ERROR';
        coordsEl.textContent = gps.error;
        metaEl.textContent = '';
      } else {
        dotEl.className = 'gps-dot pending';
        labelEl.textContent = '🟡 ACQUIRING GPS...';
        coordsEl.textContent = 'Waiting for location...';
        metaEl.textContent = '';
      }
    };

    /* Cancel handler */
    modal.overlay.querySelector('[data-act="cancel-sos"]').addEventListener('click', () => {
      cancelled = true;
      ERSMap.stopWatch();
      modal.close();
      this.sosResetButton();
    });

    /* Start watching location */
    ERSMap.watchLocation({
      onUpdate: (gps) => {
        updateGpsUI(gps);
        if (gps.active && gps.lat != null && !cancelled) {
          /* Got a good location — stop watching and proceed */
          ERSMap.stopWatch();
          if (!cancelled) {
            loc = { ok: true, latitude: gps.lat, longitude: gps.lng, accuracy: gps.accuracy };
            modal.close();
            this.sosCreate(loc.latitude, loc.longitude, `Live GPS location (±${Math.round(loc.accuracy || 0)} m)`);
          }
        }
      },
      onError: (err) => {
        updateGpsUI(ERSMap.gpsStatus());
      },
      timeout: 15000
    });

    /* Fallback: if watchPosition doesn't fire within 18 seconds, use single-shot or demo */
    setTimeout(() => {
      if (!cancelled && !loc) {
        ERSMap.stopWatch();
        /* Try single-shot as fallback */
        ERSMap.getUserLocation().then(fallbackLoc => {
          if (cancelled) return;
          if (fallbackLoc.ok) {
            loc = fallbackLoc;
            modal.close();
            this.sosCreate(fallbackLoc.latitude, fallbackLoc.longitude, `Live location (±${Math.round(fallbackLoc.accuracy || 0)} m)`);
          } else {
            UI.toast('Location Unavailable', fallbackLoc.reason, 'warning');
            modal.close();
            this.sosDemoPicker(fallbackLoc.reason);
          }
        });
      }
    }, 18000);
  },

  /* Demo location picker (fallback when permission denied) */
  sosDemoPicker(reason) {
    let pickerLat = ERSMap.DEMO_CENTER[0];
    let pickerLng = ERSMap.DEMO_CENTER[1];

    const modal = UI.modal({
      title: 'Select Demo Location',
      icon: '🗺️',
      large: true,
      bodyHTML: `
        <div class="map-pick-hint">ℹ️ ${esc(reason)}</div>
        <div class="map-pick-hint">👆 Click anywhere on the map to select the emergency location, then confirm.</div>
        <div id="sosDemoMap" style="height: 320px; border-radius: 8px; border: 1px solid var(--border); z-index:1;"></div>
        <p class="hint-text" id="sosDemoCoords">Selected: ${pickerLat.toFixed(5)}, ${pickerLng.toFixed(5)}</p>
      `,
      footHTML: `
        <button class="btn btn-outline" data-act="cancel-sos">Cancel SOS</button>
        <button class="btn btn-danger" data-act="confirm-loc">🆘 Use This Location</button>
      `
    });

    ERSMap.createLocationPicker('sosDemoMap', {
      onPick: (lat, lng) => {
        pickerLat = lat; pickerLng = lng;
        modal.overlay.querySelector('#sosDemoCoords').textContent =
          `Selected: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      }
    });

    modal.overlay.querySelector('[data-act="cancel-sos"]').addEventListener('click', () => {
      modal.close();
      this.sosResetButton();
    });
    modal.overlay.querySelector('[data-act="confirm-loc"]').addEventListener('click', () => {
      modal.close();
      this.sosCreate(pickerLat, pickerLng, 'Demo location (selected on map)');
    });
  },

  /* ============ SOS — create incident ============ */
  sosCreate(latitude, longitude, locationName) {
    const s = Auth.getSession();
    const incident = Incidents.create({
      reporter: `${s.name} (${s.email})`,
      reporterId: s.userId,
      type: 'Emergency/SOS',
      description: '🆘 SOS ACTIVATED — Citizen pressed the Emergency SOS button. Immediate assistance required.',
      latitude, longitude, locationName,
      contact: getUsers().find(u => u.id === s.userId)?.phone || '—',
      priority: 'HIGH',
      source: 'SOS',
      attachments: []
    });
    this.sosSuccess(incident);
  },

  /* ============ SOS STEP 3 — success confirmation ============ */
  sosSuccess(incident) {
    UI.toast('Emergency Reported', `${incident.id} has been sent to the Emergency Control Room.`, 'success');

    const modal = UI.modal({
      title: 'Emergency SOS Activated',
      icon: '🆘',
      bodyHTML: `
        <div class="text-center" style="margin-bottom:16px;">
          <div class="modal-icon-lg" style="margin: 0 auto 12px; background: var(--success-light);">✅</div>
          <h3 style="font-size:17px;">Emergency reported successfully.</h3>
          <p style="color:var(--text-2); font-size:13px; margin-top:4px;">
            The Emergency Control Room has received your SOS and is responding now.
          </p>
        </div>
        <div class="detail-section" style="border:1px solid var(--border); border-radius:10px; padding: 14px 16px;">
          <div class="detail-row"><div class="k">Incident ID</div><div class="v mono">${esc(incident.id)}</div></div>
          <div class="detail-row"><div class="k">Emergency Type</div><div class="v">${esc(incident.type)}</div></div>
          <div class="detail-row"><div class="k">Location</div><div class="v">${esc(incident.locationName)}</div></div>
          <div class="detail-row"><div class="k">GPS Coordinates</div><div class="v mono">${Number(incident.latitude).toFixed(6)}, ${Number(incident.longitude).toFixed(6)}</div></div>
          <div class="detail-row"><div class="k">Priority</div><div class="v">${UI.priorityBadge(incident.priority)}</div></div>
          <div class="detail-row"><div class="k">Current Status</div><div class="v">${UI.statusBadge(incident.status)}</div></div>
        </div>
      `,
      footHTML: `
        <button class="btn btn-outline" data-act="close">Close</button>
        <button class="btn btn-primary" data-act="track">📋 Track This Incident</button>
      `
    });

    modal.overlay.querySelector('[data-act="track"]').addEventListener('click', () => {
      modal.close();
      this.sosResetButton();
      App.navTo(`citizen-incident:${incident.id}`);
    });
    modal.overlay.querySelector('[data-act="close"]').addEventListener('click', () => {
      modal.close();
      this.sosResetButton();
      App.render();
    });
  },

  sosResetButton() {
    const btn = document.getElementById('sosBtn');
    if (!btn) return;
    btn.classList.remove('holding', 'loading');
    btn.textContent = 'SOS';
    btn._sosDone = false;
    const progress = document.getElementById('sosProgress');
    if (progress) progress.style.display = 'none';
  },

  /* ============ MANUAL REPORT FORM ============ */
  report(container) {
    const user = getUsers().find(u => u.id === Auth.getSession().userId);

    container.innerHTML = `
      <div class="page-head">
        <div>
          <h2>📝 Report an Emergency</h2>
          <p>Fill in the details below. Our control room will verify and dispatch the nearest response team.</p>
        </div>
        <button class="btn btn-outline" data-act="back">← Back to Dashboard</button>
      </div>

      <div class="card">
        <div class="card-head"><h3>🚨 Emergency Details</h3></div>
        <div class="card-body">
          <div class="grid grid-2">
            <div class="form-group">
              <label>Emergency Type <span class="req">*</span></label>
              <select class="field" id="repType">
                <option value="">— Select emergency type —</option>
                ${EMERGENCY_TYPES.filter(t => t !== 'Emergency/SOS').map(t =>
                  `<option value="${t}">${UI.typeIcon(t)} ${t}</option>`).join('')}
              </select>
              <div class="field-error" id="err-repType">Please select the emergency type.</div>
            </div>
            <div class="form-group">
              <label>Requested Urgency <span class="req">*</span></label>
              <select class="field" id="repPriority">
                <option value="MEDIUM">🟠 MEDIUM — Urgent but stable</option>
                <option value="HIGH">🔴 HIGH — Urgent, quick response needed</option>
                <option value="CRITICAL">🚨 CRITICAL — Life-threatening situation</option>
                <option value="LOW">⚪ LOW — Non-urgent assistance</option>
              </select>
              <div class="hint-text">Final priority is confirmed by the Emergency Operator after verification.</div>
            </div>
          </div>

          <div class="form-group">
            <label>Description <span class="req">*</span></label>
            <textarea class="field" id="repDesc" placeholder="Describe the emergency — what happened, how many people are affected, any hazards nearby…"></textarea>
            <div class="field-error" id="err-repDesc">Please describe the emergency (at least 10 characters).</div>
          </div>

          <div class="grid grid-2">
            <div class="form-group">
              <label>Location Name / Address <span class="req">*</span></label>
              <input class="field" id="repLocation" placeholder="e.g. H-45, Green Park, New Delhi">
              <div class="field-error" id="err-repLocation">Please enter the location name or address.</div>
            </div>
            <div class="form-group">
              <label>Contact Number <span class="req">*</span></label>
              <input class="field" id="repContact" placeholder="e.g. +91 98765 43210" value="${esc(user?.phone || '')}">
              <div class="field-error" id="err-repContact">Please enter a valid contact number (at least 8 digits).</div>
            </div>
          </div>

          <div class="actions-bar mb-1">
            <button class="btn btn-outline" id="btnGeo">📍 Use My Current Location</button>
            <span class="muted" id="geoStatus">No coordinates captured yet — you can also click the map below.</span>
          </div>
          <div class="map-pick-hint">🗺️ Click the map to set the exact emergency location. A marker will confirm your selection.</div>
          <div id="repMap" style="height: 300px; border-radius: 10px; border: 1px solid var(--border); z-index:1;"></div>

          <div class="form-group mt-2">
            <label>Photo (optional)</label>
            <div class="file-upload" id="repFileBox">
              📷 Click to attach a photo of the emergency (max 2 MB)
              <input type="file" id="repFile" accept="image/*" style="display:none;">
            </div>
            <div class="attach-preview" id="repPreview"></div>
          </div>

          <hr class="divider">
          <div class="actions-bar">
            <button class="btn btn-danger btn-lg" id="btnSubmitReport">🚨 Submit Emergency Report</button>
            <button class="btn btn-ghost" id="btnClearReport">Clear Form</button>
          </div>
        </div>
      </div>
    `;

    container.querySelector('[data-act="back"]').addEventListener('click', () => App.navTo('citizen-dashboard'));
    this.bindReportForm(container);
  },

  /* Report form behaviour: map picker, geolocation, upload, validate, submit */
  bindReportForm(container) {
    let pickedLat = null, pickedLng = null, attachData = [];

    const map = ERSMap.createLocationPicker('repMap', {
      onPick: (lat, lng) => {
        pickedLat = lat; pickedLng = lng;
        document.getElementById('geoStatus').textContent =
          `📍 Location set: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      }
    });
    App.activeMap = map;

    document.getElementById('btnGeo').addEventListener('click', async () => {
      const status = document.getElementById('geoStatus');
      status.textContent = '⏳ Getting your location…';
      const loc = await ERSMap.getUserLocation();
      if (loc.ok) {
        pickedLat = loc.latitude; pickedLng = loc.longitude;
        map.setView([pickedLat, pickedLng], 15);
        map._ersPick(pickedLat, pickedLng);
        status.textContent = `📍 Location set: ${pickedLat.toFixed(5)}, ${pickedLng.toFixed(5)}`;
        UI.toast('Location Captured', 'Your current location has been attached to the report.', 'success');
      } else {
        status.textContent = '⚠️ ' + loc.reason;
        UI.toast('Location Unavailable', loc.reason, 'warning');
      }
    });

    const fileInput = document.getElementById('repFile');
    const fileBox = document.getElementById('repFileBox');
    const preview = document.getElementById('repPreview');
    fileBox.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        UI.toast('Invalid File', 'Please attach an image file.', 'error');
        fileInput.value = '';
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        UI.toast('File Too Large', 'Please attach an image smaller than 2 MB.', 'error');
        fileInput.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        attachData = [reader.result];
        fileBox.classList.add('has-file');
        fileBox.textContent = `📷 ${file.name} attached — click to replace`;
        preview.innerHTML = `<div class="ap-item"><img src="${attachData[0]}" alt="Preview"><button class="ap-remove" id="apRemove" title="Remove">✕</button></div>`;
        preview.querySelector('#apRemove').addEventListener('click', () => {
          attachData = [];
          fileInput.value = '';
          fileBox.classList.remove('has-file');
          fileBox.textContent = '📷 Click to attach a photo of the emergency (max 2 MB)';
          preview.innerHTML = '';
        });
      };
      reader.readAsDataURL(file);
    });

    /* Clear form */
    document.getElementById('btnClearReport').addEventListener('click', () => {
      container.querySelectorAll('input.field, textarea.field').forEach(el => el.value = '');
      container.querySelectorAll('select.field').forEach(el => el.selectedIndex = 0);
      pickedLat = pickedLng = null;
      attachData = [];
      container.querySelectorAll('.field-error.show').forEach(el => el.classList.remove('show'));
      document.getElementById('geoStatus').textContent = 'No coordinates captured yet — you can also click the map below.';
      preview.innerHTML = '';
      fileBox.classList.remove('has-file');
      fileBox.textContent = '📷 Click to attach a photo of the emergency (max 2 MB)';
      UI.toast('Form Cleared', 'All fields have been reset.', 'info');
    });

    /* Submit with validation */
    document.getElementById('btnSubmitReport').addEventListener('click', () => {
      const type = document.getElementById('repType').value;
      const desc = document.getElementById('repDesc').value.trim();
      const locationName = document.getElementById('repLocation').value.trim();
      const contact = document.getElementById('repContact').value.trim();
      const priority = document.getElementById('repPriority').value;

      let valid = true;
      const mark = (id, bad) => {
        const err = document.getElementById('err-' + id);
        const fld = document.getElementById(id);
        if (err) err.classList.toggle('show', bad);
        if (bad) valid = false;
      };
      mark('repType', !type);
      mark('repDesc', desc.length < 10);
      mark('repLocation', !locationName);
      mark('repContact', !/^[+\d][\d\s\-()]{7,}$/.test(contact));

      if (!valid) {
        UI.toast('Missing Information', 'Please correct the highlighted fields and try again.', 'error');
        container.querySelector('.field-error.show')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      if (pickedLat == null) {
        pickedLat = ERSMap.DEMO_CENTER[0];
        pickedLng = ERSMap.DEMO_CENTER[1];
      }

      const s = Auth.getSession();
      const incident = Incidents.create({
        reporter: `${s.name} (${s.email})`,
        reporterId: s.userId,
        type, description: desc,
        latitude: pickedLat, longitude: pickedLng,
        locationName, contact, priority,
        source: 'Citizen Report',
        attachments: attachData
      });

      UI.toast('Emergency Reported', `${incident.id} created and sent to the Emergency Control Room.`, 'success');
      App.navTo(`citizen-incident:${incident.id}`);
    });
  },

  /* ============ MY INCIDENTS ============ */
  myIncidents(container) {
    const s = Auth.getSession();
    const mine = Incidents.forCitizen(s.userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const active = Incidents.active(mine);
    const resolved = Incidents.resolved(mine);

    container.innerHTML = `
      <div class="page-head">
        <div>
          <h2>📋 My Incidents</h2>
          <p>Track every emergency you have reported, from report to resolution.</p>
        </div>
        <button class="btn btn-primary" data-route="citizen-report">📝 New Report</button>
      </div>

      <div class="grid grid-3">
        <div class="stat-card"><div class="stat-icon ic-red">🔥</div><div><div class="stat-value">${active.length}</div><div class="stat-label">Active</div></div></div>
        <div class="stat-card"><div class="stat-icon ic-green">✅</div><div><div class="stat-value">${resolved.length}</div><div class="stat-label">Resolved</div></div></div>
        <div class="stat-card"><div class="stat-icon ic-blue">📋</div><div><div class="stat-value">${mine.length}</div><div class="stat-label">Total</div></div></div>
      </div>

      <div class="card">
        <div class="card-head"><h3>All Reports</h3></div>
        <div class="card-body" style="padding:12px;">
          ${mine.length ? mine.map(i => UI.incidentCard(i)).join('')
            : UI.emptyState('📭', 'No incidents reported yet', 'Use the Report Emergency button to create your first report.')}
        </div>
      </div>
    `;

    container.querySelectorAll('[data-route]').forEach(b =>
      b.addEventListener('click', () => App.navTo(b.dataset.route)));
  },

  /* ============ EMERGENCY CONTACTS (Phase 2 CRUD) ============ */
  contacts(container) {
    const s = Auth.getSession();
    const renderList = () => {
      const items = getContacts(s.userId);
      return items.length ? items.map(c => `
        <div class="contact-editor-item">
          <div class="ci-icon ic-red">${c.icon || '📞'}</div>
          <div class="ce-main">
            <strong>${esc(c.name)}</strong>
            <span class="muted">${esc(c.relation || 'Personal')} · <a class="ce-call" href="tel:${esc(c.number)}">${esc(c.number)}</a></span>
          </div>
          <div class="actions-bar">
            <a class="btn btn-outline btn-sm" href="tel:${esc(c.number)}">📞 Call</a>
            <button class="btn btn-ghost btn-sm" data-act="edit" data-id="${esc(c.id)}">✏️</button>
            <button class="btn btn-ghost btn-sm" data-act="delete" data-id="${esc(c.id)}">🗑</button>
          </div>
        </div>`).join('')
      : UI.emptyState('📭', 'No personal contacts yet', 'Add family, friends or specialists who can be called during emergencies.');
    };

    container.innerHTML = `
      <div class="page-head">
        <div>
          <h2>☎️ Emergency Contacts</h2>
          <p>Your personal call list — shown during SOS and incident tracking. Stored only in this browser.</p>
        </div>
        <div class="actions-bar">
          <button class="btn btn-primary" data-act="add">＋ Add Contact</button>
          <button class="btn btn-outline" data-act="back">← Dashboard</button>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><h3>My Contacts</h3><span class="muted">Stored locally (LocalStorage)</span></div>
        <div class="card-body" id="contactList">${renderList()}</div>
      </div>
      <div class="alert info">ℹ️ During the SOS / tracking workflow, a quick <strong>Call Contact</strong> action is shown using your list, opened via <code>tel:</code> links where supported.</div>
    `;

    const rerender = () => this.contacts(container);

    container.querySelector('[data-act="back"]').addEventListener('click', () => App.navTo('citizen-dashboard'));
    container.querySelector('[data-act="add"]').addEventListener('click', () => this.contactModal(null, rerender));
    container.querySelector('#contactList').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      if (btn.dataset.act === 'edit') this.contactModal(btn.dataset.id, rerender);
      if (btn.dataset.act === 'delete') this.deleteContact(btn.dataset.id, rerender);
    });
  },

  /* ============ CONTACT MODAL (add / edit) ============ */
  contactModal(contactId, onDone) {
    const s = Auth.getSession();
    const items = getContacts(s.userId);
    const c = contactId ? items.find(x => x.id === contactId) : null;
    if (contactId && !c) return;

    const modal = UI.modal({
      title: c ? 'Edit Contact' : 'Add Contact',
      icon: '☎️',
      bodyHTML: `
        <div class="form-group">
          <label>Name <span class="req">*</span></label>
          <input class="field" id="conName" value="${esc(c ? c.name : '')}" placeholder="e.g. Father">
        </div>
        <div class="form-group">
          <label>Relationship</label>
          <input class="field" id="conRel" value="${esc(c ? c.relation : '')}" placeholder="e.g. Family">
        </div>
        <div class="form-group">
          <label>Phone Number <span class="req">*</span></label>
          <input class="field" id="conNum" value="${esc(c ? c.number : '')}" placeholder="e.g. +91 98xxxxxxx">
        </div>
        <div class="form-group">
          <label>Icon</label>
          <select class="field" id="conIcon">
            <option value="📞">📞 Default</option>
            <option value="👨">👨 Father</option>
            <option value="👩">👩 Mother</option>
            <option value="🧑">🧑 Family</option>
            <option value="👵">👵 Grandparent</option>
            <option value="🩺">🩺 Doctor</option>
            <option value="🚑">🚑 Ambulance</option>
          </select>
        </div>
        <div class="alert info mt-1">ℹ️ Contacts are used to place quick <code>tel:</code> calls during emergencies.</div>
      `,
      footHTML: `
        <button class="btn btn-outline" data-act="cancel">Cancel</button>
        <button class="btn btn-primary" data-act="save">💾 Save Contact</button>
      `
    });

    if (c) modal.overlay.querySelector('#conIcon').value = c.icon || '📞';
    modal.overlay.querySelector('[data-act="cancel"]').addEventListener('click', modal.close);
    modal.overlay.querySelector('[data-act="save"]').addEventListener('click', () => {
      const name = modal.overlay.querySelector('#conName').value.trim();
      const num = modal.overlay.querySelector('#conNum').value.trim();
      if (!name || !/^[+\d][\d\s\-()]{6,}$/.test(num)) {
        UI.toast('Missing Information', 'Enter a name and a valid phone number.', 'error');
        return;
      }
      const list = getContacts(s.userId).slice();
      const rel = modal.overlay.querySelector('#conRel').value.trim() || 'Personal';
      const icon = modal.overlay.querySelector('#conIcon').value;
      if (c) {
        const idx = list.findIndex(x => x.id === c.id);
        if (idx > -1) list[idx] = { ...list[idx], name, relation: rel, number: num, icon };
      } else {
        list.unshift({ id: 'C-' + Date.now(), name, relation: rel, number: num, icon });
      }
      saveContacts(s.userId, list);
      modal.close();
      UI.toast('Contact Saved', `${name} saved to your emergency contacts.`, 'success');
      if (onDone) onDone();
    });
  },

  async deleteContact(contactId, onDone) {
    const s = Auth.getSession();
    const ok = await UI.confirm({
      title: 'Remove Contact',
      message: 'Remove this contact from your emergency list?',
      confirmText: '🗑 Remove', danger: true, icon: '🗑'
    });
    if (!ok) return;
    saveContacts(s.userId, getContacts(s.userId).filter(x => x.id !== contactId));
    UI.toast('Contact Removed', 'Contact deleted from your list.', 'info');
    if (onDone) onDone();
  },

  /* ============ CITIZEN INCIDENT DETAIL (live tracking) ============ */
  incidentDetail(container, id) {
    const inc = Incidents.getById(id);
    if (!inc) {
      UI.toast('Not Found', 'That incident does not exist.', 'error');
      App.navTo('citizen-incidents');
      return;
    }
    const s = Auth.getSession();
    if (inc.reporterId !== s.userId) {
      UI.toast('Access Denied', 'You can only view your own incidents.', 'error');
      App.navTo('citizen-incidents');
      return;
    }

    container.innerHTML = CitizenView.trackingHtml(inc);
    container.querySelector('[data-act="back"]').addEventListener('click', () => App.navTo('citizen-incidents'));
    CitizenView.bindTracking(container, inc);
  },

  trackingHtml(inc) {
    const team = inc.assignedTeam ? Teams.getById(inc.assignedTeam) : null;
    const st = inc.status;
    const snap = (typeof Simulation !== 'undefined' && Simulation.get) ? Simulation.snapshot(inc.id) : null;
    const contacts = getContacts(Auth.getSession().userId).slice(0, 3);
    const showBand = snap || ['DISPATCHED', 'ON THE WAY', 'ARRIVED', 'HANDLING'].includes(st);

    return `
      <div class="page-head">
        <div>
          <h2>${UI.typeIcon(inc.type)} ${esc(inc.id)} <span class="muted" id="ctUpdated" style="font-size:12px;"></span></h2>
          <p>${esc(inc.type)} · Reported ${esc(fmtDateTime(inc.createdAt))} (${timeAgo(inc.createdAt)})</p>
        </div>
        <div class="actions-bar">
          ${contacts.map(c => `<a class="btn btn-danger btn-sm" href="tel:${esc(c.number)}" title="Call ${esc(c.name)}">📞 ${esc(c.name)}</a>`).join('')}
          <button class="btn btn-outline btn-sm" data-act="back">← My Incidents</button>

        </div>
      </div>

      ${UI.sysChips({ updatedAt: inc.updatedAt })}
      ${UI.stepper(st)}

      ${showBand ? `
      <div class="live-tracking-bar" id="simBand">
        <span class="live-indicator"><span class="live-dot"></span> ${snap ? 'LIVE RESPONSE' : 'AWAITING DISPATCH'}</span>
        <span class="live-stat">Distance: <strong id="ctDistance">${snap ? fmtDist(snap.distanceKm) : '—'}</strong></span>
        <span class="live-stat">Simulated ETA: <strong id="ctEta">${snap ? (snap.phase === 'arrived' ? 'Arrived' : fmtEta(snap.etaMin)) : '—'}</strong></span>
        ${snap ? `<div class="live-stat" style="flex:1; min-width:180px;">
          <div class="prog-track"><div class="prog-fill" id="ctBar" style="width:${snap.progress}%; background:var(--success);"></div></div>
        </div>` : ''}
        <span class="hint-text">Simulated ETA — not a real traffic estimate.</span>
      </div>` : ''}

      <div class="detail-grid">
        <div>
          <div class="card">
            <div class="card-head"><h3>ℹ️ Incident Information</h3><div class="inc-badges">${UI.priorityBadge(inc.priority)} ${UI.statusBadge(st)}</div></div>
            <div class="card-body">
              <div class="detail-row"><div class="k">Incident ID</div><div class="v mono">${esc(inc.id)}</div></div>
              <div class="detail-row"><div class="k">Reporter</div><div class="v">${esc(inc.reporter)}</div></div>
              <div class="detail-row"><div class="k">Emergency Type</div><div class="v">${UI.typeIcon(inc.type)} ${esc(inc.type)}</div></div>
              <div class="detail-row"><div class="k">Description</div><div class="v">${esc(inc.description)}</div></div>
              <div class="detail-row"><div class="k">Contact</div><div class="v mono">${esc(inc.contact)}</div></div>
              <div class="detail-row"><div class="k">Location</div><div class="v">${esc(inc.locationName)}</div></div>
              ${st === 'REPORTED' ? `<div class="alert info mt-2">⏳ <strong>Waiting for verification.</strong> The control room will review your report shortly, then assign a response team.</div>` : ''}
              ${st === 'REJECTED' ? `<div class="alert danger mt-2">🚫 This report was reviewed and marked as <strong>not actionable</strong> by the control room. If you believe this is a mistake, report again or call 112.</div>` : ''}
            </div>
          </div>

          <div class="card mt-2">
            <div class="card-head"><h3>🚑 Response Team</h3>${team ? UI.teamStatusBadge(team.status) : ''}</div>
            <div class="card-body">
              ${team ? `
                <div style="display:flex; align-items:center; gap:12px;">
                  <div class="type-icon ${UI.typeBadgeCls(team.department)}" style="font-size:22px;">${team.icon}</div>
                  <div style="flex:1;">
                    <strong>${esc(team.name)}</strong>
                    <div class="muted">${esc(team.department)} · Base: ${esc(team.base || '')}</div>
                  </div>
                </div>
                ${snap ? `<hr class="divider">${UI.etaWidget({ distanceKm: snap.distanceKm, etaMin: snap.etaMin, progress: snap.progress, arrived: snap.phase === 'arrived' })}` : ''}
                ${['ON THE WAY', 'ARRIVED', 'HANDLING'].includes(st) ? `<div class="alert info mt-2">🚨 The team is actively responding to your emergency right now.</div>` : ''}
              ` : `<p class="muted">No response team assigned yet. Once the control room verifies your report, a team will be assigned and its progress will appear here.</p>`}
            </div>
          </div>

          ${st === 'RESOLVED' ? `
          <div class="card mt-2" style="border-left:4px solid var(--success);">
            <div class="card-head"><h3>✅ Resolution</h3></div>
            <div class="card-body">
              <p style="font-size:14px;">${esc(inc.resolutionNotes)}</p>
              <p class="muted mt-1">Resolved at ${esc(fmtDateTime(inc.resolvedAt))}</p>
            </div>
          </div>` : ''}

          <div class="card mt-2">
            <div class="card-head"><h3>🖼️ Attachments</h3></div>
            <div class="card-body">${inc.attachments?.length ? UI.attachments(inc) : '<p class="muted">No photos were attached to this report.</p>'}</div>
          </div>
        </div>

        <div>
          <div class="card">
            <div class="card-head"><h3>📍 Live Tracking Map</h3></div>
            <div class="card-body">
              <p class="muted mb-1">${esc(inc.locationName)}</p>
              <div id="incMap"></div>
            </div>
          </div>

          <div class="card mt-2">
            <div class="card-head"><h3>🕐 Timeline</h3></div>
            <div class="card-body">${UI.timeline(inc)}</div>
          </div>
        </div>
      </div>`;
  },

  /* Live refresh: ETA, distance, progress, updated time, vehicle marker */
  bindTracking(container, inc) {
    let mapApi = null;
    if (typeof Simulation !== 'undefined' && Simulation.get) {
      const snap = Simulation.snapshot(inc.id);
      mapApi = ERSMap.showTrackingMap('incMap', {
        incident: inc,
        vehicle: snap ? { lat: snap.vehicleLat, lng: snap.vehicleLng, icon: snap.icon, label: snap.teamName } : null,
        services: true, legend: true, locate: true
      });
    } else {
      ERSMap.showIncidentMap('incMap', inc);
    }

    const refresh = () => {
      const cur = Incidents.getById(inc.id);
      if (!cur) return;
      const up = container.querySelector('#ctUpdated');
      if (up) up.textContent = '· Updated ' + timeAgo(cur.updatedAt);
      if (typeof Simulation !== 'undefined' && Simulation.get) {
        const snap = Simulation.snapshot(inc.id);
        if (snap) {
          const dEl = container.querySelector('#ctDistance');
          const eEl = container.querySelector('#ctEta');
          if (dEl) dEl.textContent = snap.phase === 'arrived' ? '0 m' : fmtDist(snap.distanceKm);
          if (eEl) eEl.textContent = snap.phase === 'arrived' ? 'Arrived' : fmtEta(snap.etaMin);
          const bar = container.querySelector('#ctBar');
          if (bar) bar.style.width = (snap.progress || 0) + '%';
          if (mapApi && mapApi.moveVehicle) mapApi.moveVehicle(snap.vehicleLat, snap.vehicleLng, snap.icon);
        }
      }
    };
    refresh();
    App.interval(refresh, 1500);
  }
};







