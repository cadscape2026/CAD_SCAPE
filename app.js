const API_BASE = "https://procad-backend.onrender.com"; // IMPORTANT: Replace this with your actual Render URL!

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

  // If Admin panel is opened, auto-fetch requests
  if(target === 'admin') fetchAdminRequests();
}

document.getElementById('logoHomeBtn').addEventListener('click', (e) => { e.preventDefault(); switchView('home'); });
navs.market.addEventListener('click', (e) => { e.preventDefault(); switchView('market'); });
navs.requests.addEventListener('click', (e) => { e.preventDefault(); switchView('requests'); });
navs.admin.addEventListener('click', (e) => { e.preventDefault(); switchView('admin'); });
document.getElementById('heroBrowseBtn').addEventListener('click', () => switchView('market'));


// --- ADMIN TABS (Upload vs View Requests) ---
document.getElementById('btnShowUpload').addEventListener('click', () => {
  document.getElementById('adminUploadSection').classList.remove('hidden');
  document.getElementById('adminRequestsSection').classList.add('hidden');
  document.getElementById('btnShowUpload').className = "btn-blue-large";
  document.getElementById('btnShowRequests').className = "btn-glass-large";
});

document.getElementById('btnShowRequests').addEventListener('click', () => {
  document.getElementById('adminUploadSection').classList.add('hidden');
  document.getElementById('adminRequestsSection').classList.remove('hidden');
  document.getElementById('btnShowRequests').className = "btn-blue-large";
  document.getElementById('btnShowUpload').className = "btn-glass-large";
  fetchAdminRequests();
});


// --- SIDEBAR & THEME TOGGLE ---
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function toggleSidebar() {
  sidebar.classList.toggle('open');
  sidebarOverlay.classList.toggle('hidden');
}

document.getElementById('menuBtn').addEventListener('click', toggleSidebar);
document.getElementById('closeSidebar').addEventListener('click', toggleSidebar);
sidebarOverlay.addEventListener('click', toggleSidebar);

document.getElementById('themeToggleBtn').addEventListener('click', () => {
  if (document.body.classList.contains('dark-mode')) {
    document.body.classList.replace('dark-mode', 'light-mode');
  } else {
    document.body.classList.replace('light-mode', 'dark-mode');
  }
});


// --- AUTHENTICATION ---
const adminEmails = ["deekshith123pi@gmail.com", "cadscape2026@gmail.com"]; 
let currentUser = { name: "Guest", email: null };
let tokenClient; // Defined variable to hold the Google Login instance

