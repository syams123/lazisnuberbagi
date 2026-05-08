/* =============================================
   js/artikel-detail.js - INSTANT LOAD (Tanpa Loading Time)
   ============================================= */

// ===== PASTIKAN apiFetch TERSEDIA =====
if (typeof apiFetch !== 'function') {
    window.apiFetch = async function(payload, method = 'POST') {
        const API_URL = 'https://script.google.com/macros/s/AKfycbxxx/exec'; // Ganti dengan URL asli
        const params = new URLSearchParams();
        for (let key in payload) params.append(key, payload[key]);
        const url = method === 'POST' ? API_URL : `${API_URL}?${params.toString()}`;
        const response = await fetch(url, {
            method: method,
            mode: 'cors',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: method === 'POST' ? params : undefined
        });
        const text = await response.text();
        try {
            return JSON.parse(text);
        } catch(e) {
            console.error('Respon bukan JSON:', text);
            return { error: 'Invalid response' };
        }
    };
}

// ===== AMBIL ID DARI URL =====
const articleId = new URLSearchParams(window.location.search).get('id');

// ===== FORMAT TANGGAL =====
function formatDate(str) {
    if (!str) return '—';
    let cleanStr = str.includes('T') ? str.split('T')[0] : str;
    const d = new Date(cleanStr);
    if (isNaN(d.getTime())) return str;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ===== AMBIL SEMUA ARTIKEL (fallback) =====
async function fetchAllArticles() {
    try {
        const data = await apiFetch({ action: 'getArticles' });
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.warn('Gagal ambil semua artikel:', e);
        return [];
    }
}

// ===== AMBIL SATU ARTIKEL =====
async function fetchArticleById(id) {
    try {
        const data = await apiFetch({ action: 'getArticleById', id });
        if (data && !data.error) return data;
    } catch (err) {
        console.warn('getArticleById gagal, coba fallback', err);
    }
    const all = await fetchAllArticles();
    return all.find(a => String(a.id) === String(id)) || null;
}

// ===== AMBIL PROFIL PENULIS =====
async function fetchAuthorProfile(email) {
    if (!email) return null;
    try {
        const data = await apiFetch({ action: 'getPenulisProfile', email });
        if (data && data.status === 'success') return data;
    } catch (e) {
        console.warn('Gagal ambil profil penulis:', e);
    }
    return null;
}

// ===== NAMA PENULIS =====
async function getAuthorDisplayName(authorEmail) {
    if (!authorEmail) return 'Tim Lazisnu';
    const profile = await fetchAuthorProfile(authorEmail);
    if (profile?.name) return profile.name;
    if (authorEmail.includes('@')) {
        const localPart = authorEmail.split('@')[0];
        return localPart.split(/[._-]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }
    return authorEmail || 'Tim Lazisnu';
}

// ===== RENDER STRUKTUR AWAL (INSTANT) =====
function renderInitialStructure() {
    const main = document.getElementById('articleMain');
    if (!main) return;
    
    main.innerHTML = `
        <div class="article-card">
            <div class="featured-img-placeholder-skeleton"></div>
            <div class="article-body">
                <div class="skeleton-title"></div>
                <div class="skeleton-heading"></div>
                <div class="skeleton-meta"></div>
                <div class="skeleton-content"></div>
            </div>
        </div>
    `;
}

// ===== RENDER ARTIKEL LENGKAP (SETELAH DATA TERSEDIA) =====
async function renderArticle() {
    const main = document.getElementById('articleMain');
    if (!main) {
        console.error('Element #articleMain tidak ditemukan!');
        return;
    }

    if (!articleId) {
        main.innerHTML = `
            <div class="article-card" style="text-align:center; padding:60px 20px;">
                <i class="fas fa-exclamation-triangle" style="font-size:3rem;color:#f4a261;"></i>
                <h2>ID Artikel Tidak Ditemukan</h2>
                <a href="berita.html" class="btn-primary">← Kembali ke Berita</a>
            </div>`;
        return;
    }

    // Mulai fetch data (tanpa menunggu, lanjut eksekusi)
    let article = null;
    const articlePromise = fetchArticleById(articleId);
    
    // Tampilkan struktur awal INSTANT
    renderInitialStructure();
    
    // Tunggu data artikel selesai
    try {
        article = await articlePromise;
    } catch (err) {
        console.error('Error fetch artikel:', err);
    }

    if (!article) {
        main.innerHTML = `
            <div class="article-card" style="text-align:center; padding:60px 20px;">
                <i class="fas fa-file-slash" style="font-size:3rem;color:#e76f51;"></i>
                <h2>Artikel Tidak Ditemukan</h2>
                <p>ID: ${escapeHtml(articleId)}</p>
                <a href="berita.html" class="btn-primary">← Kembali ke Berita</a>
            </div>`;
        const breadcrumb = document.getElementById('breadcrumbTitle');
        if (breadcrumb) breadcrumb.textContent = 'Tidak Ditemukan';
        return;
    }

    // Update title & breadcrumb
    document.title = `${article.title} - Lazisnu Kedungrejo`;
    const breadcrumb = document.getElementById('breadcrumbTitle');
    if (breadcrumb) breadcrumb.textContent = article.title;

    const authorEmail = article.author || '';
    const authorName = await getAuthorDisplayName(authorEmail);

    // Render konten lengkap (replace placeholder)
    main.innerHTML = `
        <div class="article-card">
            ${article.featured_image ? `
    <div class="featured-image-wrapper">
        <img class="featured-img"
             src="${escapeHtml(article.featured_image)}"
             alt="${escapeHtml(article.title)}"
             onerror="this.style.display='none'">
        ${article.thumbnail_caption ? `
            <div class="featured-caption">
                ${escapeHtml(article.thumbnail_caption)}
            </div>
        ` : ''}
    </div>
` : ''}
            <div class="article-body">
                <span class="article-category-badge" style="display:inline-block; background:#067d7d20; color:#067d7d; padding:6px 14px; border-radius:30px; font-size:0.85rem; margin-bottom:16px;">
                    <i class="fas fa-tag"></i> ${escapeHtml(article.category || 'Artikel')}
                </span>
                <h1 class="article-title" style="font-size:2rem; margin-bottom:16px;">${escapeHtml(article.title)}</h1>
                <div class="article-meta" style="display:flex; gap:20px; color:#6c757d; font-size:0.9rem; margin-bottom:32px; flex-wrap:wrap;">
                    <span><i class="far fa-calendar-alt"></i> ${formatDate(article.created_at)}</span>
                    <span><i class="far fa-eye"></i> ${Number(article.views || 0).toLocaleString('id-ID')} dibaca</span>
                    <span><i class="far fa-user-circle"></i> <span id="articleAuthorName">${escapeHtml(authorName)}</span></span>
                </div>
                <div class="article-content" style="font-size:1.05rem; line-height:1.8; color:#94a3b8;">
                    ${article.content || '<p>Konten artikel tidak tersedia.</p>'}
                </div>
                <div class="article-share" style="display:flex; gap:12px; align-items:center; margin-top:40px; padding-top:24px; border-top:1px solid #e9ecef;">
                    <span class="share-label" style="font-weight:600;"><i class="fas fa-share-alt"></i> Bagikan:</span>
                    <a class="share-icon-btn s-fb" id="artFb" href="#" target="_blank" rel="noopener" style="display:inline-flex; width:36px; height:36px; background:#1877f2; color:white; border-radius:50%; align-items:center; justify-content:center; text-decoration:none;">
                        <i class="fab fa-facebook-f"></i>
                    </a>
                    <a class="share-icon-btn s-tw" id="artTw" href="#" target="_blank" rel="noopener" style="display:inline-flex; width:36px; height:36px; background:#000; color:white; border-radius:50%; align-items:center; justify-content:center; text-decoration:none;">
                        <i class="fa-brands fa-x-twitter"></i>
                    </a>
                    <a class="share-icon-btn s-wa" id="artWa" href="#" target="_blank" rel="noopener" style="display:inline-flex; width:36px; height:36px; background:#25d366; color:white; border-radius:50%; align-items:center; justify-content:center; text-decoration:none;">
                        <i class="fab fa-whatsapp"></i>
                    </a>
                    <a class="share-icon-btn s-tg" id="artTg" href="#" target="_blank" rel="noopener" style="display:inline-flex; width:36px; height:36px; background:#0088cc; color:white; border-radius:50%; align-items:center; justify-content:center; text-decoration:none;">
                        <i class="fab fa-telegram-plane"></i>
                    </a>
                    <button class="share-icon-btn s-cp" id="artCp" title="Salin link" style="display:inline-flex; width:36px; height:36px; background:#6c757d; color:white; border-radius:50%; align-items:center; justify-content:center; border:none; cursor:pointer;">
                        <i class="fas fa-link"></i>
                    </button>
                </div>
            </div>
        </div>
    `;

    setShareLinks(article.title);
    
    // Load artikel terkait & author card (async, tidak nge-blok)
    Promise.allSettled([
        renderRelated(article),
        loadAuthorCard(authorEmail, authorName)
    ]);
}

// ===== SHARE LINKS =====
function setShareLinks(title) {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(title || document.title);
    const links = {
        artFb: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
        artTw: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
        artWa: `https://wa.me/?text=${text}%20${url}`,
        artTg: `https://t.me/share/url?url=${url}&text=${text}`
    };
    for (const [id, link] of Object.entries(links)) {
        const el = document.getElementById(id);
        if (el) el.href = link;
    }
    const cp = document.getElementById('artCp');
    if (cp) {
        cp.onclick = () => {
            navigator.clipboard.writeText(window.location.href)
                .then(() => showCopyToast())
                .catch(() => alert(window.location.href));
        };
    }
}

function showCopyToast() {
    let toast = document.getElementById('copyToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'copyToast';
        toast.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#067d7d;color:#fff;padding:10px 22px;border-radius:30px;z-index:9999;opacity:0;transition:0.3s`;
        toast.innerText = '✅ Link berhasil disalin!';
        document.body.appendChild(toast);
    }
    toast.style.opacity = '1';
    setTimeout(() => toast.style.opacity = '0', 2200);
}

// ===== ARTIKEL TERKAIT =====
async function renderRelated(currentArticle) {
    const el = document.getElementById('relatedList');
    if (!el) return;
    const all = await fetchAllArticles();
    let related = all.filter(a => String(a.id) !== String(currentArticle.id) && a.category === currentArticle.category);
    if (related.length < 4) {
        const extras = all.filter(a => String(a.id) !== String(currentArticle.id) && a.category !== currentArticle.category);
        related.push(...extras);
    }
    related = related.slice(0, 4);
    if (!related.length) {
        el.innerHTML = '<p class="text-muted">Belum ada artikel terkait.</p>';
        return;
    }
    el.innerHTML = related.map(a => `
        <div class="related-item" onclick="window.location.href='artikel-detail.html?id=${a.id}'" style="display:flex; gap:12px; margin-bottom:16px; cursor:pointer;">
            <img class="related-thumb" style="width:66px; height:66px; object-fit:cover; border-radius:12px;"
                 src="${escapeHtml(a.featured_image || 'https://placehold.co/66x66/067d7d/fff?text=NU')}"
                 onerror="this.src='https://placehold.co/66x66/067d7d/fff?text=NU'">
            <div class="related-info" style="flex:1;">
                <h5 style="margin:0 0 6px 0; font-size:0.95rem;">${escapeHtml(a.title)}</h5>
                <span style="font-size:0.75rem; color:#6c757d;"><i class="far fa-calendar-alt"></i> ${formatDate(a.created_at)}</span>
            </div>
        </div>
    `).join('');
}

// ===== AUTHOR CARD =====
async function loadAuthorCard(email, fallbackName) {
    const card = document.getElementById('authorCard');
    if (!card) return;
    const profile = await fetchAuthorProfile(email);
    const name = profile?.name || fallbackName;
    const bio = profile?.bio || 'Penulis di NU-Care Lazisnu Kedungrejo.';
    const foto = profile?.foto_profil || '';
    const ig = profile?.ig || '';
    const tw = profile?.x_twitter || '';
    const fb = profile?.facebook || '';
    const tt = profile?.tiktok || '';

    const metaName = document.getElementById('articleAuthorName');
    if (metaName) metaName.textContent = name;

    const avatar = document.getElementById('authorAvatar');
    if (avatar) {
        avatar.src = foto || `https://ui-avatars.com/api/?background=067d7d&color=fff&name=${encodeURIComponent(name)}`;
        avatar.onerror = () => avatar.src = `https://ui-avatars.com/api/?background=067d7d&color=fff&name=${encodeURIComponent(name)}`;
    }
    const nameEl = document.getElementById('authorName');
    if (nameEl) nameEl.textContent = name;
    const bioEl = document.getElementById('authorBio');
    if (bioEl) bioEl.textContent = bio;

    const socials = [
        { url: ig, icon: 'fab fa-instagram', label: 'Instagram' },
        { url: tw, icon: 'fa-brands fa-x-twitter', label: 'X' },
        { url: fb, icon: 'fab fa-facebook-f', label: 'Facebook' },
        { url: tt, icon: 'fab fa-tiktok', label: 'TikTok' }
    ].filter(s => s.url);
    const socEl = document.getElementById('authorSocials');
    if (socEl) {
        socEl.innerHTML = socials.length ? socials.map(s => `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener" style="margin-right:12px;"><i class="${s.icon}"></i></a>`).join('') : '<span class="text-muted">-</span>';
    }
    card.style.display = 'block';
}

// ===== NEWSLETTER =====
function initNewsletter() {
    const btn = document.getElementById('btnNewsletter');
    const input = document.getElementById('newsletterEmail');
    const sucEl = document.getElementById('newsletterSuccess');
    const errEl = document.getElementById('newsletterError');
    if (!btn || !input) return;
    const hide = () => { if(sucEl) sucEl.classList.remove('show'); if(errEl) errEl.classList.remove('show'); };
    btn.onclick = async () => {
        hide();
        const email = input.value.trim();
        if (!email) {
            if(errEl){ errEl.innerText = 'Masukkan email.'; errEl.classList.add('show'); }
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            if(errEl){ errEl.innerText = 'Email tidak valid.'; errEl.classList.add('show'); }
            return;
        }
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
        try { await apiFetch({ action: 'subscribeNewsletter', email }, 'POST'); } catch(e) {}
        if(sucEl){ sucEl.innerText = `Terima kasih! ${email} berlangganan.`; sucEl.classList.add('show'); }
        input.value = '';
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Berlangganan';
        setTimeout(hide, 5000);
    };
    input.addEventListener('keypress', e => { if(e.key === 'Enter') btn.click(); });
}

// ===== ESCAPE HTML =====
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    if (typeof initCommon === 'function') initCommon();
    renderArticle();
    initNewsletter();
});

