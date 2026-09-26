/* ============================================================
   login.js — Login page behaviour (validation & demo accounts)
   ============================================================ */

const LoginView = {
  bind() {
    const form = document.getElementById('loginForm');
    if (!form || form.dataset.bound) return;
    form.dataset.bound = '1';

    /* Navigation link on login page (Back to Home) */
    document.querySelectorAll('#login [data-goto]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const g = btn.dataset.goto;
        if (g === 'landing') App.navTo('landing');
      });
    });

    const emailEl = document.getElementById('loginEmail');
    const passEl = document.getElementById('loginPassword');
    const errBox = document.getElementById('loginError');
    const btn = document.getElementById('loginBtn');

    /* Show / hide password */
    document.getElementById('togglePass').addEventListener('click', () => {
      const isPass = passEl.type === 'password';
      passEl.type = isPass ? 'text' : 'password';
      document.getElementById('togglePass').textContent = isPass ? '🙈' : '👁️';
      passEl.focus();
    });

    /* One-click demo accounts */
    document.querySelectorAll('.demo-row').forEach(row =>
      row.addEventListener('click', () => {
        emailEl.value = row.dataset.email;
        passEl.value = row.dataset.password;
        errBox.classList.remove('show');
      }));

    /* Clear error while typing */
    [emailEl, passEl].forEach(el => el.addEventListener('input', () => {
      errBox.classList.remove('show');
      el.classList.remove('error');
    }));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = emailEl.value.trim();
      const password = passEl.value;

      /* Basic validation */
      let ok = true;
      if (!email) { emailEl.classList.add('error'); ok = false; }
      if (!password) { passEl.classList.add('error'); ok = false; }
      if (!ok) {
        errBox.textContent = '⛔ Please enter both email and password.';
        errBox.classList.add('show');
        return;
      }

      /* Simulated brief loading state */
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;"></span> Signing in…';

      setTimeout(() => {
        const res = Auth.login(email, password);
        btn.disabled = false;
        btn.textContent = '🔐 Sign In';

        if (!res.ok) {
          errBox.textContent = '⛔ ' + res.error;
          errBox.classList.add('show');
          passEl.classList.add('error');
          return;
        }

        errBox.classList.remove('show');
        UI.toast('Welcome Back', `Signed in as ${res.user.name} (${res.user.role}).`, 'success');
        App.currentRoute = Auth.dashboardFor(res.user.role);
        App.render();
        window.scrollTo({ top: 0 });
      }, 450);
    });
  }
};
