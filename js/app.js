/**
 * Taman Sayur - Core Application Logic
 * Features:
 * - Product filtering & live search
 * - Relational package detail modal (shows individual items inside a bundle)
 * - Cart state management with localStorage persistence
 * - Direct WhatsApp Checkout message generator
 * - Showcase video modal player
 */

const CONFIG = {
  storeName: "Taman Sayur",
  // Nomor kontak dienkripsi menggunakan algoritma simetris 2-arah (XOR Cipher + Base64)
  // Menjaga privasi kontak dari bot scraper dan crawler regex di repositori publik GitHub
  contactCipher: "YlNVVF9mVEtHQXxYQQ==",
  contactKey: "TamanSayurJateng2026",
  freeShippingMin: 100000,
  currencyFormatter: new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
};

// Dekripsi 2-Arah Nomor Kontak WhatsApp
function getDecryptedPhone() {
  try {
    const raw = atob(CONFIG.contactCipher);
    const key = CONFIG.contactKey;
    let result = "";
    for (let i = 0; i < raw.length; i++) {
      result += String.fromCharCode(raw.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch (err) {
    console.error("Gagal mendekripsi nomor kontak:", err);
    return "";
  }
}

// Inisialisasi Tautan WhatsApp Kontak CS (Header & Footer)
function initContactLinks() {
  const phone = getDecryptedPhone();
  if (!phone) return;

  const headerLink = document.getElementById("header-wa-link");
  if (headerLink) {
    headerLink.href = `https://wa.me/${phone}?text=${encodeURIComponent("Halo Taman Sayur, saya ingin tanya seputar produk dan pengiriman.")}`;
  }

  const footerLink = document.getElementById("footer-wa-link");
  if (footerLink) {
    footerLink.href = `https://wa.me/${phone}?text=${encodeURIComponent("Halo Taman Sayur, saya butuh bantuan.")}`;
  }
}

// Utilitas publik untuk enkripsi nomor baru jika diperlukan di masa depan (akses via konsol browser F12)
window.encryptContactPhone = function(plainPhone, key = CONFIG.contactKey) {
  const raw = String(plainPhone).trim();
  let xored = "";
  for (let i = 0; i < raw.length; i++) {
    xored += String.fromCharCode(raw.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(xored);
};

// Application State
let state = {
  cart: [],
  activeCategory: "all",
  searchQuery: "",
  sortBy: "featured",
  currentPage: 1,
  itemsPerPage: 10
};

// DOM Elements
const productGrid = document.getElementById("product-grid");
const productCountEl = document.getElementById("product-count");
const categoryButtons = document.querySelectorAll(".category-btn");
const searchInput = document.getElementById("search-input");
const sortSelect = document.getElementById("sort-select");
const paginationContainer = document.getElementById("pagination-container");

// Cart DOM
const cartDrawer = document.getElementById("cart-drawer");
const cartOverlay = document.getElementById("cart-overlay");
const cartItemsContainer = document.getElementById("cart-items");
const cartSubtotalEl = document.getElementById("cart-subtotal");
const cartCountBadges = document.querySelectorAll(".cart-count-badge");
const floatingCartBtn = document.getElementById("floating-cart-btn");
const openCartBtns = document.querySelectorAll(".open-cart-btn");
const closeCartBtn = document.getElementById("close-cart-btn");
const checkoutWaBtn = document.getElementById("checkout-wa-btn");
const copyWaBtn = document.getElementById("copy-wa-btn");

// Modal DOM
const packageModal = document.getElementById("package-modal");
const packageModalContent = document.getElementById("package-modal-content");
const productModal = document.getElementById("product-modal");
const productModalContent = document.getElementById("product-modal-content");
const videoModal = document.getElementById("video-modal");
const videoPlayerContainer = document.getElementById("video-player-container");

// Format Rupiah Helper
function formatRupiah(amount) {
  return CONFIG.currencyFormatter.format(amount);
}

// Calculate discount percentage
function calculateDiscount(original, current) {
  if (!original || original <= current) return 0;
  return Math.round(((original - current) / original) * 100);
}

// Initialize Application
function initApp() {
  initContactLinks();
  loadCartFromStorage();
  setupEventListeners();
  renderProducts();
  updateCartUI();
}

// Event Listeners Setup
function setupEventListeners() {
  // Category tabs
  categoryButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      categoryButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.activeCategory = btn.dataset.category;
      state.currentPage = 1; // Reset to page 1
      renderProducts();
    });
  });

  // Search input
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      state.searchQuery = e.target.value.trim().toLowerCase();
      state.currentPage = 1; // Reset to page 1
      renderProducts();
    });
  }

  // Sort dropdown
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      state.sortBy = e.target.value;
      state.currentPage = 1; // Reset to page 1
      renderProducts();
    });
  }

  // Cart Drawer open/close
  openCartBtns.forEach(btn => btn.addEventListener("click", openCart));
  if (floatingCartBtn) floatingCartBtn.addEventListener("click", openCart);
  if (closeCartBtn) closeCartBtn.addEventListener("click", closeCart);
  if (cartOverlay) cartOverlay.addEventListener("click", closeCart);

  // Modal Backdrop Click & Escape Key
  if (packageModal) {
    packageModal.addEventListener("click", (e) => {
      if (e.target === packageModal) closePackageModal();
    });
  }
  if (productModal) {
    productModal.addEventListener("click", (e) => {
      if (e.target === productModal) closeProductModal();
    });
  }
  if (videoModal) {
    videoModal.addEventListener("click", (e) => {
      if (e.target === videoModal) closeVideoModal();
    });
  }
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closePackageModal();
      closeProductModal();
      closeVideoModal();
      closeCart();
    }
  });

  // Checkout & Copy WhatsApp Actions
  if (checkoutWaBtn) {
    checkoutWaBtn.addEventListener("click", handleWhatsAppCheckout);
  }
  if (copyWaBtn) {
    copyWaBtn.addEventListener("click", handleCopyOrder);
  }
}

