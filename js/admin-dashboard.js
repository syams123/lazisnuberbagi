/* ============================================================
   admin-dashboard.js  —  Logic halaman Admin Dashboard
   Bergantung pada main.js:
     - CONFIG.GAS_URL  : endpoint Google Apps Script
     - escapeHtml()    : sanitasi output HTML
     - uploadToImgBB() : upload file → return URL string
     - formatRupiah()  : format angka ke Rupiah
   ============================================================ */

/* ── State ──────────────────────────────────────────────────── */
var _categories   = [];    // cache kategori
var _isSubmitting = false; // cegah double-submit

/* ─────────────────────────────────────────────────────────────
   AUTH
───────────────────────────────────────────────────────────── */
function checkAdminSession() {
  if (localStorage.getItem('adminLoggedIn') !== 'true') {
    window.location.href = 'admin-login.html';
    return false;
  }
  var name = localStorage.getItem('adminName') || 'Admin';
  var el   = document.getElementById('adminName');
  if (el) el.textContent = name;
  return true;
}

function logout() {
  if (!confirm('Yakin ingin keluar?')) return;
  localStorage.removeItem('adminLoggedIn');
  localStorage.removeItem('adminName');
  localStorage.removeItem('adminEmail');
  window.location.href = 'admin-login.html';
}

/* ─────────────────────────────────────────────────────────────
   DARK MODE
───────────────────────────────────────────────────────────── */
function initDarkMode() {
  var btn = document.getElementById('darkModeToggle');
  if (!btn) return;

  // Terapkan state tersimpan
  if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
    var icon = btn.querySelector('i');
    if (icon) { icon.classList.remove('fa-moon'); icon.classList.add('fa-sun'); }
  }

  btn.addEventListener('click', function () {
    document.body.classList.toggle('dark-mode');
    var isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    var ic = btn.querySelector('i');
    if (ic) {
      ic.classList.toggle('fa-moon', !isDark);
      ic.classList.toggle('fa-sun',   isDark);
    }
  });
}

/* ─────────────────────────────────────────────────────────────
   FETCH HELPERS (pakai apiFetch dari main.js)
───────────────────────────────────────────────────────────── */
async function fetchCampaigns() {
  try {
    var data = await apiFetch({ action: 'getCampaigns' });
    if (!Array.isArray(data)) throw new Error('Response bukan array');
    renderCampaignTable(data);
    return data;
  } catch (err) {
    console.error('fetchCampaigns:', err);
    document.getElementById('campaignTableBody').innerHTML =
      '<tr><td colspan="9" class="text-center" style="padding:30px;">❌ Gagal memuat data. Periksa koneksi.</td></tr>';
    return [];
  }
}

async function fetchCategories() {
  try {
    var data = await apiFetch({ action: 'getCategories' });
    _categories = Array.isArray(data) ? data : [];
    if (_categories.length === 0) throw new Error('Kosong');
  } catch (_) {
    _categories = ['Pendidikan','Kesehatan','Kemanusiaan','Bencana Alam','Rumah Ibadah','Sosial','Ekonomi','Dakwah'];
  }
  renderCategorySelect('category');
}

async function fetchStats() {
  try {
    var stats = await apiFetch({ action: 'getStats' });
    var el = function (id) { return document.getElementById(id); };
    el('statTotalDonasi').textContent  = 'Rp ' + formatRupiah(stats.totalDonation   || 0);
    el('statCampaignAktif').textContent = stats.activeCampaigns || 0;
    el('statTotalDonatur').textContent  = stats.totalDonatur    || 0;
  } catch (err) {
    console.error('fetchStats:', err);
  }
}

/* ─────────────────────────────────────────────────────────────
   REFRESH SEMUA
───────────────────────────────────────────────────────────── */
async function refreshAllData() {
  // Animasi tombol refresh
  var btn = document.getElementById('btnRefresh');
  if (btn) btn.classList.add('spinning');

  await Promise.all([ fetchCampaigns(), fetchCategories(), fetchStats() ]);

  if (btn) btn.classList.remove('spinning');
}

