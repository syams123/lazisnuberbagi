/* js/keranjang.js */

const DONATION_ADDON = 5000;

function getCart() {
  return JSON.parse(localStorage.getItem('storeCart') || '[]');
}

function saveCart(cart) {
  localStorage.setItem('storeCart', JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const count = getCart().reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const el = document.getElementById('cartCount');
  if (el) el.textContent = count;
}

function renderCart() {
  const cart = getCart();
  const wrap = document.getElementById('cartItems');

  if (!cart.length) {
    wrap.innerHTML = `
      <div class="empty-cart">
        <i class="fas fa-shopping-cart"></i>
        <h3>Keranjang masih kosong</h3>
        <p>Yuk mulai belanja kebutuhan warga Kedungrejo.</p>
        <a href="toko.html" class="btn-primary">
          <i class="fas fa-store"></i> Belanja Sekarang
        </a>
      </div>
    `;
    updateSummary([]);
    return;
  }

  wrap.innerHTML = cart.map(item => {
    const subtotal = Number(item.price || 0) * Number(item.qty || 0);

    return `
      <div class="cart-item">
        <img class="cart-item-img"
          src="${item.image_url || 'https://placehold.co/300x300?text=Produk'}"
          alt="${escapeHtml(item.name)}"
          onerror="this.src='https://placehold.co/300x300?text=Produk'">

        <div>
          <div class="cart-item-name">${escapeHtml(item.name)}</div>
          <div class="cart-item-meta">
            Berat: ${formatWeight(item.weight_gram)} / item
          </div>
          <div class="cart-item-price">Rp ${formatRupiah(item.price)}</div>
        </div>

        <div class="cart-item-actions">
          <div class="cart-qty">
            <button onclick="changeCartQty('${item.id}', -1)">-</button>
            <span>${item.qty}</span>
            <button onclick="changeCartQty('${item.id}', 1)">+</button>
          </div>

          <div style="text-align:right;margin-bottom:8px;font-weight:900;">
            Rp ${formatRupiah(subtotal)}
          </div>

          <button class="cart-remove" onclick="removeCartItem('${item.id}')">
            <i class="fas fa-trash"></i> Hapus
          </button>
        </div>
      </div>
    `;
  }).join('');

  updateSummary(cart);
}

function updateSummary(cart) {
  const subtotal = cart.reduce((sum, item) => {
    return sum + Number(item.price || 0) * Number(item.qty || 0);
  }, 0);

  const totalWeightGram = cart.reduce((sum, item) => {
    return sum + Number(item.weight_gram || 0) * Number(item.qty || 0);
  }, 0);

  const donationChecked = document.getElementById('addDonation')?.checked;
  const donation = donationChecked ? DONATION_ADDON : 0;

  document.getElementById('cartSubtotal').textContent = 'Rp ' + formatRupiah(subtotal);
  document.getElementById('cartWeight').textContent = formatWeight(totalWeightGram);
  document.getElementById('cartTotal').textContent = 'Rp ' + formatRupiah(subtotal + donation);
}

function changeCartQty(id, delta) {
  let cart = getCart();
  const item = cart.find(x => String(x.id) === String(id));
  if (!item) return;

  item.qty = Number(item.qty || 1) + delta;

  if (item.qty <= 0) {
    cart = cart.filter(x => String(x.id) !== String(id));
  }

  saveCart(cart);
  renderCart();
}

function removeCartItem(id) {
  let cart = getCart().filter(x => String(x.id) !== String(id));
  saveCart(cart);
  renderCart();
}

function formatWeight(gram) {
  gram = Number(gram || 0);
  if (gram >= 1000) {
    return (gram / 1000).toFixed(gram % 1000 === 0 ? 0 : 1) + ' kg';
  }
  return gram + ' gram';
}

function goCheckout() {
  const cart = getCart();

  if (!cart.length) {
    alert('Keranjang masih kosong.');
    return;
  }

  const donationChecked = document.getElementById('addDonation')?.checked;
  localStorage.setItem('storeAddDonation', donationChecked ? 'true' : 'false');

  window.location.href = 'checkout.html';
}

document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  renderCart();
});