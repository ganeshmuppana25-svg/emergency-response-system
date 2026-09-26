/* ============================================================
   operator.js — Emergency Control Room (operator dashboard)
   ============================================================ */

const OperatorView = {
  filters: { search: '', status: 'ALL', type: 'ALL', priority: 'ALL' },

  /* ============ CONTROL ROOM DASHBOARD ============ */
  dashboard(container) {
    const all = Incidents.getAll();
    const A = (typeof Analytics !== 'undefined') ? Analytics.compute() : null;
    const stats = A ? {
      total: A.total, new: A.new, active: A.active, resolved: A.resolved,
      critical: A.critical, high: A.high,
      teamsAvailable: A.teamsAvailable, teamsTotal: A.teamsTotal,
      avgResponseMin: A.avgResponseMin, avgResolutionMin: A.avgResolutionMin
    } : {
      total: all.length, new: Incidents.reported(all).length,
      active: Incidents.active(all).length, resolved: Incidents.resolved(all).length,
      critical: 0, high: 0,
      teamsAvailable: Teams.available().length, teamsTotal: getTeams().length,
      avgResponseMin: null, avgResolutionMin: null
    };
    const f = this.filters;
    const list = Incidents.filter(f);
    const isNew = (s) => s === 'REPORTED';

    container.innerHTML = `
      <div class="page-head">
        <div>
          <h2>🖥️ Emergency Control Room</h2>
          <p>Live incident monitoring & dispatch coordination · ${esc(getSettings().city)}</p>
        </div>
        <div class="actions-bar">
          ${UI.sysChips({ updatedAt: all[0]?.updatedAt || null })}
          <button class="btn btn-outline" data-route="operator-teams">🚑 Response Teams</button>
          <button class="btn btn-ghost" data-act="refresh">🔄 Refresh</button>
        </div>
      </div>

      <div class="grid grid-4">
        <div class="stat-card"><div class="stat-icon ic-blue">📊</div><div><div class="stat-value">${stats.total}</div><div class="stat-label">Total Incidents</div></div></div>
        <div class="stat-card ${stats.new ? 'pulse-red' : ''}"><div class="stat-icon ic-red">🆕</div><div><div class="stat-value">${stats.new}</div><div class="stat-label">New (Unverified)</div></div></div>
        <div class="stat-card"><div class="stat-icon ic-orange">🔥</div><div><div class="stat-value">${stats.active}</div><div class="stat-label">Active Incidents</div></div></div>
        <div class="stat-card"><div class="stat-icon ic-green">✅</div><div><div class="stat-value">${stats.resolved}</div><div class="stat-label">Resolved</div></div></div>
      </div>

      <div class="grid grid-2">
        <div class="team-mini-card">
          <div>
            <div class="stat-value" style="font-size:22px;">${stats.teamsAvailable}/${stats.teamsTotal}</div>
            <div class="stat-label">Response Teams Available</div>
          </div>
          <div class="team-dots">
            ${getTeams().map(t => `<span class="dot-badge ${t.status === 'Available' ? 'on' : 'off'}" title="${esc(t.name)} — ${esc(t.status)}">${t.icon}</span>`).join('')}
          </div>
        </div>
        <div class="team-mini-card">
          <div>
            <div class="stat-value" style="font-size:22px;">${Incidents.filter({ status: 'VERIFIED' }).length}</div>
            <div class="stat-label">Verified — Awaiting Team Assignment</div>
          </div>
          <span class="badge pr-high">ACTION NEEDED</span>
        </div>
      </div>
      ${A ? `
      <div class="card">
        <div class="card-head"><h3>📈 Incident Analytics</h3><span class="muted">Computed from LocalStorage demo data</span></div>
        <div class="card-body">
          ${Analytics.statusStrip(A)}
          ${Analytics.timeChips(A)}
          <div class="grid grid-2 mt-2">
            <div><h4 style="font-size:13px;color:var(--text-2);margin-bottom:8px;">By Emergency Type</h4>${Analytics.hbarChart(A.byType)}</div>
            <div><h4 style="font-size:13px;color:var(--text-2);margin-bottom:8px;">By Priority</h4>${Analytics.hbarChart(A.byPriority)}</div>
          </div>
          <h4 style="font-size:13px;color:var(--text-2);margin:14px 0 8px;">Incidents Over Last 14 Days</h4>
          ${Analytics.trendChart(A.trend)}
          <h4 style="font-size:13px;color:var(--text-2);margin:14px 0 8px;">Team Workload</h4>
          ${Analytics.hbarChart(A.teamWorkload)}
        </div>
      </div>` : ''}
    `;
    this.dashboardQueue(container, list, isNew);
  },

  /* Incident queue table + filters (part 2 of dashboard) */
  dashboardQueue(container, list, isNew) {
    const f = this.filters;
    container.insertAdjacentHTML('beforeend', `
      <div class="card">
        <div class="card-head"><h3>📋 Incident Queue</h3><span class="muted">${list.length} shown</span></div>
        <div class="card-body">
          <div class="filter-bar">
            <div class="flt-group grow">
              <label>Search</label>
              <input class="field" id="fltSearch" placeholder="🔍 Search ID, type, location…" value="${esc(f.search)}">
            </div>
            <div class="flt-group">
              <label>Status</label>
              <select class="field" id="fltStatus">
                <option value="ALL">All Statuses</option>
                ${Object.values(INCIDENT_STATUSES).map(s => `<option ${f.status === s ? 'selected' : ''}>${s}</option>`).join('')}
              </select>
            </div>
            <div class="flt-group">
              <label>Type</label>
              <select class="field" id="fltType">
                <option value="ALL">All Types</option>
                ${EMERGENCY_TYPES.map(t => `<option ${f.type === t ? 'selected' : ''}>${t}</option>`).join('')}
              </select>
            </div>
            <div class="flt-group">
              <label>Priority</label>
              <select class="field" id="fltPriority">
                <option value="ALL">All Priorities</option>
                ${PRIORITIES.map(p => `<option ${f.priority === p ? 'selected' : ''}>${p}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="table-wrap">
            ${list.length ? `
            <table class="table">
              <thead>
                <tr>
                  <th>Incident</th><th>Type</th><th>Location</th>
                  <th>Priority</th><th>Status</th><th>Reported</th><th>Team</th>
                </tr>
              </thead>
              <tbody>
                ${list.map(i => `
                  <tr data-incident="${esc(i.id)}" data-role="open-incident" class="clickable ${isNew(i.status) ? 'row-new' : ''}">
                    <td><span class="mono inc-id">${esc(i.id)}</span>${isNew(i.status) ? ' <span class="badge pr-critical">NEW</span>' : ''}</td>
                    <td>${UI.typeIcon(i.type)} ${esc(i.type)}</td>
                    <td class="loc-cell">${esc(i.locationName)}</td>
                    <td>${UI.priorityBadge(i.priority)}</td>
                    <td>${UI.statusBadge(i.status)}</td>
                    <td title="${esc(fmtDateTime(i.createdAt))}">${timeAgo(i.createdAt)}</td>
                    <td>${i.assignedTeam ? esc(Teams.getTeamName(i.assignedTeam)) : '<span class="muted">—</span>'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>` : UI.emptyState('🔍', 'No incidents match your filters', 'Try clearing the search or selecting different filter values.')}
          </div>
        </div>
      </div>
    `);

    const apply = () => {
      this.filters = {
        search: document.getElementById('fltSearch').value,
        status: document.getElementById('fltStatus').value,
        type: document.getElementById('fltType').value,
        priority: document.getElementById('fltPriority').value
      };
      this.dashboard(container);
    };
    ['fltStatus', 'fltType', 'fltPriority'].forEach(id =>
      document.getElementById(id).addEventListener('change', apply));
    let deb;
    document.getElementById('fltSearch').addEventListener('input', () => {
      clearTimeout(deb);
      deb = setTimeout(apply, 300);
    });

    container.querySelector('[data-act="refresh"]').addEventListener('click', () => {
      this.dashboard(container);
      UI.toast('Refreshed', 'Incident list is up to date.', 'info', 2200);
    });
    container.querySelectorAll('[data-route]').forEach(b =>
      b.addEventListener('click', () => App.navTo(b.dataset.route)));
  },

  /* ============ OPERATOR INCIDENT DETAIL ============ */
  incidentDetail(container, id) {
    const inc = Incidents.getById(id);
    if (!inc) {
      UI.toast('Not Found', 'That incident does not exist.', 'error');
      App.navTo('operator-dashboard');
      return;
    }
    const s = Auth.getSession();
    const team = inc.assignedTeam ? Teams.getById(inc.assignedTeam) : null;
    const st = inc.status;

    container.innerHTML = `
      <div class="page-head">
        <div>
          <h2>${UI.typeIcon(inc.type)} ${esc(inc.id)}
            ${st === 'REPORTED' ? '<span class="badge pr-critical">NEEDS VERIFICATION</span>' : ''}
          </h2>
          <p>${esc(inc.type)} · Reported ${esc(fmtDateTime(inc.createdAt))} (${timeAgo(inc.createdAt)})</p>
        </div>
        <button class="btn btn-outline" data-act="back">← Control Room</button>
      </div>

      ${UI.stepper(st)}

      <div class="detail-grid">
        <div>
          <div class="card">
            <div class="card-head">
              <h3>ℹ️ Incident Details</h3>
              <div class="inc-badges">${UI.priorityBadge(inc.priority)} ${UI.statusBadge(st)}</div>
            </div>
            <div class="card-body">
              <div class="detail-row"><div class="k">Reporter</div><div class="v">${esc(inc.reporter)}</div></div>
              <div class="detail-row"><div class="k">Emergency Type</div><div class="v">${UI.typeIcon(inc.type)} ${esc(inc.type)}</div></div>
              <div class="detail-row"><div class="k">Description</div><div class="v">${esc(inc.description)}</div></div>
              <div class="detail-row"><div class="k">Contact</div><div class="v mono">${esc(inc.contact)}</div></div>
              <div class="detail-row"><div class="k">Location</div><div class="v">${esc(inc.locationName)}</div></div>
              <div class="detail-row"><div class="k">Coordinates</div><div class="v mono">${inc.latitude != null ? inc.latitude.toFixed(5) + ', ' + inc.longitude.toFixed(5) : '—'}</div></div>
              <div class="detail-row"><div class="k">Reported At</div><div class="v">${esc(fmtDateTime(inc.createdAt))}</div></div>
              <div class="detail-row"><div class="k">Source</div><div class="v">${esc(inc.source || 'Citizen Report')}</div></div>
              <div class="detail-row"><div class="k">Assigned Team</div><div class="v">${team ? esc(team.icon + ' ' + team.name) : '<span class="muted">Not assigned</span>'}</div></div>
              ${inc.attachments?.length ? `
                <div class="detail-row"><div class="k">Attachments</div><div class="v">${UI.attachments(inc)}</div></div>` : ''}
              ${st === 'REJECTED' ? '<div class="alert danger mt-2">🚫 This incident was rejected as a false / non-actionable report.</div>' : ''}
            </div>
          </div>

          ${this.actionPanel(inc, s)}
        </div>

        <div>
          <div class="card">
            <div class="card-head"><h3>📍 Incident Location</h3></div>
            <div class="card-body"><div id="opMap"></div></div>
          </div>
          <div class="card mt-2">
            <div class="card-head"><h3>🕐 Timeline</h3></div>
            <div class="card-body">${UI.timeline(inc)}</div>
          </div>
        </div>
      </div>
    `;

    container.querySelector('[data-act="back"]').addEventListener('click', () => App.navTo('operator-dashboard'));
    ERSMap.showIncidentMap('opMap', inc);
    this.bindActions(container, inc, s);
  },

  /* Operator action panel by current status */
  actionPanel(inc, s) {
    const st = inc.status;
    const team = inc.assignedTeam ? Teams.getById(inc.assignedTeam) : null;

    if (st === 'REPORTED') {
      return `
        <div class="card mt-2" style="border-left:4px solid var(--warning);">
          <div class="card-head"><h3>🛠️ Operator Actions</h3></div>
          <div class="card-body">
            <p class="muted mb-2">This incident has not been verified yet. Verify it to enable team assignment, or reject it if it is a false report.</p>
            <div class="actions-bar">
              <button class="btn btn-success" data-act="verify">✅ VERIFY INCIDENT</button>
              <button class="btn btn-outline" data-act="reject">🚫 REJECT INCIDENT</button>
            </div>
          </div>
        </div>`;
    }

    if (st === 'VERIFIED') {
      const suggested = Teams.departmentsForType(inc.type);
      const teams = getTeams();
      const suitable = teams.filter(t => suggested.includes(t.department));
      const others = teams.filter(t => !suggested.includes(t.department));
      return `
        <div class="card mt-2" style="border-left:4px solid var(--primary);">
          <div class="card-head"><h3>🚑 Assign Response Team</h3></div>
          <div class="card-body">
            <p class="muted mb-2">Recommended departments for ${esc(inc.type)}: <strong>${suggested.join(', ')}</strong></p>
            <div class="team-select-list" id="teamList">
              ${[...suitable, ...others].map(t => `
                <label class="team-option ${t.status !== 'Available' ? 'disabled' : ''} ${suggested.includes(t.department) ? 'suggested' : ''}">
                  <input type="radio" name="pickTeam" value="${esc(t.id)}" ${t.status !== 'Available' ? 'disabled' : ''}>
                  <span class="to-icon">${t.icon}</span>
                  <span class="to-main">
                    <strong>${esc(t.name)}</strong>
                    <span class="muted">${esc(t.department)} · ${esc(t.base || '')}</span>
                  </span>
                  ${UI.teamStatusBadge(t.status)}
                </label>
              `).join('')}
            </div>
            <div class="actions-bar mt-2">
              <button class="btn btn-primary btn-lg" data-act="assign">🚑 ASSIGN TEAM</button>
            </div>
            <p class="hint-text">Only teams marked <strong>Available</strong> can be selected. Assigning will set the team to <strong>BUSY</strong>.</p>
          </div>
        </div>`;
    }

    if (st === 'REJECTED') {
      return `
        <div class="card mt-2">
          <div class="card-head"><h3>🛠️ Operator Actions</h3></div>
          <div class="card-body"><p class="muted">No further actions available — this incident is closed.</p></div>
        </div>`;
    }

    /* TEAM ASSIGNED / in-progress / RESOLVED */
    return `
      <div class="card mt-2">
        <div class="card-head"><h3>🛠️ Operator Actions</h3></div>
        <div class="card-body">
          ${st === 'RESOLVED' ? `
            <div class="alert success">✅ Incident resolved at ${esc(fmtDateTime(inc.resolvedAt))}</div>
            <div class="detail-section"><div class="detail-row"><div class="k">Resolution Notes</div><div class="v">${esc(inc.resolutionNotes || '—')}</div></div></div>
          ` : `
            <div class="alert info">📡 Response in progress — <strong>${esc(team ? team.name : 'team')}</strong> is handling this incident.
            Current status: ${UI.statusBadge(st)}</div>
            <p class="muted">Status updates are performed by the response team from their dashboard.
            As the operator you can still adjust the priority below.</p>
          `}
          <hr class="divider">
          <label style="font-weight:700; font-size:12.5px;">⚠️ Manual Priority Override (no auto-prediction)</label>
          <div class="priority-picker mt-1">
            ${PRIORITIES.map(p => `
              <button class="pp-btn ${p.toLowerCase()} ${inc.priority === p ? 'active' : ''}" data-act="priority" data-p="${p}">${p}</button>
            `).join('')}
          </div>
          <p class="hint-text mt-1">Changing priority is recorded in the incident timeline.</p>
        </div>
      </div>`;
  },

  /* Wire up verify / reject / assign / priority actions */
  bindActions(container, inc, s) {
    const rerender = () => this.incidentDetail(container, inc.id);

    const vBtn = container.querySelector('[data-act="verify"]');
    if (vBtn) vBtn.addEventListener('click', async () => {
      const ok = await UI.confirm({
        title: 'Verify Incident',
        message: `Confirm that ${inc.id} (${inc.type}) is a genuine emergency? Verified incidents can be assigned to a response team.`,
        confirmText: '✅ Verify Incident', icon: '✅'
      });
      if (!ok) return;
      const res = Incidents.verify(inc.id, s.name);
      if (res.ok) {
        UI.toast('Incident Verified', `${inc.id} is now verified. You can assign a response team.`, 'success');
        rerender();
      } else UI.toast('Action Failed', res.error, 'error');
    });

    const rBtn = container.querySelector('[data-act="reject"]');
    if (rBtn) rBtn.addEventListener('click', async () => {
      const ok = await UI.confirm({
        title: 'Reject Incident',
        message: `Reject ${inc.id} as a false or non-actionable report? The citizen will see it as REJECTED. This cannot be undone.`,
        confirmText: '🚫 Reject Incident', danger: true, icon: '🚫'
      });
      if (!ok) return;
      const res = Incidents.reject(inc.id, s.name);
      if (res.ok) {
        UI.toast('Incident Rejected', `${inc.id} was marked as non-actionable.`, 'warning');
        rerender();
      } else UI.toast('Action Failed', res.error, 'error');
    });

    const aBtn = container.querySelector('[data-act="assign"]');
    if (aBtn) aBtn.addEventListener('click', () => {
      const picked = container.querySelector('input[name="pickTeam"]:checked');
      if (!picked) {
        UI.toast('No Team Selected', 'Please select an available response team first.', 'warning');
        return;
      }
      const team = Teams.getById(picked.value);
      const res = Incidents.assignTeam(inc.id, picked.value, s.name);
      if (res.ok) {
        UI.toast('Response Team Assigned',
          `${team.name} assigned to ${inc.id}. The team has been notified.`, 'success');
        rerender();
      } else UI.toast('Assignment Failed', res.error, 'error');
    });

    container.querySelectorAll('[data-act="priority"]').forEach(btn =>
      btn.addEventListener('click', () => {
        const res = Incidents.setPriority(inc.id, btn.dataset.p, s.name);
        if (res.ok) {
          UI.toast('Priority Updated', `${inc.id} priority set to ${btn.dataset.p}.`, 'success');
          rerender();
        } else UI.toast('Priority Unchanged', res.error, 'info', 3000);
      }));
  },

  /* ============ RESPONSE TEAMS OVERVIEW ============ */
  teams(container) {
    const teams = getTeams();
    container.innerHTML = `
      <div class="page-head">
        <div>
          <h2>🚑 Response Teams</h2>
          <p>Availability of all demo response units. Busy teams are working on an active incident.</p>
        </div>
        <button class="btn btn-outline" data-act="back">← Control Room</button>
      </div>

      <div class="grid grid-3">
        ${teams.map(t => {
          const inc = t.currentIncident ? Incidents.getById(t.currentIncident) : null;
          return `
          <div class="card team-card">
            <div class="team-card-head">
              <div class="type-icon ${UI.typeBadgeCls(t.department)}" style="font-size:24px;">${t.icon}</div>
              <div style="flex:1;">
                <strong style="font-size:15px;">${esc(t.name)}</strong>
                <div class="muted">${esc(t.department)} · ${esc(t.base || '')}</div>
              </div>
              ${UI.teamStatusBadge(t.status)}
            </div>
            <div class="card-body" style="padding-top:10px;">
              <div class="detail-row"><div class="k">Members</div><div class="v">${t.members}</div></div>
              <div class="detail-row"><div class="k">Contact</div><div class="v mono">${esc(t.phone)}</div></div>
              <div class="detail-row"><div class="k">Assignment</div><div class="v">
                ${inc ? `<button class="btn btn-ghost btn-sm" data-incident="${esc(inc.id)}" data-role="open-incident">${esc(inc.id)} →</button>` : '<span class="muted">None</span>'}
              </div></div>
            </div>
          </div>`;
        }).join('')}
      </div>
    `;
    container.querySelector('[data-act="back"]').addEventListener('click', () => App.navTo('operator-dashboard'));
  }
};




