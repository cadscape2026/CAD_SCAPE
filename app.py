const API_BASE = "https://procad-backend.onrender.com/api"; 

// --- GLOBAL STATE ---
let cart = [];
let wishlist = [];
let allProducts = [];
let requestImages = {}; 

try { cart = JSON.parse(localStorage.getItem('cadCart')) || []; } catch(e){}
try { wishlist = JSON.parse(localStorage.getItem('cadWishlist')) || []; } catch(e){}

// --- NAVIGATION ---
const views = {
  home: document.getElementById('viewHome'),
  market: document.getElementById('viewMarketplace'),
  requests: document.getElementById('viewRequests'),
  admin: document.getElementById('viewAdmin')
};
const navs = {
  market: document.getElementById('navMarket'),
  requests: document.getElementById('navRequests'),
  admin: document.getElementById('navAdmin')
};

function switchView(target) {
  Object.values(views).forEach(v => { if(v) v.classList.add('hidden'); });
  Object.values(navs).forEach(n => { if(n) n.classList.remove('active'); });
  
  if(views[target]) views[target].classList.remove('hidden');
  if(navs[target]) navs[target].classList.add('active');

  if(target === 'admin') fetchAdminRequests();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// BULLETPROOF EVENT LISTENERS 
document.getElementById('logoHomeBtn')?.addEventListener('click', (e) => { e.preventDefault(); switchView('home'); });
if(navs.market) navs.market.addEventListener('click', (e) => { e.preventDefault(); switchView('market'); });
if(navs.requests) navs.requests.addEventListener('click', (e) => { e.preventDefault(); switchView('requests'); });
if(navs.admin) navs.admin.addEventListener('click', (e) => { e.preventDefault(); switchView('admin'); });
document.getElementById('heroBrowseBtn')?.addEventListener('click', () => switchView('market'));

// --- ADMIN TABS ---
document.getElementById('btnShowUpload')?.addEventListener('click', () => {
  document.getElementById('adminUploadSection')?.classList.remove('hidden');
  document.getElementById('adminRequestsSection')?.classList.add('hidden');
  const btnUp = document.getElementById('btnShowUpload');
  const btnReq = document.getElementById('btnShowRequests');
  if(btnUp) btnUp.className = "btn-blue-large";
  if(btnReq) btnReq.className = "btn-glass-large";
});

document.getElementById('btnShowRequests')?.addEventListener('click', () => {
  document.getElementById('adminUploadSection')?.classList.add('hidden');
  document.getElementById('adminRequestsSection')?.classList.remove('hidden');
  const btnUp = document.getElementById('btnShowUpload');
  const btnReq = document.getElementById('btnShowRequests');
  if(btnReq) btnReq.className = "btn-blue-large";
  if(btnUp) btnUp.className = "btn-glass-large";
  fetchAdminRequests();
});


// --- SIDEBAR & THEME TOGGLE (DEFAULT LIGHT MODE) ---
function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('open');
  document.getElementById('sidebarOverlay')?.classList.toggle('hidden');
}

document.getElementById('menuBtn')?.addEventListener('click', toggleSidebar);
document.getElementById('closeSidebar')?.addEventListener('click', toggleSidebar);
document.getElementById('sidebarOverlay')?.addEventListener('click', toggleSidebar);

