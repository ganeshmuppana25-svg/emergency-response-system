/* ============================================================
   analytics.js — Statistics & charts generated ONLY from the
   LocalStorage dataset (no database, no fabricated numbers).
   All charts are lightweight CSS bars (no external chart lib).
   ============================================================ */

const Analytics = {
  /* Full statistics snapshot for operator/admin dashboards */
  compute() {
    const all = Incidents.getAll();
    const teams = getTeams();
    const active = Incidents.active(all);
    const resolved = Incidents.resolved(all);
    const critical = all.filter(i => i.priority === 'CRITICAL');
    const high = all.filter(i => i.priority === 'HIGH');

    /* Average times where data permits (from real lifecycle timestamps) */
    const avgResolutionMin = this._avgMin(resolved, i => i.resolvedAt && i.createdAt
      ? (new Date(i.resolvedAt) - new Date(i.createdAt)) / 60000 : null);
    const avgResponseMin = this._avgMin(all, i => {
      const a = this._arrivedAt(i);
      return a && i.createdAt ? (a - new Date(i.createdAt)) / 60000 : null;
    });

    return {
      total: all.length,
      active: active.length,
      new: Incidents.reported(all).length,
      resolved: resolved.length,
      rejected: all.filter(i => i.status === INCIDENT_STATUSES.REJECTED).length,
      teamsTotal: teams.length,
      teamsAvailable: Teams.available().length,
      teamsBusy: teams.filter(t => t.status === 'Busy').length,
      critical: critical.length,
      high: high.length,
      avgResponseMin, avgResolutionMin,
      byType: this.countBy(all, 'type'),
      byPriority: this.countBy(all, 'priority'),
      byStatus: this.countBy(all, 'status'),
      trend: this.trend14(all),
      teamWorkload: this.teamWorkload(all, teams)
    };
  },

  /* Earliest "arrived" timestamp from the incident timeline */
  _arrivedAt(inc) {
    if (!inc || !Array.isArray(inc.timeline)) return null;
    const hit = inc.timeline.find(t => t.title && /arriv/i.test(t.title));
    return hit && hit.time ? new Date(hit.time).getTime() : null;
  },

  _avgMin(list, pick) {
    const vals = list
      .map(pick)
      .filter(v => v != null && isFinite(v) && v >= 0);
    if (!vals.length) return null;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return avg >= 1 ? Math.round(avg) : Math.round(avg * 10) / 10;
  },

  countBy(list, key) {
    const map = {};
    list.forEach(i => { map[i[key] || 'Other'] = (map[i[key] || 'Other'] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
  },

  /* Incidents created per day over the last 14 days */
  trend14(list) {
    const out = [];
    const now = new Date();
    for (let d = 13; d >= 0; d--) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d);
      const next = new Date(day.getTime() + 86400000);
      const count = list.filter(i => {
        const t = new Date(i.createdAt).getTime();
        return t >= day.getTime() && t < next.getTime();
      }).length;
      out.push({ label: day.toLocaleDateString([], { day: '2-digit', month: 'short' }), value: count });
    }
    return out;
  },

  teamWorkload(incidents, teams) {
    return teams.map(t => ({
      label: `${t.icon} ${t.name}`,
      value: incidents.filter(i => i.assignedTeam === t.id).length,
      status: t.status
    }));
  },

  /* ---------- Chart renderers (pure HTML, CSS-drawn) ---------- */

  hbarChart(items, { max = null } = {}) {
    if (!items || !items.length) return '<p class="muted">No data yet.</p>';
    const mx = max || Math.max(1, ...items.map(x => x.value));
    const palette = ['#1a56db', '#0891b2', '#d97706', '#16a34a', '#dc2626', '#7c3aed', '#64748b', '#db2777'];
    return `
      <div class="chart-hbars">
        ${items.map((it, i) => `
          <div class="chart-row">
            <span class="chart-label" title="${esc(it.label)}">${esc(it.label)}</span>
            <div class="chart-track"><div class="chart-bar" style="width:${Math.round((it.value / mx) * 100)}%; background:${palette[i % palette.length]};"></div></div>
            <span class="chart-val">${it.value}</span>
          </div>
        `).join('')}
      </div>`;
  },

  trendChart(trend) {
    if (!trend || !trend.length) return '<p class="muted">No data yet.</p>';
    const mx = Math.max(1, ...trend.map(t => t.value));
    return `
      <div class="chart-trend">
        ${trend.map(t => `
          <div class="trend-col">
            <div class="trend-track"><div class="trend-bar" style="height:${Math.max(4, Math.round((t.value / mx) * 100))}%;"></div></div>
            <span class="trend-day">${esc(t.label)}</span>
            <span class="trend-val">${t.value}</span>
          </div>
        `).join('')}
      </div>`;
  },

  /* Segmented status strip (total = active + resolved + rejected + new) */
  statusStrip(stats) {
    const segs = [
      { label: 'Active', value: stats.active, color: '#dc2626' },
      { label: 'Resolved', value: stats.resolved, color: '#16a34a' },
      { label: 'Rejected', value: stats.rejected, color: '#64748b' },
      { label: 'New', value: stats.new, color: '#d97706' }
    ];
    const total = Math.max(1, stats.total);
    return `
      <div class="status-strip">
        ${segs.map(s => `
          <div class="strip-seg" style="width:${Math.round((s.value / total) * 100)}%; background:${s.color};" title="${esc(s.label)}: ${s.value}"></div>
        `).join('')}
      </div>
      <div class="strip-legend">
        ${segs.map(s => `<span><i style="background:${s.color}"></i>${s.label} (${s.value})</span>`).join('')}
      </div>`;
  },

  /* Average-time chips */
  timeChips(stats) {
    return `
      <div class="grid grid-2 mt-2">
        <div class="stat-card"><div class="stat-icon ic-amber">⏱</div><div><div class="stat-value">${this._fmtMin(stats.avgResponseMin)}</div><div class="stat-label">Avg Response to Arrival*</div></div></div>
        <div class="stat-card"><div class="stat-icon ic-green">⏱</div><div><div class="stat-value">${this._fmtMin(stats.avgResolutionMin)}</div><div class="stat-label">Avg Time to Resolve*</div></div></div>
      </div>`;
  },

  _fmtMin(min) {
    if (min == null) return '—';
    if (min < 60) return `${Math.round(min)} min`;
    return `${Math.floor(min / 60)} h ${Math.round(min % 60)} min`;
  }
};