// Filter and Sort Products
function getFilteredProducts() {
  let list = [...ALL_CATALOG];

  // Category filter
  if (state.activeCategory !== "all") {
    list = list.filter(item => item.category === state.activeCategory);
  }

  // Search query filter
  if (state.searchQuery) {
    list = list.filter(item => {
      const matchName = item.name.toLowerCase().includes(state.searchQuery);
      const matchDesc = item.description.toLowerCase().includes(state.searchQuery);
      const matchOrigin = item.origin.toLowerCase().includes(state.searchQuery);
      return matchName || matchDesc || matchOrigin;
    });
  }

  // Sorting
  switch (state.sortBy) {
    case "price-asc":
      list.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      list.sort((a, b) => b.price - a.price);
      break;
    case "popular":
      list.sort((a, b) => b.soldCount - a.soldCount);
      break;
    case "rating":
      list.sort((a, b) => b.rating - a.rating);
      break;
    case "featured":
    default:
      // Packages first, then featured items
      list.sort((a, b) => {
        if (a.category === "paket" && b.category !== "paket") return -1;
        if (a.category !== "paket" && b.category === "paket") return 1;
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;
        return b.soldCount - a.soldCount;
      });
      break;
  }

  return list;
}

// Render Products Grid with Pagination & Interactive Popups
function renderProducts() {
  const items = getFilteredProducts();
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / state.itemsPerPage) || 1;

  // Boundary check
  if (state.currentPage > totalPages) {
    state.currentPage = totalPages;
  }
  if (state.currentPage < 1) {
    state.currentPage = 1;
  }

  const startIndex = (state.currentPage - 1) * state.itemsPerPage;
  const endIndex = Math.min(startIndex + state.itemsPerPage, totalItems);
  const paginatedItems = items.slice(startIndex, endIndex);

  // Update product count label
  if (productCountEl) {
    if (totalItems === 0) {
      productCountEl.textContent = "0 pilihan komoditas ditemukan";
    } else if (totalPages === 1) {
      productCountEl.textContent = `Menampilkan seluruh ${totalItems} pilihan komoditas segar`;
    } else {
      productCountEl.textContent = `Menampilkan ${startIndex + 1} - ${endIndex} dari ${totalItems} pilihan komoditas segar`;
    }
  }

  // Empty state handling
  if (totalItems === 0) {
    productGrid.innerHTML = `
      <div class="col-span-full py-16 text-center">
        <div class="w-20 h-20 mx-auto mb-4 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
          <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>
        <h3 class="text-lg font-bold text-slate-800 mb-1">Produk tidak ditemukan</h3>
        <p class="text-sm text-slate-500 max-w-sm mx-auto mb-4">Coba cari dengan kata kunci lain seperti "bayam", "sop", "bawang", atau "cabai".</p>
        <button onclick="resetFilter()" class="px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-medium hover:bg-emerald-800 transition">
          Lihat Semua Produk
        </button>
      </div>
    `;
    if (paginationContainer) {
      paginationContainer.innerHTML = "";
      paginationContainer.classList.add("hidden");
    }
    return;
  }

  // Render paginated cards
  productGrid.innerHTML = paginatedItems.map(product => {
    const isPackage = product.category === "paket";
    const discount = calculateDiscount(product.originalPrice, product.price);
    const hasDiscount = discount > 0;

    if (isPackage) {
      // Bundling Package Card Layout
      return `
        <div class="product-card bg-white rounded-2xl border-2 border-emerald-100 overflow-hidden shadow-sm flex flex-col relative group">
          <!-- Top Package Badge -->
          <div class="absolute top-3 left-3 z-10 flex flex-col gap-1 items-start">
            <span class="bg-emerald-700 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
              <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
              Paket Masak Jateng
            </span>
            ${hasDiscount ? `
              <span class="bg-rose-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                Hemat ${discount}%
              </span>
            ` : ""}
          </div>

          <!-- Product Image (Click to open modal) -->
          <div 
            onclick="openPackageModal('${product.id}')"
            class="relative aspect-[4/3] overflow-hidden bg-slate-100 cursor-pointer"
            title="Klik untuk melihat rincian bahan paket"
          >
            <img 
              src="${product.image}" 
              alt="${product.name}" 
              loading="lazy"
              class="w-full h-full object-cover group-hover:scale-105 transition duration-500"
            />
            <div class="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[11px] px-2 py-0.5 rounded-md">
              ${product.harvestStatus || "On-Demand"}
            </div>
            ${product.farmHub ? `
              <div class="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                Hub: ${product.farmHub}
              </div>
            ` : ""}
          </div>

          <!-- Card Content -->
          <div class="p-4 flex-1 flex flex-col justify-between">
            <div>
              <!-- Rating & Terjual -->
              <div class="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span class="flex items-center gap-1 text-amber-500 font-semibold">
                  ★ ${product.rating.toFixed(1)}
                  <span class="text-slate-400 font-normal">(${product.soldCount}+ terjual)</span>
                </span>
                <span class="text-slate-500 truncate max-w-[130px] text-right font-medium">
                  📍 ${product.origin}
                </span>
              </div>

              <!-- Product Name (Click to open modal) -->
              <h3 
                onclick="openPackageModal('${product.id}')"
                class="font-bold text-slate-900 text-base mb-1 line-clamp-1 group-hover:text-emerald-700 transition cursor-pointer"
                title="Klik untuk melihat rincian bahan paket"
              >
                ${product.name}
              </h3>
              
              <!-- Description -->
              <p class="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                ${product.description}
              </p>

              <!-- Relational Info: Isi Paket (Clickable) -->
              <div class="bg-emerald-50/70 border border-emerald-200/70 rounded-xl p-2.5 mb-3">
                <div class="flex items-center justify-between mb-1.5">
                  <span class="text-xs font-bold text-emerald-900 flex items-center gap-1">
                    📦 Isi Paket (${product.includedItemIds.length} Bahan):
                  </span>
                  <button 
                    type="button"
                    onclick="openPackageModal('${product.id}')" 
                    class="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline flex items-center gap-0.5"
                  >
                    Lihat Rincian &rarr;
                  </button>
                </div>
                <!-- Mini thumbnails of included products -->
                <div class="flex items-center gap-1.5 overflow-x-auto py-0.5">
                  ${product.includedItemIds.slice(0, 5).map(itemId => {
                    const item = PRODUCT_MAP.get(itemId);
                    if (!item) return "";
                    return `
                      <span class="inline-flex items-center text-[11px] bg-white text-slate-700 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0" title="${item.name}">
                        ${item.name.split(" ")[0]}
                      </span>
                    `;
                  }).join("")}
                  ${product.includedItemIds.length > 5 ? `<span class="text-[11px] text-emerald-800 font-bold shrink-0">+${product.includedItemIds.length - 5} lainnya</span>` : ""}
                </div>
                ${product.savingsNote ? `
                  <div class="text-[11px] text-emerald-700 font-semibold mt-1.5 pt-1.5 border-t border-emerald-200/50 flex items-center gap-1">
                    <svg class="w-3.5 h-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                    </svg>
                    ${product.savingsNote}
                  </div>
                ` : ""}
              </div>
            </div>

            <!-- Price & Add Button -->
            <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
              <div>
                ${hasDiscount ? `
                  <div class="text-xs text-slate-400 line-through">
                    ${formatRupiah(product.originalPrice)}
                  </div>
                ` : ""}
                <div class="text-lg font-extrabold text-emerald-800">
                  ${formatRupiah(product.price)}
                </div>
                <div class="text-[10px] text-slate-500 font-medium">${product.unit}</div>
              </div>

              <button 
                onclick="addToCart('${product.id}')"
                class="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm hover:shadow"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
                Tambah
              </button>
            </div>
          </div>
        </div>
      `;
    }

    // Individual Product Card Layout
    return `
      <div class="product-card bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm flex flex-col relative group">
        <!-- Badge -->
        <div class="absolute top-3 left-3 z-10 flex flex-col gap-1 items-start">
          ${product.badge ? `
            <span class="bg-white/95 backdrop-blur-sm text-emerald-800 border border-emerald-200 text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              ${product.badge}
            </span>
          ` : ""}
          ${hasDiscount ? `
            <span class="bg-rose-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              -${discount}%
            </span>
          ` : ""}
        </div>

        <!-- Product Image (Click to open modal) -->
        <div 
          onclick="openProductModal('${product.id}')"
          class="relative aspect-[4/3] overflow-hidden bg-slate-100 cursor-pointer"
          title="Klik untuk melihat detail produk & tips penyimpanan"
        >
          <img 
            src="${product.image}" 
            alt="${product.name}" 
            loading="lazy"
            class="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          />
          <div class="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[11px] px-2 py-0.5 rounded-md">
            ${product.harvestStatus || "Segar"}
          </div>
          ${product.farmHub ? `
            <div class="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
              Hub: ${product.farmHub}
            </div>
          ` : ""}
        </div>

        <!-- Card Body -->
        <div class="p-4 flex-1 flex flex-col justify-between">
          <div>
            <!-- Rating & Asal Petani -->
            <div class="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span class="flex items-center gap-1 text-amber-500 font-semibold">
                ★ ${product.rating.toFixed(1)}
                <span class="text-slate-400 font-normal">(${product.soldCount})</span>
              </span>
              <span class="text-slate-500 truncate max-w-[130px] text-right font-medium">
                📍 ${product.origin}
              </span>
            </div>

            <!-- Name (Click to open modal) -->
            <h3 
              onclick="openProductModal('${product.id}')"
              class="font-bold text-slate-900 text-base mb-1 line-clamp-1 group-hover:text-emerald-700 transition cursor-pointer"
              title="Klik untuk melihat detail produk"
            >
              ${product.name}
            </h3>

            <!-- Description -->
            <p class="text-xs text-slate-500 line-clamp-2 mb-2 leading-relaxed">
              ${product.description}
            </p>

            <!-- Quick Detail Link -->
            <button 
              type="button"
              onclick="openProductModal('${product.id}')" 
              class="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline flex items-center gap-0.5 mb-2"
            >
              Lihat Detail &rarr;
            </button>
          </div>

          <!-- Price & Button -->
          <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
            <div>
              ${hasDiscount ? `
                <div class="text-xs text-slate-400 line-through">
                  ${formatRupiah(product.originalPrice)}
                </div>
              ` : ""}
              <div class="text-base font-extrabold text-slate-900">
                ${formatRupiah(product.price)}
              </div>
              <div class="text-[10px] text-slate-500 font-medium">${product.unit}</div>
            </div>

            <button 
              onclick="addToCart('${product.id}')"
              class="px-3.5 py-2 bg-slate-900 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm hover:shadow"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
              + Keranjang
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  // Render pagination controls
  renderPagination(totalItems, totalPages);
}

// Render Dynamic Pagination Controls
function renderPagination(totalItems, totalPages) {
  if (!paginationContainer) return;

  if (totalPages <= 1) {
    paginationContainer.classList.add("hidden");
    paginationContainer.innerHTML = "";
    return;
  }

  paginationContainer.classList.remove("hidden");

  const start = (state.currentPage - 1) * state.itemsPerPage + 1;
  const end = Math.min(start + state.itemsPerPage - 1, totalItems);

  let pagesHtml = "";
  for (let i = 1; i <= totalPages; i++) {
    const isActive = i === state.currentPage;
    pagesHtml += `
      <button 
        type="button"
        onclick="goToPage(${i})" 
        class="w-9 h-9 rounded-xl text-xs font-bold transition flex items-center justify-center ${
          isActive 
            ? "bg-emerald-700 text-white shadow-sm shadow-emerald-700/30" 
            : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
        }"
      >
        ${i}
      </button>
    `;
  }

  const prevDisabled = state.currentPage === 1;
  const nextDisabled = state.currentPage === totalPages;

  paginationContainer.innerHTML = `
    <!-- Left Info Text -->
    <div class="text-xs text-slate-500 font-medium text-center sm:text-left">
      Menampilkan <span class="font-bold text-slate-800">${start}</span> - <span class="font-bold text-slate-800">${end}</span> dari <span class="font-bold text-slate-800">${totalItems}</span> pilihan komoditas
    </div>

    <!-- Right Controls -->
    <div class="flex items-center gap-2 justify-center">
      <button 
        type="button"
        onclick="goToPage(${state.currentPage - 1})"
        ${prevDisabled ? "disabled" : ""}
        class="px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-slate-200 ${
          prevDisabled 
            ? "opacity-40 cursor-not-allowed bg-slate-50 text-slate-400" 
            : "bg-white text-slate-700 hover:bg-slate-100 active:scale-95"
        }"
      >
        &larr; <span class="hidden sm:inline">Sebelumnya</span>
      </button>

      <div class="flex items-center gap-1.5">
        ${pagesHtml}
      </div>

      <button 
        type="button"
        onclick="goToPage(${state.currentPage + 1})"
        ${nextDisabled ? "disabled" : ""}
        class="px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-slate-200 ${
          nextDisabled 
            ? "opacity-40 cursor-not-allowed bg-slate-50 text-slate-400" 
            : "bg-white text-slate-700 hover:bg-slate-100 active:scale-95"
        }"
      >
        <span class="hidden sm:inline">Selanjutnya</span> &rarr;
      </button>
    </div>
  `;
}

// Navigate to Specific Page with Smooth Scroll
function goToPage(page) {
  const items = getFilteredProducts();
  const totalPages = Math.ceil(items.length / state.itemsPerPage) || 1;
  if (page < 1 || page > totalPages) return;
  state.currentPage = page;
  renderProducts();
  document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Reset filter back to all
function resetFilter() {
  state.activeCategory = "all";
  state.searchQuery = "";
  state.currentPage = 1;
  if (searchInput) searchInput.value = "";
  categoryButtons.forEach(b => {
    b.classList.toggle("active", b.dataset.category === "all");
  });
  renderProducts();
}

// Open Single Product Detail Modal
function openProductModal(productId) {
  const prod = PRODUCT_MAP.get(productId);
  if (!prod) return;

  const discount = calculateDiscount(prod.originalPrice, prod.price);
  const hasDiscount = discount > 0;

  productModalContent.innerHTML = `
    <!-- Top Image with Badges & Close -->
    <div class="relative aspect-video sm:aspect-[16/9] w-full overflow-hidden bg-slate-100">
      <img 
        src="${prod.image}" 
        alt="${prod.name}" 
        class="w-full h-full object-cover"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent"></div>

      <!-- Close Button -->
      <button 
        type="button"
        onclick="closeProductModal()"
        class="absolute top-4 right-4 z-10 text-white bg-black/40 hover:bg-black/70 backdrop-blur-sm rounded-full p-1.5 transition"
        title="Tutup"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>

      <!-- Overlay Badges -->
      <div class="absolute bottom-4 left-4 right-4 text-white">
        <div class="flex items-center gap-2 mb-1.5 flex-wrap">
          <span class="bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            ${prod.subCategory || "Sayuran Segar"}
          </span>
          ${prod.farmHub ? `
            <span class="bg-white/90 backdrop-blur-sm text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
              Hub: ${prod.farmHub}
            </span>
          ` : ""}
          <span class="bg-amber-400 text-slate-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
            ★ ${prod.rating.toFixed(1)} (${prod.soldCount}+ terjual)
          </span>
        </div>
        <h2 class="text-xl sm:text-2xl font-black text-white drop-shadow-sm">${prod.name}</h2>
      </div>
    </div>

    <!-- Modal Body -->
    <div class="p-6 max-h-[60vh] overflow-y-auto">
      
      <!-- Price & Origin Row -->
      <div class="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
        <div>
          <span class="text-xs text-slate-400 font-medium">Harga Petani:</span>
          <div class="flex items-baseline gap-2">
            <span class="text-2xl font-extrabold text-emerald-800">${formatRupiah(prod.price)}</span>
            <span class="text-xs text-slate-500 font-medium">/ ${prod.unit}</span>
          </div>
          ${hasDiscount ? `
            <span class="text-xs text-slate-400 line-through">${formatRupiah(prod.originalPrice)}</span>
            <span class="text-xs font-bold text-rose-600 ml-1">Hemat ${discount}%</span>
          ` : ""}
        </div>
        <div class="text-right">
          <span class="text-xs text-slate-400 font-medium block">Lokasi Panen:</span>
          <span class="text-xs font-bold text-slate-800">📍 ${prod.origin}</span>
          <span class="block text-[10px] text-emerald-700 font-semibold mt-0.5">${prod.harvestStatus || "Dipetik Sesuai Pesanan"}</span>
        </div>
      </div>

      <!-- Description -->
      <div class="mb-5">
        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Deskripsi Komoditas</h4>
        <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">${prod.description}</p>
      </div>

      <!-- Freshness & Storage Guarantee -->
      <div class="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3.5 space-y-2 mb-4">
        <div class="flex items-start gap-2">
          <span class="text-emerald-700 text-sm">🌱</span>
          <div class="text-xs text-slate-700 leading-normal">
            <strong class="text-emerald-900">Zero-Inventory Fresh Harvest:</strong> Dipetik langsung dari kebun mitra petani setelah pesanan Anda masuk, bukan sayur simpanan gudang pendingin.
          </div>
        </div>
        <div class="flex items-start gap-2 pt-2 border-t border-emerald-100/60">
          <span class="text-emerald-700 text-sm">🧊</span>
          <div class="text-xs text-slate-700 leading-normal">
            <strong class="text-emerald-900">Tips Penyimpanan Dapur:</strong> Simpan pada suhu chiller kulkas (4°C - 8°C) dalam wadah kering atau plastik berventilasi agar tetap renyah hingga 5-7 hari.
          </div>
        </div>
      </div>

      <!-- Quantity Selector & Add Button -->
      <div class="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <span class="text-xs font-bold text-slate-700">Jumlah Beli:</span>
          <div class="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
            <button 
              type="button"
              onclick="adjustModalQty(-1)"
              class="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-200 transition font-bold"
            >
              -
            </button>
            <input 
              id="modal-product-qty"
              type="number" 
              value="1" 
              min="1" 
              max="99"
              readonly
              class="w-10 text-center text-xs font-bold bg-transparent text-slate-800 focus:outline-none"
            />
            <button 
              type="button"
              onclick="adjustModalQty(1)"
              class="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-200 transition font-bold"
            >
              +
            </button>
          </div>
        </div>

        <div class="flex items-center gap-2 w-full sm:w-auto">
          <button 
            type="button"
            onclick="closeProductModal()"
            class="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition"
          >
            Tutup
          </button>
          <button 
            type="button"
            onclick="addModalProductToCart('${prod.id}')"
            class="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-700/20"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
            </svg>
            + Masukkan Keranjang
          </button>
        </div>
      </div>

    </div>
  `;

  productModal.classList.remove("hidden");
  productModal.classList.add("flex");
}

function closeProductModal() {
  if (!productModal) return;
  productModal.classList.add("hidden");
  productModal.classList.remove("flex");
}

function adjustModalQty(delta) {
  const input = document.getElementById("modal-product-qty");
  if (!input) return;
  let val = parseInt(input.value) || 1;
  val = Math.max(1, Math.min(99, val + delta));
  input.value = val;
}

function addModalProductToCart(productId) {
  const input = document.getElementById("modal-product-qty");
  const qty = input ? parseInt(input.value) || 1 : 1;
  addToCart(productId, qty);
  closeProductModal();
}

// Open Package Detail Modal
function openPackageModal(packageId) {
  const pkg = PRODUCT_MAP.get(packageId);
  if (!pkg || !pkg.includedItemIds) return;

  const includedItems = pkg.includedItemIds.map(id => PRODUCT_MAP.get(id)).filter(Boolean);
  const totalIndividualPrice = includedItems.reduce((sum, item) => sum + item.price, 0);
  const savings = totalIndividualPrice - pkg.price;

  packageModalContent.innerHTML = `
    <!-- Modal Header -->
    <div class="relative bg-emerald-800 text-white p-6 rounded-t-2xl">
      <button 
        onclick="closePackageModal()"
        class="absolute top-4 right-4 text-emerald-200 hover:text-white bg-emerald-900/50 hover:bg-emerald-900 rounded-full p-1.5 transition"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>

      <span class="inline-block bg-emerald-600/80 text-emerald-100 text-xs font-semibold px-2.5 py-0.5 rounded-full mb-2">
        Rincian Bahan Paket Masakan
      </span>
      <h2 class="text-xl md:text-2xl font-bold">${pkg.name}</h2>
      <p class="text-sm text-emerald-100/90 mt-1 max-w-lg">${pkg.description}</p>
    </div>

    <!-- Modal Body -->
    <div class="p-6 max-h-[70vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div>
          <span class="text-xs text-slate-500">Harga Paket Lengkap:</span>
          <div class="text-2xl font-extrabold text-emerald-800">${formatRupiah(pkg.price)}</div>
        </div>
        ${savings > 0 ? `
          <div class="text-right">
            <span class="text-xs text-slate-400 line-through">Beli ecer: ${formatRupiah(totalIndividualPrice)}</span>
            <div class="text-sm font-bold text-rose-600">Hemat ${formatRupiah(savings)}!</div>
          </div>
        ` : ""}
      </div>

      <h4 class="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
        <span>🥗</span> Komposisi Bahan Segar dalam Paket (${includedItems.length} item):
      </h4>

      <div class="space-y-3">
        ${includedItems.map(item => `
          <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/70 hover:bg-emerald-50/40 transition">
            <div class="flex items-center gap-3">
              <img src="${item.image}" alt="${item.name}" class="w-12 h-12 rounded-lg object-cover border border-slate-200">
              <div>
                <h5 class="text-sm font-bold text-slate-800">${item.name}</h5>
                <div class="text-xs text-slate-500">Porsi: ${item.unit} • Asal: ${item.origin}</div>
              </div>
            </div>
            <div class="text-right">
              <div class="text-xs font-semibold text-slate-700">${formatRupiah(item.price)}</div>
              <span class="text-[10px] text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded font-medium">${item.harvestStatus || "Segar"}</span>
            </div>
          </div>
        `).join("")}
      </div>

      <div class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
        <button 
          onclick="closePackageModal()"
          class="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition"
        >
          Tutup
        </button>
        <button 
          onclick="addToCart('${pkg.id}'); closePackageModal();"
          class="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold transition flex items-center gap-2 shadow-sm"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
          </svg>
          Masukkan Paket ke Keranjang
        </button>
      </div>
    </div>
  `;

  packageModal.classList.remove("hidden");
  packageModal.classList.add("flex");
}

function closePackageModal() {
  packageModal.classList.add("hidden");
  packageModal.classList.remove("flex");
}

// Open Video Showcase Modal
function openVideoModal() {
  if (!videoModal) return;
  videoPlayerContainer.innerHTML = `
    <div class="relative aspect-video w-full bg-black rounded-2xl overflow-hidden shadow-2xl">
      <iframe 
        class="w-full h-full"
        src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&mute=0" 
        title="Taman Sayur Farm Video Showcase" 
        frameborder="0" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
        allowfullscreen>
      </iframe>
    </div>
  `;
  videoModal.classList.remove("hidden");
  videoModal.classList.add("flex");
}

function closeVideoModal() {
  if (!videoModal) return;
  videoPlayerContainer.innerHTML = "";
  videoModal.classList.add("hidden");
  videoModal.classList.remove("flex");
}

// Shopping Cart Functions
function loadCartFromStorage() {
  try {
    const saved = localStorage.getItem("tamansayur_cart") || localStorage.getItem("tanisegar_cart");
    state.cart = saved ? JSON.parse(saved) : [];
  } catch (e) {
    state.cart = [];
  }
}

function saveCartToStorage() {
  localStorage.setItem("tamansayur_cart", JSON.stringify(state.cart));
}

function addToCart(productId, qty = 1) {
  const existing = state.cart.find(item => item.id === productId);
  if (existing) {
    existing.quantity += qty;
  } else {
    state.cart.push({ id: productId, quantity: qty });
  }

  saveCartToStorage();
  updateCartUI();
  showToast("Produk ditambahkan ke keranjang");

  // Animate badge
  cartCountBadges.forEach(badge => {
    badge.classList.remove("animate-cart-bounce");
    void badge.offsetWidth; // trigger reflow
    badge.classList.add("animate-cart-bounce");
  });
}

function updateCartQuantity(productId, delta) {
  const itemIndex = state.cart.findIndex(i => i.id === productId);
  if (itemIndex > -1) {
    state.cart[itemIndex].quantity += delta;
    if (state.cart[itemIndex].quantity <= 0) {
      state.cart.splice(itemIndex, 1);
    }
    saveCartToStorage();
    updateCartUI();
  }
}

function removeCartItem(productId) {
  state.cart = state.cart.filter(i => i.id !== productId);
  saveCartToStorage();
  updateCartUI();
}

function getCartTotal() {
  return state.cart.reduce((total, cartItem) => {
    const product = PRODUCT_MAP.get(cartItem.id);
    return total + (product ? product.price * cartItem.quantity : 0);
  }, 0);
}

function getCartItemCount() {
  return state.cart.reduce((total, cartItem) => total + cartItem.quantity, 0);
}

function updateCartUI() {
  const count = getCartItemCount();
  const subtotal = getCartTotal();

  // Update Badges
  cartCountBadges.forEach(badge => {
    badge.textContent = count;
    badge.classList.toggle("hidden", count === 0);
  });

  if (floatingCartBtn) {
    floatingCartBtn.classList.toggle("hidden", count === 0);
    const floatTotal = document.getElementById("floating-cart-total");
    if (floatTotal) floatTotal.textContent = formatRupiah(subtotal);
  }

  // Update Drawer Subtotal
  if (cartSubtotalEl) {
    cartSubtotalEl.textContent = formatRupiah(subtotal);
  }

  // Update Free Shipping Progress Bar
  const freeShipBar = document.getElementById("free-shipping-bar");
  const freeShipText = document.getElementById("free-shipping-text");
  if (freeShipBar && freeShipText) {
    const progress = Math.min((subtotal / CONFIG.freeShippingMin) * 100, 100);
    freeShipBar.style.width = `${progress}%`;
    if (subtotal >= CONFIG.freeShippingMin) {
      freeShipText.innerHTML = `🎉 Selamat! Pesanan Anda berhak mendapat <b>Gratis Ongkir</b>!`;
    } else {
      const remaining = CONFIG.freeShippingMin - subtotal;
      freeShipText.innerHTML = `Tambah <b>${formatRupiah(remaining)}</b> lagi untuk Gratis Ongkir!`;
    }
  }

  // Render Cart Items List
  if (!cartItemsContainer) return;

  if (state.cart.length === 0) {
    cartItemsContainer.innerHTML = `
      <div class="py-16 text-center text-slate-400">
        <svg class="w-16 h-16 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
        </svg>
        <p class="text-sm font-medium">Keranjang belanja Anda masih kosong</p>
        <p class="text-xs text-slate-400 mt-1">Pilih sayur, buah, atau paket masakan segar di atas</p>
      </div>
    `;
    if (checkoutWaBtn) {
      checkoutWaBtn.disabled = true;
      checkoutWaBtn.classList.add("opacity-50", "cursor-not-allowed");
    }
    return;
  }

  if (checkoutWaBtn) {
    checkoutWaBtn.disabled = false;
    checkoutWaBtn.classList.remove("opacity-50", "cursor-not-allowed");
  }

  cartItemsContainer.innerHTML = state.cart.map(cartItem => {
    const product = PRODUCT_MAP.get(cartItem.id);
    if (!product) return "";

    const itemTotal = product.price * cartItem.quantity;
    const isPackage = product.category === "paket";

    return `
      <div class="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-xs">
        <img 
          src="${product.image}" 
          alt="${product.name}" 
          class="w-16 h-16 rounded-lg object-cover shrink-0 border border-slate-200"
        />

        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-1">
            <h4 class="text-xs font-bold text-slate-900 truncate">${product.name}</h4>
            <button 
              onclick="removeCartItem('${product.id}')"
              class="text-slate-400 hover:text-rose-500 text-xs p-1"
              title="Hapus"
            >
              ✕
            </button>
          </div>

          <div class="text-[11px] text-slate-500 font-medium mb-1.5">
            ${formatRupiah(product.price)} / ${product.unit}
            ${isPackage ? '<span class="text-emerald-700 font-bold ml-1">• Paket Masak</span>' : ""}
          </div>

          <div class="flex items-center justify-between">
            <!-- Qty controls -->
            <div class="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
              <button 
                onclick="updateCartQuantity('${product.id}', -1)" 
                class="px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-200 active:bg-slate-300 font-bold"
              >
                -
              </button>
              <span class="px-2.5 text-xs font-bold text-slate-800">${cartItem.quantity}</span>
              <button 
                onclick="updateCartQuantity('${product.id}', 1)" 
                class="px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-200 active:bg-slate-300 font-bold"
              >
                +
              </button>
            </div>

            <!-- Line total -->
            <div class="text-xs font-bold text-emerald-800">
              ${formatRupiah(itemTotal)}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// Drawer Controls
