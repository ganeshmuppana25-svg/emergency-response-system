/* ============================================================
   helpers.js — Shared rendering helpers & formatters
   ============================================================ */

/* Escape user-entered text before injecting into HTML */
function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* Time formatters */
function fmtTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  return `${fmtDate(iso)} · ${fmtTime(iso)}`;
}

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

/* Badges */
UI.statusBadge = function (status) {
  const cls = {
    'REPORTED': 'st-reported', 'VERIFIED': 'st-verified',
    'TEAM ASSIGNED': 'st-team-assigned', 'ACCEPTED': 'st-accepted',
    'DISPATCHED': 'st-dispatched', 'ON THE WAY': 'st-on-the-way',
    'ARRIVED': 'st-arrived', 'HANDLING': 'st-handling',
    'RESOLVED': 'st-resolved', 'REJECTED': 'st-rejected'
  }[status] || 'st-rejected';
  return `<span class="badge ${cls}"><span class="dot"></span>${esc(status)}</span>`;
};

UI.priorityBadge = function (priority) {
  const cls = { CRITICAL: 'pr-critical', HIGH: 'pr-high', MEDIUM: 'pr-medium', LOW: 'pr-low' }[priority] || 'pr-low';
  return `<span class="badge ${cls}">${esc(priority)}</span>`;
};

UI.teamStatusBadge = function (status) {
  const cls = { Available: 'ts-available', Busy: 'ts-busy', Offline: 'ts-offline' }[status] || 'ts-offline';
  return `<span class="badge ${cls}"><span class="dot"></span>${esc(status)}</span>`;
};

UI.typeIcon = function (type) {
  const icons = {
    'Medical': '🚑', 'Fire': '🔥', 'Road Accident': '🚗', 'Security': '🚨',
    'Flood': '🌊', 'Electrical': '⚡', 'Building Emergency': '🏢',
    'Emergency/SOS': '🆘', 'Other': '❓'
  };
  return icons[type] || '❓';
};

UI.typeBadgeCls = function (type) {
  const cls = {
    'Medical': 'type-medical', 'Fire': 'type-fire', 'Road Accident': 'type-road-accident',
    'Security': 'type-security', 'Flood': 'type-flood', 'Electrical': 'type-electrical',
    'Building Emergency': 'type-building-emergency', 'Emergency/SOS': 'type-emergency-sos',
    'Other': 'type-other'
  }[type] || 'type-other';
  return cls;
};

/* Incident card (used by citizen & team lists) */
UI.incidentCard = function (inc, { showTeam = true } = {}) {
  const team = showTeam && inc.assignedTeam ? Teams.getTeamName(inc.assignedTeam) : null;
  const leftCls = { CRITICAL: 'left-crit', HIGH: 'left-high', MEDIUM: 'left-medium', LOW: 'left-low' }[inc.priority] || '';
  return `
    <div class="incident-card ${leftCls}" data-incident="${esc(inc.id)}" data-role="open-incident">
      <div class="type-icon ${UI.typeBadgeCls(inc.type)}">${UI.typeIcon(inc.type)}</div>
      <div class="inc-main">
        <div class="inc-title">
          <span class="inc-id">${esc(inc.id)}</span>
          <span>${esc(inc.type)}</span>
        </div>
        <div class="inc-meta">
          <span>📍 ${esc(inc.locationName || 'No location')}</span>
          <span>🕒 ${timeAgo(inc.createdAt)}</span>
          ${team ? `<span>🚑 ${esc(team)}</span>` : ''}
        </div>
      </div>
      <div class="inc-badges">
        ${UI.priorityBadge(inc.priority)}
        ${UI.statusBadge(inc.status)}
      </div>
    </div>
  `;
};

/* Empty state block */
UI.emptyState = function (icon, title, msg = '') {
  return `
    <div class="empty-state">
      <div class="es-icon">${icon}</div>
      <h4>${esc(title)}</h4>
      ${msg ? `<p>${esc(msg)}</p>` : ''}
    </div>
  `;
};

/* Full lifecycle stepper (Phase 1 order) */
UI.stepper = function (status) {
  const order = [
    'REPORTED', 'VERIFIED', 'TEAM ASSIGNED', 'ACCEPTED', 'DISPATCHED',
    'ON THE WAY', 'ARRIVED', 'HANDLING', 'RESOLVED'
  ];
  if (status === 'REJECTED') {
    return `<div class="stepper"><span class="badge st-rejected">🚫 REJECTED — False / non-actionable report</span></div>`;
  }
  const idx = order.indexOf(status);
  const html = order.map((s, i) => {
    const done = idx > -1 && i < idx;
    const current = i === idx;
    const cls = done ? 'done' : current ? 'current' : '';
    const sep = i < order.length - 1 ? '<span class="step-sep"></span>' : '';
    return `<span class="step ${cls}"><span class="step-dot"></span>${s}</span>${sep}`;
  }).join('');
  return `<div class="stepper">${html}</div>`;
};

