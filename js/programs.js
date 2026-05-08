/* =============================================
   js/programs.js — Logika Halaman Program Donasi
   Bergantung pada: js/main.js
   ============================================= */

let allCampaigns = [];
let currentFilter = 'all';

async function fetchAndRender() {
    const grid = document.getElementById('allCampaignsGrid');
    grid.innerHTML = '<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i>Memuat program donasi...</div>';
    try {
        const data = await apiFetch({ action: 'getCampaigns' });
        allCampaigns = Array.isArray(data) ? data : [];
        renderPrograms(currentFilter);
    } catch (e) {
        grid.innerHTML = '<div class="loading-indicator">Gagal memuat data. Periksa koneksi.</div>';
    }
}

function renderPrograms(filter = 'all') {
    const grid = document.getElementById('allCampaignsGrid');
    let list = allCampaigns;
    if (filter === 'active') list = allCampaigns.filter(c => c.status === 'active');
    if (filter === 'ended')  list = allCampaigns.filter(c => c.status !== 'active');
    if (!list.length) {
        grid.innerHTML = '<div class="loading-indicator">Tidak ada program donasi.</div>';
        return;
    }
    grid.innerHTML = list.map(c => renderCampaignCard(c)).join('');
}

function initFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderPrograms(currentFilter);
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initCommon();
    initFilters();
    fetchAndRender();
    setInterval(fetchAndRender, CONFIG.REFRESH_MS);
});