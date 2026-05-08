/* ============================================================
   penulis-editor.js  —  Logic halaman Editor Artikel
   Bergantung pada main.js yang harus di-load lebih dulu:
     - GAS_URL         : endpoint Google Apps Script
     - IMGBB_API_KEY   : API key ImgBB
     - uploadToImgBB() : upload file → return URL string
     - escapeHtml()    : sanitasi output HTML
   ============================================================ */

'use strict';

/* ── State ──────────────────────────────────────────────────── */
let _slugEdited = false;   // true setelah user mengetik slug sendiri

/* ── Cek Auth ────────────────────────────────────────────────── */
function checkAuth() {
  if (localStorage.getItem('penulisLoggedIn') !== 'true') {
    window.location.href = 'penulis-login.html';
    return false;
  }
  return true;
}

/* ── Generate slug dari teks ─────────────────────────────────── */
function generateSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/* ── Auto-slug saat mengetik judul ───────────────────────────── */
function bindSlugAuto() {
  const titleEl = document.getElementById('title');
  const slugEl  = document.getElementById('slug');
  if (!titleEl || !slugEl) return;

  // Tandai kalau user mengetik slug sendiri
  slugEl.addEventListener('input', () => {
    _slugEdited = slugEl.value.trim() !== '';
  });

  titleEl.addEventListener('input', () => {
    if (!_slugEdited) {
      slugEl.value = generateSlug(titleEl.value);
    }
  });
}

/* ── Summernote Init ──────────────────────────────────────────── */
function initSummernote() {
  $('#content').summernote({
    height: 400,
    toolbar: [
      ['style',    ['bold', 'italic', 'underline', 'strikethrough', 'clear']],
      ['fontsize', ['fontsize']],
      ['color',    ['color']],
      ['para',     ['ul', 'ol', 'paragraph']],
      ['insert',   ['link', 'picture']],
      ['view',     ['fullscreen', 'codeview', 'help']],
    ],
    callbacks: {
      onImageUpload: function (files) {
        uploadEditorImage(files[0]);
      },
    },
  });
}

/* ── Upload gambar di dalam editor ───────────────────────────── */
async function uploadEditorImage(file) {
  try {
    const url = await uploadToImgBB(file);
    if (url) {
      $('#content').summernote('insertImage', url);
    } else {
      alert('Gagal mengupload gambar ke editor. Coba lagi.');
    }
  } catch (err) {
    console.error('Upload editor image error:', err);
    alert('Terjadi kesalahan saat upload gambar.');
  }
}

/* ── Preview featured image ───────────────────────────────────── */
async function previewImage(input) {
  if (!input.files || !input.files[0]) return;

  const file    = input.files[0];
  const preview = document.getElementById('imagePreview');

  // Tampilkan preview lokal dulu (cepat)
  const reader = new FileReader();
  reader.onload = (e) => {
    preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
  };
  reader.readAsDataURL(file);

  // Upload ke ImgBB, simpan URL ke hidden field
  try {
    const url = await uploadToImgBB(file);
    document.getElementById('featured_image').value =
      url || 'https://placehold.co/600x400?text=No+Image';
  } catch (err) {
    console.error('Upload featured image error:', err);
    document.getElementById('featured_image').value =
      'https://placehold.co/600x400?text=Upload+Gagal';
  }
}

/* ── Load kategori dari GAS ──────────────────────────────────── */
async function loadCategories() {
  const select = document.getElementById('category');
  if (!select) return;

  try {
    const res        = await fetch(`${CONFIG.GAS_URL}?action=getArticleCategories`);
    const categories = await res.json();

    if (Array.isArray(categories) && categories.length > 0) {
      select.innerHTML =
        '<option value="">Pilih Kategori</option>' +
        categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    } else {
      // Fallback kategori statis kalau GAS tidak mengembalikan data
      const fallback = ['Berita', 'Zakat', 'Infaq', 'Sedekah', 'Program', 'Lainnya'];
      select.innerHTML =
        '<option value="">Pilih Kategori</option>' +
        fallback.map(c => `<option value="${c}">${c}</option>`).join('');
    }
  } catch (err) {
    console.error('Gagal memuat kategori:', err);
    select.innerHTML = '<option value="">Gagal memuat kategori</option>';
  }
}