function updateThemeUI(isDark) {
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const mainLogoImg = document.getElementById('mainLogoImg');
  
  const sunIcon = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
  const moonIcon = `<svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

  if (isDark) {
    document.body.classList.replace('light-mode', 'dark-mode');
    if(themeToggleBtn) themeToggleBtn.innerHTML = `${sunIcon} <span>Switch to Light Mode</span>`;
    if(mainLogoImg) mainLogoImg.src = 'logo_4.png';
  } else {
    document.body.classList.replace('dark-mode', 'light-mode');
    if(themeToggleBtn) themeToggleBtn.innerHTML = `${moonIcon} <span>Switch to Dark Mode</span>`;
    if(mainLogoImg) mainLogoImg.src = 'logo_light.png';
  }
}

document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
  const isDark = document.body.classList.contains('light-mode');
  updateThemeUI(isDark);
});


// --- AUTHENTICATION ---
const adminEmails = ["deekshith123pi@gmail.com", "cadscape2026@gmail.com"]; 
let savedUser = null;
try { savedUser = JSON.parse(localStorage.getItem('cadUser')); } catch(e) { localStorage.removeItem('cadUser'); }
let currentUser = (savedUser && savedUser.email) ? savedUser : { name: "Guest", email: null };
let tokenClient; 

function handleSuccessfulLogin(name, email, avatarUrl) {
  currentUser = { name: name, email: email, avatar: avatarUrl };
  localStorage.setItem('cadUser', JSON.stringify(currentUser)); 

  document.getElementById('customLoginBtn')?.classList.add('hidden');
  document.getElementById('sidebarGuestInfo')?.classList.add('hidden');
  document.getElementById('sidebarUserInfo')?.classList.remove('hidden');
  
  const avatarEl = document.getElementById('userAvatar');
  if(avatarEl && avatarUrl) avatarEl.src = avatarUrl;
  
  const nameEl = document.getElementById('userNameDisplay');
  if(nameEl) nameEl.textContent = name;
  
  const emailEl = document.getElementById('userEmailDisplay');
  if(emailEl) emailEl.textContent = email;
  
  document.getElementById('logoutBtn')?.classList.remove('hidden');

  if (adminEmails.includes(email)) {
    if(navs.admin) navs.admin.classList.remove('hidden');
    const sideAdminBtn = document.getElementById('sidebarNavAdmin');
    if(sideAdminBtn) sideAdminBtn.classList.remove('hidden');
  } else {
    if(navs.admin) navs.admin.classList.add('hidden');
    const sideAdminBtn = document.getElementById('sidebarNavAdmin');
    if(sideAdminBtn) sideAdminBtn.classList.add('hidden');
  }
  
  if(allProducts.length > 0) renderGrid(allProducts);
}

if (currentUser.email) {
  handleSuccessfulLogin(currentUser.name, currentUser.email, currentUser.avatar);
}

window.onload = function () {
  try {
    if (typeof google !== 'undefined' && google.accounts) {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: '668904528697-eotq6djic32hvggt9ge3ja90piq22d5e.apps.googleusercontent.com', 
        scope: 'email profile',
        callback: async (tokenResponse) => {
          if (tokenResponse && tokenResponse.access_token) {
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
            });
            const user = await res.json();
            handleSuccessfulLogin(user.given_name, user.email, user.picture);
          }
        },
      });
    }
  } catch (error) {
    console.warn("Google Auth not configured.");
  }
};

document.getElementById('customLoginBtn')?.addEventListener('click', () => {
  if (tokenClient) {
     tokenClient.requestAccessToken(); 
  } else {
    handleSuccessfulLogin("Admin", "cadscape2026@gmail.com", "https://via.placeholder.com/64");
  }
});

document.getElementById('logoutBtn')?.addEventListener('click', () => {
  try {
    currentUser = { name: "Guest", email: null };
    localStorage.removeItem('cadUser'); 
    
    document.getElementById('customLoginBtn')?.classList.remove('hidden');
    document.getElementById('sidebarUserInfo')?.classList.add('hidden');
    document.getElementById('sidebarGuestInfo')?.classList.remove('hidden');
    document.getElementById('logoutBtn')?.classList.add('hidden');
    
    if(navs.admin) navs.admin.classList.add('hidden');
    const sideAdminBtn = document.getElementById('sidebarNavAdmin');
    if(sideAdminBtn) sideAdminBtn.classList.add('hidden');

    switchView('home');
    toggleSidebar();
    
    if(allProducts.length > 0) renderGrid(allProducts);
  } catch (error) {
    window.location.reload(); 
  }
});

function updateCounters() {
  const cc = document.getElementById('cartCount');
  if(cc) cc.textContent = cart.length;
  const wc = document.getElementById('wishlistCount');
  if(wc) wc.textContent = wishlist.length;
}

function getDirectImageUrl(url) {
  if (!url) return '';
  if (url.includes('drive.google.com/file/d/')) {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
  }
  return url; 
}


// --- 3D SCROLL-SCRUB ANIMATION LOGIC ---
const heroScrollTrack = document.getElementById('heroScrollTrack');
const heroScrubModel = document.getElementById('heroScrubModel');
const heroTextOverlay = document.getElementById('heroTextOverlay');

if(heroScrubModel) {
    heroScrubModel.addEventListener('load', () => {
      heroScrubModel.pause();
      heroScrubModel.currentTime = 0;
    });
}

window.addEventListener('scroll', () => {
  if (!views.home.classList.contains('hidden') && heroScrollTrack && heroScrubModel) {
    
    const rect = heroScrollTrack.getBoundingClientRect();
    const rawProgress = -rect.top / (rect.height - window.innerHeight);
    const scrollProgress = Math.max(0, Math.min(1, rawProgress));
    
    if (heroScrubModel.availableAnimations && heroScrubModel.availableAnimations.length > 0) {
      heroScrubModel.pause(); 
      heroScrubModel.currentTime = scrollProgress * heroScrubModel.duration;
    }

    if (heroTextOverlay) {
      const fadeProgress = Math.min(1, scrollProgress * 3); 
      heroTextOverlay.style.opacity = 1 - fadeProgress;
      heroTextOverlay.style.transform = `translateY(calc(-50% - ${fadeProgress * 50}px))`;
    }
  }
});


// --- DRAG AND DROP IMAGE UPLOADER ---
let currentUploadBase64 = "";
let currentEditBase64 = "";

function setupDropZone(dropZoneId, inputId, isEdit = false) {
  const dropZoneElement = document.getElementById(dropZoneId);
  const inputElement = document.getElementById(inputId);
  if(!dropZoneElement || !inputElement) return;

  dropZoneElement.addEventListener("click", (e) => {
    if(e.target !== inputElement) inputElement.click();
  });

  inputElement.addEventListener("change", () => {
    if (inputElement.files.length) updateThumbnail(dropZoneElement, inputElement.files[0], isEdit);
  });

  dropZoneElement.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZoneElement.classList.add("drop-zone--over");
  });

  ["dragleave", "dragend"].forEach((type) => {
    dropZoneElement.addEventListener(type, () => dropZoneElement.classList.remove("drop-zone--over"));
  });

  dropZoneElement.addEventListener("drop", (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) {
      inputElement.files = e.dataTransfer.files;
      updateThumbnail(dropZoneElement, e.dataTransfer.files[0], isEdit);
    }
    dropZoneElement.classList.remove("drop-zone--over");
  });
}

function updateThumbnail(dropZoneElement, file, isEdit) {
  let thumbnailElement = dropZoneElement.querySelector(".drop-zone__thumb");
  const promptEl = dropZoneElement.querySelector(".drop-zone__prompt");
  if (promptEl) promptEl.remove();

  if (!thumbnailElement) {
    thumbnailElement = document.createElement("div");
    thumbnailElement.classList.add("drop-zone__thumb");
    dropZoneElement.appendChild(thumbnailElement);
  }

  if (file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      thumbnailElement.style.backgroundImage = `url('${reader.result}')`;
      if (isEdit) currentEditBase64 = reader.result;
      else currentUploadBase64 = reader.result;
    };
  } else {
    alert("Please upload an image file.");
  }
}

function resetDropZone(dropZoneId, isEdit = false) {
  const dropZoneElement = document.getElementById(dropZoneId);
  if(!dropZoneElement) return;
  const inputElement = dropZoneElement.querySelector(".drop-zone__input");
  if(inputElement) inputElement.value = ""; 
  
  const thumb = dropZoneElement.querySelector(".drop-zone__thumb");
  if(thumb) thumb.remove(); 

  let prompt = dropZoneElement.querySelector(".drop-zone__prompt");
  if(!prompt) {
    prompt = document.createElement("span");
    prompt.classList.add("drop-zone__prompt");
    prompt.textContent = isEdit ? "Drag & Drop New Image Here or Click to Browse" : "Drag & Drop Image Here or Click to Browse";
    if(inputElement) dropZoneElement.insertBefore(prompt, inputElement);
  }

  if (isEdit) currentEditBase64 = "";
  else currentUploadBase64 = "";
}

setupDropZone("uploadDropZone", "modelImageFile", false);
setupDropZone("editDropZone", "editModelImageFile", true);


// --- CAROUSEL LOGIC ---
let currentSlide = 0;
let carouselInterval;

function initCarousel(products) {
  const track = document.getElementById('carouselTrack');
  if(!track) return;
  track.innerHTML = '';
  if(products.length === 0) return;

  const featured = products.slice(0, 3);
  featured.forEach(p => {
    track.innerHTML += `
      <div class="carousel-slide">
        <img src="${getDirectImageUrl(p.image_url)}" alt="${p.name}" loading="lazy">
        <div class="carousel-info">
          <h2 style="margin-bottom:8px;">${p.name}</h2>
          <button class="btn-blue-large" onclick="addToCart('${p.id}', '${p.name}', ${p.price}, '${p.download_url}')">Add to Cart</button>
        </div>
      </div>
    `;
  });

  clearInterval(carouselInterval);
  carouselInterval = setInterval(() => {
    currentSlide = (currentSlide + 1) % featured.length;
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
  }, 4000); 
}


// --- 3D / IMAGE LIGHTBOX LOGIC ---
window.openLightbox = function(id) {
  const product = allProducts.find(p => p.id === id);
  if(!product) return;

  const titleEl = document.getElementById('lightboxTitle');
  if(titleEl) titleEl.textContent = product.name;
  
  const mainImgEl = document.getElementById('lightboxMainImg');
  if(mainImgEl) mainImgEl.src = getDirectImageUrl(product.image_url);
  
  toggleLightboxView('img');

  const toggles = document.getElementById('lightboxToggles');
  const viewer = document.getElementById('lightbox3DViewer');

  if (product.model_3d_url && toggles && viewer) {
    toggles.classList.remove('hidden');
    viewer.src = product.model_3d_url;
  } else if (toggles && viewer) {
    toggles.classList.add('hidden');
    viewer.src = '';
  }

  document.getElementById('lightboxModal')?.classList.remove('hidden');
};

window.toggleLightboxView = function(view) {
  const imgContainer = document.getElementById('lightboxImgContainer');
  const threeDContainer = document.getElementById('lightbox3DContainer');
  const btnImg = document.getElementById('btnViewImg');
  const btn3D = document.getElementById('btnView3D');

  if(!imgContainer || !threeDContainer) return;

  if (view === '3d') {
    imgContainer.classList.add('hidden');
    threeDContainer.classList.remove('hidden');
    if(btn3D) btn3D.classList.add('active');
    if(btnImg) btnImg.classList.remove('active');
  } else {
    threeDContainer.classList.add('hidden');
    imgContainer.classList.remove('hidden');
    if(btnImg) btnImg.classList.add('active');
    if(btn3D) btn3D.classList.remove('active');
  }
};


// --- RENDER PRODUCTS GRID (LAZY LOADING ADDED) ---
function generateProductCardHTML(p, isAdmin, isWishlisted) {
  const priceDisplay = p.price === 0 
    ? `<span class="price text-green">Free</span>` 
    : `<span class="price">₹${p.price.toFixed(2)}</span>`;

  const actionHtml = `<button onclick="addToCart('${p.id}', '${p.name}', ${p.price}, '${p.download_url}')" class="btn-small">Add to Cart</button>`;
  const commentsLength = p.comments ? p.comments.length : 0;
  
  const previewBadge = p.model_3d_url ? `<div style="position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.7); color:#fff; padding:4px 8px; border-radius:12px; font-size:0.75rem; font-weight:bold;">3D VIEW</div>` : '';

  const adminControls = isAdmin ? `
    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); display: flex; gap: 8px;">
      <button onclick="openEditModal('${p.id}')" class="btn-small" style="background:#f59e0b; flex:1;">Edit</button>
      <button onclick="deleteProduct('${p.id}')" class="btn-small" style="background:#ef4444; flex:1;">Delete</button>
    </div>
  ` : '';

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
          <button class="social-btn" onclick="openComments('${p.id}')">💬 Comments (${commentsLength})</button>
        </div>

        <div class="card-footer">
          ${priceDisplay}
          ${actionHtml}
        </div>
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
  
  if (products.length === 0) {
    if(grid) grid.innerHTML = '<p style="color:var(--text-muted)">No models found.</p>';
    return;
  }

  const isAdmin = (currentUser && currentUser.email) ? adminEmails.includes(currentUser.email) : false;

  products.forEach((p, index) => {
    const isWishlisted = wishlist.includes(p.id) ? 'Remove' : 'Wishlist';
    const cardHTML = generateProductCardHTML(p, isAdmin, isWishlisted);
    
    if(grid) grid.innerHTML += cardHTML;
    if(homeGrid && index < 3) homeGrid.innerHTML += cardHTML;
  });
}

document.getElementById('searchInput')?.addEventListener('input', (e) => {
  const term = e.target.value.toLowerCase();
  const filtered = allProducts.filter(p => p.name.toLowerCase().includes(term));
  renderGrid(filtered);
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
    initCarousel(allProducts);
    renderGrid(allProducts);
  } catch (error) {
    console.warn("Backend not connected yet.");
  }
}


// --- ADMIN: PRODUCT MANAGEMENT ---
window.submitNewProduct = async function() {
  const btn = document.getElementById('uploadBtn');
  const name = document.getElementById('modelName').value;
  const desc = document.getElementById('modelDesc').value;
  const price = document.getElementById('modelPrice').value;
  const file = document.getElementById('modelFile').value;
  const url3d = document.getElementById('model3dUrl')?.value || '';

  if (!name || !desc || !currentUploadBase64 || !file) {
    alert("Please fill in all required fields!");
    return;
  }

  if(btn) {
      btn.textContent = "Uploading... Please wait";
      btn.style.backgroundColor = "#f59e0b";
      btn.style.pointerEvents = "none"; 
  }

  const data = { 
    name, 
    description: desc, 
    price, 
    image_url: currentUploadBase64, 
    download_url: file,
    model_3d_url: url3d 
  };

  try {
    const response = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      alert("Product Uploaded Successfully!");
      document.getElementById('uploadForm')?.reset();
      resetDropZone("uploadDropZone", false); 
      loadProducts(); 
    } else {
      alert("Failed to upload product.");
    }
  } catch (error) {
    alert("Error uploading product.");
  } finally {
    if(btn){
        btn.textContent = "Upload to Database";
        btn.style.backgroundColor = ""; 
        btn.style.pointerEvents = "auto";
    }
  }
};

let currentEditId = null;
window.openEditModal = function(id) {
  const product = allProducts.find(p => p.id === id);
  if(!product) return;
  
  currentEditId = id;
  
  const nameEl = document.getElementById('editModelName');
  const descEl = document.getElementById('editModelDesc');
  const priceEl = document.getElementById('editModelPrice');
  const fileEl = document.getElementById('editModelFile');
  const url3dEl = document.getElementById('editModel3dUrl');
  
  if(nameEl) nameEl.value = product.name;
  if(descEl) descEl.value = product.description;
  if(priceEl) priceEl.value = product.price;
  if(fileEl) fileEl.value = product.download_url;
  if(url3dEl) url3dEl.value = product.model_3d_url || '';
  
  currentEditBase64 = product.image_url;
  const dropZoneElement = document.getElementById('editDropZone');
  
  if(dropZoneElement) {
      const prompt = dropZoneElement.querySelector(".drop-zone__prompt");
      if(prompt) prompt.remove();

      let thumb = dropZoneElement.querySelector(".drop-zone__thumb");
      if(!thumb) {
        thumb = document.createElement("div");
        thumb.classList.add("drop-zone__thumb");
        dropZoneElement.appendChild(thumb);
      }
      thumb.style.backgroundImage = `url('${getDirectImageUrl(product.image_url)}')`;
  }

  document.getElementById('editModal')?.classList.remove('hidden');
}

window.submitEditProduct = async function() {
  const btn = document.getElementById('editBtn');
  const name = document.getElementById('editModelName')?.value;
  const desc = document.getElementById('editModelDesc')?.value;
  const price = document.getElementById('editModelPrice')?.value;
  const file = document.getElementById('editModelFile')?.value;
  const url3d = document.getElementById('editModel3dUrl')?.value || '';

  if (!name || !desc || !currentEditBase64 || !file) return alert("Fill all fields!");

  if(btn){
      btn.textContent = "Saving...";
      btn.style.backgroundColor = "#f59e0b";
      btn.style.pointerEvents = "none";
  }

  const data = { 
    name, 
    description: desc, 
    price, 
    image_url: currentEditBase64, 
    download_url: file,
    model_3d_url: url3d 
  };

  try {
    const res = await fetch(`${API_BASE}/products/${currentEditId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if(res.ok) {
      alert("Product updated successfully!");
      document.getElementById('editModal')?.classList.add('hidden');
      resetDropZone('editDropZone', true);
      loadProducts();
    } else {
      alert("Failed to update product.");
    }
  } catch (error) {
    alert("Error communicating with server.");
  } finally {
    if(btn){
        btn.textContent = "Save Changes";
        btn.style.backgroundColor = "";
        btn.style.pointerEvents = "auto";
    }
  }
};