function openCart() {
  if (cartDrawer && cartOverlay) {
    cartDrawer.classList.add("open");
    cartOverlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }
}

function closeCart() {
  if (cartDrawer && cartOverlay) {
    cartDrawer.classList.remove("open");
    cartOverlay.classList.remove("open");
    document.body.style.overflow = "";
  }
}

// Build Order Data & Formatted Message
function generateOrderData() {
  const nameInput = document.getElementById("customer-name");
  const addressInput = document.getElementById("customer-address");
  const zoneInput = document.getElementById("delivery-zone");
  const timeSlotInput = document.getElementById("delivery-slot");
  const notesInput = document.getElementById("customer-notes");

  const customerName = nameInput ? nameInput.value.trim() : "";
  const customerAddress = addressInput ? addressInput.value.trim() : "";
  const deliveryZone = zoneInput ? zoneInput.value : "Radius Dekat Kebun Mitra (Klaim Bebas Ongkir)";
  const deliverySlot = timeSlotInput ? timeSlotInput.value : "Pagi (06.00 - 09.00 WIB)";
  const notes = notesInput ? notesInput.value.trim() : "";

  if (!customerName) {
    alert("Silakan masukkan Nama Anda terlebih dahulu.");
    if (nameInput) nameInput.focus();
    return null;
  }

  if (!customerAddress) {
    alert("Silakan masukkan Alamat Pengiriman Anda.");
    if (addressInput) addressInput.focus();
    return null;
  }

  const subtotal = getCartTotal();
  const dateStr = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(new Date());

  const isFreeRadius = deliveryZone.includes("Bebas Ongkir");

  // Build Clean Structured WhatsApp Message (Tanpa ikon/emoji, rapi & formal)
  let message = `PESANAN BARU - ${CONFIG.storeName.toUpperCase()}\n`;
  message += `Tanggal: ${dateStr}\n\n`;
  
  message += `DATA PENGIRIMAN\n`;
  message += `Nama: ${customerName}\n`;
  message += `Alamat: ${customerAddress}\n`;
  message += `Zona: ${deliveryZone}\n`;
  message += `Waktu Kirim: ${deliverySlot}\n`;
  if (notes) {
    message += `Catatan: ${notes}\n`;
  }
  message += `\nRINCIAN PESANAN\n`;

  state.cart.forEach((item, index) => {
    const product = PRODUCT_MAP.get(item.id);
    if (product) {
      const lineTotal = product.price * item.quantity;
      const isPkg = product.category === "paket";
      const hubText = product.farmHub ? ` [${product.farmHub}]` : "";
      message += `${index + 1}. ${product.name} (${item.quantity}x)${hubText}\n`;
      message += `   ${formatRupiah(product.price)} / ${product.unit} = ${formatRupiah(lineTotal)}\n`;
      if (isPkg && product.includedItemIds) {
        const itemNames = product.includedItemIds.map(id => {
          const p = PRODUCT_MAP.get(id);
          return p ? p.name.split(" ")[0] : "";
        }).filter(Boolean).join(", ");
        message += `   Komposisi: ${itemNames}\n`;
      }
    }
  });

  message += `\nSubtotal: ${formatRupiah(subtotal)}\n`;
  message += `Ongkos Kirim: ${isFreeRadius ? "Bebas Ongkir (Radius Kebun Mitra)" : "Tarif Kurir Reguler (Konfirmasi Admin)"}\n`;
  message += `TOTAL TAGIHAN: ${formatRupiah(subtotal)}\n\n`;
  message += `Mohon konfirmasi ketersediaan stok dan penerusan pesanan ke kebun tujuan. Terima kasih.\n\n`;
  message += `Setelah pesanan sampai, kirim ulasan Anda dengan format:\n`;
  message += `/rating *jumlah_bintang_maks_5* *pesan*\n`;
  message += `Contoh: /rating 5 Sayur kangkung dan bumbu brebes segar sekali, sampai masih dingin!`;

  const phone = getDecryptedPhone();
  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  return { customerName, customerAddress, subtotal, message, waUrl };
}

