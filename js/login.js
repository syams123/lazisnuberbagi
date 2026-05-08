/* js/login.js — Login Donatur */

async function donaturLogin() {
    const email    = document.getElementById('donaturEmail').value.trim();
    const password = document.getElementById('donaturPassword').value;
    const errEl    = document.getElementById('alertError');
    const btn      = document.getElementById('loginBtn');

    errEl.classList.remove('show');

    if (!email || !password) {
        errEl.innerText = 'Email dan password harus diisi';
        errEl.classList.add('show');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memeriksa...';

    try {
        const data = await apiFetch({ action: 'donaturLogin', email, password }, 'POST');
        if (data.status === 'success') {
            localStorage.setItem('userName', data.name);
            localStorage.setItem('userEmail', email);
            localStorage.setItem('userLoggedIn', 'true');
            window.location.href = 'index.html';
        } else {
            errEl.innerText = 'Email atau password salah';
            errEl.classList.add('show');
        }
    } catch (e) {
        errEl.innerText = 'Gagal terhubung ke server';
        errEl.classList.add('show');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Masuk';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('donaturPassword')?.addEventListener('keypress', e => {
        if (e.key === 'Enter') donaturLogin();
    });
});