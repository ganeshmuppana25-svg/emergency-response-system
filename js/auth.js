/* ============================================================
   auth.js — Authentication, session & role-based access
   ============================================================ */

const Auth = {
  /* Attempt login; returns {ok, user} or {ok:false, error} */
  login(email, password) {
    const em = (email || '').trim().toLowerCase();
    const pw = password || '';
    if (!em || !pw) return { ok: false, error: 'Please enter both email and password.' };

    const user = getUsers().find(u => u.email.toLowerCase() === em);
    if (!user || user.password !== pw) {
      return { ok: false, error: 'Invalid email or password. Please try again.' };
    }
    /* Never store the password in the session — only identity + role */
    const session = {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      teamId: user.teamId || null,
      loginAt: new Date().toISOString()
    };
    storageSet(APP_KEYS.SESSION, session);
    return { ok: true, user: session };
  },

  getSession() {
    const s = storageGet(APP_KEYS.SESSION, null);
    if (!s || !s.role || !s.userId) return null;
    /* Validate the session user still exists (handles data reset) */
    const exists = getUsers().some(u => u.id === s.userId);
    if (!exists) { this.logout(true); return null; }
    return s;
  },

  logout(silent = false) {
    storageRemove(APP_KEYS.SESSION);
    if (!silent && typeof UI !== 'undefined' && UI.toast) {
      UI.toast('Signed Out', 'You have been securely signed out.', 'info');
    }
  },

  /* Route guard — the only entry point to role dashboards */
  requireRole(role) {
    const s = this.getSession();
    if (!s) {
      return { allowed: false, redirect: 'login', reason: 'Not signed in.' };
    }
    if (s.role !== role) {
      return { allowed: false, redirect: Auth.dashboardFor(s.role), reason: 'You are not authorized to view that page.' };
    }
    return { allowed: true, session: s };
  },

  /* Where each role should land after login / on refresh / on invalid route */
  dashboardFor(role) {
    return {
      citizen: 'citizen-dashboard', operator: 'operator-dashboard',
      team: 'team-dashboard', admin: 'admin-dashboard'
    }[role] || 'login';
  }
};
