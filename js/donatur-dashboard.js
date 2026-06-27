/* js/donatur-dashboard.js — Dashboard Donatur */

let donorDonations = [];
let campaignsCache = [];

function getLoginData() {
    return {
        loggedIn: localStorage.getItem('userLoggedIn') === 'true',
        name: localStorage.getItem('userName') || 'Donatur',
        email: localStorage.getItem('userEmail') || ''
    };
}

function protectDonaturPage() {
    const user = getLoginData();
    if (!user.loggedIn || !user.email) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

function initDonaturHeader() {
    const user = getLoginData();
    document.getElementById('donaturNameDisplay').textContent = user.name || 'Donatur';
    document.getElementById('heroName').textContent = user.name || 'Donatur';
    document.getElementById('profileName').textContent = user.name || 'Donatur';
    document.getElementById('profileEmail').textContent = user.email || '-';
    document.getElementById('lastOpen').textContent = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

    const dropdown = document.getElementById('dropdownUser');
    const btn = document.getElementById('dropdownUserBtn');
    if (dropdown && btn) {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('open');
        });
        document.addEventListener('click', () => dropdown.classList.remove('open'));
    }
}

async function loadDonaturDashboard() {
    const user = getLoginData();
    const tbody = document.getElementById('donationTableBody');

    try {
        campaignsCache = await apiFetch({ action: 'getCampaigns' });

        // Endpoint baru yang perlu ditambahkan di Apps Script.
        // Kalau endpoint belum ada, dashboard tetap tampil dengan pesan kosong.
        const result = await apiFetch({ action: 'getDonaturDonations', email: user.email });
        donorDonations = Array.isArray(result) ? result : (result.donations || []);
    } catch (error) {
        console.warn('Gagal memuat riwayat donatur:', error);
        donorDonations = [];
    }

    renderStats();
    renderDonationTable(tbody);
}

function getCampaignTitle(campaignId) {
    const c = campaignsCache.find(item => String(item.id) === String(campaignId));
    return c ? c.title : `Program #${campaignId || '-'}`;
}

function normalizeDonation(row) {
    return {
        date: row.date || row.created_at || row.timestamp || '',
        campaign_id: row.campaign_id || row.campaignId || '',
        nominal: Number(row.nominal || row.amount || 0),
        status: String(row.status || 'pending').toLowerCase(),
        method: row.method || row.payment_method || '-'
    };
}

function renderStats() {
    const normalized = donorDonations.map(normalizeDonation);
    const total = normalized.reduce((sum, d) => sum + (d.status === 'failed' || d.status === 'cancel' ? 0 : d.nominal), 0);
    const pending = normalized.filter(d => d.status === 'pending').length;
    const programCount = new Set(normalized.map(d => String(d.campaign_id)).filter(Boolean)).size;

    document.getElementById('statTotalNominal').textContent = `Rp ${formatRupiah(total)}`;
    document.getElementById('statTotalTransaksi').textContent = normalized.length;
    document.getElementById('statPending').textContent = pending;
    document.getElementById('statProgram').textContent = programCount;
}

function renderDonationTable(tbody) {
    const rows = donorDonations.map(normalizeDonation).sort((a, b) => new Date(b.date) - new Date(a.date));

    if (!rows.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="donasi-empty">
                        <i class="fas fa-hand-holding-heart"></i>
                        <div>Belum ada riwayat donasi pada akun ini.</div>
                        <small>Mulai berdonasi melalui halaman Program Donasi.</small>
                    </div>
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = rows.map(d => {
        const statusClass = `status-${d.status}`;
        return `
            <tr>
                <td>${formatDate(d.date, 'short')}</td>
                <td><a class="campaign-link" href="donasi.html?id=${encodeURIComponent(d.campaign_id)}">${escapeHtml(getCampaignTitle(d.campaign_id))}</a></td>
                <td><strong>Rp ${formatRupiah(d.nominal)}</strong></td>
                <td><span class="status-pill ${statusClass}">${escapeHtml(d.status)}</span></td>
                <td class="hide-mobile">${escapeHtml(d.method)}</td>
            </tr>`;
    }).join('');
}

function logoutDonatur() {
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userLoggedIn');
    localStorage.removeItem('userRole');
    window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', () => {
    if (!protectDonaturPage()) return;
    if (typeof initCommon === 'function') initCommon();
    initDonaturHeader();
    loadDonaturDashboard();
});
