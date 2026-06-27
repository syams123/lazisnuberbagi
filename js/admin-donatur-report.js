/* js/admin-donatur-report.js */

let reportDonations = [];
let reportCampaigns = [];

function checkReportAdminSession() {
  if (localStorage.getItem('adminLoggedIn') !== 'true') {
    window.location.href = 'admin-login.html';
    return false;
  }
  document.getElementById('adminName').textContent =
    localStorage.getItem('adminName') || 'Admin';
  return true;
}

function logoutReportAdmin() {
  localStorage.removeItem('adminLoggedIn');
  localStorage.removeItem('adminName');
  localStorage.removeItem('adminEmail');
  window.location.href = 'admin-login.html';
}

async function loadDonationReport() {
  reportCampaigns = await apiFetch({ action: 'getCampaigns', include_deleted: true });
  reportDonations = await apiFetch({ action: 'getDonationReports' });

  renderCampaignOptions();
  renderDonationReport(reportDonations);
}

function getCampaignName(id) {
  const c = reportCampaigns.find(x => String(x.id) === String(id));
  return c ? c.title : `Program #${id || '-'}`;
}

function renderCampaignOptions() {
  const filter = document.getElementById('filterCampaign');
  const manual = document.getElementById('manualCampaign');

  const options = reportCampaigns
    .filter(c => c.status !== 'deleted')
    .map(c => `<option value="${c.id}">${escapeHtml(c.title)}</option>`)
    .join('');

  filter.innerHTML = `<option value="">Semua Program</option>` + options;
  manual.innerHTML = options || `<option value="">Belum ada program</option>`;
}

function normalizeReport(row) {
  return {
    timestamp: row.timestamp || row.date || '',
    email: row.email || '',
    nominal: Number(row.nominal || row.amount || 0),
    campaign_id: row.campaign_id || '',
    status: String(row.status || 'pending').toLowerCase(),
    method: row.method || row.payment_method || '-',
    name: row.name || '',
    phone: row.phone || '',
    note: row.note || '',
    source: row.source || 'website'
  };
}

function applyDonationFilter() {
  const start = document.getElementById('filterStart').value;
  const end = document.getElementById('filterEnd').value;
  const campaign = document.getElementById('filterCampaign').value;
  const status = document.getElementById('filterStatus').value;

  let rows = reportDonations.map(normalizeReport);

  if (start) rows = rows.filter(r => new Date(r.timestamp) >= new Date(start));
  if (end) rows = rows.filter(r => new Date(r.timestamp) <= new Date(end + 'T23:59:59'));
  if (campaign) rows = rows.filter(r => String(r.campaign_id) === String(campaign));
  if (status) rows = rows.filter(r => r.status === status);

  renderDonationReport(rows);
}

function renderDonationReport(rows) {
  const tbody = document.getElementById('donationReportBody');

  rows = rows.map(normalizeReport).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));

  renderSummary(rows);

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center" style="padding:35px;">Belum ada data donasi.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${formatDate(r.timestamp, 'short')}</td>
      <td>${escapeHtml(r.name || '-')}</td>
      <td>${escapeHtml(r.email || '-')}</td>
      <td>${escapeHtml(r.phone || '-')}</td>
      <td>${escapeHtml(getCampaignName(r.campaign_id))}</td>
      <td><strong>Rp ${formatRupiah(r.nominal)}</strong></td>
      <td>${escapeHtml(r.method)}</td>
      <td>${escapeHtml(r.status)}</td>
      <td>${escapeHtml(r.source)}</td>
      <td>${escapeHtml(r.note || '-')}</td>
    </tr>
  `).join('');
}

function renderSummary(rows) {
  const total = rows.reduce((sum, r) => sum + Number(r.nominal || 0), 0);
  const donatur = new Set(rows.map(r => r.email || r.phone || r.name).filter(Boolean)).size;
  const pending = rows.filter(r => r.status === 'pending').length;

  document.getElementById('sumTotalDonation').textContent = 'Rp ' + formatRupiah(total);
  document.getElementById('sumTransaction').textContent = rows.length;
  document.getElementById('sumDonatur').textContent = donatur;
  document.getElementById('sumPending').textContent = pending;
}

function exportDonationExcel() {
  const table = document.querySelector('table');
  const wb = XLSX.utils.table_to_book(table, { sheet: 'Laporan Donatur' });
  XLSX.writeFile(wb, 'laporan-donatur.xlsx');
}

function downloadDonationTemplate() {
  const rows = [
    ['timestamp','email','nominal','campaign_id','status','method','name','phone','note','source'],
    ['2026-06-27','donatur@email.com','100000','1','paid','manual','Nama Donatur','08123456789','Catatan','manual']
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, 'template-laporan-donatur.xlsx');
}

function openManualDonationModal() {
  document.getElementById('manualDonationModal').classList.add('show');
}

function closeManualDonationModal() {
  document.getElementById('manualDonationModal').classList.remove('show');
}

function initExcelUpload() {
  const input = document.getElementById('excelUpload');
  if (!input) return;

  input.addEventListener('change', async function () {
    const file = this.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async function (e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet);

      if (!rows.length) {
        alert('File Excel kosong.');
        return;
      }

      const res = await apiFetch({
        action: 'importDonationReports',
        rows: JSON.stringify(rows)
      }, 'POST');

      if (res.status === 'success') {
        alert('Import berhasil: ' + res.imported + ' data');
        await loadDonationReport();
      } else {
        alert(res.message || 'Import gagal');
      }

      input.value = '';
    };

    reader.readAsArrayBuffer(file);
  });
}

async function saveManualDonation() {
  const payload = {
    action: 'addManualDonation',
    timestamp: document.getElementById('manualDate').value,
    name: document.getElementById('manualName').value,
    email: document.getElementById('manualEmail').value,
    phone: document.getElementById('manualPhone').value,
    campaign_id: document.getElementById('manualCampaign').value,
    nominal: document.getElementById('manualNominal').value,
    method: document.getElementById('manualMethod').value,
    status: document.getElementById('manualStatus').value,
    note: document.getElementById('manualNote').value,
    source: 'manual'
  };

  const res = await apiFetch(payload, 'POST');

  if (res.status === 'success') {
    alert('Donasi manual berhasil disimpan');
    closeManualDonationModal();
    await loadDonationReport();
  } else {
    alert(res.message || 'Gagal menyimpan donasi');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!checkReportAdminSession()) return;
  if (typeof initDarkMode === 'function') initDarkMode();
  initExcelUpload();
  loadDonationReport();
});