window.deleteProduct = async function(id) {
  if(!confirm("Permanently delete this product?")) return;
  try {
    const res = await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE' });
    if(res.ok) {
      alert("Product deleted!");
      loadProducts();
    } else {
      alert("Failed to delete product.");
    }
  } catch (error) {
    alert("Error communicating with server.");
  }
}


// --- REQUESTS, ORDERS & ADMIN GRID VIEW ---
window.submitDesignRequest = async function() {
  const btn = document.getElementById('requestBtn');
  const phone = document.getElementById('reqPhone')?.value;
  const details = document.getElementById('reqDetails')?.value;
  const link = document.getElementById('reqLink')?.value;

  if(!phone || !details) return alert("Please provide your phone number and requirements.");

  if(btn) {
      btn.textContent = "Submitting...";
      btn.style.backgroundColor = "#f59e0b";
      btn.style.pointerEvents = "none";
  }

  const safeEmail = (currentUser && currentUser.email) ? currentUser.email : 'guest@example.com';
  
  const data = {
    req_type: "Custom Design",
    details: details,
    reference_link: link, 
    phone: phone,         
    user_email: safeEmail
  };

  try {
    const res = await fetch(`${API_BASE}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if(res.ok) {
      document.getElementById('requestForm')?.reset();
      
      const waText = encodeURIComponent(`Hi, I just submitted a new CAD design request.\nEmail: ${safeEmail}\nDetails: ${details}`);
      if(confirm("Request Submitted Successfully!\n\nWould you like to open WhatsApp now to discuss your project details with us?")) {
          window.open(`https://wa.me/919446308229?text=${waText}`, '_blank');
      }
    } else {
      alert("Failed to submit request.");
    }
  } catch (error) {
    alert("Network Error.");
  } finally {
    if(btn){
        btn.textContent = "Submit Request";
        btn.style.backgroundColor = "";
        btn.style.pointerEvents = "auto";
    }
  }
};

