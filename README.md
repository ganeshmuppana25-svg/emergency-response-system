# 🚨 Emergency Response Management System — Phase 2

A fully functional, professional emergency-response web application demo built with **pure HTML, CSS & JavaScript**. All data is persisted in **LocalStorage** — no database, no backend, no AI/ML/prediction, no paid APIs.

---

## ▶ How to Run

1. Serve the folder (recommended — required for full Leaflet map behaviour):
   ```
   python -m http.server 8000        # or: npx serve .
   ```
   then open **http://localhost:8000**
2. Or double-click `index.html` (most features work; map tiles need internet).
3. The public **landing page** appears first — use **Login** or **▶ Run Emergency Demo**.

> An internet connection is needed for Leaflet/OpenStreetMap tiles (free CDN, no API key).

---

## 👥 Demo Accounts

| Role | Email | Password |
|---|---|---|
| 🧑 Citizen | `citizen@demo.com` | `demo123` |
| 🖥️ Emergency Operator | `operator@demo.com` | `demo123` |
| 🚑 Response Team (Ambulance 01) | `team@demo.com` | `demo123` |
| ⚙️ Administrator | `admin@demo.com` | `demo123` |

The login page also offers **one-click demo account** autofill buttons.

---

## ✨ Phase 2 Features

| Feature | Description |
|---|---|
| 🌐 **Public Landing Page** | Hero, About (4 roles), How It Works (6 steps), Emergency Services, Key Features, **Live Response Preview map**, System Statistics, CTA & footer — with scroll-reveal animations, mobile burger nav and Light/Dark support |
| 📍 **Real GPS** | Browser `navigator.geolocation.watchPosition()` with `enableHighAccuracy`, live status card (lat/lng/accuracy/last update), graceful handling of permission-denied / unavailable / timeout / unsupported browsers |
| 🗺️ **Advanced Map** | Leaflet + OpenStreetMap: pulsing emergency marker, citizen marker, response-vehicle marker, hospital/police/fire service markers, legend, locate-me control, route line, map instance registry (no "already initialized" errors) |
| 🚑 **Vehicle Simulation** | Dispatched teams get a **clearly labelled simulated** vehicle that drives from its base toward the incident — *not real GPS tracking* |
| ⏱ **Dynamic ETA** | Distance + **"Simulated ETA"** (remaining distance ÷ configurable average speed, default 40 km/h) — explicitly *not* a traffic prediction |

---

| 📡 **Live Incident Tracking** | Citizen tracking page: status stepper, live distance/ETA/progress band, multi-layer map, full timeline, quick `tel:` call buttons |
| 🔔 **Notification Center** | Persisted per-user notifications for every lifecycle event (created/verified/assigned/dispatched/on-the-way/arrived/handling/resolved/rejected), unread badge, mark-read, clear, de-duplicated |
| 📊 **Analytics** | Operator & Admin dashboards: totals, active/resolved/rejected, critical/high counts, team availability, average response & resolution times, CSS bar charts (by type, priority, 14-day trend, team workload) — computed **only** from LocalStorage data |
| 🔎 **Advanced Filtering** | Search + status + type + priority filters, priority-first default sorting (engine also supports team/source/date/sort) |
| ☎️ **Emergency Contacts** | Per-user contacts (add/edit/delete) stored in LocalStorage with `tel:` quick-call buttons during emergencies |
| 🏥 **Nearby Services** | Static demo hospitals/police/fire/rescue locations shown as list cards and map markers with approximate distances |
| 🎬 **Demo Mode** | Fully isolated 11-step showcase (SOS → GPS → created → verified → assigned → dispatched → moving → ETA → arrived → handling → resolved) with its own dataset that **cannot corrupt real data**; Start/Pause/Reset |
| 🌓 **Light/Dark Mode** | Full theming across landing page, login, dashboards, maps, modals, toasts and charts; persisted across refreshes |
| ⚙️ **Admin Panel** | Users/teams/incidents statistics, analytics summary, team status controls (Available/Busy/Offline), demo-data reset |

---

## 🎬 Complete Demo Flow

