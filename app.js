const API_BASE = "https://procad-backend-xyz.onrender.com/api"; // Update with actual backend URL

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
}

document.getElementById('logoHomeBtn').addEventListener('click', (e) => { e.preventDefault(); switchView('home'); });
navs.market.addEventListener('click', (e) => { e.preventDefault(); switchView('market'); });
navs.requests.addEventListener('click', (e) => { e.preventDefault(); switchView('requests'); });
navs.admin.addEventListener('click', (e) => { e.preventDefault(); switchView('admin'); });
document.getElementById('heroBrowseBtn').addEventListener('click', () => switchView('market'));


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
const adminEmails = ["your-email@gmail.com", "friend-email@gmail.com"]; 
let currentUser = { name: "Guest", email: null };

window.onload = function () {
  try {
    if (typeof google !== 'undefined' && google.accounts) {
      google.accounts.oauth2.initTokenClient({
        client_id: 'YOUR_GOOGLE_CLIENT_ID', 
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
  if (typeof google !== 'undefined' && google.accounts) {
     alert("Google Client ID needs to be configured in app.js");
  } else {
    handleSuccessfulLogin("Admin", "your-email@gmail.com", "https://via.placeholder.com/64");
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

  // Use top 3 products for featured carousel
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

  // Auto-Slide Logic
  clearInterval(carouselInterval);
  carouselInterval = setInterval(() => {
    currentSlide = (currentSlide + 1) % featured.length;
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
  }, 4000); // Changes every 4 seconds
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
