/* js/checkout.js */

const ADMIN_WA_STORE = '6288217237735';
const DONATION_ADDON = 5000;

function getCart() {
  return JSON.parse(localStorage.getItem('storeCart') || '[]');
}

function formatWeight(gram) {
  gram = Number(gram || 0);
  if (gram >= 1000) {
    return (gram / 1000).toFixed(gram % 1000 === 0 ? 0 : 1) + ' kg';
  }
  return gram + ' gram';
}

function getCartSubtotal(cart) {
  return cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);
}

function getCartWeightGram(cart) {
  return cart.reduce((sum, item) => sum + Number(item.weight_gram || 0) * Number(item.qty || 0), 0);
}

function getSelectedShippingInfo() {
  const select = document.getElementById('buyerArea');
  const opt = select.options[select.selectedIndex];

  return {
    area: select.value || '',
    ongkir: Number(opt?.dataset?.ongkir || 0),
    estimasi: opt?.dataset?.estimasi || '-'
  };
}

function getWeightExtra(weightGram) {
  const kg = Math.ceil(Number(weightGram || 0) / 1000);

  if (kg <= 5) return 0;
  if (kg <= 10) return 1000;
  if (kg <= 15) return 2000;

  return 3000;
}
function renderCheckout() {
  const cart = getCart();

  if (!cart.length) {
    alert('Keranjang kosong.');
    window.location.href = 'toko.html';
    return;
  }

  const wrap = document.getElementById('checkoutItems');

  wrap.innerHTML = cart.map(item => `
    <div class="checkout-product">
      <img src="${item.image_url || 'https://placehold.co/200x200?text=Produk'}"
           onerror="this.src='https://placehold.co/200x200?text=Produk'">
      <div>
        <div class="checkout-product-name">${escapeHtml(item.name)}</div>
        <div class="checkout-product-meta">${item.qty} x Rp ${formatRupiah(item.price)}</div>
      </div>
      <strong>Rp ${formatRupiah(Number(item.price || 0) * Number(item.qty || 0))}</strong>
    </div>
  `).join('');

  calculateCheckout();
}

function calculateCheckout() {
  const cart = getCart();

  const subtotal = getCartSubtotal(cart);
  const weightGram = getCartWeightGram(cart);
  const shippingInfo = getSelectedShippingInfo();
  const weightExtra = getWeightExtra(weightGram);
  const distanceKm = 0;
  const shipping = shippingInfo.ongkir ? shippingInfo.ongkir + weightExtra : 0;
  const donation = localStorage.getItem('storeAddDonation') === 'true' ? DONATION_ADDON : 0;
  const total = subtotal + shipping + donation;

  document.getElementById('checkoutSubtotal').textContent = 'Rp ' + formatRupiah(subtotal);
  document.getElementById('checkoutWeight').textContent = formatWeight(weightGram);
  document.getElementById('checkoutDistance').textContent =
  shippingInfo.area ? `${shippingInfo.area} • ${shippingInfo.estimasi}` : '-';
  document.getElementById('checkoutShipping').textContent = 'Rp ' + formatRupiah(shipping);
  document.getElementById('checkoutTotal').textContent = 'Rp ' + formatRupiah(total);

  const donationRow = document.getElementById('checkoutDonationRow');
  if (donationRow) donationRow.style.display = donation ? 'flex' : 'none';

  return { subtotal, weightGram, distanceKm, shipping, donation, total };
}

async function submitOrder() {
  const cart = getCart();
  if (!cart.length) {
    alert('Keranjang kosong.');
    return;
  }

  const name = document.getElementById('buyerName').value.trim();
  const phone = document.getElementById('buyerPhone').value.trim();
  const address = document.getElementById('buyerAddress').value.trim();
  const area = document.getElementById('buyerArea').value;
  const note = document.getElementById('orderNote').value.trim();
  const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'cod';

  if (!name || !phone || !address || !area) {
    alert('Nama, WA, alamat, dan area wajib diisi.');
    return;
  }

  const calc = calculateCheckout();

  const orderProducts = cart.map(item => ({
    id: item.id,
    name: item.name,
    price: item.price,
    qty: item.qty,
    weight_gram: item.weight_gram
  }));

  const payload = {
    action: 'saveOrder',
    name,
    phone,
    address,
    village: 'Kedungrejo',
    district: 'Waru',
    city: 'Sidoarjo',
    area,
    distance_km: calc.distanceKm,
    total_weight_kg: Math.ceil(calc.weightGram / 1000),
    subtotal: calc.subtotal,
    shipping_cost: calc.shipping,
    donation: calc.donation,
    total: calc.total,
    payment_method: paymentMethod,
    status: 'pending',
    products: JSON.stringify(orderProducts),
    note
  };

  try {
    const res = await apiFetch(payload, 'POST');

    if (res.status !== 'success') {
      alert(res.message || 'Gagal membuat pesanan.');
      return;
    }

    const msg = encodeURIComponent(
      `*Pesanan Toko Lazisnu Kedungrejo*\n\n` +
      `Invoice: ${res.order_id || '-'}\n` +
      `Nama: ${name}\n` +
      `WA: ${phone}\n` +
      `Alamat: ${address}\n` +
      `Area: ${area}\n\n` +
      `*Produk:*\n` +
      cart.map(item => `- ${item.name} x${item.qty} = Rp ${formatRupiah(Number(item.price) * Number(item.qty))}`).join('\n') +
      `\n\nSubtotal: Rp ${formatRupiah(calc.subtotal)}` +
      `\nOngkir: Rp ${formatRupiah(calc.shipping)}` +
      `${calc.donation ? `\nDonasi: Rp ${formatRupiah(calc.donation)}` : ''}` +
      `\nTotal: Rp ${formatRupiah(calc.total)}` +
      `\nMetode: ${paymentMethod.toUpperCase()}` +
      `${note ? `\nCatatan: ${note}` : ''}`
    );

    localStorage.removeItem('storeCart');
    localStorage.removeItem('storeAddDonation');

    alert('Pesanan berhasil dibuat. Mengarahkan ke WhatsApp admin.');
    window.open(`https://wa.me/${ADMIN_WA_STORE}?text=${msg}`, '_blank');
    window.location.href = 'toko.html';

  } catch (e) {
    console.error(e);
    alert('Gagal terhubung ke server.');
  }
}

document.addEventListener('DOMContentLoaded', renderCheckout);
