/* =============================================
   LAZISNU KEDUNGREJO - GLOBAL JAVASCRIPT
   main.js — Fungsi bersama semua halaman
   ============================================= */

/* ========== KONFIGURASI GLOBAL ========== */
const CONFIG = {
    GAS_URL:      'https://script.google.com/macros/s/AKfycbzLZjVSM20ZSlFW4xD-TMLKezjLhCtob61oDZ123eDkNH9msGE0QQLZqU-mywkXdQB_/exec',
    IMGBB_KEY:    '87caa8eb33e40264b4214e93b90ca6e3',
    REFRESH_MS:   60000, // 1 menit
};

/* ========== FORMAT RUPIAH ========== */
function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID').format(Number(angka) || 0);
}

/* ========== ESCAPE HTML ========== */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/* ========== TOGGLE PASSWORD ========== */
function togglePassword(fieldId, btn) {
    const input = document.getElementById(fieldId);
    const icon  = btn.querySelector('i');
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    }
}

/* ========== FORMAT TANGGAL ========== */
function formatDate(dateString, format = 'long') {
    if (!dateString) return '-';
    
    // Jika format ISO (mengandung T), potong bagian waktu
    let cleanDate = dateString;
    if (dateString.includes('T')) {
        cleanDate = dateString.split('T')[0];
    }
    
    const date = new Date(cleanDate);
    if (isNaN(date.getTime())) return '-';
    
    if (format === 'short') {
        return date.toLocaleDateString('id-ID', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
        });
    }
    
    return date.toLocaleDateString('id-ID', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    });
}
/* ========== DARK MODE ========== */
function initDarkMode() {
    const toggle = document.getElementById('darkModeToggle');
    if (!toggle) return;

    // Terapkan dark mode tersimpan
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        const icon = toggle.querySelector('i');
        if (icon) icon.classList.replace('fa-moon', 'fa-sun');
    }

    toggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDark);
        const icon = toggle.querySelector('i');
        if (isDark) {
            icon.classList.replace('fa-moon', 'fa-sun');
        } else {
            icon.classList.replace('fa-sun', 'fa-moon');
        }
    });
}

/* ========== MOBILE MENU ========== */
function initMobileMenu() {
    const toggle  = document.getElementById('mobileToggle');
    const navbar  = document.getElementById('navbar');
    if (!toggle || !navbar) return;

    toggle.addEventListener('click', () => navbar.classList.toggle('open'));

    // Tutup saat klik di luar
    document.addEventListener('click', (e) => {
        if (!navbar.contains(e.target) && !toggle.contains(e.target)) {
            navbar.classList.remove('open');
        }
    });
}

/* ========== DROPDOWN MOBILE ========== */
function initDropdownMobile() {
    const dropdown = document.querySelector('.dropdown');
    if (!dropdown) return;
    const dropbtn  = dropdown.querySelector('.dropbtn');
    if (!dropbtn) return;

    dropbtn.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            e.preventDefault();
            e.stopPropagation();
            dropdown.classList.toggle('open');
        }
    });

    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && !dropdown.contains(e.target)) {
            dropdown.classList.remove('open');
        }
    });
}

/* ========== NAVBAR LOGIN STATUS ========== */
function initNavbarAuth() {
    const userName    = localStorage.getItem('userName');
    const loginDropdown = document.getElementById('loginDropdown');
    if (!loginDropdown) return;

    if (userName) {
        // Ganti dropdown menjadi tombol logout
        loginDropdown.innerHTML = `
            <a href="javascript:void(0)" onclick="logoutDonatur()" style="display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;font-size:0.88rem;font-weight:500;background:var(--primary-light);color:var(--primary);">
                <i class="fas fa-user-circle"></i> ${escapeHtml(userName)}
                <i class="fas fa-sign-out-alt" style="margin-left:4px;font-size:0.75rem;"></i>
            </a>`;
    }
}

function logoutDonatur() {
    if (confirm('Keluar dari akun donatur?')) {
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userLoggedIn');
        window.location.reload();
    }
}