window.encodeRequestImage = function(input, reqId) {
    if(input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            requestImages[reqId] = e.target.result;
            const preview = document.getElementById(`preview_${reqId}`);
            if(preview) {
                preview.src = e.target.result;
                preview.classList.remove('hidden');
            }
        };
        reader.readAsDataURL(input.files[0]);
    }
}

window.saveAdminUpdate = async function(id) {
  const status = document.getElementById(`status_${id}`)?.value;
  const payStatus = document.getElementById(`pay_${id}`)?.value;
  const price = document.getElementById(`price_${id}`)?.value;
  const link = document.getElementById(`link_${id}`)?.value;
  const imageBase64 = requestImages[id] || null;

  const payload = {
      status: status,
      payment_status: payStatus,
      price: price,
      completed_link: link
  };

  if(imageBase64) payload.completed_image = imageBase64;

  try {
    const res = await fetch(`${API_BASE}/requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if(res.ok) {
       alert("Order saved successfully!");
       fetchAdminRequests(); 
    } else {
       alert("Failed to update Order.");
    }
  } catch(e) {
     alert("Error connecting to server.");
  }
};

async function fetchAdminRequests() {
  try {
    const res = await fetch(`${API_BASE}/requests`);
    const requests = await res.json();
    const list = document.getElementById('adminRequestsList');
    if(!list) return;
    list.innerHTML = '';

    if(requests.length === 0) {
      list.innerHTML = "<p>No custom requests or orders yet.</p>";
      return;
    }

    requests.forEach(req => {
      const dateStr = req.created_at ? new Date(req.created_at).toLocaleString('en-IN') : 'Date Unknown';

      const linkHtml = req.reference_link && req.reference_link !== "None provided" && req.reference_link !== ""
        ? `<a href="${req.reference_link}" target="_blank">View Attached Files (Drive)</a>`
        : `<span style="color:var(--text-muted)">No files attached</span>`;
      
      let badgeClass = "status-pending";
      if(req.status === "In Progress") badgeClass = "status-progress";
      if(req.status === "Completed") badgeClass = "status-completed";
      
      let typeBadge = req.req_type === "Store Checkout" 
        ? `<span class="status-badge" style="background:#8b5cf6; color:#fff; border-color:#8b5cf6;">Store Order</span>` 
        : `<span class="status-badge" style="background:#0ea5e9; color:#fff; border-color:#0ea5e9;">Custom Design</span>`;

      list.innerHTML += `
        <div class="admin-req-card">
          <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom: 10px;">
             ${typeBadge}
             <span class="status-badge ${badgeClass}" style="margin:0">${req.status}</span>
          </div>

          <span class="timestamp">Ordered: ${dateStr}</span>
          <p><strong>Client:</strong> ${req.user_email}</p>
          <p><strong>Phone:</strong> ${req.phone}</p>
          <p style="margin-top: 5px;"><strong>Details:</strong><br>${req.details.replace(/\n/g, '<br>')}</p>
          <p style="margin-top: 10px;">${linkHtml}</p>

          <div style="background:var(--bg-dimmer); padding: 14px; border-radius: 8px; margin-top: 14px; display: flex; flex-direction: column; gap: 10px; border: 1px solid var(--border);">
             <label style="font-size:0.85rem; color:var(--text-muted);">Admin Controls (Price, Files, Image):</label>
             
             <div style="display:flex; gap: 10px;">
                <select id="status_${req.id}" class="admin-input" style="flex:1;">
                   <option value="Pending" ${req.status === 'Pending' ? 'selected' : ''}>Status: Pending</option>
                   <option value="In Progress" ${req.status === 'In Progress' ? 'selected' : ''}>Status: In Progress</option>
                   <option value="Completed" ${req.status === 'Completed' ? 'selected' : ''}>Status: Completed</option>
                </select>
                
                <select id="pay_${req.id}" class="admin-input" style="flex:1;">
                   <option value="Unpaid" ${req.payment_status === 'Unpaid' ? 'selected' : ''}>Payment: Unpaid</option>
                   <option value="Paid" ${req.payment_status === 'Paid' ? 'selected' : ''}>Payment: Paid</option>
                </select>
             </div>

             <input type="number" id="price_${req.id}" value="${req.price || 0}" step="1" class="admin-input" placeholder="Price (₹)">
             
             <textarea id="link_${req.id}" class="admin-input" rows="2" placeholder="Paste Completed Drive Links here...">${req.completed_link || ''}</textarea>

             <div style="border: 1px dashed var(--border); padding: 10px; border-radius: 6px; text-align: center; margin-top: 4px;">
                 <label style="cursor: pointer; color: var(--blue-primary); font-size: 0.85rem; display: block;">
                     📷 Upload Finished Preview Image
                     <input type="file" accept="image/*" class="hidden drop-zone__input" onchange="encodeRequestImage(this, '${req.id}')">
                 </label>
                 <img id="preview_${req.id}" src="${req.completed_image || ''}" class="${req.completed_image ? '' : 'hidden'}" style="max-width: 100%; height: 120px; object-fit: cover; border-radius: 6px; margin-top: 8px;">
             </div>

             <button onclick="saveAdminUpdate('${req.id}')" class="btn-blue-large" style="margin-top:4px; padding: 8px;">Save Settings</button>
          </div>
        </div>
      `;
    });
  } catch (err) {
    console.warn("Could not fetch requests.");
  }
}

// User Checking Order History
document.getElementById('orderHistoryBtn')?.addEventListener('click', () => {
  toggleSidebar();
  if(!currentUser || !currentUser.email) {
    return alert("Please sign in to view your order history.");
  }
  
  const list = document.getElementById('ordersList');
  if(!list) return;
  
  list.innerHTML = '<p style="color:var(--text-muted)">Loading your requests...</p>';
  document.getElementById('ordersModal')?.classList.remove('hidden');

  fetch(`${API_BASE}/requests`)
    .then(res => res.json())
    .then(allReqs => {
      const myReqs = allReqs.filter(r => r.user_email === currentUser.email);

      if(myReqs.length === 0) {
        list.innerHTML = '<p style="color:var(--text-muted)">You have no active orders or design requests yet.</p>';
        return;
      }

      list.innerHTML = '';
      myReqs.forEach(req => {
        const dateStr = req.created_at ? new Date(req.created_at).toLocaleString('en-IN') : 'Date Unknown';
        
        let badgeClass = "status-pending";
        if(req.status === "In Progress") badgeClass = "status-progress";
        if(req.status === "Completed") badgeClass = "status-completed";

        let actionHtml = '';
        let imagePreviewHtml = req.completed_image ? `<img src="${req.completed_image}" style="width:100%; max-height:220px; object-fit:cover; border-radius:8px; margin-bottom:10px; border:1px solid var(--border);">` : '';
        
        const waPayText = encodeURIComponent(`Hello! I want to pay for my CAD order.\nEmail: ${currentUser.email}\nOrder Details: ${req.details}\nTotal: ₹${req.price}`);
        const waPayLink = `https://wa.me/919446308229?text=${waPayText}`;

        const waDiscussText = encodeURIComponent(`Hello! I'd like to discuss my CAD request.\nEmail: ${currentUser.email}\nOrder Details: ${req.details}`);
        const waDiscussLink = `https://wa.me/919446308229?text=${waDiscussText}`;
        const discussBtn = `<a href="${waDiscussLink}" target="_blank" class="btn-small" style="background:#25D366; display:inline-block; margin-top:6px; margin-right:8px; text-decoration:none;">💬 Discuss on WhatsApp</a>`;

        if (req.payment_status === 'Paid') {
           actionHtml = `
             ${imagePreviewHtml}
             <div style="margin-top:8px; padding:10px; background:rgba(34, 197, 94, 0.1); border:1px solid var(--green-free); border-radius:6px;">
                 <p style="color:var(--green-free); font-weight:bold; margin-bottom:4px;">✅ Payment Confirmed</p>
                 <p style="word-break: break-all;"><strong>Your Download Files:</strong><br>${(req.completed_link || 'No links attached.').replace(/\n/g, '<br>')}</p>
             </div>
             ${discussBtn}
           `;
        } else if (req.price > 0 && req.payment_status === 'Unpaid') {
           actionHtml = `
             ${imagePreviewHtml}
             <div style="margin-top:8px; padding:10px; background:rgba(245, 158, 11, 0.1); border:1px solid #f59e0b; border-radius:6px;">
                <p style="color:#f59e0b; font-weight:bold; margin-bottom:4px;">⚠️ Pending Payment: ₹${req.price}</p>
                <a href="${waPayLink}" target="_blank" class="btn-small" style="background:#f59e0b; display:inline-block; margin-top:4px; margin-right:8px; text-decoration:none;">Pay via WhatsApp</a>
             </div>
             ${discussBtn}
           `;
        } else {
           actionHtml = `
             ${imagePreviewHtml}
             <p style="margin-top:8px; color:var(--text-muted); font-size: 0.85rem;"><em>Waiting for Admin to review and quote price.</em></p>
             ${discussBtn}
           `;
        }

        list.innerHTML += `
          <div class="admin-req-card">
            <div style="display:flex; justify-content:space-between; margin-bottom: 5px;">
              <span class="status-badge ${badgeClass}" style="margin-bottom:0;">${req.status}</span>
              <span style="font-size:0.75rem; color:var(--text-muted); font-style:italic;">${dateStr}</span>
            </div>
            <p style="color:var(--text-muted); font-size:0.8rem; margin-bottom: 4px; text-transform: uppercase; font-weight:700;">${req.req_type}</p>
            <p style="font-size: 0.9rem; margin-bottom: 8px;">${req.details.replace(/\n/g, '<br>')}</p>
            ${actionHtml}
          </div>
        `;
      });
    })
    .catch(() => {
      list.innerHTML = '<p style="color:#ef4444">Failed to load orders.</p>';
    });
});