/* ─────────────────────────────────────────────────────────────
   RENDER TABEL CAMPAIGN
───────────────────────────────────────────────────────────── */
function renderCampaignTable(campaigns) {
    var tbody = document.getElementById('campaignTableBody');
    if (!tbody) return;

    if (!campaigns || campaigns.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center" style="padding:30px;">' +
            '📭 Belum ada campaign. Klik <strong>+ Tambah Campaign</strong> untuk membuat.</td></tr>';
        return;
    }

    tbody.innerHTML = campaigns.map(function (c) {
        var pct = c.target > 0 ? (c.collected / c.target * 100).toFixed(1) : 0;
        var badge = c.status === 'active'
            ? '<span class="badge-active">Aktif</span>'
            : '<span class="badge-ended">Berakhir</span>';
        var imgSrc = c.image_url || 'https://placehold.co/50x50?text=No+Img';
        
        // PERBAIKAN: Format deadline dari ISO ke format Indonesia
        var formattedDeadline = formatDate(c.deadline || '');

        return '<tr>' +
            '<td data-label="ID">' + escapeHtml(String(c.id)) + '</td>' +
            '<td data-label="Gambar"><img src="' + imgSrc + '" class="tbl-img" ' +
            'onerror="this.src=\'https://placehold.co/50x50?text=No+Img\'"></td>' +
            '<td data-label="Judul">' + escapeHtml(c.title) + '</td>' +
            '<td data-label="Target">Rp ' + formatRupiah(c.target) + '</td>' +
            '<td data-label="Terkumpul">Rp ' + formatRupiah(c.collected) + ' <small>(' + pct + '%)</small></td>' +
            '<td data-label="Deadline">' + formattedDeadline + '</td>' +
            '<td data-label="Kategori">' + escapeHtml(c.category || '-') + '</td>' +
            '<td data-label="Status">' + badge + '</td>' +
            '<td data-label="Aksi">' +
                '<div class="action-btns">' +
                    '<button class="btn-icon btn-icon-edit" title="Edit" onclick="openEditModal(' + c.id + ')">' +
                        '<i class="fas fa-pencil-alt"></i>' +
                    '</button>' +
                    '<button class="btn-icon btn-icon-delete" title="Hapus" onclick="deleteCampaign(' + c.id + ')">' +
                        '<i class="fas fa-trash-alt"></i>' +
                    '</button>' +
                '</div>' +
            '</td>' +
        '</tr>';
    }).join('');
}

/* ─────────────────────────────────────────────────────────────
   RENDER CATEGORY SELECT
───────────────────────────────────────────────────────────── */
function renderCategorySelect(selectId) {
  var sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Pilih Kategori --</option>' +
    _categories.map(function (c) {
      return '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>';
    }).join('');
}

/* ─────────────────────────────────────────────────────────────
   MODAL CAMPAIGN — BUKA / TUTUP
───────────────────────────────────────────────────────────── */
function openAddModal() {
  document.getElementById('modalCampaignTitle').textContent = '+ Tambah Campaign';
  document.getElementById('campaignForm').reset();
  document.getElementById('campaignId').value  = '';
  document.getElementById('image_url').value   = '';
  document.getElementById('imagePreview').innerHTML = '';
  renderCategorySelect('category');
  document.getElementById('campaignModal').classList.add('show');
}

async function openEditModal(id) {
  document.getElementById('modalCampaignTitle').textContent = 'Edit Campaign';

  try {
    var campaigns = await apiFetch({ action: 'getCampaigns' });
    var c = (campaigns || []).find(function (x) { return String(x.id) === String(id); });
    if (!c) { alert('Campaign tidak ditemukan.'); return; }

    renderCategorySelect('category');

    document.getElementById('campaignId').value    = c.id;
    document.getElementById('title').value         = c.title        || '';
    document.getElementById('description').value   = c.description  || '';
    document.getElementById('target').value        = c.target       || 0;
    document.getElementById('deadline').value      = c.deadline     || '';
    document.getElementById('location').value      = c.location     || '';
    document.getElementById('maps_link').value     = c.maps_link    || '';
    document.getElementById('category').value      = c.category     || '';
    document.getElementById('image_url').value     = c.image_url    || '';

    if (c.image_url) {
      document.getElementById('imagePreview').innerHTML =
        '<img src="' + c.image_url + '" alt="Preview">';
    } else {
      document.getElementById('imagePreview').innerHTML = '';
    }

    document.getElementById('campaignModal').classList.add('show');
  } catch (err) {
    alert('Gagal memuat data campaign: ' + err.message);
  }
}

function closeModal() {
  document.getElementById('campaignModal').classList.remove('show');
}

