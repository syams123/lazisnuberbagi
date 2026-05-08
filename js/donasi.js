/* =============================================
   js/donasi.js — Logika Halaman Donasi
   ============================================= */

const ADMIN_WA = '6288217237735';
const campaignId = new URLSearchParams(window.location.search).get('id');
let currentCampaign = null;

/* ========== FORMAT TANGGAL ========== */
function formatDateIndonesia(dateString) {
    if (!dateString) return '-';
    let cleanDate = dateString;
    if (dateString.includes('T')) {
        cleanDate = dateString.split('T')[0];
    }
    const date = new Date(cleanDate);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

/* ========== LOAD CAMPAIGN DETAIL ========== */
async function loadCampaign() {
    const container = document.getElementById('campaignDetail');
    if (!campaignId) {
        container.innerHTML = '<div class="loading-indicator">ID program tidak ditemukan. <a href="programs.html">Kembali</a></div>';
        return;
    }
    try {
        const campaigns = await apiFetch({ action: 'getCampaigns' });
        const c = campaigns.find(x => String(x.id) === String(campaignId));
        if (!c) {
            container.innerHTML = '<div class="loading-indicator">Program tidak ditemukan.</div>';
            return;
        }
        currentCampaign = c;
        const pct = c.target > 0 ? (c.collected / c.target * 100).toFixed(1) : 100;
        const isEnded = c.status !== 'active';

        container.innerHTML = `
            <div class="donation-card">
                ${c.image_url ? `<img class="campaign-featured-img" src="${c.image_url}" alt="${escapeHtml(c.title)}" onerror="this.style.display='none'">` : ''}
                <span class="badge ${isEnded ? 'badge-ended' : 'badge-active'}">${isEnded ? 'Berakhir' : 'Aktif'}</span>
                <h1 class="campaign-detail-title">${escapeHtml(c.title)}</h1>
                <div class="campaign-detail-meta">
                    <span><i class="fas fa-calendar-alt"></i> Deadline: ${formatDateIndonesia(c.deadline)}</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(c.location || 'Kedungrejo')}</span>
                    ${c.category ? `<span><i class="fas fa-tag"></i> ${escapeHtml(c.category)}</span>` : ''}
                </div>
                ${c.target !== 0 ? `
                <div style="margin-bottom:18px;">
                    <div style="display:flex;justify-content:space-between;font-size:0.85rem;color:var(--text-muted);margin-bottom:6px;">
                        <span>Terkumpul: <strong style="color:var(--primary);">Rp ${formatRupiah(c.collected)}</strong></span>
                        <span>${pct}%</span>
                    </div>
                    <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(pct,100)}%"></div></div>
                    <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;">Target: Rp ${formatRupiah(c.target)}</div>
                </div>` : `
                <div style="margin-bottom:18px;font-size:0.85rem;color:var(--text-muted);">
                    Terkumpul: <strong style="color:var(--primary);">Rp ${formatRupiah(c.collected)}</strong> (Target Unlimited)
                </div>`}
                <div class="campaign-desc">${c.description || 'Deskripsi program tidak tersedia.'}</div>
                ${c.maps_link ? `<div style="margin-top:16px;"><a href="${c.maps_link}" target="_blank" class="btn-outline btn-sm"><i class="fas fa-map-marker-alt"></i> Lihat Lokasi</a></div>` : ''}
            </div>`;

        if (isEnded) {
            const btnDonasi = document.getElementById('btnDonasi');
            if (btnDonasi) {
                btnDonasi.disabled = true;
                btnDonasi.innerHTML = '<i class="fas fa-ban"></i> Program Sudah Berakhir';
            }
        }
    } catch (e) {
        container.innerHTML = '<div class="loading-indicator">Gagal memuat data. Periksa koneksi.</div>';
        console.error(e);
    }
}

/* ========== NOMINAL BUTTONS WITH MINIMUM ========== */
function initNominalButtons() {
    const btns = document.querySelectorAll('.nominal-btn');
    if (!btns.length) return;
    
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (btn.dataset.val !== 'other') {
                const amountInput = document.getElementById('donationAmount');
                if (amountInput) amountInput.value = btn.dataset.val;
                // Trigger validasi
                validateNominal();
            } else {
                const amountInput = document.getElementById('donationAmount');
                if (amountInput) {
                    amountInput.value = '';
                    amountInput.focus();
                }
            }
        });
    });
}