/* ── Load artikel untuk mode edit ────────────────────────────── */
async function loadArticleForEdit() {
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) return;  // mode tulis baru, tidak ada yang dimuat

  document.getElementById('formTitle').textContent = '✏️ Edit Artikel';
  document.title = 'Edit Artikel - Lazisnu Kedungrejo';

  try {
    const res     = await fetch(`${CONFIG.GAS_URL}?action=getArticleById&id=${encodeURIComponent(id)}`);
    const article = await res.json();

    if (!article || article.error) {
      alert('Artikel tidak ditemukan atau terjadi kesalahan.');
      return;
    }

    // Isi semua field form
    document.getElementById('articleId').value        = article.id        || '';
    document.getElementById('title').value            = article.title     || '';
    document.getElementById('slug').value             = article.slug      || generateSlug(article.title || '');
    document.getElementById('tags').value             = article.tags      || '';
    document.getElementById('excerpt').value          = article.excerpt   || '';
    document.getElementById('meta_title').value       = article.meta_title       || '';
    document.getElementById('meta_description').value = article.meta_description || '';
    document.getElementById('featured_image').value   = article.featured_image   || '';

    // ========== TAMBAH: Set tanggal terbit ==========
    const publishDateInput = document.getElementById('publish_date');
    if (publishDateInput && article.created_at) {
      const dateStr = article.created_at.split('T')[0];
      publishDateInput.value = dateStr;
    }
    // ================================================

    // Tandai slug sudah terisi agar tidak ditimpa auto-slug
    _slugEdited = !!document.getElementById('slug').value;

    // Preview gambar kalau ada
    if (article.featured_image) {
      document.getElementById('imagePreview').innerHTML =
        `<img src="${article.featured_image}" alt="Featured image">`;
    }

    // Set konten ke Summernote (tunggu sampai Summernote siap)
    const setContent = () => {
      if ($('#content').summernote && $('#content').summernote('instance')) {
        $('#content').summernote('code', article.content || '');
      } else {
        setTimeout(setContent, 100);
      }
    };
    setContent();

    // Set kategori setelah select terisi
    const setCat = () => {
      const select = document.getElementById('category');
      if (!select || select.options.length <= 1) {
        setTimeout(setCat, 200);
        return;
      }
      select.value = article.category || '';
    };
    setCat();

  } catch (err) {
    console.error('Gagal memuat artikel:', err);
    alert('Gagal memuat data artikel. Periksa koneksi Anda.');
  }
}

/* ── Simpan artikel (draft / published) ──────────────────────── */
async function saveArticle(status) {
  const titleEl    = document.getElementById('title');
  const categoryEl = document.getElementById('category');
  const title      = titleEl.value.trim();
  const category   = categoryEl.value.trim();

  // Validasi wajib
  if (!title) {
    titleEl.focus();
    alert('Judul artikel harus diisi.');
    return;
  }
  if (!category) {
    categoryEl.focus();
    alert('Pilih kategori terlebih dahulu.');
    return;
  }

  // Ambil konten dari Summernote
  const content = $('#content').summernote('code');
  const isEmpty = !content || content.replace(/<[^>]*>/g, '').trim() === '';
  if (status === 'published' && isEmpty) {
    alert('Konten artikel tidak boleh kosong untuk dipublish.');
    return;
  }

  // Kumpulkan semua nilai
  const id              = document.getElementById('articleId').value;
  const slug            = document.getElementById('slug').value.trim() || generateSlug(title);
  const excerpt         = document.getElementById('excerpt').value.trim();
  const featured_image  = document.getElementById('featured_image').value.trim()
                          || 'https://placehold.co/600x400?text=No+Image';
  const tags            = document.getElementById('tags').value.trim();
  const meta_title      = document.getElementById('meta_title').value.trim() || title;
  const meta_description= document.getElementById('meta_description').value.trim();
  const author          = localStorage.getItem('penulisEmail') || '';

  // ========== TAMBAH: Ambil tanggal terbit ==========
  const publishDateInput = document.getElementById('publish_date');
  const publishDate = publishDateInput ? publishDateInput.value : '';
  // =================================================

  // Tampilkan loading state di tombol
  const btnId  = status === 'draft' ? 'btnDraft' : 'btnPublish';
  const btnEl  = document.getElementById(btnId);
  const origHTML = btnEl ? btnEl.innerHTML : '';
  if (btnEl) {
    btnEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    btnEl.classList.add('btn-saving');
    btnEl.disabled = true;
  }

  // Bangun payload sebagai URLSearchParams
  const payload = new URLSearchParams();
  payload.append('action',           'saveArticle');
  if (id) payload.append('id',       id);
  payload.append('title',            title);
  payload.append('slug',             slug);
  payload.append('content',          content);
  payload.append('excerpt',          excerpt);
  payload.append('featured_image',   featured_image);
  payload.append('category',         category);
  payload.append('tags',             tags);
  payload.append('meta_title',       meta_title);
  payload.append('meta_description', meta_description);
  payload.append('status',           status);
  payload.append('author',           author);

  // ========== TAMBAH: Kirim publish_date ke server ==========
  if (publishDate) {
    payload.append('publish_date', publishDateInput.value);
}
  // =========================================================

  try {
    const res    = await fetch(CONFIG.GAS_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    payload.toString(),
    });
    const result = await res.json();

    if (result.status === 'success') {
      const pesan = status === 'published'
        ? 'Artikel berhasil dipublikasikan! 🎉'
        : 'Draft berhasil disimpan.';
      alert(pesan);
      window.location.href = 'penulis-dashboard.html';
    } else {
      throw new Error(result.message || JSON.stringify(result));
    }
  } catch (err) {
    console.error('Gagal menyimpan artikel:', err);
    alert('Gagal menyimpan artikel.\nError: ' + err.message);
  } finally {
    // Kembalikan tombol ke semula
    if (btnEl) {
      btnEl.innerHTML = origHTML;
      btnEl.classList.remove('btn-saving');
      btnEl.disabled = false;
    }
  }
}