// --- CART & CHECKOUT LOGIC ---
window.addToCart = function(id, name, price, download_url) {
  cart.push({ id, name, price: parseFloat(price), download_url });
  localStorage.setItem('cadCart', JSON.stringify(cart));
  updateCounters();
  alert(`${name} added to cart!`);
}

window.removeFromCart = function(index) {
  cart.splice(index, 1);
  localStorage.setItem('cadCart', JSON.stringify(cart));
  updateCounters();
  renderCart(); 
}

function renderCart() {
  const cartItemsDiv = document.getElementById('cartItems');
  const cartTotalSpan = document.getElementById('cartTotal');
  const cartTotalContainer = document.getElementById('cartTotalContainer');
  
  if(!cartItemsDiv) return;
  cartItemsDiv.innerHTML = '';
  let total = 0;

  if(cartTotalContainer) cartTotalContainer.classList.remove('hidden');

  if (cart.length === 0) {
    cartItemsDiv.innerHTML = '<p style="color:var(--text-muted);">Your cart is empty.</p>';
  } else {
    cart.forEach((item, index) => {
      total += item.price;
      cartItemsDiv.innerHTML += `
        <div class="cart-item" style="display:flex; justify-content:space-between; margin-bottom: 12px; border-bottom: 1px solid var(--border); padding-bottom: 12px;">
          <span style="font-weight: 500;">${item.name}</span>
          <div>
            <span style="color:var(--green-free); font-weight:bold;">₹${item.price.toFixed(2)}</span>
            <button onclick="removeFromCart(${index})" style="background:none; border:none; color:#ef4444; margin-left:12px; cursor:pointer; font-weight:bold;">X</button>
          </div>
        </div>
      `;
    });
  }
  if(cartTotalSpan) cartTotalSpan.textContent = total.toFixed(2);
}

