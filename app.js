const API_BASE = "https://procad-backend.onrender.com/api"; 
const ADMIN_SECRET = "778899"; 

let cart = [], wishlist = [], allProducts = [], requestImages = {}; 
try { cart = JSON.parse(localStorage.getItem('cadCart')) || []; } catch(e){}
try { wishlist = JSON.parse(localStorage.getItem('cadWishlist')) || []; } catch(e){}

// --- NAVIGATION & VIEWS ---
const views = { home: document.getElementById('viewHome'), market: document.getElementById('viewMarketplace'), requests: document.getElementById('viewRequests'), admin: document.getElementById('viewAdmin') };
const navs = { market: document.getElementById('navMarket'), requests: document.getElementById('navRequests'), admin: document.getElementById('navAdmin') };

function switchView(target) {
  Object.values(views).forEach(v => { if(v) v.classList.add('hidden'); });
  Object.values(navs).forEach(n => { if(n) n.classList.remove('active'); });
  if(views[target]) views[target].classList.remove('hidden');
  if(navs[target]) navs[target].classList.add('active');
  if(target === 'admin') fetchAdminRequests();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById('logoHomeBtn')?.addEventListener('click', (e) => { e.preventDefault(); switchView('home'); });
if(navs.market) navs.market.addEventListener('click', (e) => { e.preventDefault(); switchView('market'); });
if(navs.requests) navs.requests.addEventListener('click', (e) => { e.preventDefault(); switchView('requests'); });
if(navs.admin) navs.admin.addEventListener('click', (e) => { e.preventDefault(); switchView('admin'); });

// --- COMMAND PALETTE (CMD+K) ---
function toggleCmdPalette() {
  const modal = document.getElementById('cmdPaletteOverlay');
  const input = document.getElementById('cmdSearchInput');
  if (modal.classList.contains('hidden')) {
    modal.classList.remove('hidden');
    input.focus();
  } else {
    modal.classList.add('hidden');
    input.value = '';
    document.getElementById('cmdResults').innerHTML = '';
  }
}
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); toggleCmdPalette(); }
  if (e.key === 'Escape' && !document.getElementById('cmdPaletteOverlay').classList.contains('hidden')) toggleCmdPalette();
});
document.getElementById('cmdSearchInput')?.addEventListener('input', (e) => {
  const term = e.target.value.toLowerCase();
  const resultsDiv = document.getElementById('cmdResults');
  if(!term) { resultsDiv.innerHTML = ''; return; }
  const filtered = allProducts.filter(p => p.name.toLowerCase().includes(term) || p.description.toLowerCase().includes(term));
  if(filtered.length === 0) { resultsDiv.innerHTML = '<p style="color:var(--text-muted); padding: 10px;">No results found.</p>'; return; }
  resultsDiv.innerHTML = filtered.map(p => `
    <a href="#" class="cmd-item" onclick="openLightbox('${p.id}'); toggleCmdPalette(); return false;">
      <div style="display:flex; align-items:center;">
        <img src="${getDirectImageUrl(p.image_url)}" alt="">
        <div><strong>${p.name}</strong><br><span style="font-size:0.8rem; color:var(--text-muted)">₹${p.price}</span></div>
      </div>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
    </a>
  `).join('');
});

// --- SIDEBAR & THEME ---
function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('open');
  document.getElementById('sidebarOverlay')?.classList.toggle('hidden');
}
document.getElementById('menuBtn')?.addEventListener('click', toggleSidebar);
document.getElementById('closeSidebar')?.addEventListener('click', toggleSidebar);
document.getElementById('sidebarOverlay')?.addEventListener('click', toggleSidebar);

function updateThemeUI(setDark) {
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const mainLogoImg = document.getElementById('mainLogoImg');
  if (setDark) {
    document.body.classList.replace('light-mode', 'dark-mode');
    if(themeToggleBtn) themeToggleBtn.innerHTML = `<span>Switch to Light Mode</span>`;
    if(mainLogoImg) mainLogoImg.src = 'logo_4.png';
    localStorage.setItem('cadTheme', 'dark'); 
  } else {
    document.body.classList.replace('dark-mode', 'light-mode');
    if(themeToggleBtn) themeToggleBtn.innerHTML = `<span>Switch to Dark Mode</span>`;
    if(mainLogoImg) mainLogoImg.src = 'logo_light.png';
    localStorage.setItem('cadTheme', 'light'); 
  }
}
document.getElementById('themeToggleBtn')?.addEventListener('click', () => { updateThemeUI(!document.body.classList.contains('dark-mode')); });
document.addEventListener('DOMContentLoaded', () => { updateThemeUI(document.body.classList.contains('dark-mode')); });

