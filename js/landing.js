/* ============================================================
   landing.js — Emergency Response Management System (ERMS)
   High-Fidelity Command Center Public Landing Page
   Rendered into #public for logged-out visitors.
   ============================================================ */

const LandingView = {
  _delegated: false,
  _onScroll: null,
  _activeMap: null,
  _vehicleInterval: null,
  _flowInterval: null,

  render(container) {
    if (!container) return;
    document.documentElement.dataset.theme = 'dark';
    container.style.display = '';
    container.innerHTML = `
      <!-- ==================== TACTICAL GLASS NAVBAR ==================== -->
      <header class="lp-nav" id="lpNav">
        <div class="lp-nav-inner">
          <a class="lp-logo" href="#home" data-nav>
            <div class="lp-logo-icon">
              <span class="logo-shield">🛡️</span>
              <span class="logo-pulse"></span>
            </div>
            <div class="lp-logo-text">
              <span class="logo-brand">ERMS</span>
              <span class="logo-sub">Emergency Response Management System</span>
            </div>
          </a>

          <button class="lp-burger" id="lpBurger" aria-label="Toggle navigation menu" aria-expanded="false">
            <span class="burger-bar"></span>
            <span class="burger-bar"></span>
            <span class="burger-bar"></span>
          </button>

          <nav class="lp-links" id="lpLinks">
            <a href="#home" data-nav class="active">Home</a>
            <a href="#live" data-nav>Live Response</a>
            <a href="#about" data-nav>About</a>
            <a href="#services" data-nav>Services</a>
            <a href="#how" data-nav>How It Works</a>
            <a href="#features" data-nav>Features</a>
            <a href="#contact" data-nav>Contact</a>

            <div class="lp-nav-actions">
              <button class="lp-btn-login" data-goto="login">Login <span class="nav-arrow">→</span></button>
            </div>
          </nav>
        </div>
      </header>

      <!-- ==================== HERO SECTION ==================== -->
      <section class="lp-hero" id="home">
        <!-- Background Grid & Dynamic Atmospheric Lighting Orbs -->
        <div class="lp-hero-grid" aria-hidden="true"></div>
        <div class="lp-hero-bg" aria-hidden="true">
          <div class="lp-orb lp-orb-blue"></div>
          <div class="lp-orb lp-orb-red"></div>
          <div class="lp-orb lp-orb-cyan"></div>
          <!-- Animated Network Communication Lines -->
          <svg class="lp-network-svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="netGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.5"/>
                <stop offset="50%" stop-color="#ef4444" stop-opacity="0.35"/>
                <stop offset="100%" stop-color="#10b981" stop-opacity="0.4"/>
              </linearGradient>
            </defs>
            <path class="net-path path-1" d="M120,480 Q360,280 620,380 T1120,240 T1380,420" />
            <path class="net-path path-2" d="M200,600 Q540,520 860,620 T1320,500" />
            <path class="net-path path-3" d="M400,180 Q720,320 1020,190 T1400,310" />
            <!-- Network Hub Nodes -->
            <g class="net-node node-1" transform="translate(620, 380)"><circle r="4" /><circle class="ping" r="9" /><text x="8" y="4">New Delhi Central</text></g>
            <g class="net-node node-2" transform="translate(1120, 240)"><circle r="4" /><circle class="ping" r="9" /><text x="8" y="4">Dispatch Hub 04</text></g>
            <g class="net-node node-3" transform="translate(860, 620)"><circle r="4" /><circle class="ping" r="9" /><text x="8" y="4">Mobile Node Alpha</text></g>
          </svg>
        </div>

        <div class="lp-hero-inner">
          <!-- Left Column: Hero Content & Live Indicators -->
          <div class="lp-hero-text">
            <div class="lp-tagline-pill">
              <span class="pill-beacon"></span>
              <span>FASTER RESPONSE &bull; SAFER COMMUNITIES &bull; STRONGER TOMORROW</span>
            </div>

            <h1 class="lp-main-heading">
              Every Second <span class="grad-alert">Saves Lives</span>
            </h1>

            <div class="lp-system-title">Emergency Response Management System</div>

            <p class="lp-desc">
              A unified emergency response platform connecting citizens, operators, response teams and administrators for faster, smarter, and more effective incident management.
            </p>

            <div class="lp-cta">
              <button class="btn lp-cta-report" data-goto="report">
                <span>🚨 Report Emergency</span>
              </button>
            </div>

            <!-- 4 Live Status Widgets (Reference image inspired) -->
            <div class="lp-hero-chips">
              <div class="status-widget">
                <span class="sw-dot dot-green"></span>
                <div class="sw-body">
                  <div class="sw-title">System Online</div>
                  <div class="sw-sub">All Services Active</div>
                </div>
              </div>

              <div class="status-widget">
                <span class="sw-dot dot-blue"></span>
                <div class="sw-body">
                  <div class="sw-title">GPS Network</div>
                  <div class="sw-sub">Live Tracking</div>
                </div>
              </div>

              <div class="status-widget">
                <span class="sw-dot dot-red"></span>
                <div class="sw-body">
                  <div class="sw-title">Response Units</div>
                  <div class="sw-sub">5 Active</div>
                </div>
              </div>

              <div class="status-widget">
                <span class="sw-dot dot-cyan"></span>
                <div class="sw-body">
                  <div class="sw-title">Network Status</div>
                  <div class="sw-sub">Stable (±5m)</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: Precision Tactical Radar & Telemetry Overlays -->
          <div class="lp-hero-visual" aria-hidden="true">
            <div class="lp-radar-wrapper">
              <!-- Floating Card Top-Left: SOS Alert Badge -->
              <div class="lp-radar-badge badge-sos">
                <div class="badge-header">
                  <span class="badge-indicator pulse-red"></span>
                  <span class="badge-title-sos">SOS</span>
                </div>
                <div class="badge-content">
                  <div class="badge-label">Signal Detected</div>
                  <div class="badge-coords">28.6139, 77.2090</div>
                </div>
              </div>

              <!-- Floating Card Top-Right: Live Monitoring Badge -->
              <div class="lp-radar-badge badge-monitoring">
                <div class="badge-header">
                  <span class="badge-indicator pulse-green"></span>
                  <span class="badge-title-green">Live Monitoring</span>
                </div>
                <ul class="badge-list">
                  <li><span class="bl-dot green"></span> 5 Response Units</li>
                  <li><span class="bl-dot amber"></span> 12 Active Incidents</li>
                  <li><span class="bl-dot cyan"></span> 98% System Uptime</li>
                </ul>
              </div>

              <!-- Tactical Radar Circle -->
              <div class="lp-radar-tactical" id="heroRadar">
                <!-- Concentric Distance Rings -->
                <div class="radar-ring r-outer"></div>
                <div class="radar-ring r1"></div>
                <div class="radar-ring r2"></div>
                <div class="radar-ring r3"></div>
                <div class="radar-ring r4"></div>

                <!-- Fine Grid & Crosshairs -->
                <div class="radar-crosshair ch-x"></div>
                <div class="radar-crosshair ch-y"></div>
                <div class="radar-diag d1"></div>
                <div class="radar-diag d2"></div>

                <!-- Cardinal Direction Labels -->
                <span class="cardinal c-n">N</span>
                <span class="cardinal c-e">E</span>
                <span class="cardinal c-s">S</span>
                <span class="cardinal c-w">W</span>

                <!-- Range Markings -->
                <span class="range-mark rm-1">5km</span>
                <span class="range-mark rm-2">10km</span>
                <span class="range-mark rm-3">15km</span>

                <!-- Continuous Sweeping Beam -->
                <div class="radar-sweep-beam"></div>

                <!-- Detection Blips -->
                <div class="radar-blip blip-1" title="Ambulance 01">
                  <span class="blip-core green"></span>
                  <span class="blip-sonar"></span>
                  <span class="blip-ico">🚑</span>
                </div>
                <div class="radar-blip blip-2" title="Police Unit 04">
                  <span class="blip-core blue"></span>
                  <span class="blip-ico">🚓</span>
                </div>
                <div class="radar-blip blip-3" title="Fire Squad 02">
                  <span class="blip-core amber"></span>
                  <span class="blip-ico">🚒</span>
                </div>
                <div class="radar-blip blip-ping-a"></div>
                <div class="radar-blip blip-ping-b"></div>

                <!-- Center Emergency Marker -->
                <div class="radar-center-hub">
                  <div class="hub-pulse"></div>
                  <div class="hub-icon">🚨</div>
                </div>

                <!-- Fine Scanline Effect -->
                <div class="radar-scanlines"></div>
              </div>

              <!-- Floating Card Bottom-Right: GPS Tracking & Safer Cities -->
              <div class="lp-radar-badge badge-gps">
                <div class="badge-header">
                  <span class="badge-indicator pulse-blue"></span>
                  <span class="badge-title-blue">GPS Tracking</span>
                </div>
                <div class="badge-content">
                  <div class="badge-label">Real-time Location</div>
                  <div class="badge-meta">Accuracy: &plusmn;5m</div>
                  <div class="badge-sub-tags">
                    <span>PEOPLE</span> &bull; <span>TECHNOLOGY</span> &bull; <span>SAFER CITIES</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <a class="lp-scroll-hint" href="#live" data-nav aria-label="Explore Live Demonstration">
          <div class="scroll-pill-wrap">
            <span class="scroll-beacon-dot"></span>
            <span class="scroll-text">EXPLORE LIVE DEMO</span>
            <span class="scroll-chevron-wrap">
              <svg class="scroll-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </span>
          </div>
        </a>
      </section>

      <!-- ==================== LIVE RESPONSE PREVIEW ==================== -->
      <section class="lp-section lp-live-section" id="live">
        <div class="section-atmosphere" aria-hidden="true">
          <div class="technical-grid"></div>
          <div class="ambient-light light-blue" style="top: 30px; left: -140px; width: 640px; height: 640px; opacity: 0.55;"></div>
          <div class="ambient-light light-cyan" style="bottom: -80px; right: -100px; width: 580px; height: 580px; opacity: 0.55;"></div>
          <div class="radar-arc-decor" style="width: 500px; height: 500px; right: -160px; top: 12%;"></div>
          <svg class="network-lines-svg" viewBox="0 0 1440 600" preserveAspectRatio="none">
            <path d="M0,80 C360,180 720,120 1440,240" stroke="rgba(6,182,212,0.20)" stroke-width="1.5" />
            <path class="rev" d="M0,450 C450,520 980,360 1440,480" stroke="rgba(59,130,246,0.18)" stroke-width="1.2" />
          </svg>
          <div class="telemetry-node cyan" style="top: 25%; left: 4%;"><span class="dot"></span><span class="ping-ring"></span></div>
          <div class="telemetry-node" style="bottom: 30%; right: 4%;"><span class="dot"></span><span class="ping-ring"></span></div>
        </div>

        <div class="section-inner">
          <div class="lp-section-head reveal">
            <div class="section-eyebrow live-eyebrow">
              <span class="eyebrow-dot"></span> LIVE DEMONSTRATION
            </div>
            <h2 class="live-section-title">Live <span class="grad-preview">Response Preview</span></h2>
            <p class="live-section-subtitle">See how ERMS coordinates emergency response in real-time, from incident report to resolution.</p>
          </div>

          <!-- 6-Stage Incident Lifecycle Flow -->
          <div class="lp-flow-wrapper reveal">
            <div class="flow-track">
              <div class="flow-line-fill"></div>
            </div>
            <div class="flow-steps">
              <div class="flow-step step-active">
                <div class="step-icon-wrap">
                  <span class="step-icon">🚨</span>
                  <span class="step-glow"></span>
                </div>
                <div class="step-num">1. Emergency Reported</div>
                <div class="step-desc">Citizen sends SOS</div>
              </div>

              <div class="flow-step">
                <div class="step-icon-wrap">
                  <span class="step-icon">🎧</span>
                </div>
                <div class="step-num">2. Operator Verification</div>
                <div class="step-desc">Incident validated</div>
              </div>

              <div class="flow-step">
                <div class="step-icon-wrap">
                  <span class="step-icon">🛡️</span>
                </div>
                <div class="step-num">3. Team Assigned</div>
                <div class="step-desc">Nearest unit allocated</div>
              </div>

              <div class="flow-step">
                <div class="step-icon-wrap">
                  <span class="step-icon">🚑</span>
                </div>
                <div class="step-num">4. Dispatched</div>
                <div class="step-desc">Team on the way</div>
              </div>

              <div class="flow-step">
                <div class="step-icon-wrap">
                  <span class="step-icon">📡</span>
                </div>
                <div class="step-num">5. Response In Progress</div>
                <div class="step-desc">Live tracking</div>
              </div>

              <div class="flow-step">
                <div class="step-icon-wrap">
                  <span class="step-icon">✅</span>
                </div>
                <div class="step-num">6. Resolved</div>
                <div class="step-desc">Incident closed</div>
              </div>
            </div>
          </div>

          <!-- Two-Column Display: Telemetry Card & Embedded Map -->
          <div class="lp-preview-grid">
            <!-- Left Column: Active Incident Telemetry Card -->
            <div class="lp-telemetry-card reveal">
              <div class="telemetry-top">
                <span class="telemetry-badge">
                  <span class="tb-dot pulse-red"></span> LIVE DEMO &bull; Simulated Incident
                </span>
              </div>

              <div class="telemetry-incident">
                <h3 class="incident-title">Medical Emergency</h3>
                <div class="incident-loc">
                  <span class="loc-pin">📍</span> Connaught Place, New Delhi
                </div>
              </div>

              <div class="telemetry-metrics">
                <div class="tm-item">
                  <div class="tm-label">Response Team</div>
                  <div class="tm-val">Ambulance 01</div>
                </div>
                <div class="tm-item">
                  <div class="tm-label">ETA</div>
                  <div class="tm-val highlight-val">4 min</div>
                </div>
                <div class="tm-item">
                  <div class="tm-label">Distance</div>
                  <div class="tm-val">1.2 km</div>
                </div>
                <div class="tm-item">
                  <div class="tm-label">Status</div>
                  <div class="tm-val status-enroute">
                    <span class="enroute-pulse"></span> En Route
                  </div>
                </div>
              </div>

              <div class="telemetry-info">
                <div class="ti-title">Specialist Units Coordinated</div>
                <div class="ti-chips">
                  <span class="ti-chip">🚑 Advanced Life Support</span>
                  <span class="ti-chip">🏥 AIIMS Trauma Center</span>
                  <span class="ti-chip">🚔 Traffic Clearance</span>
                </div>
              </div>
            </div>

            <!-- Right Column: Leaflet Map Preview with Route and Legend -->
            <div class="lp-map-container reveal">
              <div class="map-simulation-notice">
                <span class="sn-tag">DEMO SIMULATION</span>
                <span class="sn-text">(Not a real emergency)</span>
              </div>
              <div id="lpMap"></div>
              <div class="lp-map-legend-bar">
                <div class="legend-chip"><span class="lc-dot red"></span> Incident Location</div>
                <div class="legend-chip"><span class="lc-dot green"></span> Response Vehicle</div>
                <div class="legend-chip"><span class="lc-dot blue"></span> Route to Incident</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ==================== ABOUT: 4 MISSION-CRITICAL ROLES ==================== -->
      <section class="lp-section lp-about-section" id="about">
        <div class="section-atmosphere" aria-hidden="true">
          <div class="technical-grid"></div>
          <div class="ambient-light light-blue" style="top: 15%; left: 35%; width: 680px; height: 680px; opacity: 0.55;"></div>
          <div class="ambient-light light-cyan" style="bottom: -60px; left: -100px; width: 520px; height: 520px; opacity: 0.4;"></div>
          <div class="radar-arc-decor arc-cyan" style="width: 440px; height: 440px; left: -140px; top: 15%;"></div>
          <svg class="network-lines-svg" viewBox="0 0 1440 600" preserveAspectRatio="none">
            <path d="M0,120 L450,380 L920,240 L1440,460" stroke="rgba(59,130,246,0.18)" stroke-width="1.2" />
            <path class="rev" d="M0,480 C400,320 800,500 1440,200" stroke="rgba(6,182,212,0.16)" stroke-width="1" />
          </svg>
          <div class="telemetry-node" style="top: 18%; right: 4%;"><span class="dot"></span><span class="ping-ring"></span></div>
          <div class="telemetry-node emerald" style="bottom: 22%; left: 4%;"><span class="dot"></span><span class="ping-ring"></span></div>
        </div>

        <div class="section-inner">
          <div class="lp-section-head reveal">
            <div class="section-eyebrow">COMMAND &amp; CONTROL</div>
            <h2>Built Around Four Mission-Critical Roles</h2>
            <p>Every part of the emergency chain has a dedicated, role-based dashboard engineered for high-stakes coordination.</p>
          </div>
          <div class="lp-cards">
            <div class="lp-card reveal">
              <div class="lp-card-icon ic-red">👤</div>
              <h3>Citizen</h3>
              <p>
                <span class="desk-text">Report emergencies instantly with the one-touch SOS button and live GPS, then track the response vehicle and ETA in real time until resolution.</span>
                <span class="mob-text">Report emergencies instantly with SOS &amp; GPS, and track response teams in real time.</span>
              </p>
              <div class="card-role-tag">One-Touch SOS &bull; GPS</div>
            </div>

            <div class="lp-card reveal">
              <div class="lp-card-icon ic-blue">🎧</div>
              <h3>Emergency Operator</h3>
              <p>
                <span class="desk-text">Monitor the 3-column control room, verify incidents, triage priorities, assign optimal response units, and coordinate multi-agency dispatches.</span>
                <span class="mob-text">Monitor incidents, triage priorities, assign response units, and coordinate dispatches.</span>
              </p>
              <div class="card-role-tag">Control Room &bull; Triage</div>
            </div>

            <div class="lp-card reveal">
              <div class="lp-card-icon ic-green">🚑</div>
              <h3>Response Team</h3>
              <p>
                <span class="desk-text">Accept assignments, navigate vehicle travel with live telematics, manage on-scene emergency operations, and close incidents with resolution notes.</span>
                <span class="mob-text">Accept dispatches, navigate with live telematics, and manage on-scene operations.</span>
              </p>
              <div class="card-role-tag">Dispatch &bull; On-Scene</div>
            </div>

            <div class="lp-card reveal">
              <div class="lp-card-icon ic-amber">🛡️</div>
              <h3>Administrator</h3>
              <p>
                <span class="desk-text">Manage users, response teams, and fleet status, monitor comprehensive analytics and KPIs, and oversee system operations from an executive panel.</span>
                <span class="mob-text">Manage users, fleet status, and track system analytics from an executive panel.</span>
              </p>
              <div class="card-role-tag">Analytics &bull; Fleet</div>
            </div>
          </div>
        </div>
      </section>

      <!-- ==================== HOW IT WORKS ==================== -->
      <section class="lp-section lp-dk" id="how">
        <div class="section-atmosphere" aria-hidden="true">
          <div class="technical-grid"></div>
          <div class="ambient-light light-cyan" style="top: 25%; left: -80px; width: 560px; height: 560px; opacity: 0.45;"></div>
          <div class="ambient-light light-blue" style="bottom: 15%; right: -60px; width: 620px; height: 620px; opacity: 0.45;"></div>
          <div class="ambient-light light-red" style="bottom: -40px; right: 8%; width: 380px; height: 380px; opacity: 0.22;"></div>
          <div class="radar-arc-decor" style="width: 480px; height: 480px; left: -140px; bottom: 10%;"></div>
          <svg class="network-lines-svg" viewBox="0 0 1440 500" preserveAspectRatio="none">
            <path d="M0,250 L1440,250" stroke="rgba(6,182,212,0.22)" stroke-width="1.5" />
            <path class="rev" d="M0,340 C480,240 960,380 1440,290" stroke="rgba(59,130,246,0.15)" stroke-width="1" />
          </svg>
          <div class="telemetry-node cyan" style="top: 50%; left: 4%;"><span class="dot"></span><span class="ping-ring"></span></div>
          <div class="telemetry-node cyan" style="top: 50%; left: 34%;"><span class="dot"></span><span class="ping-ring"></span></div>
          <div class="telemetry-node cyan" style="top: 50%; left: 66%;"><span class="dot"></span><span class="ping-ring"></span></div>
          <div class="telemetry-node emerald" style="top: 50%; right: 4%;"><span class="dot"></span><span class="ping-ring"></span></div>
        </div>

        <div class="section-inner">
          <div class="lp-section-head reveal">
            <div class="section-eyebrow">WORKFLOW LIFECYCLE</div>
            <h2>How It Works</h2>
            <p>Six structured, validated steps from citizen report to verified resolution.</p>
          </div>
          <div class="lp-steps">
            <div class="lp-step reveal">
              <span class="lp-step-num">01</span>
              <span class="lp-step-ic">📞</span>
              <h4>REPORT</h4>
              <p>Citizen triggers an SOS or reports an emergency with browser-validated GPS coordinates.</p>
            </div>
            <div class="lp-step reveal">
              <span class="lp-step-num">02</span>
              <span class="lp-step-ic">✅</span>
              <h4>VERIFY</h4>
              <p>Operator receives immediate alert, confirms the report validity, and assigns priority level.</p>
            </div>
            <div class="lp-step reveal">
              <span class="lp-step-num">03</span>
              <span class="lp-step-ic">🚑</span>
              <h4>ASSIGN</h4>
              <p>The system triages the closest available and specialist response team across the city.</p>
            </div>
            <div class="lp-step reveal">
              <span class="lp-step-num">04</span>
              <span class="lp-step-ic">🚀</span>
              <h4>DISPATCH</h4>
              <p>Response unit accepts dispatch and departs from base station with optimal route clearance.</p>
            </div>
            <div class="lp-step reveal">
              <span class="lp-step-num">05</span>
              <span class="lp-step-ic">📡</span>
              <h4>TRACK</h4>
              <p>All parties monitor response vehicle movement, live distance, and simulated ETA on the map.</p>
            </div>
            <div class="lp-step reveal">
              <span class="lp-step-num">06</span>
              <span class="lp-step-ic">✔️</span>
              <h4>RESOLVE</h4>
              <p>Team delivers on-scene medical or emergency care and logs full resolution notes into the record.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ==================== EMERGENCY SERVICES COVERED ==================== -->
      <section class="lp-section" id="services">
        <div class="section-atmosphere" aria-hidden="true">
          <div class="technical-grid"></div>
          <div class="ambient-light light-red" style="top: -60px; right: 2%; width: 500px; height: 500px; opacity: 0.40;"></div>
          <div class="ambient-light light-blue" style="bottom: -100px; left: -60px; width: 680px; height: 680px; opacity: 0.55;"></div>
          <div class="ambient-light light-cyan" style="top: 40%; left: 45%; width: 520px; height: 520px; opacity: 0.35;"></div>
          <div class="radar-arc-decor arc-red" style="width: 460px; height: 460px; right: -130px; top: 12%;"></div>
          <svg class="network-lines-svg" viewBox="0 0 1440 700" preserveAspectRatio="none">
            <path d="M0,160 C380,320 860,120 1440,280" stroke="rgba(239,68,68,0.18)" stroke-width="1.3" />
            <path class="rev" d="M0,520 C520,420 920,600 1440,460" stroke="rgba(59,130,246,0.18)" stroke-width="1.2" />
          </svg>
          <div class="telemetry-node red" style="top: 16%; right: 4%;"><span class="dot"></span><span class="ping-ring"></span></div>
          <div class="telemetry-node" style="bottom: 25%; left: 4%;"><span class="dot"></span><span class="ping-ring"></span></div>
        </div>

        <div class="section-inner">
          <div class="lp-section-head reveal">
            <div class="section-eyebrow">OUR SERVICES</div>
            <h2>Comprehensive Emergency Response</h2>
            <p>A complete ecosystem for modern emergency management and multi-department dispatch.</p>
          </div>
          <div class="lp-services">
            <div class="lp-svc reveal">
              <div class="svc-icon-box box-red">🏥</div>
              <h4>Medical Emergency</h4>
              <p>Rapid ambulance dispatch, paramedic care, trauma triage, and seamless hospital coordination.</p>
              <div class="svc-link">Learn More <span>→</span></div>
            </div>

            <div class="lp-svc reveal">
              <div class="svc-icon-box box-blue">🚓</div>
              <h4>Police Support</h4>
              <p>Quick coordination with law enforcement agencies, perimeter security, and crime response.</p>
              <div class="svc-link">Learn More <span>→</span></div>
            </div>

            <div class="lp-svc reveal">
              <div class="svc-icon-box box-orange">🔥</div>
              <h4>Fire Response</h4>
              <p>Immediate dispatch for fire suppression, search &amp; rescue operations, and hazardous material control.</p>
              <div class="svc-link">Learn More <span>→</span></div>
            </div>

            <div class="lp-svc reveal">
              <div class="svc-icon-box box-green">🌊</div>
              <h4>Disaster Management</h4>
              <p>Coordinated multi-agency response for floods, structural collapses, earthquakes, and civil emergencies.</p>
              <div class="svc-link">Learn More <span>→</span></div>
            </div>

            <div class="lp-svc reveal">
              <div class="svc-icon-box box-amber">🚗</div>
              <h4>Road Accident</h4>
              <p>Coordinated trauma ambulance and police patrol dispatch for highway collisions and traffic rescue.</p>
              <div class="svc-link">Learn More <span>→</span></div>
            </div>

            <div class="lp-svc reveal">
              <div class="svc-icon-box box-purple">⚠️</div>
              <h4>Other Emergency</h4>
              <p>Flexible emergency routing for civic hazards, power line failures, and multi-unit specialized assistance.</p>
              <div class="svc-link">Learn More <span>→</span></div>
            </div>
          </div>
        </div>
      </section>

      <!-- ==================== KEY FEATURES ==================== -->
      <section class="lp-section lp-dk" id="features">
        <div class="section-atmosphere" aria-hidden="true">
          <div class="technical-grid"></div>
          <div class="ambient-light light-blue" style="top: -40px; left: 20%; width: 600px; height: 600px; opacity: 0.5;"></div>
          <div class="ambient-light light-cyan" style="bottom: -60px; right: 20%; width: 560px; height: 560px; opacity: 0.45;"></div>
          <div class="radar-arc-decor arc-cyan" style="width: 440px; height: 440px; right: -130px; top: 18%;"></div>
          <svg class="network-lines-svg" viewBox="0 0 1440 650" preserveAspectRatio="none">
            <path d="M50,180 L480,180 L720,440 L1380,440" stroke="rgba(6,182,212,0.16)" stroke-width="1.2" />
            <path class="rev" d="M120,540 C600,480 840,220 1340,160" stroke="rgba(59,130,246,0.15)" stroke-width="1.2" />
          </svg>
          <div class="telemetry-node cyan" style="top: 28%; left: 4%;"><span class="dot"></span><span class="ping-ring"></span></div>
          <div class="telemetry-node" style="bottom: 35%; right: 4%;"><span class="dot"></span><span class="ping-ring"></span></div>
        </div>

        <div class="section-inner">
          <div class="lp-section-head reveal">
            <div class="section-eyebrow">ENGINEERING CAPABILITIES</div>
            <h2>Key Features</h2>
            <p>Architected for realistic, mission-critical demonstration with 100% offline-resilient LocalStorage.</p>
          </div>
          <div class="lp-features">
            <div class="lp-feat reveal">
              <div class="feat-icon">🛰️</div>
              <div>
                <h4>Real GPS Positioning</h4>
                <p>High-accuracy browser geolocation with coordinate readout, accuracy metrics, and fallback picker.</p>
              </div>
            </div>

            <div class="lp-feat reveal">
              <div class="feat-icon">🗺️</div>
              <div>
                <h4>Live Incident Maps</h4>
                <p>Leaflet &amp; OpenStreetMap with custom pulsing pins, vehicle tracking, and nearby service stations.</p>
              </div>
            </div>

            <div class="lp-feat reveal">
              <div class="feat-icon">🚑</div>
              <div>
                <h4>Vehicle Simulation</h4>
                <p>Smooth, realistic dispatch vehicle movement with continuous distance and simulated ETA calculations.</p>
              </div>
            </div>

            <div class="lp-feat reveal">
              <div class="feat-icon">🔔</div>
              <div>
                <h4>Smart Notifications</h4>
                <p>Cross-tab lifecycle alerts, emergency toasts, and persisted user-specific notification logs.</p>
              </div>
            </div>

            <div class="lp-feat reveal">
              <div class="feat-icon">📊</div>
              <div>
                <h4>Analytics &amp; KPIs</h4>
                <p>Real-time analytics computation from local data with clean CSS bar charts and workload strips.</p>
              </div>
            </div>

            <div class="lp-feat reveal">
              <div class="feat-icon">🕐</div>
              <div>
                <h4>Complete Timeline</h4>
                <p>Immutable, chronological audit trail recording every state change, operator verification, and note.</p>
              </div>
            </div>

            <div class="lp-feat reveal">
              <div class="feat-icon">🌓</div>
              <div>
                <h4>Light &amp; Dark Theme</h4>
                <p>Carefully calibrated high-contrast dark command center and clean modern light mode.</p>
              </div>
            </div>

            <div class="lp-feat reveal">
              <div class="feat-icon">📱</div>
              <div>
                <h4>Fully Responsive</h4>
                <p>Precision layouts engineered for desktops, command center monitors, tablets, and smartphones.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ==================== REAL IMPACT / SYSTEM STATISTICS ==================== -->
      <section class="lp-section" id="stats">
        <div class="section-atmosphere" aria-hidden="true">
          <div class="technical-grid"></div>
          <div class="ambient-light light-blue" style="top: 15%; left: 25%; width: 720px; height: 720px; opacity: 0.65;"></div>
          <div class="ambient-light light-cyan" style="bottom: -40px; left: -60px; width: 460px; height: 460px; opacity: 0.4;"></div>
          <div class="ambient-light light-red" style="top: -50px; right: 10%; width: 380px; height: 380px; opacity: 0.22;"></div>
          <div class="radar-arc-decor arc-emerald" style="width: 420px; height: 420px; left: -140px; top: 20%;"></div>
          <svg class="network-lines-svg" viewBox="0 0 1440 550" preserveAspectRatio="none">
            <path d="M0,320 C420,180 880,400 1440,260" stroke="rgba(59,130,246,0.18)" stroke-width="1.4" />
            <path class="rev" d="M0,140 L450,420 L950,220 L1440,360" stroke="rgba(6,182,212,0.16)" stroke-width="1" />
          </svg>
          <div class="telemetry-node emerald" style="top: 25%; left: 4%;"><span class="dot"></span><span class="ping-ring"></span></div>
          <div class="telemetry-node cyan" style="bottom: 28%; right: 4%;"><span class="dot"></span><span class="ping-ring"></span></div>
        </div>

        <div class="section-inner">
          <div class="lp-section-head reveal">
            <div class="section-eyebrow">REAL IMPACT</div>
            <h2>Building Safer Communities</h2>
            <p>Through technology, coordination, and rapid emergency response.</p>
          </div>
          <div class="lp-stats-grid">
            <div class="lp-stat-card reveal">
              <div class="stat-icon-circle icon-coral">👥</div>
              <div class="stat-content">
                <div class="lp-stat-num" data-count="2500">0</div>
                <div class="stat-unit">+</div>
                <div class="lp-stat-label">Lives Impacted</div>
                <div class="stat-desc">Direct emergency assistance</div>
              </div>
            </div>

            <div class="lp-stat-card reveal">
              <div class="stat-icon-circle icon-blue">⚡</div>
              <div class="stat-content">
                <div class="lp-stat-num" data-count="98">0</div>
                <div class="stat-unit">%</div>
                <div class="lp-stat-label">Response Efficiency</div>
                <div class="stat-desc">Average response improvement</div>
              </div>
            </div>

            <div class="lp-stat-card reveal">
              <div class="stat-icon-circle icon-green">🧑‍🤝‍🧑</div>
              <div class="stat-content">
                <div class="lp-stat-num" data-count="500">0</div>
                <div class="stat-unit">+</div>
                <div class="lp-stat-label">Active Users</div>
                <div class="stat-desc">Citizens, teams and operators</div>
              </div>
            </div>

            <div class="lp-stat-card reveal">
              <div class="stat-icon-circle icon-purple">📍</div>
              <div class="stat-content">
                <div class="lp-stat-num" data-count="50">0</div>
                <div class="stat-unit">+</div>
                <div class="lp-stat-label">Response Units</div>
                <div class="stat-desc">Across the city</div>
              </div>
            </div>
          </div>

          <p class="stat-disclaimer text-center">
            Demo statistics shown for illustration — generated from LocalStorage, no database involved.
          </p>
        </div>
      </section>

      <!-- ==================== CTA BANNER ==================== -->
      <section class="lp-cta-section reveal" id="cta">
        <div class="section-atmosphere" aria-hidden="true">
          <div class="technical-grid"></div>
          <div class="ambient-light light-blue" style="top: -80px; left: 20%; width: 700px; height: 700px; opacity: 0.65;"></div>
          <div class="ambient-light light-cyan" style="bottom: -50px; right: 15%; width: 500px; height: 500px; opacity: 0.45;"></div>
          <div class="radar-arc-decor arc-cyan" style="width: 380px; height: 380px; right: -100px; top: 10%;"></div>
          <svg class="network-lines-svg" viewBox="0 0 1440 450" preserveAspectRatio="none">
            <path d="M0,220 C450,120 950,300 1440,180" stroke="rgba(59,130,246,0.22)" stroke-width="1.3" />
            <path class="rev" d="M0,320 C400,200 850,380 1440,240" stroke="rgba(6,182,212,0.15)" stroke-width="1" />
          </svg>
          <div class="telemetry-node cyan" style="top: 35%; left: 4%;"><span class="dot"></span><span class="ping-ring"></span></div>
          <div class="telemetry-node" style="bottom: 30%; right: 4%;"><span class="dot"></span><span class="ping-ring"></span></div>
        </div>
        <div class="section-inner">
          <div class="lp-cta-glass-card">
            <div class="cta-glow-mesh"></div>
            <div class="cta-left">
              <div class="cta-badge">🚨 RAPID RESPONSE PLATFORM</div>
              <h2>Ready to Make a Difference?</h2>
              <p>Join ERMS and be part of a safer, more responsive community. Test the complete emergency workflow today.</p>
            </div>
            <div class="cta-right">
              <button class="btn btn-primary btn-lg cta-btn-main" data-goto="login">
                Get Started <span class="btn-arrow">→</span>
              </button>
              <a href="#live" class="btn btn-outline btn-lg cta-btn-contact" data-nav>
                Run Live Demo
              </a>
            </div>
          </div>
        </div>
      </section>

      <!-- ==================== FOOTER ==================== -->
      <footer class="lp-footer" id="contact">
        <div class="section-atmosphere" aria-hidden="true">
          <div class="technical-grid" style="opacity: 0.35;"></div>
          <div class="ambient-light light-blue" style="top: -60px; right: 25%; width: 550px; height: 550px; opacity: 0.25;"></div>
          <svg class="network-lines-svg" viewBox="0 0 1440 400" preserveAspectRatio="none">
            <path d="M0,180 L1440,180" stroke="rgba(59,130,246,0.08)" stroke-width="1" />
          </svg>
        </div>
        <div class="section-inner">
          <div class="lp-footer-grid">
            <div class="footer-col footer-brand-col">
              <div class="lp-logo">
                <div class="lp-logo-icon"><span class="logo-shield">🛡️</span></div>
                <div class="lp-logo-text">
                  <span class="logo-brand">ERMS</span>
                  <span class="logo-sub">Emergency Response Management System</span>
                </div>
              </div>
              <p class="footer-tagline">A safer tomorrow, together.<br>Technology &bull; People &bull; Community &bull; Impact</p>
              <div class="footer-social-links">
                <span class="social-icon" title="Twitter/X">𝕏</span>
                <span class="social-icon" title="LinkedIn">in</span>
                <span class="social-icon" title="GitHub">git</span>
                <span class="social-icon" title="YouTube">yt</span>
              </div>
            </div>

            <div class="footer-col">
              <h5>Platform</h5>
              <a data-goto="login">Sign In</a>
              <a data-goto="demo">Demo Simulation</a>
              <a href="#how" data-nav>How It Works</a>
              <a href="#features" data-nav>Platform Features</a>
            </div>

            <div class="footer-col">
              <h5>Emergency Services</h5>
              <a href="#services" data-nav>Medical Emergency</a>
              <a href="#services" data-nav>Police Support</a>
              <a href="#services" data-nav>Fire Response</a>
              <a href="#services" data-nav>Disaster Management</a>
            </div>

            <div class="footer-col">
              <h5>Notice</h5>
              <p class="muted">Demonstration system for academic and emergency dispatch presentation. In a real-life emergency, always immediately dial <strong>112</strong> or your local national emergency authority.</p>
            </div>
          </div>

          <div class="lp-footer-bottom">
            <p>&copy; 2026 ERMS. All rights reserved. &bull; College Demonstration Project &bull; LocalStorage Only &bull; No Backend &bull; No Database</p>
          </div>
        </div>
      </footer>
    `;

    this.bind(container);
  },

  /* ---------- Event Binding & Click Delegation ---------- */
  bind(container) {
    if (this._delegated) {
      this._bindDynamic(container);
      return;
    }
    this._delegated = true;

    const go = (target) => {
      const s = (typeof Auth !== 'undefined' && Auth.getSession) ? Auth.getSession() : null;
      if (target === 'login') App.navTo('login');
      else if (target === 'demo') App.navTo('demo');
      else if (target === 'live' || target === '#live') {
        const el = document.getElementById('live');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
      else if (target === 'report') {
        if (s && s.role === ROLES.CITIZEN) App.navTo('citizen-report');
        else App.navTo('login');
      }
    };

    container.addEventListener('click', (e) => {
      const goto = e.target.closest('[data-goto]');
      if (goto) {
        e.preventDefault();
        const links = container.querySelector('#lpLinks');
        if (links) links.classList.remove('open');
        const burger = container.querySelector('#lpBurger');
        if (burger) burger.setAttribute('aria-expanded', 'false');
        go(goto.dataset.goto);
        return;
      }
      const nav = e.target.closest('[data-nav]');
      if (nav) {
        const target = nav.getAttribute('href') || nav.dataset.goto;
        if (target && target.startsWith('#')) {
          e.preventDefault();
          const el = document.getElementById(target.slice(1));
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
            // Close mobile menu if open
            const links = container.querySelector('#lpLinks');
            if (links) links.classList.remove('open');
            const burger = container.querySelector('#lpBurger');
            if (burger) burger.setAttribute('aria-expanded', 'false');
          }
        }
        return;
      }

      // Close mobile menu if clicked outside nav
      if (!e.target.closest('#lpNav')) {
        const links = container.querySelector('#lpLinks');
        if (links && links.classList.contains('open')) {
          links.classList.remove('open');
          const burger = container.querySelector('#lpBurger');
          if (burger) burger.setAttribute('aria-expanded', 'false');
        }
      }
    });

    this._bindDynamic(container);
  },

  /* ---------- Per-render bindings ---------- */
  _bindDynamic(container) {
    if (this._onScroll) {
      window.removeEventListener('scroll', this._onScroll);
      this._onScroll = null;
    }

    const burger = container.querySelector('#lpBurger');
    const links = container.querySelector('#lpLinks');
    if (burger && links) {
      burger.onclick = (e) => {
        e.stopPropagation();
        const isOpen = links.classList.toggle('open');
        burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      };
    }

    // Sticky nav shadow & active link highlight on scroll
    const nav = container.querySelector('#lpNav');
    if (nav) {
      // Throttle the sticky-nav state update to one paint per frame with state change guard.
      // This eliminates DOM class manipulation and style recalcs on every scroll frame.
      let isScrolled = null;
      let scrollFrame = 0;
      this._onScroll = () => {
        if (scrollFrame) return;
        scrollFrame = requestAnimationFrame(() => {
          const next = window.scrollY > 12;
          if (next !== isScrolled) {
            isScrolled = next;
            nav.classList.toggle('scrolled', isScrolled);
          }
          scrollFrame = 0;
        });
      };
      window.addEventListener('scroll', this._onScroll, { passive: true });
      this._onScroll();
    }

    // Scroll reveal observer - smooth entry with GPU compositor settling
    const reveals = container.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(en => {
          if (en.isIntersecting) {
            en.target.classList.add('in');
            io.unobserve(en.target);
            setTimeout(() => {
              en.target.classList.add('settled');
            }, 360);
          }
        });
      }, { threshold: 0.05, rootMargin: '0px 0px 80px 0px' });
      reveals.forEach(el => io.observe(el));
    } else {
      reveals.forEach(el => {
        el.classList.add('in');
        el.classList.add('settled');
      });
    }

    // Animated numerical counters for statistics
    const animateCount = (el) => {
      const target = parseInt(el.dataset.count || '0', 10);
      const dur = 1400;
      const t0 = performance.now();
      const step = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        const ease = 1 - Math.pow(1 - p, 3);
        const val = Math.round(target * ease);
        el.textContent = val.toLocaleString();
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    if ('IntersectionObserver' in window) {
      const statObserver = new IntersectionObserver((entries) => {
        entries.forEach(en => {
          if (en.isIntersecting) {
            animateCount(en.target);
            statObserver.unobserve(en.target);
          }
        });
      }, { threshold: 0.4 });
      container.querySelectorAll('.lp-stat-num').forEach(el => statObserver.observe(el));
    }

    // Live Response Lifecycle Stepper Progression (1. Emergency Reported to 6. Resolved)
    if (this._flowInterval) {
      clearInterval(this._flowInterval);
      this._flowInterval = null;
    }

    const flowSteps = container.querySelectorAll('.flow-step');
    const flowFill = container.querySelector('.flow-line-fill');

    if (flowSteps.length && flowFill) {
      let activeIdx = 0;
      const updateFlow = (idx) => {
        flowSteps.forEach((s, i) => {
          s.classList.remove('step-active', 'step-done');
          const existingGlow = s.querySelector('.step-glow');
          if (existingGlow) existingGlow.remove();

          if (i < idx) {
            s.classList.add('step-done');
          } else if (i === idx) {
            s.classList.add('step-active');
            const iconWrap = s.querySelector('.step-icon-wrap');
            if (iconWrap && !iconWrap.querySelector('.step-glow')) {
              const g = document.createElement('span');
              g.className = 'step-glow';
              iconWrap.appendChild(g);
            }
          }
        });

        // Fill line reaches from 0% at step 1 all the way to 100% at step 6 (Resolved)
        const pct = flowSteps.length > 1 ? (idx / (flowSteps.length - 1)) * 100 : 0;
        if (window.innerWidth <= 768) {
          flowFill.style.setProperty('width', '100%', 'important');
          flowFill.style.setProperty('height', '100%', 'important');
          flowFill.style.setProperty('transform', `scaleY(${pct / 100})`, 'important');
        } else {
          flowFill.style.setProperty('width', pct + '%', 'important');
          flowFill.style.setProperty('height', '100%', 'important');
          flowFill.style.removeProperty('transform');
        }
      };

      const syncTrack = () => {
        const track = container.querySelector('.flow-track');
        if (!track) return;
        if (window.innerWidth <= 768) {
          const firstIcon = flowSteps[0]?.querySelector('.step-icon-wrap');
          const lastIcon = flowSteps[flowSteps.length - 1]?.querySelector('.step-icon-wrap');
          const wrapper = container.querySelector('.lp-flow-wrapper');
          if (firstIcon && lastIcon && wrapper) {
            const wRect = wrapper.getBoundingClientRect();
            const fRect = firstIcon.getBoundingClientRect();
            const lRect = lastIcon.getBoundingClientRect();
            if (wRect.height > 0) {
              const top = (fRect.top - wRect.top) + fRect.height / 2;
              const bottom = (wRect.bottom - lRect.bottom) + lRect.height / 2;
              track.style.top = Math.round(top) + 'px';
              track.style.bottom = Math.round(bottom) + 'px';
            }
          }
        } else {
          track.style.top = '';
          track.style.bottom = '';
        }
      };

      updateFlow(0);
      syncTrack();
      window.addEventListener('resize', syncTrack, { passive: true });

      this._flowInterval = setInterval(() => {
        activeIdx++;
        if (activeIdx >= flowSteps.length) {
          activeIdx = 0;
        }
        updateFlow(activeIdx);
      }, 2000);

      // Interactive click to inspect any stage
      flowSteps.forEach((s, idx) => {
        s.style.cursor = 'pointer';
        s.setAttribute('title', 'Click to view stage ' + (idx + 1));
        s.addEventListener('click', () => {
          activeIdx = idx;
          updateFlow(idx);
        });
      });
    }

    // Floating Cards: interactive 3D levitation, smooth tilt & dynamic shine spotlight
    const radarBadges = container.querySelectorAll('.lp-radar-badge');
    radarBadges.forEach(badge => {
      let rect = null;

      const onEnter = () => {
        rect = badge.getBoundingClientRect();
        badge.classList.add('floating-card-active');
      };

      const onMove = (e) => {
        if (!rect) rect = badge.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        badge.style.setProperty('--mouse-x', `${x}px`);
        badge.style.setProperty('--mouse-y', `${y}px`);

        const tiltX = -((y - centerY) / centerY) * 9;
        const tiltY = ((x - centerX) / centerX) * 9;

        badge.style.transform = `translateY(-10px) scale(1.05) perspective(600px) rotateX(${tiltX.toFixed(1)}deg) rotateY(${tiltY.toFixed(1)}deg)`;
      };

      const onLeave = () => {
        badge.classList.remove('floating-card-active');
        badge.style.transform = '';
        badge.style.removeProperty('--mouse-x');
        badge.style.removeProperty('--mouse-y');
        rect = null;
      };

      badge.addEventListener('mouseenter', onEnter);
      badge.addEventListener('mousemove', onMove);
      badge.addEventListener('mouseleave', onLeave);
    });

    // Mount and run Leaflet Map Preview
    this.previewMap();
  },

  /* ---------- Live Response Preview Map (Leaflet + OpenStreetMap) ---------- */
  previewMap() {
    const el = document.getElementById('lpMap');
    if (!el || typeof L === 'undefined' || !ERSMap) return;

    // Clear any previous interval
    if (this._vehicleInterval) {
      clearInterval(this._vehicleInterval);
      this._vehicleInterval = null;
    }

    // Destroy existing map if already registered to prevent Leaflet container re-init errors
    if (this._activeMap) {
      try { this._activeMap.remove(); } catch (_) {}
      this._activeMap = null;
    }

    // Initialize Map centered near New Delhi Connaught Place
    const map = L.map('lpMap', {
      scrollWheelZoom: false,
      zoomControl: true
    }).setView([28.6180, 77.2120], 14);

    ERSMap.commonTile(map);
    ERSMap.register(map);
    this._activeMap = map;

    // Route coordinates: from Base Station to Connaught Place Incident
    const routeCoordinates = [
      [28.6240, 77.2145], // Start: Dispatch Station Alpha
      [28.6210, 77.2130],
      [28.6185, 77.2115],
      [28.6160, 77.2105],
      [28.6139, 77.2090]  // Incident: Connaught Place
    ];

    // Destination: Glowing SOS Emergency Marker
    const destLat = 28.6139, destLng = 77.2090;
    const destIcon = L.divIcon({
      className: 'ers-preview-marker emergency-marker',
      html: `
        <div class="lp-map-pulse-ping"></div>
        <div class="lp-map-pin red-pin">🆘</div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
    const destMarker = L.marker([destLat, destLng], { icon: destIcon }).addTo(map);
    destMarker.bindPopup(`
      <div class="map-popup-tactical">
        <strong>🚨 Medical Emergency</strong>
        <div>Connaught Place, New Delhi</div>
        <span class="status-chip high">HIGH PRIORITY</span>
      </div>
    `);

    // Draw Route Polyline with subtle glow
    const routePolyline = L.polyline(routeCoordinates, {
      color: '#3b82f6',
      weight: 5,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    // Simulated Response Vehicle (Ambulance 01)
    const vehIcon = L.divIcon({
      className: 'ers-preview-marker vehicle-marker',
      html: `
        <div class="lp-veh-wrapper">
          <div class="lp-veh-pin">🚑</div>
          <div class="lp-veh-tag">Demo Ambulance 01<br><strong>ETA: 4 min</strong></div>
        </div>
      `,
      iconSize: [140, 44],
      iconAnchor: [20, 22]
    });

    let currentStep = 0;
    const vehicleMarker = L.marker(routeCoordinates[0], { icon: vehIcon, zIndexOffset: 1000 }).addTo(map);

    // Fit map bounds neatly to route without triggering async zoom transitions
    if (routePolyline && typeof routePolyline.getBounds === 'function') {
      map.fitBounds(routePolyline.getBounds(), { padding: [40, 40], animate: false });
    }

    // Animate Vehicle along Route
    this._vehicleInterval = setInterval(() => {
      if (!this._activeMap) return;
      currentStep = (currentStep + 1) % routeCoordinates.length;
      vehicleMarker.setLatLng(routeCoordinates[currentStep]);
    }, 1200);

    setTimeout(() => {
      try { map.invalidateSize(); } catch (_) {}
    }, 200);
  },

  /* Cleanup on unmount or navigation */
  destroy() {
    if (this._vehicleInterval) {
      clearInterval(this._vehicleInterval);
      this._vehicleInterval = null;
    }
    if (this._flowInterval) {
      clearInterval(this._flowInterval);
      this._flowInterval = null;
    }
    if (this._onScroll) {
      window.removeEventListener('scroll', this._onScroll);
      this._onScroll = null;
    }
    if (this._activeMap) {
      try { this._activeMap.remove(); } catch (_) {}
      this._activeMap = null;
    }
  }
};