window.onload = function () {
  try {
    if (typeof google !== 'undefined' && google.accounts) {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: '668904528697-eotq6djic32hvggt9ge3ja90piq22d5e.apps.googleusercontent.com', // Added Quotes
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
    console.warn("Google Auth not fully configured.");
  }
};

document.getElementById('customLoginBtn').addEventListener('click', () => {
  if (tokenClient) {
     tokenClient.requestAccessToken(); // Actually triggers the Google Login popup
  } else {
    // Fallback if the Google script fails to load
    handleSuccessfulLogin("Admin", "cadscape2026@gmail.com", "https://via.placeholder.com/64");
  }
});

function handleSuccessfulLogin(name, email, avatarUrl) {
  currentUser = { name: name, email: email };
  document.getElementById('customLoginBtn').classList.add('hidden');
  
  // Update Sidebar
  document.getElementById('sidebarGuestInfo').classList.add('hidden');
  document.getElementById('sidebarUserInfo').classList.remove('hidden');
  document.getElementById('userAvatar').src = avatarUrl;
  document.getElementById('userNameDisplay').textContent = name;
  document.getElementById('userEmailDisplay').textContent = email;
  document.getElementById('logoutBtn').classList.remove('hidden');

  if (adminEmails.includes(email)) {
    navs.admin.classList.remove('hidden');
  }
}

document.getElementById('logoutBtn').addEventListener('click', () => {
  currentUser = { name: "Guest", email: null };
  document.getElementById('customLoginBtn').classList.remove('hidden');
  
  // Reset Sidebar
  document.getElementById('sidebarUserInfo').classList.add('hidden');
  document.getElementById('sidebarGuestInfo').classList.remove('hidden');
  document.getElementById('logoutBtn').classList.add('hidden');
  navs.admin.classList.add('hidden');
  switchView('home');
  toggleSidebar();
});


// --- STATE: CART & WISHLIST ---
let cart = JSON.parse(localStorage.getItem('cadCart')) || [];
let wishlist = JSON.parse(localStorage.getItem('cadWishlist')) || [];
let allProducts = []; 

function updateCounters() {
  document.getElementById('cartCount').textContent = cart.length;
  document.getElementById('wishlistCount').textContent = wishlist.length;
}


// --- STEAM CAROUSEL LOGIC ---
let currentSlide = 0;
let carouselInterval;

function initCarousel(products) {
  const track = document.getElementById('carouselTrack');
  track.innerHTML = '';
  if(products.length === 0) return;

  const featured = products.slice(0, 3);
  featured.forEach(p => {
    track.innerHTML += `
      <div class="carousel-slide">
        <img src="${p.image_url}" alt="${p.name}">
        <div class="carousel-info">
          <h2 style="margin-bottom:10px;">${p.name}</h2>
          <button class="btn-blue-large" onclick="addToCart(${p.id}, '${p.name}', ${p.price})">View & Download</button>
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


// --- RENDER PRODUCTS & SEARCH ---
function renderGrid(products) {
  const grid = document.getElementById('productGrid');
  grid.innerHTML = '';
  
  if (products.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-muted)">No products found.</p>';
    return;
  }

  products.forEach(p => {
    const priceDisplay = p.price === 0 
      ? `<span class="price text-green">Free</span>` 
      : `<span class="price">$${p.price.toFixed(2)}</span>`;

    const actionHtml = p.price === 0 
      ? `<a href="${p.download_url}" target="_blank" class="btn-small">Get File</a>`
      : `<button onclick="addToCart(${p.id}, '${p.name}', ${p.price})" class="btn-small">Add to Cart</button>`;

    const isWishlisted = wishlist.includes(p.id) ? 'Remove' : 'Wishlist';
    const commentsLength = p.comments ? p.comments.length : 0;

    grid.innerHTML += `
      <div class="card">
        <div class="card-img-wrapper">
          <img src="${p.image_url}" alt="${p.name}">
        </div>
        <div class="card-info">
          <h3 class="card-title">${p.name}</h3>
          <p class="card-desc">${p.description || 'No description provided.'}</p>
          
          <div class="card-social">
            <button class="social-btn" onclick="toggleWishlist(${p.id}, this)">★ ${isWishlisted}</button>
            <button class="social-btn" onclick="openComments(${p.id})">💬 Comments (${commentsLength})</button>
          </div>

          <div class="card-footer">
            ${priceDisplay}
            ${actionHtml}
          </div>
        </div>
      </div>
    `;
  });
}

document.getElementById('searchInput').addEventListener('input', (e) => {
  const term = e.target.value.toLowerCase();
  const filtered = allProducts.filter(p => p.name.toLowerCase().includes(term));
  renderGrid(filtered);
});

async function loadProducts() {
  try {
    const response = await fetch(`${API_BASE}/products`);
    if (!response.ok) return; 
    
    allProducts = await response.json();
    initCarousel(allProducts);
    renderGrid(allProducts);
  } catch (error) {
    console.warn("Backend not connected yet. Products will load once API is live.");
  }
}

// --- ADMIN: UPLOAD PRODUCT ---
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault(); // This stops the page from refreshing!

  const data = {
    name: document.getElementById('modelName').value,
    description: document.getElementById('modelDesc').value,
    price: document.getElementById('modelPrice').value,
    image_url: document.getElementById('modelImage').value,
    download_url: document.getElementById('modelFile').value
  };

  try {
    const response = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      alert("Product Uploaded Successfully!");
      document.getElementById('uploadForm').reset();
      loadProducts(); // Automatically updates the store grid
    } else {
      alert("Failed to upload product. Check backend connection.");
    }
  } catch (error) {
    alert("Error uploading product. Is the backend running?");
  }
});

// --- SUBMITTING & FETCHING REQUESTS ---
document.getElementById('requestForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    details: document.getElementById('reqDetails').value,
    reference_link: document.getElementById('reqLink').value, // Now Optional
    phone: document.getElementById('reqPhone').value,         // New Phone Field
    user_email: currentUser.email || 'guest@example.com'
  };

  try {
    await fetch(`${API_BASE}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    alert("Request Submitted! We will review your CAD requirements.");
    document.getElementById('requestForm').reset();
  } catch (error) {
    alert("Error submitting request. Backend may not be live.");
  }
});

async function fetchAdminRequests() {
  try {
    const res = await fetch(`${API_BASE}/requests`);
    const requests = await res.json();
    const list = document.getElementById('adminRequestsList');
    list.innerHTML = '';

    if(requests.length === 0) {
      list.innerHTML = "<p>No custom requests yet.</p>";
      return;
    }

    requests.forEach(req => {
      const linkHtml = req.reference_link !== "None provided" 
        ? `<a href="${req.reference_link}" target="_blank">View Attached Files (Google Drive)</a>`
        : `<span style="color:var(--text-muted)">No files attached</span>`;

      list.innerHTML += `
        <div class="admin-req-card">
          <p><strong>Email:</strong> ${req.user_email}</p>
          <p><strong>Phone:</strong> ${req.phone}</p>
          <p><strong>Details:</strong> ${req.details}</p>
          <p style="margin-top: 10px;">${linkHtml}</p>
        </div>
      `;
    });
  } catch (err) {
    console.warn("Could not fetch requests.");
  }
}

// Global UI Functions
window.toggleWishlist = function(id, btnElement) {
  const index = wishlist.indexOf(id);
  if (index > -1) {
    wishlist.splice(index, 1);
    btnElement.textContent = '★ Wishlist';
  } else {
    wishlist.push(id);
    btnElement.textContent = '★ Remove';
  }
  localStorage.setItem('cadWishlist', JSON.stringify(wishlist));
  updateCounters();
}

window.addToCart = function(id, name, price) {
  cart.push({ id, name, price });
  localStorage.setItem('cadCart', JSON.stringify(cart));
  updateCounters();
  alert(`${name} added to cart!`);
}

// Init
updateCounters();
loadProducts();