/* ─────────────────────────────────────────────────────────────
   PREVIEW GAMBAR CAMPAIGN
───────────────────────────────────────────────────────────── */
async function previewImage(input) {
  if (!input.files || !input.files[0]) return;
  var file    = input.files[0];
  var preview = document.getElementById('imagePreview');

  // Preview lokal dulu (instan)
  var reader = new FileReader();
  reader.onload = function (e) {
    preview.innerHTML = '<img src="' + e.target.result + '" alt="Preview">';
  };
  reader.readAsDataURL(file);

  // Upload ke ImgBB
  try {
    var url = await uploadToImgBB(file);
    document.getElementById('image_url').value = url;
  } catch (err) {
    console.error('Upload gambar gagal:', err);
    document.getElementById('image_url').value =
      'https://placehold.co/600x400?text=No+Image';
  }
}

/* ─────────────────────────────────────────────────────────────
   SIMPAN CAMPAIGN (submit handler)
───────────────────────────────────────────────────────────── */
function initCampaignForm() {
  var form = document.getElementById('campaignForm');
  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    if (_isSubmitting) { alert('Sedang menyimpan, harap tunggu...'); return; }

    var submitBtn  = form.querySelector('button[type="submit"]');
    var origHTML   = submitBtn ? submitBtn.innerHTML : '';
    _isSubmitting  = true;
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...'; }

    var id       = document.getElementById('campaignId').value;
    var imageUrl = document.getElementById('image_url').value ||
                   'https://placehold.co/600x400?text=Campaign';

    var params = {
      action:      id ? 'updateCampaign' : 'addCampaign',
      title:       document.getElementById('title').value,
      description: document.getElementById('description').value,
      target:      parseInt(document.getElementById('target').value) || 0,
      deadline:    document.getElementById('deadline').value,
      location:    document.getElementById('location').value,
      maps_link:   document.getElementById('maps_link').value,
      category:    document.getElementById('category').value,
      image_url:   imageUrl,
    };
    if (id) params.id = parseInt(id);

    try {
      var result = await apiFetch(params, 'POST');
      if (result.status === 'success') {
        alert('Campaign berhasil disimpan! ✅');
        closeModal();
        await refreshAllData();
      } else {
        throw new Error(result.message || JSON.stringify(result));
      }
    } catch (err) {
      console.error('Simpan campaign gagal:', err);
      alert('Gagal menyimpan campaign.\nError: ' + err.message);
    } finally {
      _isSubmitting = false;
      if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = origHTML; }
    }
  });
}

/* ─────────────────────────────────────────────────────────────
   HAPUS CAMPAIGN
───────────────────────────────────────────────────────────── */
async function deleteCampaign(id) {
  if (!confirm('Yakin ingin menghapus campaign ini? Tindakan ini tidak dapat dibatalkan.')) return;
  try {
    var result = await apiFetch({ action: 'deleteCampaign', id: id }, 'POST');
    if (result.status === 'success') {
      alert('Campaign berhasil dihapus.');
      refreshAllData();
    } else {
      throw new Error(result.message || 'Gagal');
    }
  } catch (err) {
    alert('Gagal menghapus campaign: ' + err.message);
  }
}

/* ─────────────────────────────────────────────────────────────
   MODAL KATEGORI — BUKA / TUTUP / SIMPAN
───────────────────────────────────────────────────────────── */
function openAddCategoryModal() {
  document.getElementById('newCategory').value = '';
  document.getElementById('categoryModal').classList.add('show');
}

function closeCategoryModal() {
  document.getElementById('categoryModal').classList.remove('show');
}

async function addNewCategory() {
  var val = document.getElementById('newCategory').value.trim();
  if (!val) {
    alert('Masukkan nama kategori.');
    return;
  }

  try {
    var result = await apiFetch({
      action: 'addCategory',
      category: val
    }, 'POST');

    if (result.status === 'success') {
      alert('Kategori "' + val + '" berhasil ditambahkan!');

      closeCategoryModal();

      await fetchCategories();
      renderCategorySelect('category');

      // PENTING: otomatis pilih kategori baru
      document.getElementById('category').value = val;

    } else {
      throw new Error(result.message || 'Gagal');
    }
  } catch (err) {
    alert('Gagal menambahkan kategori: ' + err.message);
  }
}

/* ─────────────────────────────────────────────────────────────
   INIT
───────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  if (!checkAdminSession()) return;

  initDarkMode();
  initCampaignForm();
  refreshAllData();

  // Auto-refresh setiap 1 menit
  setInterval(refreshAllData, CONFIG.REFRESH_MS || 60000);
});