// --- AUTHENTICATION ---
const adminEmails = ["deekshith123pi@gmail.com", "cadscape2026@gmail.com"]; 
let savedUser = null; try { savedUser = JSON.parse(localStorage.getItem('cadUser')); } catch(e) {}
let currentUser = (savedUser && savedUser.email) ? savedUser : { name: "Guest", email: null };

function handleSuccessfulLogin(name, email, avatarUrl) {
  currentUser = { name, email, avatar: avatarUrl };
  localStorage.setItem('cadUser', JSON.stringify(currentUser)); 
  document.getElementById('customLoginBtn')?.classList.add('hidden');
  document.getElementById('sidebarGuestInfo')?.classList.add('hidden');
  document.getElementById('sidebarUserInfo')?.classList.remove('hidden');
  if(document.getElementById('userAvatar')) document.getElementById('userAvatar').src = avatarUrl;
  if(document.getElementById('userNameDisplay')) document.getElementById('userNameDisplay').textContent = name;
  if(document.getElementById('userEmailDisplay')) document.getElementById('userEmailDisplay').textContent = email;
  document.getElementById('logoutBtn')?.classList.remove('hidden');
  const isAdmin = adminEmails.includes(email);
  if(navs.admin) navs.admin.classList.toggle('hidden', !isAdmin);
  if(document.getElementById('sidebarNavAdmin')) document.getElementById('sidebarNavAdmin').classList.toggle('hidden', !isAdmin);
  if(allProducts.length > 0) renderGrid(allProducts);
}
if (currentUser.email) handleSuccessfulLogin(currentUser.name, currentUser.email, currentUser.avatar);

document.getElementById('logoutBtn')?.addEventListener('click', () => {
  currentUser = { name: "Guest", email: null }; localStorage.removeItem('cadUser'); 
  window.location.reload(); 
});

function updateCounters() {
  if(document.getElementById('cartCount')) document.getElementById('cartCount').textContent = cart.length;
  if(document.getElementById('wishlistCount')) document.getElementById('wishlistCount').textContent = wishlist.length;
}

function getDirectImageUrl(url) {
  if (!url) return '';
  if (url.includes('drive.google.com/file/d/')) { const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/); if (match && match[1]) return `https://drive.google.com/uc?export=view&id=${match[1]}`; }
  return url; 
}

// --- 3D SCROLL-SCRUB ---
const heroScrubModel = document.getElementById('heroScrubModel');
function updateScrollAnimation() {
  const track = document.getElementById('heroScrollTrack');
  const overlay = document.getElementById('heroTextOverlay');
  if (!views.home.classList.contains('hidden') && track && heroScrubModel) {
    const rect = track.getBoundingClientRect();
    let raw = -rect.top / (rect.height - window.innerHeight);
    if (isNaN(raw)) raw = 0; 
    const prog = Math.max(0, Math.min(1, raw)); 
    const animProg = prog <= 0.5 ? (prog * 2) : (2 - (prog * 2));
    if (heroScrubModel.availableAnimations?.length > 0) { heroScrubModel.pause(); heroScrubModel.currentTime = animProg * heroScrubModel.duration; }
    heroScrubModel.style.transform = `translateX(${window.innerWidth > 850 ? 25 - (animProg * 25) : 0}vw)`;
    if (overlay) {
      const fade = Math.min(1, prog * 3); 
      overlay.style.opacity = 1 - fade;
      overlay.style.transform = `translateY(calc(-50% - ${fade * 50}px))`;
      overlay.style.pointerEvents = fade > 0.5 ? 'none' : 'auto';
    }
  }
}
window.addEventListener('scroll', updateScrollAnimation);
window.addEventListener('resize', updateScrollAnimation); 
if(heroScrubModel) { heroScrubModel.addEventListener('load', () => { heroScrubModel.pause(); heroScrubModel.currentTime = 0; updateScrollAnimation(); }); }
updateScrollAnimation();

// --- MAGNETIC CARD GLOW LOGIC ---
document.getElementById('productGrid')?.addEventListener('mousemove', e => {
  for(const card of document.querySelectorAll('.card')) {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);
  }
});

