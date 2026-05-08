/* =============================================
   js/penulis-dashboard.js
   Logika lengkap Dashboard Penulis
   Bergantung pada: js/main.js (CONFIG, apiFetch, escapeHtml, uploadToImgBB)
   ============================================= */

let currentFilter   = 'all';
let allArticles     = [];
let currentProfile  = null;

/* ============================================================
   AUTH — Cek login penulis, redirect jika belum login
   ============================================================ */
function checkAuth() {
    if (localStorage.getItem('penulisLoggedIn') !== 'true') {
        window.location.href = 'penulis-login.html';
        return false;
    }
    // Tampilkan nama di header
    const nameEl = document.getElementById('penulisNameDisplay');
    if (nameEl) nameEl.textContent = localStorage.getItem('penulisName') || 'Penulis';
    return true;
}

/* ============================================================
   LOGOUT
   ============================================================ */
function logoutPenulis() {
    if (!confirm('Keluar dari Dashboard Penulis?')) return;
    localStorage.removeItem('penulisLoggedIn');
    localStorage.removeItem('penulisName');
    localStorage.removeItem('penulisEmail');
    window.location.href = 'penulis-login.html';
}

/* ============================================================
   DROPDOWN USER (header)
   ============================================================ */
function initUserDropdown() {
    const wrap = document.getElementById('dropdownUser');
    const btn  = document.getElementById('dropdownUserBtn');
    if (!wrap || !btn) return;

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        wrap.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
        if (!wrap.contains(e.target)) wrap.classList.remove('open');
    });
}

/* ============================================================
   FORMAT TANGGAL
   ============================================================ */
function formatDate(str) {
    if (!str) return '—';
    const d = new Date(str);
    if (isNaN(d)) return str;
    return d.toLocaleDateString('id-ID');
}
function formatDateLong(str) {
    if (!str) return '';
    const d = new Date(str);
    if (isNaN(d)) return str;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

/* ============================================================
   LOAD PROFIL PENULIS
   ============================================================ */
async function loadProfile() {
    const email      = localStorage.getItem('penulisEmail');
    const savedName  = localStorage.getItem('penulisName') || 'Penulis';
    const profileDiv = document.getElementById('profileContent');

    if (!email) return;

    try {
        const data = await apiFetch({ action: 'getPenulisProfile', email });
        currentProfile = data;

        // Update avatar header
        const headerAvatar = document.getElementById('headerAvatar');
        if (headerAvatar && data.foto_profil) {
            headerAvatar.src = data.foto_profil;
            headerAvatar.onerror = () => {
                headerAvatar.src = `https://placehold.co/36x36/067d7d/fff?text=${savedName.charAt(0)}`;
            };
        }

        const name    = data.name || savedName;
        const hasFoto = data.status === 'success' && data.foto_profil;

        const avatarHtml = hasFoto
            ? `<img class="profile-avatar-img"
                    src="${escapeHtml(data.foto_profil)}"
                    alt="Foto Profil"
                    onerror="this.parentElement.innerHTML='<div class=\\'profile-avatar-placeholder\\'><i class=\\'fas fa-user-circle\\'></i></div>'">`
            : `<div class="profile-avatar-placeholder"><i class="fas fa-user-circle"></i></div>`;

        // Sosial media badge
        const socials = [
            { url: data.ig,        icon: 'fab fa-instagram',       cls: 'ig',  label: 'Instagram' },
            { url: data.x_twitter, icon: 'fa-brands fa-x-twitter', cls: 'tw',  label: 'X/Twitter' },
            { url: data.facebook,  icon: 'fab fa-facebook-f',      cls: 'fb',  label: 'Facebook' },
            { url: data.tiktok,    icon: 'fab fa-tiktok',           cls: 'tt',  label: 'TikTok' },
        ].filter(s => s.url);

        const socialsHtml = socials.length
            ? `<div class="profile-socials">
                ${socials.map(s =>
                    `<a class="profile-social-btn ${s.cls}"
                        href="${escapeHtml(s.url)}"
                        target="_blank" rel="noopener"
                        title="${s.label}">
                        <i class="${s.icon}"></i>
                    </a>`
                ).join('')}
               </div>`
            : '';

        profileDiv.innerHTML = `
            <div class="profile-avatar">${avatarHtml}</div>
            <p class="profile-name">${escapeHtml(name)}</p>
            ${data.tanggal_lahir
                ? `<span class="profile-birth"><i class="fas fa-cake-candles"></i> ${formatDateLong(data.tanggal_lahir)}</span>`
                : ''}
            ${data.bio
                ? `<div class="profile-bio">" ${escapeHtml(data.bio)} "</div>`
                : ''}
            ${data.alamat
                ? `<div class="profile-location"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(data.alamat)}</div>`
                : ''}
            ${socialsHtml}
        `;

    } catch (e) {
        console.error('Gagal load profil:', e);
        profileDiv.innerHTML = `
            <div class="profile-avatar-placeholder"><i class="fas fa-user-circle"></i></div>
            <p class="profile-name">${escapeHtml(savedName)}</p>
            <p style="font-size:0.82rem;color:var(--text-muted);margin-top:10px;">
                Belum ada profil. Klik "Edit Profil" untuk mengisi.
            </p>`;
    }
}

