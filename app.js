const API_BASE = "https://procad-backend-xyz.onrender.com/api"; // Keep your Render URL here

// --- 1. THEME TOGGLE (Dark/Light) ---
const themeToggle = document.getElementById('themeToggle');
const body = document.body;
themeToggle.addEventListener('click', () => {
  if (body.classList.contains('dark-mode')) {
    body.classList.remove('dark-mode');
    body.classList.add('light-mode');
    themeToggle.textContent = '🌙';
  } else {
    body.classList.remove('light-mode');
    body.classList.add('dark-mode');
    themeToggle.textContent = '☀️';
  }
});

// --- 2. NAVIGATION ---
const views = {
  home: document.getElementById('viewHome'),
  market: document.getElementById('viewMarketplace'),
  admin: document.getElementById('viewAdmin')
};
const navs = {
  home: document.getElementById('navHome'),
  market: document.getElementById('navMarket'),
  admin: document.getElementById('navAdmin')
};

function switchView(target) {
  Object.values(views).forEach(v => v.classList.add('hidden'));
  Object.values(navs).forEach(n => n.classList.remove('active'));
  views[target].classList.remove('hidden');
  navs[target].classList.add('active');
}

navs.home.addEventListener('click', (e) => { e.preventDefault(); switchView('home'); });
navs.market.addEventListener('click', (e) => { e.preventDefault(); switchView('market'); });
navs.admin.addEventListener('click', (e) => { e.preventDefault(); switchView('admin'); });
document.getElementById('heroBrowseBtn').addEventListener('click', () => switchView('market'));


// --- 3. REAL GOOGLE AUTHENTICATION (OAuth2) ---
const customLoginBtn = document.getElementById('customLoginBtn');
const userInfo = document.getElementById('userInfo');
const userAvatar = document.getElementById('userAvatar');
const logoutBtn = document.getElementById('logoutBtn');

const adminEmails = ["your-email@gmail.com", "friend-email@gmail.com"]; // Update these

// We use the modern Google Identity Services Token Client for custom buttons
let tokenClient;
window.onload = function () {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: 'YOUR_GOOGLE_CLIENT_ID_HERE', // You need to generate this in Google Cloud Console
    scope: 'email profile',
    callback: async (tokenResponse) => {
      if (tokenResponse && tokenResponse.access_token) {
        // Fetch user details using the access token
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
        });
        const user = await res.json();
        
        // Update UI
        customLoginBtn.classList.add('hidden');
        userInfo.classList.remove('hidden');
        userAvatar.src = user.picture;

        // Role-based Access
        if (adminEmails.includes(user.email)) {
          navs.admin.classList.remove('hidden');
        }
      }
    },
  });
};

customLoginBtn.addEventListener('click', () => {
  tokenClient.requestAccessToken(); // Triggers the real Google popup
});

logoutBtn.addEventListener('click', () => {
  customLoginBtn.classList.remove('hidden');
  userInfo.classList.add('hidden');
  navs.admin.classList.add('hidden');
  switchView('home');
});


// --- 4. STATE: CART, WISHLIST, LIKES ---
let cart = JSON.parse(localStorage.getItem('cadCart')) || [];
let wishlist = JSON.parse(localStorage.getItem('cadWishlist')) || [];
// Note: In production, likes and comments MUST be saved to the database via API. 
// For now, we mock them on the frontend.
let mockedLikes = {}; 

function updateCounters() {
  document.getElementById('cartCount').textContent = cart.length;
  document.getElementById('wishlistCount').textContent = wishlist.length;
}

// --- 5. RENDER PRODUCTS ---
async function loadProducts() {
  try {
    const response = await fetch(`${API_BASE}/products`);
    const products = await response.json();
    const grid = document.getElementById('productGrid');
    grid.innerHTML = '';
    
    products.forEach(p => {
      // Logic for Free (Green) vs Paid
      const priceDisplay = p.price === 0 
        ? `<span class="price text-green">Free</span>` 
        : `<span class="price">$${p.price.toFixed(2)}</span>`;

      const actionHtml = p.price === 0 
        ? `<a href="${p.download_url}" target="_blank" class="btn-small">Download Drive File</a>`
        : `<button onclick="addToCart(${p.id}, '${p.name}', ${p.price})" class="btn-small">Add to Cart</button>`;

      const isWishlisted = wishlist.includes(p.id) ? 'active' : '';
      const likesCount = mockedLikes[p.id] || Math.floor(Math.random() * 50); // Mocking initial likes

      grid.innerHTML += `
        <div class="card">
          <div class="card-img-wrapper">
            <img src="${p.image_url}" alt="${p.name}">
            <button class="wishlist-icon ${isWishlisted}" onclick="toggleWishlist(${p.id}, this)">
              ${isWishlisted ? '♥' : '♡'}
            </button>
          </div>
          <div class="card-info">
            <h3 class="card-title">${p.name}</h3>
            
            <div class="card-social">
              <button class="social-btn" onclick="toggleLike(${p.id}, this)">❤️ <span>${likesCount}</span></button>
              <button class="social-btn" onclick="openComments(${p.id})">💬 Comment</button>
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
    console.error("Error loading products:", error);
  }
}

// --- 6. INTERACTIONS ---
window.toggleWishlist = function(id, btnElement) {
  const index = wishlist.indexOf(id);
  if (index > -1) {
    wishlist.splice(index, 1);
    btnElement.classList.remove('active');
    btnElement.textContent = '♡';
  } else {
    wishlist.push(id);
    btnElement.classList.add('active');
    btnElement.textContent = '♥';
  }
  localStorage.setItem('cadWishlist', JSON.stringify(wishlist));
  updateCounters();
}

window.toggleLike = function(id, btnElement) {
  let countSpan = btnElement.querySelector('span');
  let currentCount = parseInt(countSpan.textContent);
  
  if (btnElement.classList.contains('liked')) {
    btnElement.classList.remove('liked');
    countSpan.textContent = currentCount - 1;
  } else {
    btnElement.classList.add('liked');
    countSpan.textContent = currentCount + 1;
  }
}

window.openComments = function(id) {
  // To build out a real comment section, you will need a new API endpoint on your Flask backend.
  alert("Comment section opening for product ID: " + id + "\n(Requires backend database integration to save text)");
}

window.addToCart = function(id, name, price) {
  cart.push({ id, name, price });
  localStorage.setItem('cadCart', JSON.stringify(cart));
  updateCounters();
  renderCart();
}

// --- 7. MODAL LOGIC ---
const cartModal = document.getElementById('cartModal');
document.getElementById('cartBtn').addEventListener('click', () => {
  cartModal.classList.remove('hidden');
  renderCart();
});
document.getElementById('closeCart').addEventListener('click', () => cartModal.classList.add('hidden'));

function renderCart() {
  const container = document.getElementById('cartItems');
  container.innerHTML = '';
  let total = 0;
  
  cart.forEach((item, i) => {
    total += item.price;
    container.innerHTML += `
      <div class="cart-item">
        <span>${item.name}</span>
        <div>
          <span>$${item.price.toFixed(2)}</span>
          <button onclick="removeFromCart(${i})" style="color:red; background:none; border:none; cursor:pointer; margin-left:10px;">✕</button>
        </div>
      </div>
    `;
  });
  document.getElementById('cartTotal').textContent = total.toFixed(2);
}

window.removeFromCart = function(index) {
  cart.splice(index, 1);
  localStorage.setItem('cadCart', JSON.stringify(cart));
  updateCounters();
  renderCart();
}

// --- INIT ---
updateCounters();
loadProducts();
