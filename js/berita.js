/* =============================================
   js/berita.js — Logika Halaman Berita & Artikel
   Bergantung pada: js/main.js
   ============================================= */

let allArticles  = [];
let currentCat   = 'all';
let searchQuery  = '';
let currentYear  = '';  // <-- TAMBAHAN: untuk filter tahun

async function fetchArticles() {
    try {
        const data = await apiFetch({ action: 'getArticles' });
        allArticles = Array.isArray(data) ? data : [];
        buildCategoryFilter();
        renderArticles();
    } catch (e) {
        document.getElementById('beritaGrid').innerHTML =
            '<div class="loading-indicator">Gagal memuat artikel. Periksa koneksi.</div>';
    }
}

function buildCategoryFilter() {
    // Filter buttons
    const categories  = [...new Set(allArticles.map(a => a.category).filter(Boolean))];
    const filterWrap  = document.getElementById('filterButtons');
    if (filterWrap) {
        filterWrap.innerHTML = `
            <button class="filter-btn active" data-filter="all">Semua</button>
            ${categories.map(c => `<button class="filter-btn" data-filter="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('')}
        `;
        filterWrap.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                filterWrap.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentCat = btn.dataset.filter;
                currentYear = ''; // <-- TAMBAHAN: reset tahun
                renderArticles();
                highlightActiveArchive(''); // <-- TAMBAHAN: reset highlight
            });
        });
    }

    // Sidebar kategori
    const sidebar = document.getElementById('categoryList');
    if (sidebar) {
        sidebar.innerHTML = categories.map(cat => {
            const count = allArticles.filter(a => a.category === cat).length;
            return `<a href="javascript:void(0)" onclick="filterByCategory('${escapeHtml(cat)}')">
                        <span>${escapeHtml(cat)}</span>
                        <span class="cat-count">${count}</span>
                    </a>`;
        }).join('') || '<div class="text-muted" style="font-size:0.85rem;">Tidak ada kategori</div>';
    }
}

function filterByCategory(cat) {
    currentCat = cat;
    currentYear = ''; // <-- TAMBAHAN: reset tahun
    document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.filter === cat);
    });
    renderArticles();
    highlightActiveArchive(''); // <-- TAMBAHAN: reset highlight
}

function renderArticles() {
    const grid = document.getElementById('beritaGrid');
    let list = allArticles;

    if (currentCat !== 'all') list = list.filter(a => a.category === currentCat);
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        list = list.filter(a => a.title?.toLowerCase().includes(q) || a.excerpt?.toLowerCase().includes(q));
    }
    
    // <-- TAMBAHAN: filter tahun -->
    if (currentYear) {
        list = list.filter(a => {
            if (!a.created_at) return false;
            const year = new Date(a.created_at).getFullYear().toString();
            return year === currentYear;
        });
    }

    if (!list.length) {
        grid.innerHTML = '<div class="loading-indicator">Tidak ada artikel ditemukan.</div>';
        return;
    }
    grid.innerHTML = list.map(a => renderBeritaCard(a)).join('');
    if (typeof initScrollReveal === 'function') initScrollReveal('.berita-card');
}

function doSearch() {
    const input = document.getElementById('searchInput');
    searchQuery = input?.value?.trim() || '';
    renderArticles();
}

// ========== TAMBAHAN: LOAD ARSIP TAHUN ==========
async function loadArchives() {
    const archiveContainer = document.getElementById('archiveList');
    if (!archiveContainer) return;
    try {
        const archives = await apiFetch({ action: 'getArticleArchives' });
        if (!archives || !archives.length) {
            archiveContainer.innerHTML = '<div class="text-muted">Belum ada arsip</div>';
            return;
        }
        archiveContainer.innerHTML = archives.map(a => `
            <a href="javascript:void(0)" onclick="filterByYear('${a.year}')" data-year="${a.year}">
                <span>${a.year}</span>
                <span class="cat-count">${a.count}</span>
            </a>
        `).join('');
    } catch (err) {
        console.error(err);
        archiveContainer.innerHTML = '<div class="text-muted">Gagal memuat arsip</div>';
    }
}

// ========== TAMBAHAN: LOAD DAFTAR PENULIS ==========
async function loadAuthors() {
    const authorContainer = document.getElementById('authorList');
    if (!authorContainer) return;
    try {
        const authors = await apiFetch({ action: 'getAuthorsWithStats' });
        if (!authors || !authors.length) {
            authorContainer.innerHTML = '<div class="text-muted">Belum ada penulis</div>';
            return;
        }
        const activeAuthors = authors.filter(a => a.article_count > 0);
        authorContainer.innerHTML = activeAuthors.map(author => {
            const avatarHtml = author.foto_profil 
                ? `<img src="${author.foto_profil}" class="author-avatar" onerror="this.src='https://ui-avatars.com/api/?background=067d7d&color=fff&name=${encodeURIComponent(author.name)}'">`
                : `<div class="author-avatar">${author.name.charAt(0).toUpperCase()}</div>`;
            return `
                <div class="author-item">
                    ${avatarHtml}
                    <div class="author-info">
                        <div class="author-name">${escapeHtml(author.name)}</div>
                        <div class="author-badge">📄 ${author.article_count} artikel</div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error(err);
        authorContainer.innerHTML = '<div class="text-muted">Gagal memuat penulis</div>';
    }
}

