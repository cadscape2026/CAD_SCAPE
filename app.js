const API_BASE = "https://procad-backend-xyz.onrender.com/api"; // Update with your actual backend URL later

// --- NAVIGATION ---
const views = {
  home: document.getElementById('viewHome'),
  market: document.getElementById('viewMarketplace'),
  requests: document.getElementById('viewRequests'),
  admin: document.getElementById('viewAdmin')
};

// Removed 'home' nav from the array, as the logo now serves this purpose
const navs = {
  market: document.getElementById('navMarket'),
  requests: document.getElementById('navRequests'),
  admin: document.getElementById('navAdmin')
};

function switchView(target) {
  Object.values(views).forEach(v => {
    if(v) v.classList.add('hidden');
  });
  Object.values(navs).forEach(n => {
    if(n) n.classList.remove('active');
  });
  
  if(views[target]) views[target].classList.remove('hidden');
  if(navs[target]) navs[target].classList.add('active');
}

// Event Listeners for Navigation
const logoHomeBtn = document.getElementById('logoHomeBtn');
if(logoHomeBtn) logoHomeBtn.addEventListener('click', (e) => { e.preventDefault(); switchView('home'); });

if(navs.market) navs.market.addEventListener('click', (e) => { e.preventDefault(); switchView('market'); });
if(navs.requests) navs.requests.addEventListener('click', (e) => { e.preventDefault(); switchView('requests'); });
if(navs.admin) navs.admin.addEventListener('click', (e) => { e.preventDefault(); switchView('admin'); });

const heroBrowseBtn = document.getElementById('heroBrowseBtn');
const heroRequestBtn = document.getElementById('heroRequestBtn');
if(heroBrowseBtn) heroBrowseBtn.addEventListener('click', () => switchView('market'));
if(heroRequestBtn) heroRequestBtn.addEventListener('click', () => switchView('requests'));


// --- AUTHENTICATION (Role Based) ---
const adminEmails = ["your-email@gmail.com", "friend-email@gmail.com"]; 
let currentUser = { name: "Guest", email: null };

// Safe initialization of Google Auth
window.onload = function () {
  try {
    if (typeof google !== 'undefined' && google.accounts) {
      google.accounts.oauth2.initTokenClient({
        client_id: 'YOUR_GOOGLE_CLIENT_ID', // Replace later
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
    console.warn("Google Auth not fully configured yet.", error);
  }
};

const customLoginBtn = document.getElementById('customLoginBtn');
if(customLoginBtn) {
  customLoginBtn.addEventListener('click', () => {
    if (typeof google !== 'undefined' && google.accounts) {
       // Triggers real Google Login if configured
       // client.requestAccessToken(); 
       alert("Google Client ID needs to be configured in app.js");
    } else {
      // Fallback Mock Login for testing
      handleSuccessfulLogin("Admin", "your-email@gmail.com", "https://via.placeholder.com/32");
    }
  });
}

function handleSuccessfulLogin(name, email, avatarUrl) {
  currentUser = { name: name, email: email };
  document.getElementById('customLoginBtn').classList.add('hidden');
  document.getElementById('userInfo').classList.remove('hidden');
  document.getElementById('userNameDisplay').textContent = name;
  document.getElementById('userAvatar').src = avatarUrl;

  if (adminEmails.includes(email)) {
    navs.admin.classList.remove('hidden');
  }
}

const logoutBtn = document.getElementById('logoutBtn');
if(logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    currentUser = { name: "Guest", email: null };
    document.getElementById('customLoginBtn').classList.remove('hidden');
    document.getElementById('userInfo').classList.add('hidden');
    navs.admin.classList.add('hidden');
    switchView('home');
  });
}

// --- STATE: CART & WISHLIST ---
let cart = JSON.parse(localStorage.getItem('cadCart')) || [];
let wishlist = JSON.parse(localStorage.getItem('cadWishlist')) || [];
let allProducts = []; 

function updateCounters() {
  const cartCount = document.getElementById('cartCount');
  const wishlistCount = document.getElementById('wishlistCount');
  if(cartCount) cartCount.textContent = cart.length;
  if(wishlistCount) wishlistCount.textContent = wishlist.length;
}

// --- RENDER PRODUCTS ---
async function loadProducts() {
  try {
    const response = await fetch(`${API_BASE}/products`);
    if (!response.ok) return; // Exit if backend isn't ready
    
    allProducts = await response.json();
    const grid = document.getElementById('productGrid');
    if(!grid) return;
    
    grid.innerHTML = '';
    
    allProducts.forEach(p => {
      const priceDisplay = p.price === 0 
        ? `<span class="price text-green">Free</span>` 
        : `<span class="price">$${p.price.toFixed(2)}</span>`;

      const actionHtml = p.price === 0 
        ? `<a href="${p.download_url}" target="_blank" class="btn-small">Get File</a>`
        : `<button onclick="addToCart(${p.id}, '${p.name}', ${p.price})" class="btn-small">Add to Cart</button>`;

      const isWishlisted = wishlist.includes(p.id) ? 'Remove from Wishlist' : 'Add to Wishlist';
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
  } catch (error) {
    console.warn("Backend not connected yet. Products will load once API is live.");
  }
}

window.toggleWishlist = function(id, btnElement) {
  const index = wishlist.indexOf(id);
  if (index > -1) {
    wishlist.splice(index, 1);
    btnElement.textContent = '★ Add to Wishlist';
  } else {
    wishlist.push(id);
    btnElement.textContent = '★ Remove from Wishlist';
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
