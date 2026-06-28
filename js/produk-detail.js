/* js/produk-detail.js */

const productId = new URLSearchParams(window.location.search).get('id');
let currentProduct = null;
let detailImages = [];

async function loadProductDetail() {
  const box = document.getElementById('productDetailBox');

  if (!productId) {
    box.innerHTML = '<div class="store-loading">Produk tidak ditemukan.</div>';
    return;
  }

  try {
    const res = await apiFetch({
      action: 'getProductById',
      id: productId
    });

    if (res.status !== 'success' || !res.product) {
      box.innerHTML = '<div class="store-loading">Produk tidak ditemukan.</div>';
      return;
    }

    currentProduct = res.product;
    renderProductDetail(currentProduct);
    updateCartCount();

  } catch (e) {
    console.error(e);
    box.innerHTML = '<div class="store-loading">Gagal memuat detail produk.</div>';
  }
}

function renderProductDetail(p) {
  const box = document.getElementById('productDetailBox');

  detailImages = buildProductImages(p);
  const mainImage = detailImages[0] || 'https://placehold.co/800x800?text=Produk';
  const stock = Number(p.stock || 0);
  const weightKg = Number(p.weight_gram || 0) / 1000;

  box.innerHTML = `
    <div class="product-detail-layout">
      <div>
        <img id="mainProductImage" class="product-gallery-main"
          src="${mainImage}"
          alt="${escapeHtml(p.name)}"
          onerror="this.src='https://placehold.co/800x800?text=Produk'">

        <div class="product-thumbs">
          ${detailImages.map((img, i) => `
            <img class="product-thumb ${i === 0 ? 'active' : ''}"
              src="${img}"
              onclick="changeMainImage('${img.replace(/'/g, "\\'")}', this)"
              onerror="this.style.display='none'">
          `).join('')}
        </div>
      </div>

      <div>
        <h1 class="detail-title">${escapeHtml(p.name)}</h1>

        <div class="detail-meta">
          <span><i class="fas fa-star" style="color:#f59e0b;"></i> 5.0</span>
          <span>Terjual 0</span>
          <span>${escapeHtml(p.category || '-')}</span>
        </div>

        <div class="detail-price-box">
          <div class="detail-price">Rp ${formatRupiah(p.price)}</div>
        </div>

        <div class="detail-info">
          <div class="detail-info-row">
            <span>Stok</span>
            <strong>${stock > 0 ? stock + ' tersedia' : 'Stok habis'}</strong>
          </div>
          <div class="detail-info-row">
            <span>Berat</span>
            <strong>${weightKg > 0 ? weightKg + ' kg' : '-'}</strong>
          </div>
          <div class="detail-info-row">
            <span>Pengiriman</span>
            <strong>Khusus Desa Kedungrejo</strong>
          </div>
        </div>

        <div class="qty-control">
          <span style="color:var(--text-muted);width:110px;">Jumlah</span>
          <button onclick="changeQty(-1)">-</button>
          <input type="number" id="productQty" value="1" min="1" max="${stock || 1}">
          <button onclick="changeQty(1)">+</button>
        </div>

        <div class="detail-actions">
          <button class="btn-add-detail" onclick="addDetailToCart()" ${stock <= 0 ? 'disabled' : ''}>
            <i class="fas fa-cart-plus"></i> Masukkan Keranjang
          </button>
          <button class="btn-buy-now" onclick="buyNow()" ${stock <= 0 ? 'disabled' : ''}>
            <i class="fas fa-bolt"></i> Beli Sekarang
          </button>
        </div>
      </div>
    </div>

    <div class="product-description">
      <h3>Deskripsi Produk</h3>
      <div>${p.description || 'Belum ada deskripsi produk.'}</div>
    </div>
  `;
}

function buildProductImages(p) {
  const images = [];

  if (p.image_url) images.push(p.image_url);

  if (p.gallery) {
    String(p.gallery).split(',').forEach(url => {
      const clean = url.trim();
      if (clean && !images.includes(clean)) images.push(clean);
    });
  }

  return images;
}

function changeMainImage(src, thumb) {
  document.getElementById('mainProductImage').src = src;
  document.querySelectorAll('.product-thumb').forEach(t => t.classList.remove('active'));
  thumb.classList.add('active');
}

function changeQty(delta) {
  const input = document.getElementById('productQty');
  const stock = Number(currentProduct.stock || 1);
  let qty = Number(input.value || 1) + delta;

  if (qty < 1) qty = 1;
  if (stock > 0 && qty > stock) qty = stock;

  input.value = qty;
}

function getCart() {
  return JSON.parse(localStorage.getItem('storeCart') || '[]');
}

function saveCart(cart) {
  localStorage.setItem('storeCart', JSON.stringify(cart));
  updateCartCount();
}

function addDetailToCart() {
  if (!currentProduct) return;

  const qty = Number(document.getElementById('productQty').value || 1);
  let cart = getCart();

  const existing = cart.find(item => String(item.id) === String(currentProduct.id));

  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({
      id: currentProduct.id,
      name: currentProduct.name,
      price: Number(currentProduct.price || 0),
      weight_gram: Number(currentProduct.weight_gram || 0),
      image_url: currentProduct.image_url || '',
      qty: qty
    });
  }

  saveCart(cart);
  alert('Produk berhasil masuk keranjang');
}

function buyNow() {
  addDetailToCart();
  window.location.href = 'keranjang.html';
}

function updateCartCount() {
  const count = getCart().reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const el = document.getElementById('cartCount');
  if (el) el.textContent = count;
}

document.addEventListener('DOMContentLoaded', loadProductDetail);