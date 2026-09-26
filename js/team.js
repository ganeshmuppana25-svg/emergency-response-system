/* ============================================================
   team.js — Response Team dashboard (accept & update status)
   ============================================================ */

const TeamView = {
  /* ============ TEAM DASHBOARD ============ */
  dashboard(container) {
    const s = Auth.getSession();
    const team = Teams.getById(s.teamId);
    if (!team) {
      container.innerHTML = UI.emptyState('⚠️', 'No team linked to this account',
        'This team account is not linked to a response unit. Contact the administrator.');
      return;
    }

    const mine = Incidents.forTeam(s.teamId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const pending = mine.filter(i => i.status === 'TEAM ASSIGNED');
    const inProgress = mine.filter(i => ['ACCEPTED', 'DISPATCHED', 'ON THE WAY', 'ARRIVED', 'HANDLING'].includes(i.status));
    const completed = mine.filter(i => i.status === 'RESOLVED');

    container.innerHTML = `
      <div class="page-head">
        <div>
          <h2>${team.icon} ${esc(team.name)} — Team Dashboard</h2>
          <p>${esc(team.department)} · Base: ${esc(team.base || '—')} · Members: ${team.members}</p>
        </div>
        <div class="actions-bar">
          ${UI.teamStatusBadge(team.status)}
          <button class="btn btn-ghost" data-act="refresh">🔄 Refresh</button>
        </div>
      </div>

      <div class="grid grid-3">
        <div class="stat-card"><div class="stat-icon ic-amber">🆕</div><div><div class="stat-value">${pending.length}</div><div class="stat-label">New Assignments</div></div></div>
        <div class="stat-card"><div class="stat-icon ic-red">🚨</div><div><div class="stat-value">${inProgress.length}</div><div class="stat-label">Active Assignments</div></div></div>
        <div class="stat-card"><div class="stat-icon ic-green">✅</div><div><div class="stat-value">${completed.length}</div><div class="stat-label">Completed</div></div></div>
      </div>

      ${inProgress.length ? `
        <div class="card" style="border-left:4px solid var(--danger);">
          <div class="card-head"><h3>🚨 Active Response</h3></div>
          <div class="card-body" style="padding:12px;">
            ${inProgress.map(i => this.activeCard(i, team)).join('')}
          </div>
        </div>` : ''}

      <div class="card">
        <div class="card-head"><h3>🆕 New Assignments</h3>
          <span class="muted">${pending.length} awaiting response</span>
        </div>
        <div class="card-body" style="padding:12px;">
          ${pending.length ? pending.map(i => this.assignmentCard(i)).join('')
            : UI.emptyState('📭', 'No new assignments', 'New incidents assigned by the control room will appear here.')}
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h3>📜 Assignment History</h3></div>
        <div class="table-wrap">
          ${mine.length ? `
          <table class="table">
            <thead><tr><th>Incident</th><th>Type</th><th>Priority</th><th>Status</th><th>Reported</th></tr></thead>
            <tbody>
              ${mine.map(i => `
                <tr data-incident="${esc(i.id)}" data-role="open-incident" class="clickable">
                  <td class="id-cell">${esc(i.id)}</td>
                  <td>${UI.typeIcon(i.type)} ${esc(i.type)}</td>
                  <td>${UI.priorityBadge(i.priority)}</td>
                  <td>${UI.statusBadge(i.status)}</td>
                  <td class="time-cell" title="${esc(fmtDateTime(i.createdAt))}">${timeAgo(i.createdAt)}</td>
                </tr>`).join('')}
            </tbody>
          </table>` : UI.emptyState('📭', 'No assignments yet', 'Your assignment history will build up as the control room dispatches you.')}
        </div>
      </div>
    `;

    container.querySelector('[data-act="refresh"]')?.addEventListener('click', () => {
      this.dashboard(container);
      UI.toast('Refreshed', 'Assignment list updated.', 'info', 2000);
    });
    this.bindActiveActions(container, team);
  },

  /* New assignment card with accept / reject */
  assignmentCard(inc) {
    return `
      <div class="incident-card left-${inc.priority.toLowerCase()}">
        <div class="type-icon ${UI.typeBadgeCls(inc.type)}">${UI.typeIcon(inc.type)}</div>
        <div class="inc-main">
          <div class="inc-title"><span class="inc-id">${esc(inc.id)}</span><span>${esc(inc.type)}</span></div>
          <div class="inc-meta">
            <span>📍 ${esc(inc.locationName)}</span>
            <span>🕒 ${timeAgo(inc.createdAt)}</span>
            <span>📞 ${esc(inc.contact)}</span>
          </div>
          <p class="muted mt-1" style="max-width:560px;">${esc(inc.description)}</p>
        </div>
        <div class="inc-badges">
          ${UI.priorityBadge(inc.priority)}
          ${UI.statusBadge(inc.status)}
          <div class="actions-bar" style="margin-top:6px;">
            <button class="btn btn-success btn-sm" data-act="accept" data-id="${esc(inc.id)}">✔ ACCEPT</button>
            <button class="btn btn-outline btn-sm" data-act="reject-assignment" data-id="${esc(inc.id)}">✖ REJECT</button>
          </div>
        </div>
      </div>
    `;
  },

  /* Active assignment card with the status-flow buttons */
  activeCard(inc, team) {
    const st = inc.status;
    const actions = {
      'ACCEPTED':   `<button class="btn btn-primary" data-act="status" data-id="${esc(inc.id)}" data-next="DISPATCHED">🚀 START RESPONSE</button>`,
      'DISPATCHED': `<button class="btn btn-primary" data-act="status" data-id="${esc(inc.id)}" data-next="ON THE WAY">🛣️ START TRAVEL</button>`,
      'ON THE WAY': `<button class="btn btn-warning" data-act="status" data-id="${esc(inc.id)}" data-next="ARRIVED">📍 ARRIVED</button>`,
      'ARRIVED':    `<button class="btn btn-warning" data-act="status" data-id="${esc(inc.id)}" data-next="HANDLING">🔧 START HANDLING</button>`,
      'HANDLING':   `<button class="btn btn-success" data-act="resolve" data-id="${esc(inc.id)}">✔ RESOLVE INCIDENT</button>`
    }[st] || '';

    return `
      <div class="incident-card left-${inc.priority.toLowerCase()}">
        <div class="type-icon ${UI.typeBadgeCls(inc.type)}">${UI.typeIcon(inc.type)}</div>
        <div class="inc-main">
          <div class="inc-title"><span class="inc-id">${esc(inc.id)}</span><span>${esc(inc.type)}</span></div>
          <div class="inc-meta">
            <span>📍 ${esc(inc.locationName)}</span>
            <span>🕒 ${timeAgo(inc.createdAt)}</span>
            <span>📞 ${esc(inc.contact)}</span>
          </div>
          <div class="mt-1">${UI.stepper(st)}</div>
        </div>
        <div class="inc-badges">
          ${UI.priorityBadge(inc.priority)}
          ${UI.statusBadge(st)}
          <div class="actions-bar" style="margin-top:6px;">
            ${actions}
            <button class="btn btn-ghost btn-sm" data-incident="${esc(inc.id)}" data-role="open-incident">Details</button>
          </div>
        </div>
      </div>
    `;
  },

  /* Wire accept / reject / status / resolve actions */
  bindActiveActions(container, team) {
    container.querySelectorAll('[data-act="accept"]').forEach(btn =>
      btn.addEventListener('click', () => {
        const res = Incidents.acceptAssignment(btn.dataset.id, team.name);
        if (res.ok) {
          UI.toast('Assignment Accepted', `${btn.dataset.id} accepted by ${team.name}.`, 'success');
          this.dashboard(container);
        } else UI.toast('Action Failed', res.error, 'error');
      }));

    container.querySelectorAll('[data-act="reject-assignment"]').forEach(btn =>
      btn.addEventListener('click', async () => {
        const ok = await UI.confirm({
          title: 'Reject Assignment',
          message: `Reject the assignment for ${btn.dataset.id}? The control room will need to assign another team.`,
          confirmText: '✖ Reject Assignment', danger: true, icon: '✖'
        });
        if (!ok) return;
        /* Phase 1: rejection returns the incident to the control room queue (VERIFIED) */
        const res = Incidents.returnToQueue(btn.dataset.id, team.name);
        if (res.ok) {
          UI.toast('Assignment Rejected', `${btn.dataset.id} returned to the control room queue.`, 'warning');
          this.dashboard(container);
        } else UI.toast('Action Failed', res.error, 'error');
      }));

    container.querySelectorAll('[data-act="status"]').forEach(btn =>
      btn.addEventListener('click', () => {
        const next = btn.dataset.next;
        const messages = {
          'DISPATCHED': ['Response Started', `${team.name} is now dispatched.`],
          'ON THE WAY': ['On The Way', `${team.name} is travelling to the scene.`],
          'ARRIVED': ['Arrived On Scene', `${team.name} has arrived at the emergency location.`],
          'HANDLING': ['Handling Emergency', `${team.name} is handling the emergency.`]
        };
        const res = Incidents.updateStatus(btn.dataset.id, next,
          `${next.charAt(0) + next.slice(1).toLowerCase()} — ${team.name}`,
          { 'DISPATCHED': '🚀', 'ON THE WAY': '🛣️', 'ARRIVED': '📍', 'HANDLING': '🔧' }[next]);
        if (res.ok) {
          UI.toast(messages[next][0], messages[next][1], 'success');
          this.dashboard(container);
        } else UI.toast('Action Failed', res.error, 'error');
      }));

    container.querySelectorAll('[data-act="resolve"]').forEach(btn =>
      btn.addEventListener('click', () => this.resolveModal(container, btn.dataset.id, team)));
  },

  /* ============ RESOLUTION FORM (HANDLING → RESOLVED) ============ */
  resolveModal(container, id, team) {
    const inc = Incidents.getById(id);
    if (!inc) { UI.toast('Not Found', 'Incident not found.', 'error'); return; }

    const modal = UI.modal({
      title: `Resolve ${inc.id}`,
      icon: '✔️',
      bodyHTML: `
        <p class="muted mb-2">${UI.typeIcon(inc.type)} ${esc(inc.type)} at ${esc(inc.locationName)} — describe how the emergency was handled.</p>
        <div class="form-group">
          <label>Resolution Notes <span class="req">*</span></label>
          <textarea class="field" id="resNotes" rows="4"
            placeholder="e.g. Patient stabilized and transferred to Central Hospital. Fire extinguished, area secured."></textarea>
          <div class="field-error" id="err-resNotes">Resolution notes are required (at least 10 characters).</div>
        </div>
        <div class="form-group">
          <label>Completion Attachment (optional)</label>
          <div class="file-upload" id="resFileBox">
            📷 Attach a completion photo (max 2 MB)
            <input type="file" id="resFile" accept="image/*" style="display:none;">
          </div>
          <div class="attach-preview" id="resPreview"></div>
        </div>
        <div class="alert warning mt-2">
          ⚠️ Confirm the emergency is fully handled. Resolving will mark the incident complete
          and free ${esc(team.name)} for new assignments.
        </div>
      `,
      footHTML: `
        <button class="btn btn-outline" data-act="cancel">Cancel</button>
        <button class="btn btn-success" data-act="confirm-resolve">✔ Confirm Resolution</button>
      `
    });

    /* Completion confirmation checkbox behaviour is embedded in the confirm button */
    let attachData = null;
    const fileBox = modal.overlay.querySelector('#resFileBox');
    const fileInput = modal.overlay.querySelector('#resFile');
    const preview = modal.overlay.querySelector('#resPreview');
    fileBox.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) { UI.toast('Invalid File', 'Please attach an image file.', 'error'); fileInput.value = ''; return; }
      if (file.size > 2 * 1024 * 1024) { UI.toast('File Too Large', 'Please attach an image smaller than 2 MB.', 'error'); fileInput.value = ''; return; }
      const reader = new FileReader();
      reader.onload = () => {
        attachData = reader.result;
        preview.innerHTML = `<div class="ap-item"><img src="${attachData}" alt="Attachment"></div>`;
      };
      reader.readAsDataURL(file);
    });

    modal.overlay.querySelector('[data-act="cancel"]').addEventListener('click', modal.close);
    modal.overlay.querySelector('[data-act="confirm-resolve"]').addEventListener('click', () => {
      const notes = modal.overlay.querySelector('#resNotes').value.trim();
      const err = modal.overlay.querySelector('#err-resNotes');
      if (notes.length < 10) {
        err.classList.add('show');
        UI.toast('Notes Required', 'Please describe how the emergency was resolved.', 'error');
        return;
      }
      const res = Incidents.resolve(id, notes, team.name, attachData);
      if (res.ok) {
        modal.close();
        UI.toast('Incident Resolved', `${id} marked as resolved. The citizen can see the update immediately.`, 'success');
        this.dashboard(container);
      } else UI.toast('Action Failed', res.error, 'error');
    });
  },

  /* ============ TEAM INCIDENT DETAIL ============ */
  incidentDetail(container, id) {
    const inc = Incidents.getById(id);
    if (!inc) {
      UI.toast('Not Found', 'That incident does not exist.', 'error');
      App.navTo('team-dashboard');
      return;
    }
    const s = Auth.getSession();
    if (inc.assignedTeam !== s.teamId) {
      UI.toast('Access Denied', 'This incident is not assigned to your team.', 'error');
      App.navTo('team-dashboard');
      return;
    }
    const team = Teams.getById(s.teamId);
    const st = inc.status;
    const snap = (typeof Simulation !== 'undefined' && Simulation.get) ? Simulation.snapshot(inc.id) : null;
    const showTracking = ['DISPATCHED', 'ON THE WAY', 'ARRIVED', 'HANDLING'].includes(st);

    container.innerHTML = `
      <div class="page-head">
        <div>
          <h2>${UI.typeIcon(inc.type)} ${esc(inc.id)}</h2>
          <p>${esc(inc.type)} · ${esc(inc.locationName)} · Reported ${timeAgo(inc.createdAt)}</p>
        </div>
        <button class="btn btn-outline" data-act="back">← Team Dashboard</button>
      </div>

      ${UI.stepper(st)}

      ${showTracking && snap ? `
      <div class="live-tracking-bar">
        <span class="live-indicator"><span class="live-dot"></span> LIVE RESPONSE</span>
        <span class="live-stat">Distance: <strong id="tmDistance">${snap.phase === 'arrived' ? '0 m' : fmtDist(snap.distanceKm)}</strong></span>
        <span class="live-stat">Simulated ETA: <strong id="tmEta">${snap.phase === 'arrived' ? 'Arrived' : fmtEta(snap.etaMin)}</strong></span>
        <div class="live-stat" style="flex:1; min-width:160px;"><div class="prog-track"><div class="prog-fill" id="tmBar" style="width:${snap.progress}%; background:var(--success);"></div></div></div>
        <span class="hint-text">Simulated ETA — not a real traffic estimate.</span>
      </div>` : ''}

      <div class="detail-grid">
        <div>
          <div class="card">
            <div class="card-head">
              <h3>ℹ️ Incident Information</h3>
              <div class="inc-badges">${UI.priorityBadge(inc.priority)} ${UI.statusBadge(st)}</div>
            </div>
            <div class="card-body">
              <div class="detail-row"><div class="k">Reporter</div><div class="v">${esc(inc.reporter)}</div></div>
              <div class="detail-row"><div class="k">Type</div><div class="v">${UI.typeIcon(inc.type)} ${esc(inc.type)}</div></div>
              <div class="detail-row"><div class="k">Description</div><div class="v">${esc(inc.description)}</div></div>
              <div class="detail-row"><div class="k">Contact</div><div class="v mono">${esc(inc.contact)}</div></div>
              <div class="detail-row"><div class="k">Location</div><div class="v">${esc(inc.locationName)}</div></div>
              <div class="detail-row"><div class="k">Reported At</div><div class="v">${esc(fmtDateTime(inc.createdAt))}</div></div>
              ${inc.attachments?.length ? `
                <div class="detail-row"><div class="k">Attachments</div><div class="v">${UI.attachments(inc)}</div></div>` : ''}
            </div>
          </div>

          ${st === 'RESOLVED' ? `
          <div class="card mt-2" style="border-left:4px solid var(--success);">
            <div class="card-head"><h3>✅ Resolution</h3></div>
            <div class="card-body">
              <p>${esc(inc.resolutionNotes || '—')}</p>
              <p class="muted mt-1">Resolved at ${esc(fmtDateTime(inc.resolvedAt))}</p>
            </div>
          </div>` : ''}

          ${showTracking && snap ? `
          <div class="card mt-2">
            <div class="card-head"><h3>🎮 Response Simulation</h3><span class="muted">Demo simulation</span></div>
            <div class="card-body">
              ${UI.etaWidget({ distanceKm: snap.distanceKm, etaMin: snap.etaMin, progress: snap.progress, arrived: snap.phase === 'arrived' })}
              <div class="actions-bar mt-2">
                <button class="btn btn-ghost btn-sm" id="tmPause" ${snap.phase==='arrived'?'disabled':''}>⏸ Pause</button>
                <button class="btn btn-ghost btn-sm" id="tmResume" ${snap.running?'disabled':''}>▶ Resume</button>
                <button class="btn btn-ghost btn-sm" id="tmReset">↺ Reset</button>
              </div>
              <p class="hint-text mt-1">Vehicle movement is a local demo simulation — not real GPS tracking.</p>
            </div>
          </div>` : ''}
        </div>

        <div>
          <div class="card">
            <div class="card-head"><h3>📍 ${showTracking ? 'Live Tracking Map' : 'Location'}</h3></div>
            <div class="card-body"><div id="teamMap"></div></div>
          </div>
          <div class="card mt-2">
            <div class="card-head"><h3>🕐 Timeline</h3></div>
            <div class="card-body">${UI.timeline(inc)}</div>
          </div>
        </div>
      </div>
    `;

    container.querySelector('[data-act="back"]').addEventListener('click', () => App.navTo('team-dashboard'));

    let mapApi = null;
    if (showTracking && snap) {
      mapApi = ERSMap.showTrackingMap('teamMap', {
        incident: inc,
        vehicle: { lat: snap.vehicleLat, lng: snap.vehicleLng, icon: snap.icon, label: snap.teamName },
        services: true, legend: true, locate: true
      });
      const refresh = () => {
        const s2 = Simulation.snapshot(inc.id);
        if (!s2) return;
        const dEl = container.querySelector('#tmDistance');
        const eEl = container.querySelector('#tmEta');
        if (dEl) dEl.textContent = s2.phase === 'arrived' ? '0 m' : fmtDist(s2.distanceKm);
        if (eEl) eEl.textContent = s2.phase === 'arrived' ? 'Arrived' : fmtEta(s2.etaMin);
        const bar = container.querySelector('#tmBar');
        if (bar) bar.style.width = (s2.progress || 0) + '%';
        if (mapApi && mapApi.moveVehicle) mapApi.moveVehicle(s2.vehicleLat, s2.vehicleLng, s2.icon);
      };
      App.interval(refresh, 1500);
      const pBtn = container.querySelector('#tmPause');
      const rBtn = container.querySelector('#tmResume');
      const resetBtn = container.querySelector('#tmReset');
      if (pBtn) pBtn.addEventListener('click', () => { Simulation.pause(inc.id); this.incidentDetail(container, id); });
      if (rBtn) rBtn.addEventListener('click', () => { Simulation.resume(inc.id); this.incidentDetail(container, id); });
      if (resetBtn) resetBtn.addEventListener('click', () => { Simulation.reset(inc.id); this.incidentDetail(container, id); });
    } else {
      ERSMap.showIncidentMap('teamMap', inc);
    }
  }
};




