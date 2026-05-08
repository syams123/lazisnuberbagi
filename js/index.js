/* =============================================
   js/index.js — Logika Halaman Beranda
   Bergantung pada: js/main.js
   ============================================= */

let cachedCampaigns = null;
let isLoading = false;

/* ========== AMBIL DATA CAMPAIGN ========== */
async function fetchCampaigns(force = false) {
    if (!force && cachedCampaigns) return cachedCampaigns;
    if (isLoading) return cachedCampaigns || [];
    isLoading = true;
    try {
        const data = await apiFetch({ action: 'getCampaigns' });
        if (Array.isArray(data)) cachedCampaigns = data;
        return cachedCampaigns || [];
    } catch (e) {
        console.error('Gagal ambil campaign:', e);
        return cachedCampaigns || [];
    } finally {
        isLoading = false;
    }
}

/* ========== AMBIL ARTIKEL ========== */
async function fetchArticles() {
    try {
        return await apiFetch({ action: 'getArticles' });
    } catch (e) {
        console.error('Gagal ambil artikel:', e);
        return [];
    }
}

/* ========== RENDER PROGRAM UNGGULAN (3 aktif) ========== */
async function renderFeaturedCampaigns() {
    const grid = document.getElementById('campaignGrid');
    if (!grid) return;
    const campaigns = await fetchCampaigns();
    const featured  = campaigns.filter(c => c.status === 'active').slice(0, 3);
    if (!featured.length) {
        grid.innerHTML = '<div class="loading-indicator">Belum ada program aktif.</div>';
        return;
    }
    grid.innerHTML = featured.map(c => renderCampaignCard(c)).join('');
}

/* ========== RENDER BERITA HOME (3 terbaru) ========== */
async function renderBeritaHome() {
    const grid = document.getElementById('beritaGrid');
    if (!grid) return;
    const articles = await fetchArticles();
    const latest   = articles.slice(0, 3);
    if (!latest.length) {
        grid.innerHTML = '<div class="loading-indicator">Belum ada artikel.</div>';
        return;
    }
    grid.innerHTML = latest.map(a => renderBeritaCard(a)).join('');
    setTimeout(() => {
        if (typeof initScrollReveal === 'function') {
            initScrollReveal('.berita-card');
        }
    }, 100);
}

/* ========== TAMPILKAN STATISTIK (LANGSUNG JALAN) ========== */
async function renderStats() {
    const campaigns = await fetchCampaigns();
    if (!campaigns.length) return;

    const total    = campaigns.length;
    const aktif    = campaigns.filter(c => c.status === 'active').length;
    const terkumpul = campaigns.reduce((s, c) => s + (c.collected || 0), 0);

    const elTotal = document.getElementById('statTotalProgram');
    const elAktif = document.getElementById('statDonasiAktif');
    const elDonasi = document.getElementById('statJumlahDonasi');

    // Langsung animasi tanpa menunggu scroll
    if (elTotal) animateNumber(elTotal, 0, total, 800);
    if (elAktif) animateNumber(elAktif, 0, aktif, 800);
    if (elDonasi) animateNumber(elDonasi, 0, terkumpul, 1000, true);
}

/* ========== STATS SCROLL TRIGGER (jadikan opsional, tidak override) ========== */
function initStatsObserver() {
    const wrapper = document.getElementById('statsWrapper');
    if (!wrapper) return;
    
    // Tandai sudah visible dari awal agar observer tidak double
    wrapper.classList.add('visible');
    
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                wrapper.classList.add('visible');
                obs.unobserve(wrapper);
            }
        });
    }, { threshold: 0.1 });
    obs.observe(wrapper);
}

/* ========== AUTO REFRESH ========== */
function startAutoRefresh() {
    setInterval(async () => {
        await fetchCampaigns(true);
        renderFeaturedCampaigns();
        renderStats();
        renderBeritaHome();
    }, CONFIG.REFRESH_MS || 60000);
}

/* ========== INIT ========== */
document.addEventListener('DOMContentLoaded', async () => {
    // Init common dari main.js
    if (typeof initCommon === 'function') {
        initCommon();
    }
    
    // Hero slideshow
    if (typeof initHeroSlideshow === 'function') {
        initHeroSlideshow();
    }
    
    // Observer untuk stats wrapper (tapi stats tetap jalan duluan)
    initStatsObserver();
    
    // Scroll reveal untuk tutorial card
    if (typeof initScrollReveal === 'function') {
        initScrollReveal('.tutorial-card');
    }
    
    // LOAD DATA UTAMA - Urutan penting!
    await fetchCampaigns();      // Ambil data dulu
    renderStats();               // Langsung tampilkan stats (tanpa nunggu)
    renderFeaturedCampaigns();   // Tampilkan campaign
    renderBeritaHome();          // Tampilkan berita
    
    // Auto refresh
    startAutoRefresh();
});