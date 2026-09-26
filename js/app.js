/* ============================================================
   app.js — Application shell, router & cross-tab awareness
   ============================================================ */

const App = {
  currentRoute: null,
  activeMap: null,      /* modal maps get removed on close */
  toastShownFor: new Set(),

  init() {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
    initData();

    document.addEventListener('click', (e) => {
      /* Delegated: open incident detail from cards/tables */
      const opener = e.target.closest('[data-role="open-incident"]');
      if (opener && opener.dataset.incident) {
        const role = Auth.getSession()?.role;
        const prefix = {
          citizen: 'citizen-incident', operator: 'operator-incident',
          team: 'team-incident', admin: 'admin-incident'
        }[role];
        if (prefix) this.navTo(`${prefix}:${opener.dataset.incident}`);
        return;
      }
      /* Zoom attachment */
      const zoom = e.target.closest('[data-role="zoom-attachment"]');
      if (zoom && zoom.dataset.src) {
        UI.modal({
          title: 'Attachment', icon: '🖼️',
          bodyHTML: `<img src="${zoom.dataset.src}" style="width:100%; border-radius:8px;">`
        });
      }
    });

    /* Cross-tab sync: another tab changed shared data (e.g. citizen SOS, sim ticks) */
    window.addEventListener('storage', (e) => {
      const rel = [APP_KEYS.INCIDENTS, APP_KEYS.TEAMS, APP_KEYS.SIM, APP_KEYS.NOTIFICATIONS, APP_KEYS.CONTACTS].includes(e.key);
      if (!rel) return;
      if (e.key === APP_KEYS.INCIDENTS) this.checkForNewIncidents(e);
      const s = Auth.getSession();
      if (s) {
        if (e.key === APP_KEYS.NOTIFICATIONS) {
          this.updateNotifBadge();
        } else if (e.key === APP_KEYS.SIM) {
          /* Avoid re-render churn on every movement tick; interval views self-update */
          if (Date.now() - (this._lastRender || 0) > 2500) this.render();
        } else if (!this.currentRoute?.endsWith('report')) {
          this.render();
        }
      } else if (this.currentRoute === 'demo') {
        this.render();
      }
    });

    this.route();
  },

  /* Operator alert when a brand-new incident appears (from another tab) */
  checkForNewIncidents(e) {
    const s = Auth.getSession();
    if (!s || s.role !== ROLES.OPERATOR) return;
    let oldList = [], newList = [];
    try {
      oldList = e.oldValue ? JSON.parse(e.oldValue) : [];
      newList = e.newValue ? JSON.parse(e.newValue) : [];
    } catch (_) { return; }
    const fresh = newList.filter(n => !oldList.some(o => o.id === n.id));
    if (fresh.length && !this.currentRoute?.startsWith('login')) {
      fresh.forEach(inc => {
        if (this.toastShownFor.has(inc.id)) return;
        this.toastShownFor.add(inc.id);
        UI.emergencyToast(
          '🚨 NEW EMERGENCY RECEIVED',
          `${inc.id} · ${inc.type} · ${inc.locationName || 'Unknown location'} · ${inc.priority} · Reported ${fmtTime(inc.createdAt)}`
        );
      });
    }
  },

  /* ---------- Routing ---------- */
  route() {
    const s = Auth.getSession();
    if (!s) {
      const hash = window.location.hash;
      const isLoginHash = hash === '#login';
      this.currentRoute = (this.currentRoute === 'login' || isLoginHash) ? 'login' : 'landing';
    } else if (!this.currentRoute || ['landing', 'login'].includes(this.currentRoute)) {
      this.currentRoute = Auth.dashboardFor(s.role);
    }
    this.render();
  },

  navTo(route) {
    this.currentRoute = route;
    this.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  /* Route must match the signed-in role's namespace (front-end route protection) */
  render() {
    const container = document.getElementById('view');
    if (!container) return;
    if (typeof LandingView !== 'undefined' && LandingView.destroy) {
      LandingView.destroy();
    }
    this.destroyMap();
    ERSMap.stopWatch();
    this.clearIntervals();
    this._lastRender = Date.now();

    const login = document.getElementById('login');
    const app = document.getElementById('app');
    const pub = document.getElementById('public');
    const routeChanged = this._renderedRoute !== this.currentRoute;
    this._renderedRoute = this.currentRoute;

    if (this.currentRoute === 'login') {
      app.classList.remove('active', 'app-enter');
      if (pub) {
        pub.classList.remove('landing-enter');
        pub.style.display = 'none';
      }
      login.style.display = '';
      if (routeChanged) {
        login.classList.remove('login-enter');
        void login.offsetWidth;
        login.classList.add('login-enter');
      }
      container.innerHTML = '';
      LoginView.bind();
      return;
    }

    if (this.currentRoute === 'demo') {
      app.classList.remove('active', 'app-enter');
      if (pub) {
        pub.classList.remove('landing-enter');
        pub.style.display = 'none';
      }
      login.style.display = 'none';
      login.classList.remove('login-enter');
      DemoView.render(container);
      return;
    }

    if (this.currentRoute === 'landing') {
      window.scrollTo(0, 0);
      app.classList.remove('active', 'app-enter');
      login.style.display = 'none';
      login.classList.remove('login-enter');
      container.innerHTML = '';
      if (pub) {
        pub.hidden = false;
        pub.style.display = 'block';
        pub.style.width = '100%';
        pub.style.maxWidth = 'none';
        pub.style.margin = '0';
        if (routeChanged) {
          pub.classList.remove('landing-enter');
          void pub.offsetWidth;
          pub.classList.add('landing-enter');
        }
      }
      LandingView.render(pub);
      return;
    }

    const s = Auth.getSession();
    if (!s) { this.currentRoute = 'landing'; this.render(); return; }

    const ns = this.currentRoute.split('-')[0];
    if (ns !== s.role) {
      UI.toast('Access Denied', 'You are not authorized to view that page.', 'error');
      this.currentRoute = Auth.dashboardFor(s.role);
    }

    login.style.display = 'none';
    login.classList.remove('login-enter');
    if (pub) {
      pub.classList.remove('landing-enter');
      pub.style.display = 'none';
    }
    const appWasActive = app.classList.contains('active');
    app.classList.add('active');
    if (!appWasActive) {
      app.classList.remove('app-enter');
      void app.offsetWidth;
      app.classList.add('app-enter');
    }
    this.renderTopbar();
    this.renderNavLinks();

    if (routeChanged) {
      container.classList.remove('view-enter');
      void container.offsetWidth;
      container.classList.add('view-enter');
    }

    const id = this.currentRoute.includes(':') ? this.currentRoute.split(':')[1] : null;
    const page = this.currentRoute.includes(':') ? this.currentRoute.split(':')[0] : this.currentRoute;

    /* Normalize: accept bare role names ("citizen") as aliases for their dashboards ("citizen-dashboard") */
    const DASH_ALIASES = {
      citizen: 'citizen-dashboard', operator: 'operator-dashboard',
      team: 'team-dashboard', admin: 'admin-dashboard'
    };
    const normPage = DASH_ALIASES[page] || page;

    switch (normPage) {
      case 'citizen-dashboard':  CitizenView.dashboard(container);  break;
      case 'citizen-report':     CitizenView.report(container);     break;
      case 'citizen-incidents':  CitizenView.myIncidents(container); break;
      case 'citizen-incident':   CitizenView.incidentDetail(container, id); break;
      case 'citizen-contacts':   CitizenView.contacts(container);   break;
      case 'operator-dashboard': OperatorView.dashboard(container); break;
      case 'operator-incident':  OperatorView.incidentDetail(container, id); break;
      case 'operator-teams':     OperatorView.teams(container);     break;
      case 'team-dashboard':     TeamView.dashboard(container);     break;
      case 'team-incident':      TeamView.incidentDetail(container, id); break;
      case 'admin-dashboard':    AdminView.dashboard(container);    break;
      case 'admin-incident':     AdminView.incidentDetail(container, id); break;
      default:
        this.currentRoute = Auth.dashboardFor(s.role);
        this.render();
    }

    if (routeChanged) {
      setTimeout(() => {
        if (typeof ERSMap !== 'undefined' && ERSMap.registry) {
          ERSMap.registry.forEach(m => { try { m.invalidateSize(); } catch (_) {} });
        }
      }, 480);
    }
  },

  /* ---------- Topbar ---------- */
  renderTopbar() {
    const s = Auth.getSession();
    const top = document.getElementById('topbar');
    if (top.dataset.rendered === s.userId) return;
    top.dataset.rendered = s.userId;
    top.innerHTML = `
      <button class="menu-toggle" id="menuToggle" title="Menu">☰</button>
      <div class="brand">
        <div class="logo-sm">🚨</div>
        <span class="brand-text">Emergency Response</span>
      </div>
      <nav class="nav-links" id="navLinks"></nav>
      <div class="topbar-right">
        <div class="user-chip">
          <div class="avatar">${esc(s.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase())}</div>
          <div class="meta">
            <div class="name">${esc(s.name)}</div>
            <div class="role">${esc(s.role)}</div>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" id="logoutBtn">🚪 Logout</button>
      </div>
    `;
    Notifications.renderBell(top.querySelector('.topbar-right'));
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) themeBtn.addEventListener('click', () => this.toggleTheme());
    document.getElementById('logoutBtn').addEventListener('click', () => {
      document.getElementById('topbar').dataset.rendered = '';
      Auth.logout();
      document.getElementById('app').classList.remove('active', 'app-enter');
      this.currentRoute = 'landing';
      this.render();
      window.scrollTo({ top: 0 });
    });
    document.getElementById('menuToggle').addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('navLinks').classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#topbar')) {
        const nav = document.getElementById('navLinks');
        if (nav) nav.classList.remove('open');
        const notif = document.getElementById('notifPanel');
        if (notif) notif.hidden = true;
      }
    });
  },

  /* ---------- Theme (local demo setting, persisted) ---------- */
  applyTheme(dark) {
    const s = getSettings();
    s.darkMode = !!dark;
    saveSettings(s);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  },

  toggleTheme() {
    const isDark = document.documentElement.dataset.theme === 'dark';
    this.applyTheme(!isDark);
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = isDark ? '🌙' : '☀️';
  },

  /* ---------- Lightweight interval registry (cleared on view change) ---------- */
  _intervals: [],

  interval(fn, ms) {
    const id = setInterval(fn, ms);
    this._intervals.push(id);
    return id;
  },

  clearIntervals() {
    this._intervals.forEach(id => clearInterval(id));
    this._intervals = [];
  },

  /* Notification bell unread count refresh */
  updateNotifBadge() {
    const s = Auth.getSession();
    const bell = document.getElementById('notifBell');
    if (!bell || !s) return;
    const n = Notifications.unread(s.userId);
    const old = bell.querySelector('.notif-badge');
    if (old) old.remove();
    if (n) bell.insertAdjacentHTML('beforeend', `<span class="notif-badge">${n > 9 ? '9+' : n}</span>`);
  },

  /* ---------- Role-specific nav links ---------- */
  renderNavLinks() {
    const s = Auth.getSession();
    const nav = document.getElementById('navLinks');
    if (!nav) return;

    const menus = {
      citizen: [
        { route: 'citizen-dashboard',  icon: '🏠', label: 'Dashboard' },
        { route: 'citizen-report',     icon: '📝', label: 'Report Emergency' },
        { route: 'citizen-incidents',  icon: '📋', label: 'My Incidents' },
        { route: 'citizen-contacts',   icon: '☎️', label: 'Contacts' }
      ],
      operator: [
        { route: 'operator-dashboard', icon: '🖥️', label: 'Control Room', countKey: 'new' },
        { route: 'operator-teams',     icon: '🚑', label: 'Response Teams' }
      ],
      team: [
        { route: 'team-dashboard', icon: '🚑', label: 'Team Dashboard', countKey: 'assignments' }
      ],
      admin: [
        { route: 'admin-dashboard', icon: '⚙️', label: 'System Panel' }
      ]
    };

    const items = menus[s.role] || [];
    nav.innerHTML = items.map(m => {
      const count = m.countKey ? this.navCount(m.countKey, s) : null;
      return `
        <button class="nav-link ${this.currentRoute.startsWith(m.route) || this.currentRoute.split(':')[0] === m.route ? 'active' : ''}" data-route="${m.route}">
          <span>${m.icon}</span><span>${m.label}</span>
          ${count ? `<span class="count">${count}</span>` : ''}
        </button>
      `;
    }).join('');

    nav.querySelectorAll('[data-route]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.navTo(btn.dataset.route);
        document.getElementById('navLinks').classList.remove('open');
      });
    });
  },

  navCount(key, session) {
    if (key === 'new') return Incidents.reported().length || '';
    if (key === 'assignments') {
      const mine = Incidents.forTeam(session.teamId);
      const pending = mine.filter(i => i.status === 'TEAM ASSIGNED').length;
      const active = mine.filter(i => ['ACCEPTED', 'DISPATCHED', 'ON THE WAY', 'ARRIVED', 'HANDLING'].includes(i.status)).length;
      return (pending + active) || '';
    }
    return '';
  },

  destroyMap() {
    ERSMap.destroyAll();
  },

  /* Cross-module data-change hook (LocalStorage already saved) */
  notifyDataChanged() {
    const s = Auth.getSession();
    if (!s || typeof Notifications === 'undefined') return;
    setTimeout(() => this.updateNotifBadge(), 0);
  }
};

/* Boot */
document.addEventListener('DOMContentLoaded', () => {
  const bootSettings = getSettings();
  document.documentElement.dataset.theme = bootSettings.darkMode ? 'dark' : 'light';
  App.init();
  LoginView.bind();
  App.route();
});