/* ========== FETCH HELPER ========== */
async function apiFetch(params = {}, method = 'GET') {
    if (method === 'GET') {
        const qs = new URLSearchParams(params).toString();
        const url = `${CONFIG.GAS_URL}${qs ? '?' + qs : ''}`;
        const res = await fetch(url);
        return res.json();
    } else {
        const body = new URLSearchParams(params).toString();
        const res  = await fetch(CONFIG.GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body
        });
        return res.json();
    }
}

/* ========== UPLOAD GAMBAR KE IMGBB ========== */
async function uploadToImgBB(file) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('key', CONFIG.IMGBB_KEY);
    const res    = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
    const result = await res.json();
    if (result.success) return result.data.url;
    throw new Error('Gagal upload gambar ke ImgBB');
}

/* ========== RENDER CAMPAIGN CARD ========== */
function renderCampaignCard(campaign) {
    const pct    = campaign.target > 0 ? (campaign.collected / campaign.target * 100).toFixed(1) : 100;
    const badge  = campaign.status === 'active'
        ? '<span class="badge badge-active">Aktif</span>'
        : '<span class="badge badge-ended">Berakhir</span>';
    const isEnded = campaign.status !== 'active';
    const btnCls  = isEnded ? 'btn-primary w-100 btn-sm' : 'btn-primary w-100 btn-sm';
    const btnText = isEnded
        ? '<i class="fas fa-ban"></i> Donasi Berakhir'
        : '<i class="fas fa-hand-holding-heart"></i> Donasi Sekarang';

    const progressHtml = campaign.target !== 0 ? `
        <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(pct,100)}%"></div></div>
        <div class="campaign-stats">
            <span>Rp ${formatRupiah(campaign.collected)}</span>
            <span>${pct}%</span>
        </div>` : `
        <div class="campaign-stats">
            <span>Rp ${formatRupiah(campaign.collected)} terkumpul</span>
            <span>Target Unlimited</span>
        </div>`;

    return `
        <div class="campaign-card" onclick="window.location.href='donasi.html?id=${campaign.id}'">
            <img src="${campaign.image_url || 'https://placehold.co/600x400?text=Campaign'}"
                 alt="${escapeHtml(campaign.title)}"
                 onerror="this.src='https://placehold.co/600x400?text=Campaign'">
            <div class="campaign-body">
                <div class="campaign-meta">
                    <span class="campaign-title">${escapeHtml(campaign.title)}</span>
                    ${badge}
                </div>
                ${progressHtml}
                <div class="campaign-deadline"><i class="fas fa-calendar-alt"></i> Deadline: ${formatDate(campaign.deadline)}</div>
                <button class="${btnCls}" ${isEnded ? 'disabled' : ''} style="margin-top:14px">${btnText}</button>
            </div>
        </div>`;
}

/* ========== RENDER BERITA CARD ========== */
function renderBeritaCard(article) {
    let dateStr = article.created_at;
if (dateStr && dateStr.includes('T')) {
    dateStr = dateStr.split('T')[0];
}
const date = new Date(dateStr);
const day = date.getDate();
const month = date.toLocaleString('id', { month: 'short' });
    return `
        <div class="berita-card" onclick="window.location.href='artikel-detail.html?id=${article.id}'">
            <div class="berita-image-wrapper">
                <img class="berita-image"
                     src="${article.featured_image || 'https://placehold.co/600x400?text=Berita'}"
                     alt="${escapeHtml(article.title)}"
                     onerror="this.src='https://placehold.co/600x400?text=Berita'">
                <span class="berita-category"><i class="fas fa-tag"></i> ${escapeHtml(article.category)}</span>
                <div class="berita-date">
                    <span class="day">${day}</span>
                    <span class="month">${month}</span>
                </div>
            </div>
            <div class="berita-content">
                <h3 class="berita-title">${escapeHtml(article.title)}</h3>
                <p class="berita-excerpt">${escapeHtml(article.excerpt)}</p>
                <span class="berita-readmore">Baca Selengkapnya <i class="fas fa-arrow-right"></i></span>
            </div>
        </div>`;
}

/* ========== SCROLL REVEAL ========== */
function initScrollReveal(selector) {
    const els = document.querySelectorAll(selector);
    if (!els.length) return;
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add('revealed');
                obs.unobserve(e.target);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    els.forEach(el => obs.observe(el));
}

