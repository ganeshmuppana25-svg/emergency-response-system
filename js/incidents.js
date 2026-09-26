/* ============================================================
   incidents.js — Incident CRUD, lifecycle & timeline engine
   ============================================================ */

const Incidents = {
  getAll()     { initData(); return storageGet(APP_KEYS.INCIDENTS, []); },
  saveAll(list){ return storageSet(APP_KEYS.INCIDENTS, list); },

  getById(id) {
    if (!id) return null;
    return this.getAll().find(i => i.id === id) || null;
  },

  /* ---- ID generation: ER-2026-0001 ---- */
  nextId() {
    const year = new Date().getFullYear();
    let serial = storageGet(APP_KEYS.COUNTER, 0);
    serial += 1;
    storageSet(APP_KEYS.COUNTER, serial);
    return `ER-${year}-${String(serial).padStart(4, '0')}`;
  },

  /* ---- Create incident ---- */
  create(data) {
    const incidents = this.getAll();
    const incident = {
      id: this.nextId(),
      reporter: data.reporter || 'Anonymous',
      reporterId: data.reporterId || null,
      type: data.type || 'Other',
      description: (data.description || '').trim(),
      latitude: data.latitude,
      longitude: data.longitude,
      locationName: data.locationName || 'Not specified',
      contact: data.contact || '—',
      priority: data.priority || 'MEDIUM',
      status: INCIDENT_STATUSES.REPORTED,
      assignedTeam: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      resolutionNotes: null,
      resolvedAt: null,
      source: data.source || 'Citizen Report',
      timeline: [{
        time: new Date().toISOString(),
        title: 'Emergency reported',
        detail: data.source === 'SOS'
          ? 'SOS activated by citizen'
          : `Reported via ${data.source || 'citizen report'}`,
        icon: '📞'
      }],
      attachments: data.attachments || []
    };
    incidents.unshift(incident);
    this.saveAll(incidents);
    App.notifyDataChanged('incident-created');
    if (typeof Notifications !== 'undefined') {
      Notifications.onIncidentEvent(incident, 'created', data.reporterName || null);
    }
    return incident;
  },

  /* ---- Validated status transition ---- */
  updateStatus(id, newStatus, detail, icon, actor) {
    const incidents = this.getAll();
    const inc = incidents.find(i => i.id === id);
    if (!inc) return { ok: false, error: `Incident ${id} was not found.` };

    if (inc.status === newStatus) {
      return { ok: false, error: 'This incident is already in that status.' };
    }
    const allowed = STATUS_FLOW[inc.status] || [];
    if (!allowed.includes(newStatus)) {
      return { ok: false, error: `Invalid status change: cannot go from "${inc.status}" to "${newStatus}".` };
    }

    inc.status = newStatus;
    inc.updatedAt = new Date().toISOString();
    inc.timeline.push({
      time: new Date().toISOString(),
      title: detail || `Status changed to ${newStatus}`,
      detail: detail ? `Status: ${newStatus}` : null,
      icon: icon || '🔄'
    });
    this.saveAll(incidents);
    App.notifyDataChanged('status-changed');
    const reason = {
      'VERIFIED': 'verified', 'REJECTED': 'rejected', 'ACCEPTED': 'accepted',
      'DISPATCHED': 'dispatched', 'ON THE WAY': 'on-the-way',
      'ARRIVED': 'arrived', 'HANDLING': 'handling'
    }[newStatus];
    if (reason && typeof Notifications !== 'undefined') {
      Notifications.onIncidentEvent(inc, reason, actor || null);
    }
    return { ok: true, incident: inc };
  },

  /* ---- Operator: verify / reject ---- */
  verify(id, operatorName) {
    return this.updateStatus(id, INCIDENT_STATUSES.VERIFIED,
      `Incident verified by ${operatorName || 'Operator'}`, '✅', operatorName);
  },

  /* ---- Operator: reject (false report) ---- */
  reject(id, operatorName) {
    const incidents = this.getAll();
    const inc = incidents.find(i => i.id === id);
    if (!inc) return { ok: false, error: `Incident ${id} was not found.` };
    if (inc.status !== INCIDENT_STATUSES.REPORTED) {
      return { ok: false, error: 'Only newly reported (unverified) incidents can be rejected.' };
    }
    inc.status = INCIDENT_STATUSES.REJECTED;
    inc.updatedAt = new Date().toISOString();
    inc.rejectionReason = 'Marked as a false or non-actionable report.';
    inc.timeline.push({
      time: new Date().toISOString(),
      title: `Incident rejected by ${operatorName || 'Operator'}`,
      detail: 'Marked as false report / non-actionable',
      icon: '🚫'
    });
    this.saveAll(incidents);
    App.notifyDataChanged('status-changed');
    if (typeof Notifications !== 'undefined') Notifications.onIncidentEvent(inc, 'rejected', operatorName);
    return { ok: true, incident: inc };
  },
  setPriority(id, priority, operatorName) {
    if (!PRIORITIES.includes(priority)) {
      return { ok: false, error: 'Invalid priority value.' };
    }
    const incidents = this.getAll();
    const inc = incidents.find(i => i.id === id);
    if (!inc) return { ok: false, error: `Incident ${id} was not found.` };
    if (inc.priority === priority) {
      return { ok: false, error: 'Incident already has this priority.' };
    }
    inc.priority = priority;
    inc.updatedAt = new Date().toISOString();
    inc.timeline.push({
      time: new Date().toISOString(),
      title: `Priority set to ${priority}`,
      detail: `Set by ${operatorName || 'Operator'}`,
      icon: '⚠️'
    });
    this.saveAll(incidents);
    App.notifyDataChanged('priority-changed');
    if (typeof Notifications !== 'undefined') Notifications.onIncidentEvent(inc, 'priority', operatorName);
    return { ok: true, incident: inc };
  },

  /* ---- Operator: assign team (also marks team Busy) ---- */
  assignTeam(id, teamId, operatorName) {
    const incidents = this.getAll();
    const inc = incidents.find(i => i.id === id);
    if (!inc) return { ok: false, error: `Incident ${id} was not found.` };
    if (inc.status !== INCIDENT_STATUSES.VERIFIED) {
      return { ok: false, error: 'Incident must be VERIFIED before a team can be assigned.' };
    }
    if (inc.assignedTeam) {
      return { ok: false, error: 'A team is already assigned to this incident.' };
    }

    const teams = getTeams();
    const team = teams.find(t => t.id === teamId);
    if (!team) return { ok: false, error: 'Response team not found.' };
    if (team.status !== 'Available') {
      return { ok: false, error: `${team.name} is currently ${team.status.toUpperCase()} and cannot take new assignments.` };
    }

    const teamResult = Teams.markBusy(teamId, inc.id);
    if (!teamResult.ok) return teamResult;

    inc.assignedTeam = teamId;
    inc.status = INCIDENT_STATUSES.TEAM_ASSIGNED;
    inc.updatedAt = new Date().toISOString();
    inc.timeline.push({
      time: new Date().toISOString(),
      title: `Team assigned — ${team.name}`,
      detail: `Assigned by ${operatorName || 'Operator'}`,
      icon: team.icon || '🚑'
    });
    this.saveAll(incidents);
    App.notifyDataChanged('team-assigned');
    if (typeof Notifications !== 'undefined') Notifications.onIncidentEvent(inc, 'team-assigned', operatorName);
    return { ok: true, incident: inc, team: teamResult.team };
  },

  /* ---- Team: accept assignment ---- */
  acceptAssignment(id, teamName) {
    const incidents = this.getAll();
    const inc = incidents.find(i => i.id === id);
    if (!inc) return { ok: false, error: `Incident ${id} was not found.` };
    return this.updateStatus(id, INCIDENT_STATUSES.ACCEPTED,
      `Assignment accepted by ${teamName || 'Response Team'}`, '🤝', teamName);
  },

  /* ---- Team: reject assignment → back to operator queue ---- */
  returnToQueue(id, teamName) {
    const incidents = this.getAll();
    const inc = incidents.find(i => i.id === id);
    if (!inc) return { ok: false, error: `Incident ${id} was not found.` };
    if (inc.status !== INCIDENT_STATUSES.TEAM_ASSIGNED) {
      return { ok: false, error: 'Only newly assigned incidents can be rejected.' };
    }

    /* Release the team so it can be re-assigned elsewhere */
    if (inc.assignedTeam) Teams.markAvailable(inc.assignedTeam);

    inc.assignedTeam = null;
    inc.status = INCIDENT_STATUSES.VERIFIED;
    inc.updatedAt = new Date().toISOString();
    inc.timeline.push({
      time: new Date().toISOString(),
      title: `Assignment rejected by ${teamName || 'Response Team'}`,
      detail: 'Returned to control room queue — a new team must be assigned',
      icon: '↩️'
    });
    this.saveAll(incidents);
    App.notifyDataChanged('status-changed');
    return { ok: true, incident: inc };
  },


  /* ---- Team: resolve with notes (optional attachment) ---- */
  resolve(id, notes, teamName, attachment) {
    const incidents = this.getAll();
    const inc = incidents.find(i => i.id === id);
    if (!inc) return { ok: false, error: `Incident ${id} was not found.` };
    if (inc.status !== INCIDENT_STATUSES.HANDLING) {
      return { ok: false, error: 'Incident must be in HANDLING status before it can be resolved.' };
    }
    if (!notes || !notes.trim()) {
      return { ok: false, error: 'Resolution notes are required.' };
    }

    inc.status = INCIDENT_STATUSES.RESOLVED;
    inc.resolutionNotes = notes.trim();
    inc.resolvedAt = new Date().toISOString();
    inc.updatedAt = inc.resolvedAt;
    if (attachment) inc.attachments.push(attachment);
    inc.timeline.push({
      time: inc.resolvedAt,
      title: `Incident resolved by ${teamName || 'Response Team'}`,
      detail: notes.trim(),
      icon: '✔️'
    });

    /* Free the assigned team */
    if (inc.assignedTeam) Teams.markAvailable(inc.assignedTeam);

    this.saveAll(incidents);
    App.notifyDataChanged('incident-resolved');
    if (typeof Notifications !== 'undefined') Notifications.onIncidentEvent(inc, 'resolved', teamName);
    if (typeof Simulation !== 'undefined') Simulation.clear(inc.id);
    return { ok: true, incident: inc };
  },

  /* ---- Queries ---- */
  forCitizen(reporterId) {
    if (!reporterId) return [];
    return this.getAll().filter(i => i.reporterId === reporterId);
  },

  forTeam(teamId) {
    if (!teamId) return [];
    return this.getAll().filter(i => i.assignedTeam === teamId);
  },

  active(list) {
    return (list || this.getAll()).filter(i => ACTIVE_STATUSES.includes(i.status));
  },

  resolved(list) {
    return (list || this.getAll()).filter(i => i.status === INCIDENT_STATUSES.RESOLVED);
  },

  reported(list) {
    return (list || this.getAll()).filter(i => i.status === INCIDENT_STATUSES.REPORTED);
  },

  /* ---- Search / filters (operator & admin) ---- */
  filter({ search = '', status = 'ALL', type = 'ALL', priority = 'ALL', team = 'ALL', source = 'ALL', dateFrom = null, dateTo = null, sortBy = 'priority' } = {}) {
    let list = this.getAll();
    const q = search.trim().toLowerCase();

    if (q) {
      list = list.filter(i =>
        (i.id && i.id.toLowerCase().includes(q)) ||
        (i.type && i.type.toLowerCase().includes(q)) ||
        (i.locationName && i.locationName.toLowerCase().includes(q)) ||
        (i.description && i.description.toLowerCase().includes(q)) ||
        (i.reporter && i.reporter.toLowerCase().includes(q))
      );
    }
    if (status !== 'ALL')   list = list.filter(i => i.status === status);
    if (type !== 'ALL')     list = list.filter(i => i.type === type);
    if (priority !== 'ALL') list = list.filter(i => i.priority === priority);
    if (team !== 'ALL')     list = list.filter(i => i.assignedTeam === team);
    if (source !== 'ALL')   list = list.filter(i => (i.source || 'Citizen Report') === source);
    if (dateFrom)           list = list.filter(i => new Date(i.createdAt) >= new Date(dateFrom));
    if (dateTo) {
      const end = new Date(dateTo); end.setHours(23, 59, 59, 999);
      list = list.filter(i => new Date(i.createdAt) <= end);
    }

    /* Sorting: "priority" keeps the original most-urgent-then-newest order */
    const rank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const stOrder = ['REPORTED', 'VERIFIED', 'TEAM ASSIGNED', 'ACCEPTED', 'DISPATCHED', 'ON THE WAY', 'ARRIVED', 'HANDLING', 'RESOLVED', 'REJECTED'];
    if (sortBy === 'oldest') {
      return list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }
    if (sortBy === 'newest') {
      return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    if (sortBy === 'status') {
      return list.sort((a, b) =>
        ((stOrder.indexOf(a.status) < 0 ? 99 : stOrder.indexOf(a.status)) - (stOrder.indexOf(b.status) < 0 ? 99 : stOrder.indexOf(b.status))) ||
        (new Date(b.createdAt) - new Date(a.createdAt))
      );
    }
    return list.sort((a, b) =>
      ((rank[a.priority] ?? 9) - (rank[b.priority] ?? 9)) ||
      (new Date(b.createdAt) - new Date(a.createdAt))
    );
  }
};