// ========== TAMBAHAN: FILTER TAHUN ==========
function filterByYear(year) {
    currentYear = year;
    currentCat = 'all'; // reset ke semua kategori
    
    // Update tombol filter aktif ke "Semua"
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === 'all');
    });
    
    renderArticles();
    highlightActiveArchive(year);
}

function highlightActiveArchive(year) {
    document.querySelectorAll('#archiveList a').forEach(link => {
        if (year && link.getAttribute('data-year') === year) {
            link.style.fontWeight = 'bold';
            link.style.color = 'var(--primary)';
        } else {
            link.style.fontWeight = '';
            link.style.color = '';
        }
    });
}

// ========== PAGINATION MODERN ==========
let currentPage = 1;
let itemsPerPage = 6;

// Function untuk mendapatkan artikel yang sudah difilter
function getFilteredArticlesForPagination() {
    let list = allArticles;

    if (currentCat !== 'all') list = list.filter(a => a.category === currentCat);
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        list = list.filter(a => a.title?.toLowerCase().includes(q) || a.excerpt?.toLowerCase().includes(q));
    }
    if (currentYear) {
        list = list.filter(a => {
            if (!a.created_at) return false;
            const year = new Date(a.created_at).getFullYear().toString();
            return year === currentYear;
        });
    }
    return list;
}

// Replace renderArticles asli dengan versi pagination
const originalRenderArticles = renderArticles;
window.renderArticles = function() {
    const filtered = getFilteredArticlesForPagination();
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    
    if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    
    const start = (currentPage - 1) * itemsPerPage;
    const paginated = filtered.slice(start, start + itemsPerPage);
    
    // Panggil render asli dengan artikel yang sudah dipaginasi
    renderArticlesPagination(paginated);
    renderPaginationUI(totalPages);
};

// Render artikel dengan pagination
function renderArticlesPagination(articles) {
    const grid = document.getElementById('beritaGrid');
    
    if (!articles.length) {
        grid.innerHTML = '<div class="loading-indicator">Tidak ada artikel ditemukan.</div>';
        return;
    }
    grid.innerHTML = articles.map(a => renderBeritaCard(a)).join('');
    if (typeof initScrollReveal === 'function') initScrollReveal('.berita-card');
}

// Render tombol pagination
function renderPaginationUI(totalPages) {
    const container = document.getElementById('paginationContainer');
    if (!container) return;
    
    if (totalPages <= 1) {
        container.style.display = 'none';
        return;
    }
    container.style.display = 'flex';
    
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    
    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
        prevBtn.onclick = () => {
            if (currentPage > 1) {
                currentPage--;
                window.renderArticles();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        };
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.onclick = () => {
            if (currentPage < totalPages) {
                currentPage++;
                window.renderArticles();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        };
    }
    
    const pageNumbersContainer = document.getElementById('pageNumbers');
    if (!pageNumbersContainer) return;
    
    let pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        if (currentPage <= 3) {
            pages = [1, 2, 3, 4, '...', totalPages];
        } else if (currentPage >= totalPages - 2) {
            pages = [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        } else {
            pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
        }
    }
    
    pageNumbersContainer.innerHTML = pages.map(page => {
        if (page === '...') {
            return `<span class="page-dots">...</span>`;
        }
        const isActive = page === currentPage;
        return `<button class="page-number ${isActive ? 'active' : ''}" onclick="goToPagePagination(${page})">${page}</button>`;
    }).join('');
}

// Fungsi pindah halaman
function goToPagePagination(page) {
    currentPage = page;
    window.renderArticles();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Override fungsi doSearch, filterByCategory, filterByYear agar reset ke halaman 1
const originalDoSearch = doSearch;
window.doSearch = function() {
    currentPage = 1;
    originalDoSearch();
};

const originalFilterByCategory = filterByCategory;
window.filterByCategory = function(cat) {
    currentPage = 1;
    originalFilterByCategory(cat);
};

const originalFilterByYear = filterByYear;
window.filterByYear = function(year) {
    currentPage = 1;
    originalFilterByYear(year);
};

// Ganti renderArticles asli dengan versi pagination
renderArticles = window.renderArticles;

// ========== PERBAIKAN: SATU DOMContentLoaded (tidak dobel) ==========
document.addEventListener('DOMContentLoaded', () => {
    initCommon();
    fetchArticles();
    loadArchives();   // <-- TAMBAHAN
    loadAuthors();    // <-- TAMBAHAN

    // Enter untuk search
    document.getElementById('searchInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') doSearch();
    });
});