// --- RENDER PRODUCTS GRID ---
function generateProductCardHTML(p, isAdmin, isWishlisted) {
  const priceDisplay = p.price === 0 ? `<span class="price text-green">Free</span>` : `<span class="price">₹${p.price.toFixed(2)}</span>`;
  const actionHtml = `<button onclick="addToCart('${p.id}', '${p.name}', ${p.price}, '${p.download_url}')" class="btn-small">Add to Cart</button>`;
  const previewBadge = p.model_3d_url ? `<div style="position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.7); color:#fff; padding:4px 10px; border-radius:12px; font-size:0.7rem; font-weight:800; letter-spacing:1px;">3D VIEW</div>` : '';
  const adminControls = isAdmin ? `<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); display: flex; gap: 8px;"><button onclick="openEditModal('${p.id}')" class="btn-small" style="background:#f59e0b; flex:1; color:#fff;">Edit</button><button onclick="deleteProduct('${p.id}')" class="btn-small" style="background:#ef4444; flex:1; color:#fff;">Delete</button></div>` : '';

  return `
    <div class="card">
      <div class="card-img-wrapper" onclick="openLightbox('${p.id}')">
        <img src="${getDirectImageUrl(p.image_url)}" alt="${p.name}" loading="lazy">
        ${previewBadge}
      </div>
      <div class="card-info">
        <h3 class="card-title" onclick="openLightbox('${p.id}')" style="cursor:pointer;">${p.name}</h3>
        <p class="card-desc">${p.description || 'No description provided.'}</p>
        <div class="card-social">
          <button class="social-btn" onclick="toggleWishlist('${p.id}', this)">★ ${isWishlisted}</button>
          <button class="social-btn" onclick="openComments('${p.id}')">💬 Comments (${p.comments?.length || 0})</button>
        </div>
        <div class="card-footer">${priceDisplay}${actionHtml}</div>
        ${adminControls}
      </div>
    </div>
  `;
}

function renderGrid(products) {
  const grid = document.getElementById('productGrid');
  const homeGrid = document.getElementById('homeRecentGrid');
  if(grid) grid.innerHTML = '';
  if(homeGrid) homeGrid.innerHTML = '';
  if (products.length === 0) { if(grid) grid.innerHTML = '<p style="color:var(--text-muted)">No models found.</p>'; return; }
  const isAdmin = adminEmails.includes(currentUser.email);
  products.forEach((p, index) => {
    const isWishlisted = wishlist.includes(p.id) ? 'Remove' : 'Wishlist';
    const cardHTML = generateProductCardHTML(p, isAdmin, isWishlisted);
    if(grid) grid.innerHTML += cardHTML;
    if(homeGrid && index < 3) homeGrid.innerHTML += cardHTML;
  });
}

// FILTER CHIPS LOGIC
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', (e) => {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    e.target.classList.add('active');
    const filterText = e.target.textContent;
    if(filterText === 'All Models') renderGrid(allProducts);
    else renderGrid(allProducts.filter(p => p.name.toLowerCase().includes(filterText.toLowerCase()) || p.description.toLowerCase().includes(filterText.toLowerCase())));
  });
});

async function loadProducts() {
  try {
    const response = await fetch(`${API_BASE}/products`);
    if (!response.ok) return; 
    allProducts = await response.json();
    const validIds = allProducts.map(p => p.id);
    wishlist = wishlist.filter(id => validIds.includes(id));
    localStorage.setItem('cadWishlist', JSON.stringify(wishlist));
    cart = cart.filter(item => validIds.includes(item.id));
    localStorage.setItem('cadCart', JSON.stringify(cart));
    updateCounters();
    
    // RENDER CINEMATIC STORE HERO
    const track = document.getElementById('carouselTrack');
    if(track && allProducts.length > 0) {
      track.innerHTML = allProducts.slice(0, 3).map(p => `
        <div class="carousel-slide">
          <img src="${getDirectImageUrl(p.image_url)}" alt="${p.name}">
        </div>
      `).join('');
      setInterval(() => {
        let currentSlide = parseInt(track.dataset.slide || 0);
        currentSlide = (currentSlide + 1) % Math.min(3, allProducts.length);
        track.style.transform = `translateX(-${currentSlide * 100}%)`;
        track.dataset.slide = currentSlide;
      }, 4000); 
    }
    renderGrid(allProducts);
  } catch (error) { console.warn("Backend not connected yet."); }
}