/* ── Preview artikel ─────────────────────────────────────────── */
function previewArticle() {
  const title = document.getElementById('title').value.trim();
  if (!title) {
    alert('Judul artikel harus diisi sebelum preview.');
    return;
  }

  const previewData = {
    title,
    content:         $('#content').summernote('code'),
    featured_image:  document.getElementById('featured_image').value,
    category:        document.getElementById('category').value,
    excerpt:         document.getElementById('excerpt').value,
    date:            new Date().toLocaleDateString('id-ID', {
                       day:   'numeric',
                       month: 'long',
                       year:  'numeric',
                     }),
  };

  localStorage.setItem('previewArticle', JSON.stringify(previewData));
  window.open('artikel-preview.html', '_blank');
}

/* ── Init utama ──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Cek login
  if (!checkAuth()) return;

  // Ikat auto-slug
  bindSlugAuto();

  // Init Summernote setelah DOM siap
  $(document).ready(() => {
    initSummernote();
    // Muat kategori dan (jika ada ?id=) data artikel
    loadCategories().then(() => loadArticleForEdit());
  });
});

// Fungsi preview image yang sudah ada, tambahkan caption preview
function previewImage(input) {
    const preview = document.getElementById('imagePreview');
    const hiddenInput = document.getElementById('featured_image');
    const captionInput = document.getElementById('thumbnail_caption');
    
    if (input.files && input.files[0]) {
        const file = input.files[0];
        
        // Validasi ukuran (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('Ukuran gambar maksimal 2MB');
            input.value = '';
            return;
        }
        
        // Preview lokal
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `
                <div class="preview-wrapper">
                    <img src="${e.target.result}" class="preview-img">
                    <div class="preview-caption" id="previewCaptionText">
                        <i class="fas fa-camera"></i> 
                        ${captionInput.value || 'Belum ada caption'}
                    </div>
                    <button type="button" class="remove-preview" onclick="removePreview()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            
            // Sembunyikan upload area
            document.getElementById('imageUploadArea').style.display = 'none';
        };
        reader.readAsDataURL(file);
        
        // Upload ke ImgBB
        uploadToImgBB(file).then(url => {
            hiddenInput.value = url;
        }).catch(err => {
            alert('Gagal upload: ' + err.message);
            removePreview();
        });
    }
}

// Fungsi hapus preview
function removePreview() {
    const preview = document.getElementById('imagePreview');
    const hiddenInput = document.getElementById('featured_image');
    const fileInput = document.getElementById('imageFile');
    const uploadArea = document.getElementById('imageUploadArea');
    const captionInput = document.getElementById('thumbnail_caption');
    
    preview.innerHTML = '';
    hiddenInput.value = '';
    fileInput.value = '';
    captionInput.value = '';
    uploadArea.style.display = 'flex';
}

// Update caption preview saat mengetik
document.getElementById('thumbnail_caption')?.addEventListener('input', function() {
    const captionText = document.getElementById('previewCaptionText');
    if (captionText) {
        captionText.innerHTML = `<i class="fas fa-camera"></i> ${this.value || 'Belum ada caption'}`;
    }
});