/* ============================================================
   MODAL EDIT PROFIL — Buka & Tutup
   ============================================================ */
async function openEditModal() {
    const email     = localStorage.getItem('penulisEmail');
    const savedName = localStorage.getItem('penulisName') || '';
    const modal     = document.getElementById('editProfileModal');
    const errEl     = document.getElementById('modalError');
    const sucEl     = document.getElementById('modalSuccess');

    errEl.classList.remove('show');
    sucEl.classList.remove('show');

    // Reset form
    document.getElementById('profileForm').reset();
    document.getElementById('fotoPreview').innerHTML = '';
    document.getElementById('foto_profil').value = '';

    // Isi dari profil tersimpan
    try {
        const data = await apiFetch({ action: 'getPenulisProfile', email });
        const d    = data.status === 'success' ? data : {};

        document.getElementById('profileName').value   = d.name || savedName;
        document.getElementById('tanggal_lahir').value = d.tanggal_lahir || '';
        document.getElementById('bio').value           = d.bio      || '';
        document.getElementById('alamat').value        = d.alamat   || '';
        document.getElementById('ig').value            = d.ig       || '';
        document.getElementById('x_twitter').value     = d.x_twitter || '';
        document.getElementById('facebook').value      = d.facebook  || '';
        document.getElementById('tiktok').value        = d.tiktok    || '';
        document.getElementById('foto_profil').value   = d.foto_profil || '';

        if (d.foto_profil) {
            document.getElementById('fotoPreview').innerHTML =
                `<img src="${escapeHtml(d.foto_profil)}" class="preview-avatar" alt="Preview">`;
        }
    } catch (_) { /* form tetap bisa dipakai dengan nilai kosong */ }

    modal.classList.add('show');
}

function closeEditModal() {
    document.getElementById('editProfileModal').classList.remove('show');
}

/* ============================================================
   UPLOAD FOTO PROFIL (preview + upload ke ImgBB)
   ============================================================ */
function initFotoUpload() {
    const fileInput  = document.getElementById('fotoFile');
    const statusEl   = document.getElementById('uploadStatus');
    const previewEl  = document.getElementById('fotoPreview');
    const hiddenUrl  = document.getElementById('foto_profil');

    if (!fileInput) return;

    fileInput.addEventListener('change', async () => {
        const file = fileInput.files[0];
        if (!file) return;

        // Validasi ukuran (5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Ukuran foto maksimal 5MB'); return;
        }

        // Preview lokal dulu
        const reader = new FileReader();
        reader.onload = (e) => {
            previewEl.innerHTML =
                `<img src="${e.target.result}" class="preview-avatar" alt="Preview">`;
        };
        reader.readAsDataURL(file);

        // Upload ke ImgBB
        statusEl.style.display = 'block';
        try {
            const url = await uploadToImgBB(file);
            hiddenUrl.value = url;
        } catch (e) {
            alert('Gagal upload foto: ' + e.message);
        } finally {
            statusEl.style.display = 'none';
        }
    });
}

/* ============================================================
   SIMPAN PROFIL (submit form)
   ============================================================ */
function initProfileForm() {
    const form  = document.getElementById('profileForm');
    const errEl = document.getElementById('modalError');
    const sucEl = document.getElementById('modalSuccess');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errEl.classList.remove('show');
        sucEl.classList.remove('show');

        const email      = localStorage.getItem('penulisEmail');
        const name       = document.getElementById('profileName').value.trim();
        let   fotoProfil = document.getElementById('foto_profil').value.trim();

        if (!name) {
            errEl.innerText = 'Nama lengkap harus diisi';
            errEl.classList.add('show'); return;
        }

        // Fallback avatar jika belum ada foto
        if (!fotoProfil) {
            fotoProfil = `https://ui-avatars.com/api/?background=067d7d&color=fff&name=${encodeURIComponent(name)}&size=128`;
        }

        const btn = document.getElementById('btnSaveProfile');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

        try {
            const result = await apiFetch({
                action:        'savePenulisProfile',
                email,
                foto_profil:   fotoProfil,
                name,
                tanggal_lahir: document.getElementById('tanggal_lahir').value,
                bio:           document.getElementById('bio').value,
                alamat:        document.getElementById('alamat').value,
                ig:            document.getElementById('ig').value,
                x_twitter:     document.getElementById('x_twitter').value,
                facebook:      document.getElementById('facebook').value,
                tiktok:        document.getElementById('tiktok').value,
            }, 'POST');

            if (result.status === 'success') {
                // Update localStorage nama
                localStorage.setItem('penulisName', name);
                document.getElementById('penulisNameDisplay').textContent = name;

                sucEl.innerText = '✅ Profil berhasil disimpan!';
                sucEl.classList.add('show');

                // Refresh profil card lalu tutup modal
                await loadProfile();
                setTimeout(closeEditModal, 1200);
            } else {
                errEl.innerText = '❌ ' + (result.message || 'Gagal menyimpan profil');
                errEl.classList.add('show');
            }
        } catch (e) {
            errEl.innerText = '❌ Gagal terhubung ke server: ' + e.message;
            errEl.classList.add('show');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Simpan Profil';
        }
    });
}

