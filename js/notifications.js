/* ============================================================
   notifications.js — Animated toast notification system
   ============================================================ */

const UI = {
  /* Show an animated toast. type: success | error | warning | info | emergency */
  toast(title, msg = '', type = 'info', autoClose = 5000) {
    try {
      if (typeof document === 'undefined' || !document.body) return null;
      let container = document.querySelector('.toast-container');
      if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
      }

      const icons = {
        success: '✅', error: '⛔', warning: '⚠️',
        info: '🔔', emergency: '🚨'
      };

      const el = document.createElement('div');
      el.className = `toast toast-${type}`;
      el.setAttribute('role', 'alert');
      el.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <div class="toast-body">
          <div class="toast-title">${title}</div>
          ${msg ? `<div class="toast-msg">${msg}</div>` : ''}
        </div>
        <button class="toast-close" title="Dismiss">✕</button>
      `;

      const close = () => {
        if (!el.isConnected) return;
        el.classList.add('hide');
        setTimeout(() => el.remove(), 260);
      };
      if (el.querySelector) el.querySelector('.toast-close')?.addEventListener?.('click', close);
      if (container.appendChild) container.appendChild(el);
      if (autoClose > 0) setTimeout(close, autoClose);
      return el;
    } catch (e) {
      return null;
    }
  },

  /* Confirmation dialog with a Promise result */
  confirm({ title = 'Are you sure?', message = '', confirmText = 'Confirm', danger = false, icon = '❓' } = {}) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal ${danger ? 'danger' : ''}" role="dialog" aria-modal="true">
          <div class="modal-head">
            <h3>${title}</h3>
            <button class="modal-close" title="Close">✕</button>
          </div>
          <div class="modal-body">
            <div class="modal-icon-lg ${danger ? 'ic-red' : 'ic-blue'}" style="${danger ? 'background: var(--danger-light);' : 'background: var(--primary-light);'}">${icon}</div>
            <p style="color: var(--text-2); font-size: 14px;">${message}</p>
          </div>
          <div class="modal-foot">
            <button class="btn btn-outline" data-act="cancel">Cancel</button>
            <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-act="ok">${confirmText}</button>
          </div>
        </div>
      `;
      const done = (result) => { overlay.remove(); resolve(result); };
      overlay.querySelector('[data-act="ok"]').addEventListener('click', () => done(true));
      overlay.querySelector('[data-act="cancel"]').addEventListener('click', () => done(false));
      overlay.querySelector('.modal-close').addEventListener('click', () => done(false));
      overlay.addEventListener('click', (e) => { if (e.target === overlay) done(false); });
      document.body.appendChild(overlay);
      overlay.querySelector('[data-act="ok"]').focus();
    });
  },

  /* Generic modal builder */
  modal({ title, icon = '', bodyHTML = '', footHTML = '', large = false, onOpen = null }) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal ${large ? 'modal-lg' : ''}" role="dialog" aria-modal="true">
        <div class="modal-head">
          <h3>${icon ? `<span>${icon}</span>` : ''}${title}</h3>
          <button class="modal-close" title="Close">✕</button>
        </div>
        <div class="modal-body">${bodyHTML}</div>
        ${footHTML ? `<div class="modal-foot">${footHTML}</div>` : ''}
      </div>
    `;
    /* Snapshot the map registry BEFORE onOpen runs, so closing this modal
       destroys only maps created INSIDE the modal (e.g. a picker map) —
       never page maps that happen to live behind the overlay. */
    const regBefore = (typeof ERSMap !== 'undefined' && ERSMap.registry) ? ERSMap.registry.length : 0;

    const close = () => {
      if (typeof ERSMap !== 'undefined' && ERSMap.registry) {
        while (ERSMap.registry.length > regBefore) {
          const m = ERSMap.registry.pop();
          try { m.remove(); } catch (_) { /* ignore */ }
        }
      }
      overlay.remove();
      document.removeEventListener('keydown', onKey);
    };

    /* Accessibility: ESC closes the modal */
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);

    overlay.querySelector('.modal-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.body.appendChild(overlay);
    if (onOpen) onOpen(overlay, close);
    return { overlay, close };
  }
};

/* Emergency toast — for "NEW EMERGENCY RECEIVED" style alerts */
UI.emergencyToast = function (title, msg) {
  return UI.toast(title, msg, 'emergency', 0); /* stays until dismissed */
};

/* ============================================================
   Notification center (Phase 2)
   Persisted per user in LocalStorage (ers_notifications) with
   lifecycle-event generation + de-duplication.
   ============================================================ */

const Notifications = {
  EVENTS: {
    created:      { icon: '🚨', title: 'SOS RECEIVED',       msg: 'Your emergency request has been received.' },
    verified:     { icon: '✅', title: 'INCIDENT VERIFIED',   msg: 'Your emergency has been verified.' },
    rejected:     { icon: '⛔', title: 'INCIDENT REJECTED',   msg: 'The report was marked as not actionable.' },
    'team-assigned': { icon: '🚑', title: 'TEAM ASSIGNED',    msg: '' },
    accepted:     { icon: '🤝', title: 'ASSIGNMENT ACCEPTED', msg: 'The response team has accepted the assignment.' },
    dispatched:   { icon: '🚀', title: 'TEAM DISPATCHED',     msg: 'The response team has been dispatched.' },
    'on-the-way': { icon: '🚗', title: 'TEAM ON THE WAY',     msg: '' },
    arrived:      { icon: '📍', title: 'TEAM ARRIVED',        msg: 'The response team has arrived at your location.' },
    handling:     { icon: '🛠', title: 'INCIDENT HANDLING',   msg: 'Your emergency is currently being handled.' },
    resolved:     { icon: '✅', title: 'INCIDENT RESOLVED',   msg: 'Your emergency incident has been resolved.' },
    priority:     { icon: '⚠️', title: 'PRIORITY UPDATED',    msg: '' }
  },

  list(userId) {
    if (!userId) return [];
    const state = getNotifState();
    return (Array.isArray(state[userId]) ? state[userId] : [])
      .slice().sort((a, b) => new Date(b.time) - new Date(a.time));
  },

  unread(userId) {
    return this.list(userId).filter(n => !n.read).length;
  },

  push(userId, { icon, title, msg = '', link = null, eventKey = null, incidentId = null } = {}) {
    if (!userId || !title) return null;
    const state = getNotifState();
    const list = Array.isArray(state[userId]) ? state[userId] : [];
    if (eventKey && incidentId && list.some(n => n.eventKey === eventKey && n.incidentId === incidentId)) return null;
    const notif = {
      id: 'N-' + Date.now() + '-' + Math.floor(Math.random() * 1e4),
      icon, title, msg, link,
      eventKey: eventKey || null, incidentId: incidentId || null,
      time: new Date().toISOString(), read: false
    };
    list.unshift(notif);
    if (list.length > 60) list.length = 60;
    state[userId] = list;
    saveNotifState(state);
    return notif;
  },

  markAllRead(userId) {
    const state = getNotifState();
    if (Array.isArray(state[userId])) {
      state[userId].forEach(n => { n.read = true; });
      saveNotifState(state);
    }
  },

  markRead(userId, notifId) {
    const state = getNotifState();
    const list = Array.isArray(state[userId]) ? state[userId] : [];
    const n = list.find(x => x.id === notifId);
    if (n && !n.read) { n.read = true; saveNotifState(state); }
  },

  clear(userId) {
    const state = getNotifState();
    delete state[userId];
    saveNotifState(state);
  },

  /* Live lifecycle hook — called by incidents.js after every mutation.
     Persists notifications for affected users and toasts locally for the
     current session user when they are the *receiver* of the event. */
  onIncidentEvent(inc, reason, actorName = null) {
    if (!inc) return;
    const evt = this.EVENTS[reason];
    if (!evt) return;
    const targets = this.targetsFor(inc, reason);
    const s = Auth.getSession();

    targets.forEach(target => {
      let msg = evt.msg || '';
      if (reason === 'team-assigned' || reason === 'on-the-way') {
        const t = inc.assignedTeam ? Teams.getById(inc.assignedTeam) : null;
        msg = reason === 'team-assigned'
          ? (t ? `${t.icon} ${t.name} has been assigned to ${inc.id}.` : `A team has been assigned to ${inc.id}.`)
          : (t ? `${t.icon} ${t.name} is travelling to your location.` : 'The response team is en route.');
      } else if (reason === 'priority') {
        msg = `${inc.id} priority is now ${inc.priority}.`;
      }
      const notif = this.push(target.userId, {
        icon: evt.icon, title: evt.title, msg,
        link: target.link || null,
        eventKey: reason, incidentId: inc.id
      });
      /* Toast only when the local user is the receiver, not the actor */
      if (notif && s && s.userId === target.userId && this.isReceiver(s, actorName)) {
        UI.toast(evt.title, `${inc.id} — ${msg || inc.type}`, evt.icon === '🚨' ? 'emergency' : 'info', 5200);
      }
    });
  },

  /* Who should see this event? */
  targetsFor(inc, reason) {
    const targets = [];
    const users = getUsers();
    const reporter = inc.reporterId ? users.find(u => u.id === inc.reporterId) : null;
    if (reporter && reporter.role === ROLES.CITIZEN) {
      targets.push({ userId: reporter.id, link: `citizen-incident:${inc.id}` });
    }
    if (['created', 'rejected', 'verified', 'team-assigned'].includes(reason)) {
      const op = users.find(u => u.role === ROLES.OPERATOR);
      if (op) targets.push({ userId: op.id, link: `operator-incident:${inc.id}` });
    }
    if (inc.assignedTeam && ['team-assigned', 'accepted', 'dispatched', 'on-the-way', 'arrived', 'handling', 'resolved'].includes(reason)) {
      const tm = users.find(u => u.role === ROLES.TEAM && u.teamId === inc.assignedTeam);
      if (tm) targets.push({ userId: tm.id, link: `team-incident:${inc.id}` });
    }
    const seen = new Set();
    return targets.filter(t => !seen.has(t.userId) && seen.add(t.userId));
  },

  /* Suppress the local toast when the acting user caused the event. */
  isReceiver(session, actorName) {
    if (!actorName) return true;
    const names = [session.name, Teams.getById(session.teamId)?.name].filter(Boolean);
    return !names.some(n => n.toLowerCase() === String(actorName).toLowerCase());
  },

  /* Notification bell UI (called from topbar render) */
  renderBell(container) {
    const s = Auth.getSession();
    if (!s || !container) return;
    const unread = this.unread(s.userId);
    container.insertAdjacentHTML('beforeend', `
      <div class="notif-wrap">
        <button class="notif-btn" id="notifBell" title="Notifications" aria-label="Notifications">
          <span class="notif-icon">🔔</span>
          ${unread ? `<span class="notif-badge">${unread > 9 ? '9+' : unread}</span>` : ''}
        </button>
        <div class="notif-panel" id="notifPanel" hidden>
          <div class="notif-panel-head">
            <strong>🔔 Notifications</strong>
            <div>
              <button class="btn btn-ghost btn-sm" data-act="notif-read">Mark read</button>
              <button class="btn btn-ghost btn-sm" data-act="notif-clear">Clear</button>
            </div>
          </div>
          <div class="notif-list" id="notifList"></div>
        </div>
      </div>
    `);

    const panel = container.querySelector('#notifPanel');
    const refreshList = () => {
      const listEl = container.querySelector('#notifList');
      const items = this.list(s.userId);
      listEl.innerHTML = items.length
        ? items.map(n => `
            <button class="notif-item ${n.read ? '' : 'unread'}" data-nid="${esc(n.id)}" ${n.link ? `data-link="${esc(n.link)}"` : ''}>
              <span class="ni-icon">${n.icon || '🔔'}</span>
              <span class="ni-body">
                <span class="ni-title">${esc(n.title)}</span>
                ${n.msg ? `<span class="ni-msg">${esc(n.msg)}</span>` : ''}
                <span class="ni-time">${timeAgo(n.time)}</span>
              </span>
            </button>`).join('')
        : '<div class="notif-empty">No notifications yet.</div>';
      listEl.querySelectorAll('[data-nid]').forEach(el => {
        el.addEventListener('click', () => {
          this.markRead(s.userId, el.dataset.nid);
          panel.hidden = true;
          if (el.dataset.link) App.navTo(el.dataset.link);
          else App.render();
        });
      });
    };

    container.querySelector('#notifBell').addEventListener('click', (e) => {
      e.stopPropagation();
      panel.hidden = !panel.hidden;
      if (!panel.hidden) {
        this.markAllRead(s.userId);
        refreshList();
        App.updateNotifBadge();
      }
    });
    /* Close the panel on any outside click. One shared handler is kept on
       `document` and replaced (never duplicated) across topbar re-renders,
       and always looks the panel up fresh — no stale DOM references. */
    if (document._ersNotifCloser) document.removeEventListener('click', document._ersNotifCloser);
    document._ersNotifCloser = (e) => {
      if (!e.target.closest('.notif-wrap')) {
        const p = document.getElementById('notifPanel');
        if (p) p.hidden = true;
      }
    };
    document.addEventListener('click', document._ersNotifCloser);
    container.querySelector('[data-act="notif-read"]').addEventListener('click', () => {
      this.markAllRead(s.userId); refreshList(); App.updateNotifBadge();
    });
    container.querySelector('[data-act="notif-clear"]').addEventListener('click', () => {
      this.clear(s.userId); refreshList(); App.updateNotifBadge();
    });
    refreshList();
  }
};