/* ========== VALIDASI NOMINAL ========== */
function validateNominal() {
    const amountInput = document.getElementById('donationAmount');
    const nominalError = document.getElementById('nominalError');
    const btnDonasi = document.getElementById('btnDonasi');
    
    if (!amountInput || !btnDonasi) return;
    
    let amount = parseInt(amountInput.value);
    const isManual = document.querySelector('input[name="paymentMethod"]:checked')?.value === 'manual';
    
    // Aturan minimal: 10.000 untuk online, 1.000 untuk manual
    const minAmount = isManual ? 1000 : 10000;
    
    if (isNaN(amount) || amount < minAmount) {
        if (nominalError) {
            nominalError.style.display = 'block';
            nominalError.innerHTML = `⚠️ Minimal donasi ${isManual ? 'Rp 1.000' : 'Rp 10.000'} untuk ${isManual ? 'transfer manual' : 'pembayaran online'}.`;
        }
        btnDonasi.disabled = true;
        return false;
    } else {
        if (nominalError) {
            nominalError.style.display = 'none';
        }
        btnDonasi.disabled = false;
        return true;
    }
}

/* ========== INIT PAYMENT METHOD ========== */
function initPaymentMethod() {
    const paymentOptions = document.querySelectorAll('.payment-option');
    const manualInfo = document.getElementById('manualInfo');
    const btnDonasi = document.getElementById('btnDonasi');
    
    if (!paymentOptions.length) return;
    
    paymentOptions.forEach(option => {
        const radio = option.querySelector('input[type="radio"]');
        option.addEventListener('click', () => {
            if (radio) {
                radio.checked = true;
                paymentOptions.forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                
                // Tampilkan/sembunyikan info manual
                if (manualInfo) {
                    manualInfo.style.display = radio.value === 'manual' ? 'block' : 'none';
                }
                
                // Update tombol donasi
                if (btnDonasi) {
                    if (radio.value === 'manual') {
                        btnDonasi.innerHTML = '<i class="fas fa-phone-alt"></i> Konfirmasi via WhatsApp';
                    } else {
                        btnDonasi.innerHTML = '<i class="fas fa-credit-card"></i> Bayar Sekarang';
                    }
                }
                
                // Re-validasi nominal karena minimal berubah
                validateNominal();
            }
        });
    });
}