/* ============================================================
   LOAD DAFTAR ARTIKEL PENULIS
   ============================================================ */
async function loadArticles(filter = 'all') {
    currentFilter = filter;

    // Update tombol filter aktif
    document.querySelectorAll('#filterGroup .filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });

    const email = localStorage.getItem('penulisEmail');
    const tbody = document.getElementById('articlesTableBody');
    tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:36px;">
        <i class="fas fa-spinner fa-spin" style="color:var(--primary);font-size:1.5rem;"></i>
    </td></tr>`;

    try {
        const data = await apiFetch({ action: 'getMyArticles', author: email });
        allArticles = Array.isArray(data) ? data : [];
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:30px;color:var(--danger);">
            ❌ Gagal memuat artikel. Periksa koneksi.
        </td></tr>`;
        console.error(e);
        return;
    }

    // Hitung statistik
    const published = allArticles.filter(a => a.status === 'published');
    const drafts    = allArticles.filter(a => a.status === 'draft');
    const views     = allArticles.reduce((sum, a) => sum + (Number(a.views) || 0), 0);

    document.getElementById('statTotal').textContent     = allArticles.length;
    document.getElementById('statPublished').textContent = published.length;
    document.getElementById('statDraft').textContent     = drafts.length;
    document.getElementById('statViews').textContent     = views.toLocaleString('id-ID');

    // Filter tampilkan
    let list = allArticles;
    if (filter === 'published') list = published;
    if (filter === 'draft')     list = drafts;

    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:40px;color:var(--text-muted);">
            📭 Belum ada artikel. Klik <strong>Tulis Artikel Baru</strong> untuk memulai.
        </td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(a => `
        <tr>
            <td style="color:var(--text-muted);font-size:0.78rem;">${a.id}</td>
            <td style="max-width:240px;">
                <span title="${escapeHtml(a.title)}"
                      style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
                    ${escapeHtml(a.title)}
                </span>
            </td>
            <td>${escapeHtml(a.category || '—')}</td>
            <td>
                <span class="${a.status === 'published' ? 'status-published' : 'status-draft'} status-badge">
                    ${a.status === 'published' ? 'Published' : 'Draft'}
                </span>
            </td>
            <td style="white-space:nowrap;">${formatDate(a.created_at)}</td>
            <td>${Number(a.views || 0).toLocaleString('id-ID')}</td>
            <td>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                    <a href="penulis-editor.html?id=${a.id}"
                       class="btn-icon btn-edit" title="Edit Artikel">
                        <i class="fas fa-edit"></i>
                    </a>
                    <a href="berita-detail.html?id=${a.id}" target="_blank"
                       class="btn-icon btn-view" title="Lihat Artikel">
                        <i class="fas fa-eye"></i>
                    </a>
                    <button onclick="confirmDelete(${a.id})"
                            class="btn-icon btn-delete" title="Hapus Artikel">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`).join('');
}

/* ========== DELETE ARTIKEL ========== */
async function confirmDelete(id) {
    if (!confirm('Yakin ingin menghapus artikel ini?\nTindakan ini tidak dapat dibatalkan.')) return;

    console.log('Menghapus artikel dengan ID:', id);

    try {
        const result = await apiFetch({ action: 'deleteArticle', id }, 'GET');
        console.log('Response dari server:', result);

        if (result.status === 'success') {
            alert('✅ Artikel berhasil dihapus');
            // Refresh daftar artikel
            await loadArticles(currentFilter);
        } else {
            alert('❌ Gagal menghapus: ' + (result.message || 'Terjadi kesalahan'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Gagal terhubung ke server. Periksa koneksi internet Anda.');
    }
}

/* ============================================================
   FILTER TOMBOL
   ============================================================ */
function initFilterButtons() {
    document.querySelectorAll('#filterGroup .filter-btn').forEach(btn => {
        btn.addEventListener('click', () => loadArticles(btn.dataset.filter));
    });
}

/* ============================================================
   TUTUP MODAL saat klik backdrop
   ============================================================ */
function initModalBackdrop() {
    document.getElementById('editProfileModal')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeEditModal();
    });
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;

    // Inisialisasi semua komponen
    initDarkMode();          // dari main.js
    initUserDropdown();
    initFotoUpload();
    initProfileForm();
    initFilterButtons();
    initModalBackdrop();

    // Load data
    loadProfile();
    loadArticles('all');
});