/* ============================================================
   admin.js — Administrator system panel
   ============================================================ */

const AdminView = {
  dashboard(container) {
    const users = getUsers();
    const teams = getTeams();
    const all = Incidents.getAll();
    const settings = getSettings();
    const A = (typeof Analytics !== 'undefined') ? Analytics.compute() : null;

    const stats = A ? {
      users: users.length, teams: teams.length,
      incidents: A.total, active: A.active, resolved: A.resolved,
      critical: A.critical, high: A.high,
      available: A.teamsAvailable, busy: A.teamsBusy,
      avgResponseMin: A.avgResponseMin, avgResolutionMin: A.avgResolutionMin
    } : {
      users: users.length, teams: teams.length,
      incidents: all.length, active: Incidents.active(all).length,
      resolved: Incidents.resolved(all).length,
      critical: 0, high: 0,
      available: Teams.available().length, busy: 0,
      avgResponseMin: null, avgResolutionMin: null
    };

    container.innerHTML = `
      <div class="page-head">
        <div>
          <h2>⚙️ System Administration</h2>
          <p>${esc(settings.appName)} — ${esc(settings.version)} · Demo data initialized ${esc(fmtDate(settings.initAt))}</p>
        </div>
        <div class="actions-bar">
          ${UI.sysChips({ updatedAt: all[0]?.updatedAt || null })}
          <button class="btn btn-outline" data-act="demo">▶ Run Demo</button>
          <button class="btn btn-ghost" data-act="refresh">🔄 Refresh</button>
          <button class="btn btn-danger" data-act="reset">⚠️ RESET DEMO DATA</button>
        </div>
      </div>

      <div class="grid grid-4">
        <div class="stat-card"><div class="stat-icon ic-blue">👥</div><div><div class="stat-value">${stats.users}</div><div class="stat-label">Total Users</div></div></div>
        <div class="stat-card"><div class="stat-icon ic-cyan">🚑</div><div><div class="stat-value">${stats.teams}</div><div class="stat-label">Response Teams</div></div></div>
        <div class="stat-card"><div class="stat-icon ic-red">📋</div><div><div class="stat-value">${stats.incidents}</div><div class="stat-label">Total Incidents</div></div></div>
        <div class="stat-card"><div class="stat-icon ic-green">✅</div><div><div class="stat-value">${stats.resolved}</div><div class="stat-label">Resolved</div></div></div>
      </div>
      ${A ? `<div class="grid grid-3 mt-2">
        <div class="stat-card"><div class="stat-icon ic-red">🚨</div><div><div class="stat-value">${stats.critical + stats.high}</div><div class="stat-label">Critical / High Priority</div></div></div>
        <div class="stat-card"><div class="stat-icon ic-amber">🚑</div><div><div class="stat-value">${stats.available}/${stats.teams}</div><div class="stat-label">Teams Available</div></div></div>
        <div class="stat-card"><div class="stat-icon ic-blue">⏱</div><div><div class="stat-value">${stats.avgResolutionMin != null ? (stats.avgResolutionMin < 60 ? Math.round(stats.avgResolutionMin) + ' min' : Math.floor(stats.avgResolutionMin / 60) + ' h ' + Math.round(stats.avgResolutionMin % 60) + ' min') : '—'}</div><div class="stat-label">Avg Time to Resolve*</div></div></div>
      </div>
      <div class="card mt-2"><div class="card-head"><h3>📈 Incident Status Distribution</h3><span class="muted">Demo statistics</span></div><div class="card-body">${Analytics.statusStrip(A)}</div></div>` : ''}

      <div class="card">
        <div class="card-head"><h3>👥 Demo Users</h3><span class="muted">Passwords are demo-only (never shown)</span></div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Phone</th><th>Registered</th></tr></thead>
            <tbody>
              ${users.map(u => `
                <tr>
                  <td class="id-cell">${esc(u.id)}</td>
                  <td><strong>${esc(u.name)}</strong></td>
                  <td class="mono" style="font-size:12.5px;">${esc(u.email)}</td>
                  <td><span class="badge ${u.role === 'admin' ? 'pr-critical' : u.role === 'operator' ? 'pr-high' : u.role === 'team' ? 'pr-medium' : 'pr-low'}">${esc(u.role.toUpperCase())}</span></td>
                  <td class="mono" style="font-size:12.5px;">${esc(u.phone || '—')}</td>
                  <td class="time-cell">${esc(fmtDate(u.registeredAt))}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    this.adminRest(container, { teams, all, settings, stats });
  },

  adminRest(container, ctx) {
    const { teams, all, settings } = ctx;

    container.insertAdjacentHTML('beforeend', `
      <div class="card">
        <div class="card-head"><h3>🚑 Response Teams</h3><span class="muted">Click a status to change it</span></div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Team</th><th>Department</th><th>Base</th><th>Members</th><th>Status</th><th>Control</th><th>Current Assignment</th></tr></thead>
            <tbody>
              ${teams.map(t => {
                const inc = t.currentIncident ? Incidents.getById(t.currentIncident) : null;
                return `
                <tr>
                  <td><strong>${t.icon} ${esc(t.name)}</strong></td>
                  <td>${esc(t.department)}</td>
                  <td>${esc(t.base || '—')}</td>
                  <td>${t.members}</td>
                  <td>${UI.teamStatusBadge(t.status)}</td>
                  <td><select class="field" data-team-status="${esc(t.id)}" style="padding:5px 8px;font-size:13px;min-width:110px;">
                    <option value="Available" ${t.status==='Available'?'selected':''}>Available</option>
                    <option value="Busy" ${t.status==='Busy'?'selected':''}>Busy</option>
                    <option value="Offline" ${t.status==='Offline'?'selected':''}>Offline</option>
                  </select></td>
                  <td>${inc ? `<span class="id-cell">${esc(inc.id)}</span> <span class="muted">(${esc(inc.status)})</span>` : '<span class="muted">None</span>'}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h3>📋 All Incidents</h3><span class="muted">${all.length} total</span></div>
        <div class="table-wrap">
          ${all.length ? `
          <table class="table">
            <thead><tr><th>Incident</th><th>Type</th><th>Reporter</th><th>Priority</th><th>Status</th><th>Team</th><th>Created</th></tr></thead>
            <tbody>
              ${all.map(i => `
                <tr data-incident="${esc(i.id)}" data-role="open-incident" class="clickable">
                  <td class="id-cell">${esc(i.id)}</td>
                  <td>${UI.typeIcon(i.type)} ${esc(i.type)}</td>
                  <td>${esc(i.reporter.split(' (')[0])}</td>
                  <td>${UI.priorityBadge(i.priority)}</td>
                  <td>${UI.statusBadge(i.status)}</td>
                  <td>${i.assignedTeam ? esc(Teams.getTeamName(i.assignedTeam)) : '<span class="muted">—</span>'}</td>
                  <td class="time-cell" title="${esc(fmtDateTime(i.createdAt))}">${timeAgo(i.createdAt)}</td>
                </tr>`).join('')}
            </tbody>
          </table>` : UI.emptyState('📭', 'No incidents in the system', 'Incidents reported by citizens will appear here.')}
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h3>ℹ️ System Information</h3></div>
        <div class="card-body">
          <div class="detail-row"><div class="k">Application</div><div class="v">${esc(settings.appName)}</div></div>
          <div class="detail-row"><div class="k">Phase</div><div class="v">${esc(settings.version)}</div></div>
          <div class="detail-row"><div class="k">City</div><div class="v">${esc(settings.city)}</div></div>
          <div class="detail-row"><div class="k">Data Storage</div><div class="v">LocalStorage (no database — demo only)</div></div>
          <div class="detail-row"><div class="k">Initialized</div><div class="v">${esc(fmtDateTime(settings.initAt))}</div></div>
          <div class="detail-row"><div class="k">Last Reset</div><div class="v">${settings.lastResetAt ? esc(fmtDateTime(settings.lastResetAt)) : 'Never'}</div></div>
          <div class="alert info mt-2">
            ℹ️ This is a <strong>demonstration system</strong> — not a production emergency dispatch platform.
            All data is stored locally in your browser and can be reset at any time.
          </div>
        </div>
      </div>
    `);

    container.querySelector('[data-act="refresh"]').addEventListener('click', () => {
      this.dashboard(container);
      UI.toast('Refreshed', 'System data reloaded.', 'info', 2000);
    });

    container.querySelector('[data-act="demo"]').addEventListener('click', () => {
      App.navTo('demo');
    });

    container.querySelectorAll('[data-team-status]').forEach(sel => {
      sel.addEventListener('change', () => {
        const res = Teams.setStatus(sel.dataset.teamStatus, sel.value);
        if (res.ok) {
          UI.toast('Team Status Updated', `${res.team.name} is now ${sel.value}.`, 'success', 2200);
          this.dashboard(container);
        } else {
          UI.toast('Update Failed', res.error, 'error');
        }
      });
    });

    container.querySelector('[data-act="reset"]').addEventListener('click', async () => {
      const ok = await UI.confirm({
        title: 'Reset Demo Data',
        message: 'This will restore all demo users, teams and incidents to their original state and sign you out. This action cannot be undone.',
        confirmText: '⚠️ Reset Everything', danger: true, icon: '⚠️'
      });
      if (!ok) return;
      const done = resetDemoData();
      if (done) {
        UI.toast('Demo Data Reset', 'All data restored to the initial demo state.', 'success');
        document.getElementById('topbar').dataset.rendered = '';
        App.currentRoute = 'login';
        App.render();
      } else {
        UI.toast('Reset Failed', 'Could not reset demo data. Check the console for details.', 'error');
      }
    });
  },

  /* ============ ADMIN INCIDENT DETAIL (read-only) ============ */
  incidentDetail(container, id) {
    const inc = Incidents.getById(id);
    if (!inc) {
      UI.toast('Not Found', 'That incident does not exist.', 'error');
      App.navTo('admin-dashboard');
      return;
    }
    const team = inc.assignedTeam ? Teams.getById(inc.assignedTeam) : null;

    container.innerHTML = `
      <div class="page-head">
        <div>
          <h2>${UI.typeIcon(inc.type)} ${esc(inc.id)}</h2>
          <p>${esc(inc.type)} · ${esc(inc.locationName)} · Reported ${timeAgo(inc.createdAt)}</p>
        </div>
        <button class="btn btn-outline" data-act="back">← System Panel</button>
      </div>

      ${UI.stepper(inc.status)}

      <div class="detail-grid">
        <div>
          <div class="card">
            <div class="card-head">
              <h3>ℹ️ Incident Information</h3>
              <div class="inc-badges">${UI.priorityBadge(inc.priority)} ${UI.statusBadge(inc.status)}</div>
            </div>
            <div class="card-body">
              <div class="detail-row"><div class="k">Incident ID</div><div class="v mono">${esc(inc.id)}</div></div>
              <div class="detail-row"><div class="k">Reporter</div><div class="v">${esc(inc.reporter)}</div></div>
              <div class="detail-row"><div class="k">Emergency Type</div><div class="v">${UI.typeIcon(inc.type)} ${esc(inc.type)}</div></div>
              <div class="detail-row"><div class="k">Description</div><div class="v">${esc(inc.description)}</div></div>
              <div class="detail-row"><div class="k">Contact</div><div class="v mono">${esc(inc.contact)}</div></div>
              <div class="detail-row"><div class="k">Location</div><div class="v">${esc(inc.locationName)}</div></div>
              <div class="detail-row"><div class="k">Coordinates</div><div class="v mono">${inc.latitude != null ? inc.latitude.toFixed(5) + ', ' + inc.longitude.toFixed(5) : '—'}</div></div>
              <div class="detail-row"><div class="k">Source</div><div class="v">${esc(inc.source || 'Citizen Report')}</div></div>
              <div class="detail-row"><div class="k">Assigned Team</div><div class="v">${team ? esc(team.icon + ' ' + team.name) : '<span class="muted">Not assigned</span>'}</div></div>
              <div class="detail-row"><div class="k">Created</div><div class="v">${esc(fmtDateTime(inc.createdAt))}</div></div>
              <div class="detail-row"><div class="k">Updated</div><div class="v">${esc(fmtDateTime(inc.updatedAt))}</div></div>
              ${inc.attachments?.length ? `
                <div class="detail-row"><div class="k">Attachments</div><div class="v">${UI.attachments(inc)}</div></div>` : ''}
              ${inc.status === 'RESOLVED' ? `
                <div class="detail-row"><div class="k">Resolution</div><div class="v">${esc(inc.resolutionNotes || '—')}<br><span class="muted">${esc(fmtDateTime(inc.resolvedAt || ''))}</span></div></div>` : ''}
              <div class="alert info mt-2">🔒 Read-only view — management actions are performed by Emergency Operators.</div>
            </div>
          </div>
        </div>

        <div>
          <div class="card">
            <div class="card-head"><h3>📍 Location</h3></div>
            <div class="card-body"><div id="adminMap"></div></div>
          </div>
          <div class="card mt-2">
            <div class="card-head"><h3>🕐 Timeline</h3></div>
            <div class="card-body">${UI.timeline(inc)}</div>
          </div>
        </div>
      </div>
    `;

    container.querySelector('[data-act="back"]').addEventListener('click', () => App.navTo('admin-dashboard'));
    ERSMap.showIncidentMap('adminMap', inc);
  }
};