1. **Citizen** → login → hold the **SOS** button for 3 seconds (real GPS is captured; falls back to a map picker if permission is denied) — or use *Report Emergency*.
2. Incident created (e.g. `ER-2026-0005`), status **REPORTED**, priority **HIGH**.
3. **Operator** (open in another tab for live cross-tab alerts) → *NEW EMERGENCY RECEIVED* toast → **VERIFY INCIDENT** → set priority → **ASSIGN TEAM** (team becomes BUSY).
4. **Response Team** → **ACCEPT** → START RESPONSE → START TRAVEL → the **simulated vehicle** drives toward the scene with live distance/ETA on the tracking map → auto **ARRIVED** on arrival → START HANDLING → **RESOLVE** (notes required).
5. **Citizen** → live tracking page shows the stepper, ETA band, vehicle movement and complete timeline → incident RESOLVED.
6. **Admin** → statistics, team status controls, **RESET DEMO DATA**.

Or just click **▶ Run Emergency Demo** for the automated showcase.

---

## 🧭 Incident Lifecycle (unchanged from Phase 1)

```
REPORTED → VERIFIED → TEAM ASSIGNED → ACCEPTED → DISPATCHED
→ ON THE WAY → ARRIVED → HANDLING → RESOLVED
```

Invalid transitions (e.g. REPORTED → ACCEPTED) are blocked by `STATUS_FLOW` validation in `js/incidents.js`. Operators may also REJECT a false report (terminal state). The simulation only ever advances the lifecycle through **valid** transitions (ON THE WAY → ARRIVED on arrival).

---

## 📁 Project Structure

```
emergency system/
├── index.html          Entry point (landing + login + app shell)
├── css/styles.css      Complete design system (light/dark, responsive, animations)
├── js/
│   ├── data.js         LocalStorage keys, constants, demo data, contacts, reset
│   ├── auth.js         Login/session/role guard (no real auth — demo)
│   ├── notifications.js Toasts, modals, notification center (Phase 2)
│   ├── helpers.js      Badges, formatters, timeline/stepper, ETA widget, chips
│   ├── map.js          Leaflet maps, GPS watch, advanced markers/legend/route
│   ├── incidents.js    Incident CRUD, lifecycle engine, advanced filters
│   ├── teams.js        Team availability (Available/Busy/Offline)
│   ├── simulation.js   Vehicle simulation + ETA + isolated Demo Mode (Phase 2)
│   ├── analytics.js    Statistics & CSS charts from LocalStorage (Phase 2)
│   ├── citizen.js      Citizen dashboard, SOS, report form, tracking, contacts
│   ├── operator.js     Control room, verify/reject/assign, analytics
│   ├── team.js         Team dashboard, status flow, resolution, sim controls
│   ├── admin.js        System panel, team status controls, demo reset
│   ├── login.js        Login page behaviour
│   ├── landing.js      Public landing page (Phase 2)
│   └── app.js          Router, topbar/nav, theme, cross-tab live updates
└── smoke-test.js       Node test harness (`node smoke-test.js`) — 48 checks
```

## 💾 LocalStorage Architecture

| Key | Purpose |
|---|---|
| `ers_users` | Demo user accounts |
| `ers_incidents` | All incidents incl. timeline & attachments |
| `ers_teams` | Response teams (status, base coordinates) |
| `ers_session` | Current signed-in user (no password stored) |
| `ers_settings` | App settings (theme, avg response speed, helplines) |
| `ers_incident_counter` | Incident ID serial |
| `ers_contacts` | **Phase 2** — per-user emergency contacts |
| `ers_notifications` | **Phase 2** — per-user notification center |
| `ers_sim` | **Phase 2** — simulated vehicle state per incident |
| `ers_demo` | **Phase 2** — isolated Demo Mode dataset |

All keys are initialized safely on first launch, tolerate malformed JSON (fall back to defaults), and survive page refresh. Reset from the Admin panel.

---

## ⚠️ Scope Notes & Honest Limitations

- This is a **demonstration system** for academic purposes — **not** a production dispatch platform. In a real emergency, call your local emergency number (e.g. **112**).
- **No backend / no database** — LocalStorage is per-browser, so data does **not** sync across devices. The citizen's GPS is real on their device; other roles see the same data only in the same browser.
- **Vehicle movement is a labelled simulation** ("Simulated ETA — not a real traffic estimate"). There is **no real vehicle GPS tracking**.
- **No AI/ML/prediction** — priority is manual; ETA is distance ÷ configurable average speed.
- **No real SMS, email, or emergency-dispatch APIs** — notifications are in-app only.
- GPS accuracy depends on device/browser/environment; positions are approximate.