/* ========== ANIMASI ANGKA ========== */
function animateNumber(el, from, to, duration, isRupiah = false) {
    if (!el) return;
    let start = null;
    const step = (ts) => {
        if (!start) start = ts;
        const progress = Math.min((ts - start) / duration, 1);
        const current  = Math.floor(progress * (to - from) + from);
        el.innerText   = isRupiah ? formatRupiah(current) : current;
        if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

/* ========== HERO SLIDESHOW ========== */
function initHeroSlideshow() {
    const slides = document.querySelectorAll('.hero-slide');
    if (!slides.length) return;
    let cur = 0;
    const next = () => {
        slides[cur].classList.remove('active');
        cur = (cur + 1) % slides.length;
        slides[cur].classList.add('active');
    };
    let timer = setInterval(next, 5000);
    const hero = document.querySelector('.hero');
    if (hero) {
        hero.addEventListener('mouseenter', () => clearInterval(timer));
        hero.addEventListener('mouseleave', () => { timer = setInterval(next, 5000); });
    }
}

/* ========== HEADER NAVBAR (Shared HTML) ========== */
// Gunakan ini jika halaman butuh navbar yang sama
function renderNavbar(activePage = '') {
    const pages = [
        { href: 'index.html',    label: 'Beranda',       key: 'index' },
        { href: 'programs.html', label: 'Program Donasi',key: 'programs' },
        { href: 'artikel.html',   label: 'Berita',        key: 'berita' },
    ];
    const links = pages.map(p => `
        <li><a href="${p.href}" class="${activePage === p.key ? 'active' : ''}">${p.label}</a></li>
    `).join('');

    return `
        <li>${links}</li>
        <li class="dropdown" id="loginDropdown">
            <a href="javascript:void(0)" class="dropbtn">Masuk <i class="fas fa-chevron-down"></i></a>
            <div class="dropdown-content">
                <a href="login.html"><i class="fas fa-hand-holding-heart"></i> <span>Sebagai Donatur</span></a>
                <a href="penulis-login.html"><i class="fas fa-pen-fancy"></i> <span>Sebagai Penulis</span></a>
                <a href="admin-login.html"><i class="fas fa-shield-alt"></i> <span>Sebagai Admin</span></a>
            </div>
        </li>
        <li><button id="darkModeToggle" class="dark-toggle"><i class="fas fa-moon"></i></button></li>
    `;
}

/* ========== FOOTER (Shared HTML) ========== */
function renderFooter() {
    return `
        <div class="footer-grid">
            <div>
                <img src="assets/logo.png" alt="Logo" height="35" style="filter:brightness(0) invert(1);margin-bottom:14px;">
                <p>Jl. Brigjen Katamso, Kedungrejo, Waru, Sidoarjo 61256</p>
                <div class="social-icons" style="margin-top:16px;">
                    <a href="#"><i class="fab fa-facebook"></i></a>
                    <a href="#"><i class="fab fa-instagram"></i></a>
                    <a href="#"><i class="fab fa-whatsapp"></i></a>
                </div>
            </div>
            <div>
                <h4>Tentang Kami</h4>
                <ul>
                    <li><a href="#">Profil Lazisnu</a></li>
                    <li><a href="#">Cara Berdonasi</a></li>
                    <li><a href="#">FAQ</a></li>
                </ul>
            </div>
            <div>
                <h4>Program</h4>
                <ul>
                    <li><a href="programs.html">Zakat</a></li>
                    <li><a href="programs.html">Wakaf</a></li>
                    <li><a href="programs.html">Qurban</a></li>
                </ul>
            </div>
            <div>
                <h4>Kontak</h4>
                <ul>
                    <li><a href="#">📍 Kedungrejo, Waru</a></li>
                    <li><a href="#">📞 +62 xxx-xxxx-xxxx</a></li>
                    <li><a href="#">✉️ info@lazisnu.com</a></li>
                </ul>
            </div>
        </div>
        <div class="copyright">© 2025 NU-Care Lazisnu Kedungrejo | Berbagi Berkah, Membangun Umat</div>
    `;
}

/* ========== INISIALISASI BERSAMA (dipanggil di setiap halaman publik) ========== */
function initCommon() {
    initDarkMode();
    initMobileMenu();
    initDropdownMobile();
    initNavbarAuth();
}
