/* ============================================================
   map.js — Leaflet + OpenStreetMap (Phase 1: incident display
   & location selection only; no live vehicle tracking)
   ============================================================ */

const ERSMap = {
  /* Default demo location if browser geolocation is denied */
  DEMO_CENTER: [28.6139, 77.2090],

  /* Registry of live Leaflet instances (destroyed on navigation) */
  registry: [],

  register(map) {
    this.registry.push(map);
    return map;
  },

  destroyAll() {
    this.registry.forEach(m => {
      try { m.remove(); } catch (_) {}
    });
    this.registry = [];
  },

  /* Show a read-only incident map with a clickable marker popup */
  showIncidentMap(containerId, incident, { height = 'map-box' } = {}) {
    const el = document.getElementById(containerId);
    if (!el) return null;
    el.className = height;
    const lat = incident.latitude, lng = incident.longitude;
    if (lat == null || lng == null) {
      el.innerHTML = '<div class="empty-state"><div class="es-icon">🗺️</div><h4>No location recorded</h4><p>This incident has no coordinates.</p></div>';
      return null;
    }

    const map = L.map(containerId, { scrollWheelZoom: false }).setView([lat, lng], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    this.register(map);

    const typeIcon = Incidents_TypeIcon(incident.type);
    const marker = L.marker([lat, lng]).addTo(map);
    marker.bindPopup(`
      <div>
        <div class="popup-inc-id">${incident.id}</div>
        <div style="font-weight:700; margin-bottom:2px;">${typeIcon} ${incident.type}</div>
        <div style="color:var(--text-2); font-size:11.5px;">${incident.locationName || ''}</div>
        <div class="popup-badge">
          ${UI.statusBadge(incident.status)}
          ${UI.priorityBadge(incident.priority)}
        </div>
      </div>
    `);
    setTimeout(() => marker.openPopup(), 350);
    return map;
  },

  /* Interactive location picker (report form & SOS demo location) */
  createLocationPicker(containerId, { lat = null, lng = null, onPick = null } = {}) {
    const el = document.getElementById(containerId);
    if (!el) return null;
    const start = lat != null && lng != null ? [lat, lng] : this.DEMO_CENTER;

    const map = L.map(containerId, { scrollWheelZoom: true }).setView(start, lat != null ? 15 : 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    this.register(map);

    let pickerMarker = null;
    if (lat != null && lng != null) {
      pickerMarker = L.marker([lat, lng]).addTo(map);
    }

    const pick = (lat, lng) => {
      if (pickerMarker) pickerMarker.setLatLng([lat, lng]);
      else pickerMarker = L.marker([lat, lng]).addTo(map);
      if (onPick) onPick(lat, lng);
    };

    map.on('click', (e) => pick(e.latlng.lat, e.latlng.lng));
    map._ersPick = pick;
    return map;
  },

  /* ---------- GPS state (session-scoped, not persisted) ---------- */
  _gps: { watchId: null, active: false, lat: null, lng: null, accuracy: null, lastUpdate: null, error: null },

  /* Current GPS status (read-only snapshot) */
  gpsStatus() {
    return { ...this._gps };
  },

  /* Start watching citizen location with high accuracy */
  watchLocation({ onUpdate = null, onError = null, timeout = 15000 } = {}) {
    if (!navigator.geolocation) {
      this._gps = { watchId: null, active: false, lat: null, lng: null, accuracy: null, lastUpdate: null, error: 'Geolocation is not supported by this browser.' };
      if (onError) onError(this._gps.error);
      return false;
    }

    // Clear any existing watcher
    this.stopWatch();

    const opts = { enableHighAccuracy: true, timeout: timeout, maximumAge: 0 };

    this._gps.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        this._gps = {
          watchId: this._gps.watchId,
          active: true,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          lastUpdate: new Date().toISOString(),
          error: null
        };
        if (onUpdate) onUpdate(this.gpsStatus());
      },
      (err) => {
        const messages = {
          1: 'Location permission denied. You can select a demo location on the map instead.',
          2: 'Location is currently unavailable. You can select a demo location on the map instead.',
          3: 'Location request timed out. You can select a demo location on the map instead.'
        };
        this._gps = {
          watchId: this._gps.watchId,
          active: false,
          lat: this._gps.lat,
          lng: this._gps.lng,
          accuracy: this._gps.accuracy,
          lastUpdate: this._gps.lastUpdate,
          error: messages[err.code] || 'Could not get your location.'
        };
        if (onError) onError(this._gps.error);
      },
      opts
    );
    return true;
  },

  /* Stop watching location */
  stopWatch() {
    if (this._gps.watchId != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this._gps.watchId);
    }
    this._gps.watchId = null;
    this._gps.active = false;
  },

  /* Browser geolocation — single-shot for non-SOS use */
  getUserLocation() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ ok: false, reason: 'Geolocation is not supported by this browser.', demo: true });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          ok: true,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        }),
        (err) => {
          const messages = {
            1: 'Location permission was denied. You can select a demo location on the map instead.',
            2: 'Location is currently unavailable. You can select a demo location on the map instead.',
            3: 'Location request timed out. You can select a demo location on the map instead.'
          };
          resolve({ ok: false, reason: messages[err.code] || 'Could not get your location.', demo: true });
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    });
  }
};