// --- ADMIN TABS ---
document.getElementById('btnShowUpload')?.addEventListener('click', () => {
  document.getElementById('adminUploadSection')?.classList.remove('hidden');
  document.getElementById('adminRequestsSection')?.classList.add('hidden');
  document.getElementById('btnShowUpload').className = "btn-blue-large";
  document.getElementById('btnShowRequests').className = "btn-glass-large";
});
document.getElementById('btnShowRequests')?.addEventListener('click', () => {
  document.getElementById('adminUploadSection')?.classList.add('hidden');
  document.getElementById('adminRequestsSection')?.classList.remove('hidden');
  document.getElementById('btnShowUpload').className = "btn-glass-large";
  document.getElementById('btnShowRequests').className = "btn-blue-large";
  fetchAdminRequests();
});

// --- ADMIN UPLOAD ---
window.submitNewProduct = async function() {
  const btn = document.getElementById('uploadBtn');
  const name = document.getElementById('modelName').value;
  const desc = document.getElementById('modelDesc').value;
  const priceInput = document.getElementById('modelPrice').value;
  const file = document.getElementById('modelFile').value;
  const url3d = document.getElementById('model3dUrl')?.value || '';
  if (!name || !desc || !currentUploadBase64 || !file || priceInput === '') return alert("Please fill in all required fields!");
  if(btn) { btn.textContent = "Uploading..."; btn.style.pointerEvents = "none"; }
  try {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Key': ADMIN_SECRET },
      body: JSON.stringify({ name, description: desc, price: parseFloat(priceInput) || 0, image_url: currentUploadBase64, download_url: file, model_3d_url: url3d })
    });
    if (res.ok) { alert("Product Uploaded Successfully!"); loadProducts(); } else alert("Unauthorized!");
  } catch (e) { alert("Error"); } 
  finally { if(btn){ btn.textContent = "Upload to Database"; btn.style.pointerEvents = "auto"; } }
};

// INITIALIZE FILE UPLOADS
let currentUploadBase64 = "", currentEditBase64 = "";
function setupDropZone(dropId, inputId, isEdit) {
  const drop = document.getElementById(dropId), input = document.getElementById(inputId);
  if(!drop || !input) return;
  drop.addEventListener("click", e => { if(e.target !== input) input.click(); });
  input.addEventListener("change", () => { if (input.files.length) { const r = new FileReader(); r.onload = () => { drop.innerHTML = `<div class="drop-zone__thumb" style="background-image:url('${r.result}')"></div>`; if(isEdit) currentEditBase64 = r.result; else currentUploadBase64 = r.result; }; r.readAsDataURL(input.files[0]); } });
}
setupDropZone("uploadDropZone", "modelImageFile", false);

// --- CART, WISHLIST, COMMENTS & MODALS ---
window.openLightbox = function(id) {
  const p = allProducts.find(p => p.id === id); if(!p) return;
  document.getElementById('lightboxTitle').textContent = p.name;
  document.getElementById('lightboxMainImg').src = getDirectImageUrl(p.image_url);
  toggleLightboxView('img');
  const toggles = document.getElementById('lightboxToggles');
  const viewer = document.getElementById('lightbox3DViewer');
  if (p.model_3d_url && toggles && viewer) { toggles.classList.remove('hidden'); viewer.src = p.model_3d_url; } 
  else if (toggles && viewer) { toggles.classList.add('hidden'); viewer.src = ''; }
  document.getElementById('lightboxModal')?.classList.remove('hidden');
};
window.toggleLightboxView = function(view) {
  const i = document.getElementById('lightboxImgContainer'), t = document.getElementById('lightbox3DContainer');
  if (view === '3d') { i.classList.add('hidden'); t.classList.remove('hidden'); document.getElementById('btnView3D').classList.add('active'); document.getElementById('btnViewImg').classList.remove('active'); } 
  else { t.classList.add('hidden'); i.classList.remove('hidden'); document.getElementById('btnViewImg').classList.add('active'); document.getElementById('btnView3D').classList.remove('active'); }
};

window.addToCart = function(id, name, price, link) { cart.push({ id, name, price: parseFloat(price), link }); localStorage.setItem('cadCart', JSON.stringify(cart)); updateCounters(); alert(`Added to cart!`); }
window.toggleWishlist = function(id) {
  const index = wishlist.indexOf(id);
  if (index > -1) wishlist.splice(index, 1); else wishlist.push(id);
  localStorage.setItem('cadWishlist', JSON.stringify(wishlist)); updateCounters(); renderGrid(allProducts);         
}

// Init
updateCounters();
loadProducts();