/* Timeline renderer (newest entries first) */
UI.timeline = function (inc) {
  const items = (inc.timeline || []).slice().reverse();
  if (!items.length) return UI.emptyState('🕐', 'No activity yet', 'Timeline entries will appear here.');
  const clsFor = (title) => {
    const t = (title || '').toLowerCase();
    if (t.includes('reject')) return 'tl-error';
    if (t.includes('resolv')) return 'tl-success';
    if (t.includes('priority')) return 'tl-warn';
    return '';
  };
  return `
    <div class="timeline">
      ${items.map(it => `
        <div class="timeline-item ${clsFor(it.title)}">
          <div class="tl-time">${esc(fmtDate(it.time))} ${esc(fmtTime(it.time))}</div>
          <div class="tl-text">${esc(it.icon || '')} ${esc(it.title)}</div>
          ${it.detail ? `<div class="tl-sub">${esc(it.detail)}</div>` : ''}
        </div>
      `).join('')}
    </div>
  `;
};

/* Attachment thumbnails */
UI.attachments = function (inc) {
  if (!inc.attachments || !inc.attachments.length) return '';
  return `
    <div class="attach-preview">
      ${inc.attachments.map((a, i) => `
        <div class="ap-item">
          <img src="${a}" alt="Attachment ${i + 1}" data-role="zoom-attachment" data-src="${a}">
        </div>
      `).join('')}
    </div>
  `;
};

/* ============================================================
   helpers.js — Phase 2 additions (simulation math, chips, etc.)
   ============================================================ */

/* Haversine distance in kilometres */
function haversineKm(aLat, aLng, bLat, bLng) {
  const R = 6371;
  const dLat = (bLat - aLat) * Math.PI / 180;
  const dLng = (bLng - aLng) * Math.PI / 180;
  const la1 = aLat * Math.PI / 180;
  const la2 = bLat * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/* Human-readable distance: "850 m" / "2.4 km" */
function fmtDist(km) {
  if (km == null || isNaN(km)) return '—';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

/* Human-readable ETA: "5 min" / "Arrived" (simulated, not traffic-based) */
function fmtEta(min) {
  if (min == null || isNaN(min)) return '—';
  if (min < 0.5) return 'Arrived';
  if (min < 1) return '< 1 min';
  return `${Math.round(min)} min`;
}

/* Progress bar (0-100) */
UI.progressBar = function (pct, { color = 'var(--primary)', label = '' } = {}) {
  const p = Math.max(0, Math.min(100, Math.round(pct || 0)));
  return `
    <div class="prog-wrap" ${label ? `data-label="${esc(label)}"` : ''}>
      <div class="prog-track"><div class="prog-fill" style="width:${p}%; background:${color};"></div></div>
    </div>
  `;
};

/* Small system-status chips (clearly labelled local/demo state) */
UI.sysChips = function ({ online = true, gps = null, updatedAt = null, demo = false } = {}) {
  const chips = [`<span class="sys-chip sys-on">🟢 SYSTEM ONLINE <em>local demo</em></span>`];
  if (gps) {
    chips.push(gps.active && gps.lat != null
      ? `<span class="sys-chip sys-on">📍 GPS ACTIVE</span>`
      : `<span class="sys-chip sys-warn">📍 GPS ${gps.error ? 'UNAVAILABLE' : 'STANDBY'}</span>`);
  }
  if (updatedAt) chips.push(`<span class="sys-chip sys-on">🔄 UPDATED ${esc(timeAgo(updatedAt).toUpperCase())}</span>`);
  if (demo) chips.push(`<span class="sys-chip sys-demo">▶ DEMO MODE</span>`);
  return `<div class="sys-chips">${chips.join('')}</div>`;
};

/* ETA / distance / progress widget used on tracking & team views */
UI.etaWidget = function ({ distanceKm = null, etaMin = null, progress = null, arrived = false, label = 'Simulated ETA' } = {}) {
  return `
    <div class="eta-widget">
      <div class="eta-main">
        <div class="eta-item"><span class="eta-k">Distance</span><span class="eta-v">${fmtDist(distanceKm)}</span></div>
        <div class="eta-item"><span class="eta-k">${label}</span><span class="eta-v ${arrived ? 'eta-arrived' : ''}">${arrived ? 'Arrived' : fmtEta(etaMin)}</span></div>
      </div>
      ${progress != null ? UI.progressBar(progress, { color: 'var(--success)', label: `${Math.round(progress)} %` }) : ''}
      ${label === 'Simulated ETA' ? '<div class="eta-note">ETA is simulated for demo — not a real traffic estimate.</div>' : ''}
    </div>
  `;
};
