/* js/toko.js — Toko Lazisnu */

let storeProducts = [];
let activeCategory = '';

async function loadStoreProducts() {
  try {
    const data = await apiFetch({ action: 'getProducts' });
    storeProducts = Array.isArray(data) ? data : [];

    renderCategories();
    renderStoreProducts();
    updateCartCount();
  } catch (e) {
    document.getElementById('productGrid').innerHTML =
      '<div class="store-loading">Gagal memuat produk.</div>';
  }
}

function renderCategories() {
  const wrap = document.getElementById('categoryList');
  const cats = [...new Set(storeProducts.map(p => p.category).filter(Boolean))];

  wrap.innerHTML = `
    <button class="category-chip active" onclick="setCategory('')">
      <i class="fas fa-border-all"></i> Semua
    </button>
    ${cats.map(cat => `
      <button class="category-chip" onclick="setCategory('${escapeHtml(cat)}')">
        <i class="fas fa-box"></i> ${escapeHtml(cat)}
      </button>
    `).join('')}
  `;
}

function setCategory(cat) {
  activeCategory = cat;

  document.querySelectorAll('.category-chip').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.trim() === (cat || 'Semua'));
  });

  renderStoreProducts();
}

function filterProducts() {
  renderStoreProducts();
}

function renderStoreProducts() {
  const q = document.getElementById('searchProduct').value.toLowerCase().trim();

  let rows = storeProducts.filter(p => String(p.status || 'active') === 'active');

  if (activeCategory) {
    rows = rows.filter(p => String(p.category) === String(activeCategory));
  }

  if (q) {
    rows = rows.filter(p =>
      String(p.name || '').toLowerCase().includes(q) ||
      String(p.category || '').toLowerCase().includes(q)
    );
  }

  const featured = rows.slice(0, 5);
  const latest = rows.slice().reverse();

  document.getElementById('featuredProducts').innerHTML =
    featured.length ? featured.map(renderProductCard).join('') : emptyProductHtml();

  document.getElementById('productGrid').innerHTML =
    latest.length ? latest.map(renderProductCard).join('') : emptyProductHtml();
}

function renderProductCard(p) {
  const stock = Number(p.stock || 0);
  const disabled = stock <= 0 ? 'disabled' : '';

  return `
    <div class="product-card">
      <div class="product-img-wrap" onclick="openProduct('${p.id}')">
        <img class="product-img"
          src="${p.image_url || 'https://placehold.co/600x600?text=Produk'}"
          alt="${escapeHtml(p.name)}"
          onerror="this.src='https://placehold.co/600x600?text=Produk'">
        ${stock <= 0 ? `<span class="product-badge">Habis</span>` : `<span class="product-badge">Ready</span>`}
      </div>

      <div class="product-body">
        <div class="product-name" onclick="openProduct('${p.id}')">${escapeHtml(p.name)}</div>
        <div class="product-price">Rp ${formatRupiah(p.price)}</div>

        <div class="product-meta">
          <span>${escapeHtml(p.category || '-')}</span>
          <span>Stok ${stock}</span>
        </div>

        <div class="product-actions">
          <button class="btn-view" onclick="openProduct('${p.id}')">
            Detail
          </button>
          <button class="btn-add-cart" ${disabled} onclick="addToCart('${p.id}')">
            <i class="fas fa-cart-plus"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

function emptyProductHtml() {
  return `
    <div class="store-loading">
      <i class="fas fa-box-open"></i><br>
      Produk belum tersedia.
    </div>
  `;
}

function openProduct(id) {
  window.location.href = 'produk-detail.html?id=' + encodeURIComponent(id);
}

function getCart() {
  return JSON.parse(localStorage.getItem('storeCart') || '[]');
}

function saveCart(cart) {
  localStorage.setItem('storeCart', JSON.stringify(cart));
  updateCartCount();
}

function addToCart(id) {
  const product = storeProducts.find(p => String(p.id) === String(id));
  if (!product) return;

  let cart = getCart();
  const existing = cart.find(item => String(item.id) === String(id));

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: Number(product.price || 0),
      weight_gram: Number(product.weight_gram || 0),
      image_url: product.image_url || '',
      qty: 1
    });
  }

  saveCart(cart);
  alert('Produk masuk keranjang');
}

function updateCartCount() {
  const count = getCart().reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const el = document.getElementById('cartCount');
  if (el) el.textContent = count;
}

document.addEventListener('DOMContentLoaded', () => {
  loadStoreProducts();

  const search = document.getElementById('searchProduct');
  if (search) {
    search.addEventListener('input', filterProducts);
  }
});