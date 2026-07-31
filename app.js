const API_BASE = "http://127.0.0.1:5000/api";

// --- 1. OTT Banner Smooth Transition ---
let currentSlide = 0;
const slides = document.querySelectorAll('.banner-slide');

function nextSlide() {
  if (slides.length === 0) return;
  slides[currentSlide].classList.remove('active');
  currentSlide = (currentSlide + 1) % slides.length;
  slides[currentSlide].classList.add('active');
}
setInterval(nextSlide, 5000); // Transitions every 5 seconds

// --- 2. Navigation & Views ---
const views = {
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
  Object.values(views).forEach(v => v?.classList.add('hidden'));
  Object.values(navs).forEach(n => n?.classList.remove('active'));
  
  if (views[target]) views[target].classList.remove('hidden');
  if (navs[target]) navs[target].classList.add('active');
}

navs.market?.addEventListener('click', (e) => { e.preventDefault(); switchView('market'); });
navs.requests?.addEventListener('click', (e) => { e.preventDefault(); switchView('requests'); });
navs.admin?.addEventListener('click', (e) => { e.preventDefault(); switchView('admin'); });

// --- 3. Mock Authentication (Replace with actual Google OAuth later) ---
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo = document.getElementById('userInfo');
const userName = document.getElementById('userName');

// Add your email and your friend's email here to grant admin panel access
const adminEmails = ["developer@example.com", "admin@example.com"]; 

loginBtn?.addEventListener('click', () => {
  // Simulating a successful Google Login response
  const mockUser = { name: "Dev User", email: "developer@example.com" }; 
  
  loginBtn.classList.add('hidden');
  userInfo.classList.remove('hidden');
  userName.textContent = `Hello, ${mockUser.name}`;

  // Role-Based Access Control Check
  if (adminEmails.includes(mockUser.email)) {
    navs.admin.classList.remove('hidden'); // Unlock Admin Panel
  }
});

logoutBtn?.addEventListener('click', () => {
  loginBtn.classList.remove('hidden');
  userInfo.classList.add('hidden');
  navs.admin.classList.add('hidden');
  switchView('market'); // Kick user back to marketplace if they were in admin
});

// --- 4. Local Storage Cart Logic ---
let cart = JSON.parse(localStorage.getItem('cadCart')) || [];
const cartModal = document.getElementById('cartModal');
const cartBtn = document.getElementById('cartBtn');
const closeCartBtn = document.getElementById('closeCartBtn');

cartBtn?.addEventListener('click', () => cartModal.classList.remove('hidden'));
closeCartBtn?.addEventListener('click', () => cartModal.classList.add('hidden'));

window.addToCart = function(id, name, price) {
  cart.push({ id, name, price });
  updateCart();
}

function updateCart() {
  localStorage.setItem('cadCart', JSON.stringify(cart));
  
  const cartCount = document.getElementById('cartCount');
  if (cartCount) cartCount.textContent = cart.length;
  
  const cartItemsDiv = document.getElementById('cartItems');
  if (!cartItemsDiv) return;
  
  cartItemsDiv.innerHTML = '';
  let total = 0;

  cart.forEach((item, index) => {
    total += item.price;
    cartItemsDiv.innerHTML += `
      <div class="cart-item">
        <span>${item.name}</span>
        <div>
          <span>$${item.price.toFixed(2)}</span>
          <button onclick="removeFromCart(${index})" style="background:none; border:none; cursor:pointer; color:#dc2626; margin-left:10px; font-weight:bold;">✕</button>
        </div>
      </div>
    `;
  });
  
  const cartTotal = document.getElementById('cartTotal');
  if (cartTotal) cartTotal.textContent = total.toFixed(2);
}

window.removeFromCart = function(index) {
  cart.splice(index, 1);
  updateCart();
}

// --- 5. API Logic: Fetch & Render Products ---
async function loadProducts() {
  try {
    const response = await fetch(`${API_BASE}/products`);
    if (!response.ok) throw new Error("Failed to fetch products");
    
    const products = await response.json();
    const grid = document.getElementById('productGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    products.forEach(p => {
      const actionHtml = p.price === 0 
        ? `<a href="${p.download_url}" target="_blank" class="btn-secondary" style="text-decoration:none; text-align:center; display:inline-block;">Download Free</a>`
        : `<button onclick="addToCart(${p.id}, '${p.name}', ${p.price})" class="btn-primary">Add to Cart</button>`;

      grid.innerHTML += `
        <div class="card">
          <img src="${p.image_url}" alt="${p.name}" loading="lazy">
          <div class="card-info">
            <h3>${p.name}</h3>
            <div class="price-row">
              <strong>${p.price === 0 ? 'Free' : '$' + p.price.toFixed(2)}</strong>
              ${actionHtml}
            </div>
          </div>
        </div>
      `;
    });
  } catch (error) {
    console.error("Error loading products from backend:", error);
  }
}

// --- 6. API Logic: Admin Upload Form ---
const uploadForm = document.getElementById('uploadForm');
uploadForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const productData = {
    name: document.getElementById('modelName').value,
    price: document.getElementById('modelPrice').value,
    image_url: document.getElementById('modelImage').value,
    download_url: document.getElementById('modelFile').value
  };

  try {
    const response = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });

    if (response.ok) {
      alert("Model published successfully!");
      uploadForm.reset();
      switchView('market'); 
      loadProducts(); 
    } else {
      alert("Failed to publish model.");
    }
  } catch (error) {
    console.error("Error submitting product:", error);
  }
});

// --- 7. API Logic: Custom Request Form ---
const requestForm = document.getElementById('requestForm');
requestForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const requestData = {
    details: document.querySelector('#requestForm textarea').value,
    reference_link: document.querySelector('#requestForm input[type="url"]').value,
    user_email: userName?.textContent.replace('Hello, ', '') || 'guest@example.com'
  };

  try {
    const response = await fetch(`${API_BASE}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    });

    if (response.ok) {
      alert("Custom request submitted successfully! We will be in touch.");
      requestForm.reset();
    } else {
      alert("Failed to submit request.");
    }
  } catch (error) {
    console.error("Error submitting request:", error);
  }
});

// --- 8. Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  updateCart();
  loadProducts();
});