function Incidents_TypeIcon(type) {
  const icons = {
    'Medical': '🚑', 'Fire': '🔥', 'Road Accident': '🚗', 'Security': '🚨',
    'Flood': '🌊', 'Electrical': '⚡', 'Building Emergency': '🏢',
    'Emergency/SOS': '🆘', 'Other': '❓'
  };
  return icons[type] || '❓';
}

/* ============================================================
   map.js — Phase 2 advanced map layer
   (markers, legend, route, locate — extend, never replace)
   ============================================================ */
(function () {
  const svcColor = { 'Hospital': '#dc2626', 'Police Station': '#1d4ed8', 'Fire Station': '#ea580c', 'Rescue Unit': '#0891b2' };

  ERSMap.isSupported = function () {
    return typeof navigator !== 'undefined' && !!navigator.geolocation;
  };

  ERSMap.commonTile = function (map) {
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    return map;
  };

  /* Reusable div-icon builder */
  ERSMap.divMarker = function ({ className = '', html = '', size = [26, 26], anchor = 'center', zIndexOffset = 0 } = {}) {
    if (typeof L === 'undefined') return null;
    const aMap = { center: [size[0] / 2, size[1] / 2], bottom: [size[0] / 2, size[1]] };
    return L.divIcon({
      className: `ers-div ${className}`,
      html,
      iconSize: size,
      iconAnchor: aMap[anchor] || aMap.center,
      popupAnchor: [0, -size[1] / 2],
      zIndexOffset
    });
  };

  ERSMap.addEmergencyMarker = function (map, incident, { pulse = true } = {}) {
    if (typeof L === 'undefined') return null;
    const icon = ERSMap.divMarker({
      className: 'ers-marker-emergency',
      html: `<div class="em-pulse ${pulse ? 'pulsing' : ''}"><span class="em-pin">${Incidents_TypeIcon(incident.type)}</span></div>`,
      size: [44, 44], anchor: 'center', zIndexOffset: 500
    });
    const m = L.marker([incident.latitude, incident.longitude], { icon }).addTo(map);
    m.bindPopup(`<div><div class="popup-inc-id">${esc(incident.id)}</div>
      <div style="font-weight:700">${Incidents_TypeIcon(incident.type)} ${esc(incident.type)}</div>
      <div class="popup-badge">${UI.priorityBadge(incident.priority)} ${UI.statusBadge(incident.status)}</div></div>`);
    return m;
  };

  ERSMap.addCitizenMarker = function (map, lat, lng, { label = 'Citizen' } = {}) {
    if (typeof L === 'undefined') return null;
    const icon = ERSMap.divMarker({
      className: 'ers-marker-citizen',
      html: `<div class="cit-pin">🧍</div>`, size: [30, 30], anchor: 'bottom', zIndexOffset: 400
    });
    const m = L.marker([lat, lng], { icon }).addTo(map);
    m.bindPopup(`<div style="font-weight:700">👤 ${esc(label)}</div><div style="color:var(--text-2);font-size:11.5px">Citizen location</div>`);
    return m;
  };

  ERSMap.addVehicleMarker = function (map, lat, lng, { icon = '🚑', label = 'Response Team' } = {}) {
    if (typeof L === 'undefined') return null;
    const mk = L.marker([lat, lng], {
      icon: ERSMap.divMarker({
        className: 'ers-marker-vehicle',
        html: `<div class="veh-pin moving">${icon}</div>`, size: [30, 30], anchor: 'center', zIndexOffset: 600
      })
    }).addTo(map);
    mk.bindPopup(`<div style="font-weight:700">${icon} ${esc(label)}</div><div style="color:var(--text-2);font-size:11.5px">Simulated response vehicle</div>`);
    return mk;
  };

  ERSMap.addServiceMarkers = function (map, services = NEARBY_SERVICES) {
    if (typeof L === 'undefined') return [];
    return services.map(s => {
      const icon = ERSMap.divMarker({
        className: 'ers-marker-service',
        html: `<div class="svc-pin" style="border-color:${svcColor[s.type] || '#64748b'}">${s.icon}</div>`,
        size: [26, 26], anchor: 'center', zIndexOffset: 300
      });
      const m = L.marker([s.lat, s.lng], { icon }).addTo(map);
      const dist = map._ersCenter ? haversineKm(map._ersCenter[0], map._ersCenter[1], s.lat, s.lng) : null;
      m.bindPopup(`<div style="font-weight:700">${s.icon} ${esc(s.name)}</div>
        <div style="color:var(--text-2);font-size:11.5px">${esc(s.type)}${dist != null ? ' · ~' + fmtDist(dist) : ''}</div>`);
      return m;
    });
  };

  ERSMap.addLegend = function (map, items) {
    if (typeof L === 'undefined' || !items || !items.length) return null;
    const Legend = L.Control.extend({
      onAdd() {
        const el = L.DomUtil.create('div', 'ers-legend');
        el.innerHTML = items.map(it => `
          <div class="ers-legend-item"><span class="lg-dot" style="background:${it.color || '#64748b'}">${it.icon || ''}</span><span>${esc(it.label)}</span></div>
        `).join('');
        return el;
      }
    });
    return new Legend({ position: 'bottomleft' }).addTo(map);
  };

  ERSMap.addRouteLine = function (map, from, to, { color = '#1d4ed8' } = {}) {
    if (typeof L === 'undefined') return null;
    return L.polyline([[from.lat, from.lng], [to.lat, to.lng]], {
      color, weight: 3, dashArray: '6 6', opacity: 0.75
    }).addTo(map);
  };

  ERSMap.addLocateControl = function (map, { onLocate = null } = {}) {
    if (typeof L === 'undefined' || !ERSMap.isSupported()) return null;
    const LocCtrl = L.Control.extend({
      options: { position: 'topleft' },
      onAdd() {
        const btn = L.DomUtil.create('button', 'ers-locate-btn');
        btn.type = 'button'; btn.innerHTML = '◎'; btn.title = 'Center on my current location';
        btn.addEventListener('click', async () => {
          btn.classList.add('loading');
          const loc = await ERSMap.getUserLocation();
          btn.classList.remove('loading');
          if (loc.ok) {
            map.setView([loc.latitude, loc.longitude], 15);
            if (onLocate) onLocate(loc);
          } else if (typeof UI !== 'undefined') {
            UI.toast('Location Unavailable', loc.reason, 'warning');
          }
        });
        return btn;
      }
    });
    return new LocCtrl().addTo(map);
  };

  ERSMap.fitTo = function (map, pts) {
    if (typeof L === 'undefined' || !pts || !pts.length) return;
    const b = L.latLngBounds(pts.map(p => [p.lat, p.lng]));
    map.fitBounds(b.pad(0.3), { maxZoom: 15 });
  };

  ERSMap.invalidate = function (containerId) {
    const map = this.registry.find(m => m.getContainer && m.getContainer().id === containerId);
    if (map) { try { map.invalidateSize(); } catch (_) {} }
    return map;
  };

  /* Multi-layer live tracking map used by citizen / team / operator views */
  ERSMap.showTrackingMap = function (containerId, { incident, vehicle = null, services = true, legend = true, locate = true } = {}) {
    const el = document.getElementById(containerId);
    if (!el || typeof L === 'undefined') return null;
    const rawLat = incident?.latitude, rawLng = incident?.longitude;
    const lat = Number(rawLat), lng = Number(rawLng);
    if (rawLat == null || rawLng == null || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      el.className = 'map-box';
      el.innerHTML = '<div class="empty-state"><div class="es-icon">🗺️</div><h4>Invalid location</h4><p>The incident coordinates are not valid.</p></div>';
      return null;
    }
    if (lat == null || lng == null) {
      el.innerHTML = '<div class="empty-state"><div class="es-icon">🗺️</div><h4>No location recorded</h4></div>';
      return null;
    }
    el.className = 'map-box';
    const map = ERSMap.commonTile(L.map(containerId, { scrollWheelZoom: false })).setView([lat, lng], 14);
    map._ersCenter = [lat, lng];
    ERSMap.register(map);

    const emergency = ERSMap.addEmergencyMarker(map, incident);
    const citizen = ERSMap.addCitizenMarker(map, lat, lng);
    if (services) ERSMap.addServiceMarkers(map);
    if (legend) {
      ERSMap.addLegend(map, [
        { icon: '🔴', color: '#dc2626', label: 'Emergency' },
        { icon: '👤', color: '#1a56db', label: 'Citizen' },
        { icon: vehicle?.icon || '🚑', color: '#16a34a', label: 'Response Vehicle' },
        { icon: '🏥', color: '#dc2626', label: 'Hospital' },
        { icon: '🚓', color: '#1d4ed8', label: 'Police' },
        { icon: '🚒', color: '#ea580c', label: 'Fire Station' }
      ]);
    }
    let vehicleMarker = null, routeLine = null;
    if (vehicle) {
      vehicleMarker = ERSMap.addVehicleMarker(map, vehicle.lat, vehicle.lng, { icon: vehicle.icon || '🚑', label: vehicle.label || 'Response Team' });
      routeLine = ERSMap.addRouteLine(map, { lat: vehicle.lat, lng: vehicle.lng }, { lat, lng });
      ERSMap.fitTo(map, [{ lat: vehicle.lat, lng: vehicle.lng }, { lat, lng }]);
    }
    if (locate) ERSMap.addLocateControl(map);

    const api = { map, emergency, citizen, vehicleMarker, routeLine, dest: { lat, lng } };
    api.moveVehicle = function (vlat, vlng, icon) {
      if (vehicleMarker) {
        if (icon) {
          vehicleMarker.setIcon(ERSMap.divMarker({
            className: 'ers-marker-vehicle',
            html: `<div class="veh-pin moving">${icon}</div>`, size: [30, 30], anchor: 'center', zIndexOffset: 600
          }));
        }
        vehicleMarker.setLatLng([vlat, vlng]);
      }
      if (routeLine) routeLine.setLatLngs([[vlat, vlng], [lat, lng]]);
    };
    setTimeout(() => { try { map.invalidateSize(); } catch (_) {} }, 120);
    return api;
  };
})();
