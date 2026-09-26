/* ============================================================
   teams.js — Response team management
   ============================================================ */

const Teams = {
  getAll()   { initData(); return storageGet(APP_KEYS.TEAMS, []); },
  getById(id) {
    if (!id) return null;
    return this.getAll().find(t => t.id === id) || null;
  },

  getTeamName(id) {
    const t = this.getById(id);
    return t ? `${t.icon || ''} ${t.name}`.trim() : 'Unassigned';
  },

  available() { return this.getAll().filter(t => t.status === 'Available'); },

  /* Available → Busy when a team is assigned an incident */
  markBusy(id, incidentId) {
    const teams = this.getAll();
    const team = teams.find(t => t.id === id);
    if (!team) return { ok: false, error: 'Response team not found.' };
    if (team.status !== 'Available') {
      return { ok: false, error: `${team.name} is already ${team.status.toUpperCase()}.` };
    }
    team.status = 'Busy';
    team.currentIncident = incidentId;
    saveTeams(teams);
    App.notifyDataChanged('team-status');
    return { ok: true, team };
  },

  /* Busy → Available when its incident is resolved */
  markAvailable(id) {
    const teams = this.getAll();
    const team = teams.find(t => t.id === id);
    if (!team) return { ok: false, error: 'Response team not found.' };
    team.status = 'Available';
    team.currentIncident = null;
    saveTeams(teams);
    App.notifyDataChanged('team-status');
    return { ok: true, team };
  },

  setOffline(id) {
    const teams = this.getAll();
    const team = teams.find(t => t.id === id);
    if (!team) return { ok: false, error: 'Response team not found.' };
    team.status = 'Offline';
    saveTeams(teams);
    return { ok: true, team };
  },

  /* Admin status control (Available / Busy / Offline) */
  setStatus(id, status) {
    const teams = this.getAll();
    const team = teams.find(t => t.id === id);
    if (!team) return { ok: false, error: 'Response team not found.' };
    if (!['Available', 'Busy', 'Offline'].includes(status)) {
      return { ok: false, error: 'Invalid team status.' };
    }
    team.status = status;
    if (status === 'Available') team.currentIncident = null;
    saveTeams(teams);
    App.notifyDataChanged('team-status');
    return { ok: true, team };
  },

  /* Map emergency type -> matching departments */
  departmentsForType(type) {
    const map = {
      'Medical':      ['Medical'],
      'Emergency/SOS':['Medical', 'Security', 'Fire', 'Rescue'],
      'Fire':         ['Fire'],
      'Road Accident':['Medical', 'Security', 'Rescue'],
      'Security':     ['Security'],
      'Flood':        ['Rescue', 'Fire'],
      'Electrical':   ['Fire', 'Rescue'],
      'Building Emergency': ['Fire', 'Rescue', 'Medical'],
      'Other':        ['Medical', 'Fire', 'Security', 'Rescue']
    };
    return map[type] || ['Medical', 'Fire', 'Security', 'Rescue'];
  }
};
