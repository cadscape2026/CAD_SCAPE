const API_BASE = "https://procad-backend-xyz.onrender.com/api"; // Set to your live Render API

// --- NAVIGATION ---
const views = {
  home: document.getElementById('viewHome'),
  market: document.getElementById('viewMarketplace'),
  requests: document.getElementById('viewRequests'),
  admin: document.getElementById('viewAdmin')
};
const navs = {
  home: document.getElementById('navHome'),
  market: document.getElementById('navMarket'),
  requests: document.getElementById('navRequests'),
  admin: document.getElementById('navAdmin')
};

function switchView(target) {
  Object.values(views).forEach(v => v.classList.add('hidden'));
  Object.values(navs).forEach(n => n.classList.remove('active'));
  views[target].classList.remove('hidden');
  if(navs[target]) navs[target].classList.add('active');
}

navs.home.addEventListener('click', () => switchView('home'));
navs.market.addEventListener('click', () => switchView('market'));
navs.requests.addEventListener('click', () => switchView('requests'));
navs.admin.addEventListener('click', () => switchView('admin'));
document.getElementById('heroBrowseBtn').addEventListener('click', () => switchView('market'));
document.getElementById('heroRequestBtn').addEventListener('click', () => switchView('requests'));

// --- AUTHENTICATION (Role Based) ---
const adminEmails = ["your-email@gmail.com", "friend-email@gmail.com"]; 
let currentUser = { name: "Guest", email: null };

window.onload = function () {
  google.accounts.oauth2.initTokenClient({
    client_id: 'YOUR_GOOGLE_CLIENT_ID', 
    scope: 'email profile',
    callback: async (tokenResponse) => {
      if (tokenResponse && tokenResponse.access_token) {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
        });
        const user = await res.json();
        
        currentUser = { name: user.name, email: user.email };
        document.getElementById('customLoginBtn').classList.add('hidden');
        document.getElementById('userInfo').classList.remove('hidden');
        document.getElementById('userNameDisplay').textContent = user.given_name;
        document.getElementById('userAvatar').src = user.picture;

        // Unlock Admin if authorized developer/admin
        if (adminEmails.includes(user.email)) {
          navs.admin.classList.remove('hidden');
        }
      }
    },
  });
};

document.getElementById('customLoginBtn').addEventListener('click', () => {
  if (typeof google !== 'undefined') {
    const client = google.accounts.oauth2.initTokenClient({...}); // Must be initialized properly in production
    client.requestAccessToken(); 
  } else {
    // Fallback Mock Login for local testing if Google isn't setup yet
    currentUser = { name: "Admin Developer", email: "your-email@gmail.com" };
    document.getElementById('customLoginBtn').classList.add('hidden');
    document.getElementById('userInfo').classList.remove('hidden');
    document.getElementById('userNameDisplay').textContent = "Admin";
    navs.admin.classList.remove('hidden');
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  currentUser = { name: "Guest", email: null };
  document.getElementById('customLoginBtn').classList.remove('hidden');
  document.getElementById('userInfo').classList.add('hidden');
  navs.admin.classList.add('hidden');
  switchView('home');
});

// --- STATE: CART & WISHLIST ---
let cart = JSON.parse(localStorage.getItem('cadCart')) || [];
let wishlist = JSON.parse(localStorage.getItem('cadWishlist')) || [];
let allProducts = []; // Cache products for the comments modal

function updateCounters() {
  document.getElementById('cartCount').textContent = cart.length;
  document.getElementById('wishlistCount').textContent = wishlist.length;
}

// --- RENDER PRODUCTS ---
async function loadProducts() {
  try {
    const response = await fetch(`${API_BASE}/products`);
    allProducts = await response.json();
    const grid = document.getElementById('productGrid');
    grid.innerHTML = '';
    
    allProducts.forEach(p => {
      const priceDisplay = p.price === 0 
        ? `<span class="price text-green">Free</span>` 
        : `<span class="price">$${p.price.toFixed(2)}</span>`;

      const actionHtml = p.price === 0 
        ? `<a href="${p.download_url}" target="_blank" class="btn-small">Get File</a>`
        : `<button onclick="addToCart(${p.id}, '${p.name}', ${p.price})" class="btn-small">Add to Cart</button>`;

      const isWishlisted = wishlist.includes(p.id) ? 'Remove from Wishlist' : 'Add to Wishlist';

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
              <button class="social-btn" onclick="openComments(${p.id})">💬 Comments (${p.comments.length})</button>
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

// --- COMMENTS LOGIC ---
let activeCommentProductId = null;

window.openComments = function(productId) {
  activeCommentProductId = productId;
  const product = allProducts.find(p => p.id === productId);
  const commentsList = document.getElementById('commentsList');
  commentsList.innerHTML = '';

  if(product.comments.length === 0) {
    commentsList.innerHTML = '<p style="color:#8b949e">No comments yet. Be the first!</p>';
  } else {
    product.comments.forEach(c => {
      commentsList.innerHTML += `
        <div class="comment-box">
          <div class="comment-author">${c.user_name}</div>
          <div class="comment-text">${c.text}</div>
        </div>
      `;
    });
  }
  document.getElementById('commentsModal').classList.remove('hidden');
}

document.getElementById('submitCommentBtn').addEventListener('click', async () => {
  const textInput = document.getElementById('newCommentText');
  if(!textInput.value.trim()) return;

  const commentData = {
    product_id: activeCommentProductId,
    user_name: currentUser.name,
    text: textInput.value
  };

  await fetch(`${API_BASE}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(commentData)
  });

  textInput.value = '';
  loadProducts(); // Refresh data from database
  setTimeout(() => openComments(activeCommentProductId), 500); // Reopen modal with new data
});

// --- FORMS LOGIC ---
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    name: document.getElementById('modelName').value,
    description: document.getElementById('modelDesc').value,
    price: document.getElementById('modelPrice').value,
    image_url: document.getElementById('modelImage').value,
    download_url: document.getElementById('modelFile').value
  };

  await fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  alert("Product Uploaded!");
  document.getElementById('uploadForm').reset();
  loadProducts();
});

document.getElementById('requestForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    details: document.getElementById('reqDetails').value,
    reference_link: document.getElementById('reqLink').value,
    user_email: currentUser.email || 'guest@example.com'
  };

  await fetch(`${API_BASE}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  alert("Request Submitted! We will review your CAD requirements.");
  document.getElementById('requestForm').reset();
});

// Init
updateCounters();
loadProducts();