document.getElementById('cartBtn')?.addEventListener('click', () => {
  renderCart();
  document.getElementById('cartModal')?.classList.remove('hidden');
});

window.checkoutCart = async function() {
  if (cart.length === 0) return alert("Your cart is empty!");
  
  const safeEmail = (currentUser && currentUser.email) ? currentUser.email : 'guest@example.com';
  let total = cart.reduce((sum, item) => sum + item.price, 0);
  const cartItemsDiv = document.getElementById('cartItems');

  if (total === 0) {
    let html = `<h3 style="color:var(--green-free); margin-bottom: 12px;">Success! Here are your free files:</h3>`;
    cart.forEach(item => {
      const dlLink = item.download_url ? item.download_url : '#';
      html += `
        <div style="margin-bottom: 8px; padding: 10px; background: rgba(34, 197, 94, 0.1); border: 1px solid var(--green-free); border-radius: 6px; display:flex; justify-content:space-between; align-items:center;">
          <span style="font-weight:500;">${item.name}</span>
          <a href="${dlLink}" target="_blank" class="btn-small" style="background:var(--green-free);">Download File</a>
        </div>
      `;
    });
    if(cartItemsDiv) cartItemsDiv.innerHTML = html;
    document.getElementById('cartTotalContainer')?.classList.add('hidden');
    cart = [];
    localStorage.setItem('cadCart', JSON.stringify(cart));
    updateCounters();
    
  } else {
    const btn = document.querySelector('#cartTotalContainer button');
    if(btn){
        btn.textContent = "Processing Order...";
        btn.disabled = true;
    }

    const itemNames = cart.map(i => i.name).join(", ");
    const dlLinks = cart.map(i => `${i.name}:\n${i.download_url}`).join("\n\n");

    const data = {
      req_type: "Store Checkout",
      details: `Store Purchase:\n${itemNames}`,
      phone: "N/A",
      user_email: safeEmail,
      price: total,
      completed_link: dlLinks,
      payment_status: "Unpaid",
      status: "Pending"
    };

    try {
      const res = await fetch(`${API_BASE}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if(res.ok) {
        cart = [];
        localStorage.setItem('cadCart', JSON.stringify(cart));
        updateCounters();
        document.getElementById('cartModal')?.classList.add('hidden');
        
        const waText = encodeURIComponent(`Hello! I want to pay for my CAD order.\nEmail: ${safeEmail}\nItems: ${itemNames}\nTotal: ₹${total}`);
        window.open(`https://wa.me/919446308229?text=${waText}`, '_blank');
        
        alert("Order placed! Complete your payment on WhatsApp. You can track this in your Order History.");
      } else {
        alert("Error saving order.");
      }
    } catch(e) {
      alert("Network Error.");
    } finally {
      if(btn){
          btn.textContent = "Checkout";
          btn.disabled = false;
      }
    }
  }
}