// WhatsApp Checkout Generator
function handleWhatsAppCheckout() {
  if (state.cart.length === 0) {
    alert("Keranjang belanja Anda masih kosong!");
    return;
  }

  const order = generateOrderData();
  if (!order) return;

  // Debug Log: Catch link and message in Browser DevTools Console (F12)
  console.group("🛒 [TAMAN SAYUR] Order Conversion Event Triggered");
  console.log("🔗 WhatsApp URL Generated:\n", order.waUrl);
  console.log("📝 Formatted Order Text:\n", order.message);
  console.log("💰 Subtotal Belanja: Rp", order.subtotal);
  console.groupEnd();

  // Marketing Analytics Conversion Tracking (GA4 & Meta Pixel Hooks)
  if (typeof gtag === "function") {
    gtag("event", "generate_lead", {
      currency: "IDR",
      value: order.subtotal,
      items_count: state.cart.length
    });
  }
  if (typeof fbq === "function") {
    fbq("track", "Contact", {
      value: order.subtotal,
      currency: "IDR"
    });
  }

  window.open(order.waUrl, "_blank");
}

// Copy Order Text & Catch Link
function handleCopyOrder() {
  if (state.cart.length === 0) {
    alert("Keranjang belanja Anda masih kosong!");
    return;
  }

  const order = generateOrderData();
  if (!order) return;

  // Log to Console
  console.group("📋 [TAMAN SAYUR] Order Message Copied to Clipboard");
  console.log("🔗 WhatsApp URL:\n", order.waUrl);
  console.log("📝 Plain Text:\n", order.message);
  console.groupEnd();

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(order.message)
      .then(() => {
        showToast("Format pesanan & link berhasil disalin!");
      })
      .catch(() => {
        showToast("Format pesanan siap digunakan!");
      });
  } else {
    showToast("Format pesanan siap di konsol browser (F12)!");
  }
}

// Toast notification helper
function showToast(msg) {
  let toast = document.getElementById("tamansayur-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "tamansayur-toast";
    toast.className = "fixed bottom-5 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg z-50 flex items-center gap-2 pointer-events-none transition-opacity duration-300 opacity-0";
    document.body.appendChild(toast);
  }

  toast.innerHTML = `
    <svg class="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
    </svg>
    <span>${msg}</span>
  `;

  toast.classList.remove("opacity-0");
  toast.classList.add("opacity-100");

  setTimeout(() => {
    toast.classList.remove("opacity-100");
    toast.classList.add("opacity-0");
  }, 2200);
}

// Run on page load
document.addEventListener("DOMContentLoaded", initApp);