/* ========== SUBMIT DONASI ========== */
async function submitDonation() {
    const name   = document.getElementById('donaturName')?.value.trim() || '';
    const phone  = document.getElementById('donaturPhone')?.value.trim() || '';
    const amount = document.getElementById('donationAmount')?.value || '';
    const note   = document.getElementById('donationNote')?.value.trim() || '';
    const errEl  = document.getElementById('alertError');
    const sucEl  = document.getElementById('alertSuccess');
    const btnDonasi = document.getElementById('btnDonasi');
    
    // Dapatkan metode pembayaran
    const selectedPayment = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'midtrans';
    const isManual = selectedPayment === 'manual';
    const minAmount = isManual ? 1000 : 10000;

    if (errEl) errEl.classList.remove('show');
    if (sucEl) sucEl.classList.remove('show');

    if (!name)   { showAlert(errEl, 'Nama donatur harus diisi'); return; }
    if (!phone)  { showAlert(errEl, 'Nomor WhatsApp harus diisi'); return; }
    
    const nominalInt = parseInt(amount);
    if (!amount || nominalInt < minAmount) { 
        showAlert(errEl, `Minimal donasi Rp ${formatRupiah(minAmount)} untuk ${isManual ? 'transfer manual' : 'pembayaran online'}.`); 
        return; 
    }
    
    if (!currentCampaign) { showAlert(errEl, 'Data program belum dimuat'); return; }
    
    if (currentCampaign.status !== 'active') {
        showAlert(errEl, 'Maaf, program donasi ini sudah berakhir.');
        return;
    }

    if (btnDonasi) {
        btnDonasi.disabled = true;
        btnDonasi.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
    }

    try {
        // Simpan ke spreadsheet via GAS
        await apiFetch({
            action:       'addDonation',
            campaign_id:  currentCampaign.id,
            name:         name,
            phone:        phone,
            amount:       nominalInt,
            note:         note,
            payment_method: selectedPayment
        }, 'POST');
    } catch (e) {
        console.warn('Gagal simpan ke sheet, lanjut WA redirect:', e);
    }

    if (isManual) {
    // Transfer Manual → Redirect ke WhatsApp
    const msg = encodeURIComponent(
        `*Donasi Lazisnu Kedungrejo (Manual)*\n\n` +
        `Program: ${currentCampaign.title}\n` +
        `Nama: ${name}\n` +
        `No. HP: ${phone}\n` +
        `Nominal: Rp ${formatRupiah(amount)}\n` +
        `${note ? 'Catatan: ' + note + '\n' : ''}\n` +
        `*Silakan transfer ke salah satu rekening berikut:*\n\n` +
        `🏦 BSI\n` +
        `   No. Rekening: 7150048723\n` +
        `   a.n UPZISNU KEDUNGREJO\n\n` +
        `🏦 BCA\n` +
        `   No. Rekening: 0182317495\n` +
        `   a.n Yay Lembaga Amil Zakat\n\n` +
        `🏦 BCA\n` +
        `   No. Rekening: 0182317487\n` +
        `   a.n Yay Lembaga Amil Zakat Infaq\n\n` +
        `*Setelah transfer, kirim bukti transfer ke nomor ini.*\n\n` +
        `Jazakumullah khairan.`
    );
    window.open(`https://wa.me/${ADMIN_WA}?text=${msg}`, '_blank');
    showAlert(sucEl, 'Terima kasih! Silakan transfer ke salah satu rekening dan konfirmasi via WhatsApp.');
} else {
    // Online Payment → Integrasi Midtrans nanti
    showAlert(sucEl, 'Fitur pembayaran online sedang dalam pengembangan. Silakan pilih metode Transfer Manual untuk sementara.');
}
    
    // Reset form
    const amountInput = document.getElementById('donationAmount');
    const noteInput = document.getElementById('donationNote');
    if (amountInput) amountInput.value = '';
    if (noteInput) noteInput.value = '';
    
    document.querySelectorAll('.nominal-btn').forEach(b => b.classList.remove('active'));
    
    if (btnDonasi) {
        btnDonasi.disabled = false;
        const isManualNow = document.querySelector('input[name="paymentMethod"]:checked')?.value === 'manual';
        if (isManualNow) {
            btnDonasi.innerHTML = '<i class="fas fa-phone-alt"></i> Konfirmasi via WhatsApp';
        } else {
            btnDonasi.innerHTML = '<i class="fas fa-credit-card"></i> Bayar Sekarang';
        }
    }
}
/* ========== COPY REKENING ========== */
function copyRek(rekening) {
    if (!rekening) {
        showToast('Nomor rekening tidak ditemukan', 'error');
        return;
    }
    
    navigator.clipboard.writeText(rekening).then(() => {
        showToast(` Nomor rekening ${rekening} berhasil disalin!`, 'success');
    }).catch(() => {
        showToast('Gagal menyalin, silakan salin manual.', 'error');
    });
}

/* ========== TOAST NOTIFICATION ========== */
function showToast(message, type = 'success') {
    // Hapus toast yang sudah ada
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 0.85rem;
        z-index: 9999;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
/* ========== SHOW ALERT ========== */
function showAlert(el, msg) {
    if (!el) return;
    el.innerText = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 5000);
}

/* ========== INITIALIZE ========== */
document.addEventListener('DOMContentLoaded', () => {
    if (typeof initCommon === 'function') {
        initCommon();
    }
    loadCampaign();
    initNominalButtons();
    initPaymentMethod();
    
    // Event listener untuk input nominal
    const amountInput = document.getElementById('donationAmount');
    if (amountInput) {
        amountInput.addEventListener('input', validateNominal);
        amountInput.addEventListener('blur', validateNominal);
    }
});