// --- WISHLIST LOGIC ---
window.toggleWishlist = function(id, btnElement, fromModal = false) {
  const index = wishlist.indexOf(id);
  if (index > -1) {
    wishlist.splice(index, 1);
    if(btnElement) btnElement.textContent = '★ Wishlist';
  } else {
    wishlist.push(id);
    if(btnElement) btnElement.textContent = '★ Remove';
  }
  localStorage.setItem('cadWishlist', JSON.stringify(wishlist));
  updateCounters();
  
  if (fromModal) renderWishlist(); 
  renderGrid(allProducts);         
}

function renderWishlist() {
  const wishlistItemsDiv = document.getElementById('wishlistItems');
  if(!wishlistItemsDiv) return;
  wishlistItemsDiv.innerHTML = '';
  
  if (wishlist.length === 0) {
    wishlistItemsDiv.innerHTML = '<p style="color:var(--text-muted);">Your wishlist is empty.</p>';
  } else {
    wishlist.forEach(id => {
      const item = allProducts.find(p => p.id === id);
      if(item) {
        wishlistItemsDiv.innerHTML += `
          <div class="cart-item" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px; border-bottom: 1px solid var(--border); padding-bottom: 12px;">
            <span style="font-weight: 500;">${item.name}</span>
            <div>
              <span style="color:var(--green-free); font-weight:bold; margin-right:10px;">₹${item.price.toFixed(2)}</span>
              <button onclick="addToCart('${item.id}', '${item.name}', ${item.price}, '${item.download_url}')" class="btn-small">To Cart</button>
              <button onclick="toggleWishlist('${item.id}', null, true)" style="background:none; border:none; color:#ef4444; margin-left:10px; cursor:pointer; font-weight:bold;">X</button>
            </div>
          </div>
        `;
      }
    });
  }
}

document.getElementById('wishlistBtn')?.addEventListener('click', () => {
  renderWishlist();
  document.getElementById('wishlistModal')?.classList.remove('hidden');
});

// --- COMMENTS LOGIC ---
let currentCommentProductId = null;

window.openComments = function(id) {
  currentCommentProductId = id;
  const product = allProducts.find(p => p.id === id);
  const commentsList = document.getElementById('commentsList');
  if(!commentsList) return;
  commentsList.innerHTML = '';

  if (product && product.comments && product.comments.length > 0) {
    product.comments.forEach(c => {
      commentsList.innerHTML += `
        <div class="comment-box">
          <div class="comment-author">${c.user_name}</div>
          <div class="comment-text">${c.text}</div>
        </div>
      `;
    });
  } else {
    commentsList.innerHTML = '<p style="color:var(--text-muted)">No comments yet. Be the first!</p>';
  }
  
  document.getElementById('commentsModal')?.classList.remove('hidden');
}

document.getElementById('submitCommentBtn')?.addEventListener('click', async () => {
  const textInput = document.getElementById('newCommentText');
  const text = textInput?.value.trim();
  if (!text || !currentCommentProductId) return;

  const data = {
    product_id: currentCommentProductId,
    user_name: currentUser.name || "Guest",
    text: text
  };

  try {
    await fetch(`${API_BASE}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if(textInput) textInput.value = '';
    document.getElementById('commentsModal')?.classList.add('hidden');
    alert("Comment posted successfully!");
    loadProducts(); 
  } catch (e) {
    alert("Failed to post comment.");
  }
});

// Init
updateCounters();
loadProducts();
