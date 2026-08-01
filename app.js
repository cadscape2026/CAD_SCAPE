const API_BASE = "https://procad-backend.onrender.com/api"; 

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
}

document.getElementById('logoHomeBtn').addEventListener('click', (e) => { e.preventDefault(); switchView('home'); });
if(navs.market) navs.market.addEventListener('click', (e) => { e.preventDefault(); switchView('market'); });
if(navs.requests) navs.requests.addEventListener('click', (e) => { e.preventDefault(); switchView('requests'); });
if(navs.admin) navs.admin.addEventListener('click', (e) => { e.preventDefault(); switchView('admin'); });
document.getElementById('heroBrowseBtn').addEventListener('click', () => switchView('market'));


// --- ADMIN TABS ---
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


// --- SIDEBAR & THEME ---
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


// --- AUTHENTICATION (BULLETPROOFED) ---
const adminEmails = ["deekshith123pi@gmail.com", "cadscape2026@gmail.com"]; 

// Safely parse Local Storage to prevent crashes
let savedUser = null;
try {
  savedUser = JSON.parse(localStorage.getItem('cadUser'));
} catch(e) {
  console.warn("Cleared corrupted user data.");
  localStorage.removeItem('cadUser');
}
let currentUser = (savedUser && savedUser.email) ? savedUser : { name: "Guest", email: null };
let tokenClient; 

function handleSuccessfulLogin(name, email, avatarUrl) {
  currentUser = { name: name, email: email, avatar: avatarUrl };
  localStorage.setItem('cadUser', JSON.stringify(currentUser)); 

  document.getElementById('customLoginBtn').classList.add('hidden');
  document.getElementById('sidebarGuestInfo').classList.add('hidden');
  document.getElementById('sidebarUserInfo').classList.remove('hidden');
  if(avatarUrl) document.getElementById('userAvatar').src = avatarUrl;
  document.getElementById('userNameDisplay').textContent = name;
  document.getElementById('userEmailDisplay').textContent = email;
  document.getElementById('logoutBtn').classList.remove('hidden');

  // Safely reveal admin links if the email matches
  if (adminEmails.includes(email)) {
    if(navs.admin) navs.admin.classList.remove('hidden');
    const sideAdminBtn = document.getElementById('sidebarNavAdmin');
    if(sideAdminBtn) sideAdminBtn.classList.remove('hidden');
  } else {
    // Force hide them if a normal user logs in
    if(navs.admin) navs.admin.classList.add('hidden');
    const sideAdminBtn = document.getElementById('sidebarNavAdmin');
    if(sideAdminBtn) sideAdminBtn.classList.add('hidden');
  }
  
  renderGrid(allProducts);
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
    console.warn("Google Auth not fully configured.");
  }
};

document.getElementById('customLoginBtn').addEventListener('click', () => {
  if (tokenClient) {
     tokenClient.requestAccessToken(); 
  } else {
    handleSuccessfulLogin("Admin", "cadscape2026@gmail.com", "https://via.placeholder.com/64");
  }
});

// Forceful Sign Out logic
document.getElementById('logoutBtn').addEventListener('click', () => {
  try {
    currentUser = { name: "Guest", email: null };
    localStorage.removeItem('cadUser'); 
    
    document.getElementById('customLoginBtn').classList.remove('hidden');
    document.getElementById('sidebarUserInfo').classList.add('hidden');
    document.getElementById('sidebarGuestInfo').classList.remove('hidden');
    document.getElementById('logoutBtn').classList.add('hidden');
    
    if(navs.admin) navs.admin.classList.add('hidden');
    const sideAdminBtn = document.getElementById('sidebarNavAdmin');
    if(sideAdminBtn) sideAdminBtn.classList.add('hidden');
    
    switchView('home');
    toggleSidebar();
    renderGrid(allProducts);
  } catch (error) {
    // If anything fails during the UI update, hard refresh the page to guarantee a logout
    window.location.reload(); 
  }
});


// --- STATE: CART & WISHLIST ---
let cart = JSON.parse(localStorage.getItem('cadCart')) || [];
let wishlist = JSON.parse(localStorage.getItem('cadWishlist')) || [];
let allProducts = []; 

function updateCounters() {
  document.getElementById('cartCount').textContent = cart.length;
  document.getElementById('wishlistCount').textContent = wishlist.length;
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

// --- DRAG AND DROP IMAGE LOGIC ---
let currentUploadBase64 = "";
let currentEditBase64 = "";

function setupDropZone(dropZoneId, inputId, isEdit = false) {
  const dropZoneElement = document.getElementById(dropZoneId);
  const inputElement = document.getElementById(inputId);

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
  if (dropZoneElement.querySelector(".drop-zone__prompt")) dropZoneElement.querySelector(".drop-zone__prompt").remove();

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
    alert("Please upload an image file (JPG, PNG, etc).");
  }
}

function resetDropZone(dropZoneId, isEdit = false) {
  const dropZoneElement = document.getElementById(dropZoneId);
  const inputElement = dropZoneElement.querySelector(".drop-zone__input");
  if(inputElement) inputElement.value = ""; 
  
  const thumb = dropZoneElement.querySelector(".drop-zone__thumb");
  if(thumb) thumb.remove(); 

  let prompt = dropZoneElement.querySelector(".drop-zone__prompt");
  if(!prompt) {
    prompt = document.createElement("span");
    prompt.classList.add("drop-zone__prompt");
    prompt.textContent = isEdit ? "Drag & Drop New Image Here or Click to Browse" : "Drag & Drop Image Here or Click to Browse";
    dropZoneElement.insertBefore(prompt, inputElement);
  }

  if (isEdit) currentEditBase64 = "";
  else currentUploadBase64 = "";
}

setupDropZone("uploadDropZone", "modelImageFile", false);
setupDropZone("editDropZone", "editModelImageFile", true);


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
        <img src="${getDirectImageUrl(p.image_url)}" alt="${p.name}">
        <div class="carousel-info">
          <h2 style="margin-bottom:10px;">${p.name}</h2>
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


// --- RENDER PRODUCTS & SEARCH ---
function renderGrid(products) {
  const grid = document.getElementById('productGrid');
  grid.innerHTML = '';
  
  if (products.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-muted)">No products found.</p>';
    return;
  }

  // Safely check if the user is an admin without crashing
  const isAdmin = (currentUser && currentUser.email) ? adminEmails.includes(currentUser.email) : false;

  products.forEach(p => {
    const priceDisplay = p.price === 0 
      ? `<span class="price text-green">Free</span>` 
      : `<span class="price">$${p.price.toFixed(2)}</span>`;

    const actionHtml = `<button onclick="addToCart('${p.id}', '${p.name}', ${p.price}, '${p.download_url}')" class="btn-small">Add to Cart</button>`;

    const isWishlisted = wishlist.includes(p.id) ? 'Remove' : 'Wishlist';
    const commentsLength = p.comments ? p.comments.length : 0;

    const adminControls = isAdmin ? `
      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border); display: flex; gap: 10px;">
        <button onclick="openEditModal('${p.id}')" class="btn-small" style="background:#f59e0b; flex:1;">Edit</button>
        <button onclick="deleteProduct('${p.id}')" class="btn-small" style="background:#ef4444; flex:1;">Delete</button>
      </div>
    ` : '';

    grid.innerHTML += `
      <div class="card">
        <div class="card-img-wrapper">
          <img src="${getDirectImageUrl(p.image_url)}" alt="${p.name}">
        </div>
        <div class="card-info">
          <h3 class="card-title">${p.name}</h3>
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
    console.warn("Backend not connected yet.");
  }
}

// --- ADMIN: UPLOAD PRODUCT ---
window.submitNewProduct = async function() {
  const btn = document.getElementById('uploadBtn');
  const name = document.getElementById('modelName').value;
  const desc = document.getElementById('modelDesc').value;
  const price = document.getElementById('modelPrice').value;
  const file = document.getElementById('modelFile').value;

  if (!name || !desc || !currentUploadBase64 || !file) {
    alert("Please fill in all fields and upload an image!");
    return;
  }

  btn.textContent = "Uploading... Please wait";
  btn.style.backgroundColor = "#f59e0b";
  btn.style.pointerEvents = "none"; 

  const data = { name, description: desc, price, image_url: currentUploadBase64, download_url: file };

  try {
    const response = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      alert("Product Uploaded Successfully!");
      document.getElementById('uploadForm').reset();
      resetDropZone("uploadDropZone", false); 
      loadProducts(); 
    } else {
      alert("Failed to upload product. Check backend connection.");
    }
  } catch (error) {
    alert("Error uploading product. Is the backend running?");
  } finally {
    btn.textContent = "Upload to Database";
    btn.style.backgroundColor = ""; 
    btn.style.pointerEvents = "auto";
  }
};


// --- ADMIN: EDIT & DELETE PRODUCTS ---
let currentEditId = null;

window.openEditModal = function(id) {
  const product = allProducts.find(p => p.id === id);
  if(!product) return;
  
  currentEditId = id;
  document.getElementById('editModelName').value = product.name;
  document.getElementById('editModelDesc').value = product.description;
  document.getElementById('editModelPrice').value = product.price;
  document.getElementById('editModelFile').value = product.download_url;
  
  currentEditBase64 = product.image_url;
  const dropZoneElement = document.getElementById('editDropZone');
  
  const prompt = dropZoneElement.querySelector(".drop-zone__prompt");
  if(prompt) prompt.remove();

  let thumb = dropZoneElement.querySelector(".drop-zone__thumb");
  if(!thumb) {
    thumb = document.createElement("div");
    thumb.classList.add("drop-zone__thumb");
    dropZoneElement.appendChild(thumb);
  }
  thumb.style.backgroundImage = `url('${getDirectImageUrl(product.image_url)}')`;

  document.getElementById('editModal').classList.remove('hidden');
}

window.submitEditProduct = async function() {
  const btn = document.getElementById('editBtn');
  const name = document.getElementById('editModelName').value;
  const desc = document.getElementById('editModelDesc').value;
  const price = document.getElementById('editModelPrice').value;
  const file = document.getElementById('editModelFile').value;

  if (!name || !desc || !currentEditBase64 || !file) return alert("Fill all fields and include an image!");

  btn.textContent = "Saving...";
  btn.style.backgroundColor = "#f59e0b";
  btn.style.pointerEvents = "none";

  const data = { name, description: desc, price, image_url: currentEditBase64, download_url: file };

  try {
    const res = await fetch(`${API_BASE}/products/${currentEditId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if(res.ok) {
      alert("Product updated successfully!");
      document.getElementById('editModal').classList.add('hidden');
      resetDropZone('editDropZone', true);
      loadProducts();
    } else {
      alert("Failed to update product.");
    }
  } catch (error) {
    alert("Error communicating with server.");
  } finally {
    btn.textContent = "Save Changes";
    btn.style.backgroundColor = "";
    btn.style.pointerEvents = "auto";
  }
};

window.deleteProduct = async function(id) {
  if(!confirm("Are you sure you want to permanently delete this product?")) return;
  
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

// --- SUBMITTING REQUESTS ---
window.submitDesignRequest = async function() {
  const btn = document.getElementById('requestBtn');
  const phone = document.getElementById('reqPhone').value;
  const details = document.getElementById('reqDetails').value;
  const link = document.getElementById('reqLink').value;

  if(!phone || !details) return alert("Please provide your phone number and details.");

  btn.textContent = "Submitting...";
  btn.style.backgroundColor = "#f59e0b";
  btn.style.pointerEvents = "none";

  const data = {
    details: details,
    reference_link: link, 
    phone: phone,         
    user_email: currentUser.email || 'guest@example.com'
  };

  try {
    const res = await fetch(`${API_BASE}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if(res.ok) {
      alert("Request Submitted! We will review your CAD requirements.");
      document.getElementById('requestForm').reset();
    } else {
      alert("Failed to submit request.");
    }
  } catch (error) {
    alert("Error submitting request.");
  } finally {
    btn.textContent = "Submit Request";
    btn.style.backgroundColor = "";
    btn.style.pointerEvents = "auto";
  }
};

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
      const linkHtml = req.reference_link && req.reference_link !== "None provided" && req.reference_link !== ""
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
  
  cartItemsDiv.innerHTML = '';
  let total = 0;

  cartTotalContainer.classList.remove('hidden');

  if (cart.length === 0) {
    cartItemsDiv.innerHTML = '<p style="color:var(--text-muted);">Your cart is empty.</p>';
  } else {
    cart.forEach((item, index) => {
      total += item.price;
      cartItemsDiv.innerHTML += `
        <div class="cart-item" style="display:flex; justify-content:space-between; margin-bottom: 15px; border-bottom: 1px solid var(--border); padding-bottom: 15px;">
          <span style="font-weight: 500;">${item.name}</span>
          <div>
            <span style="color:var(--green-free); font-weight:bold;">$${item.price.toFixed(2)}</span>
            <button onclick="removeFromCart(${index})" style="background:none; border:none; color:#ef4444; margin-left:15px; cursor:pointer; font-weight:bold;">X</button>
          </div>
        </div>
      `;
    });
  }
  cartTotalSpan.textContent = total.toFixed(2);
}

document.getElementById('cartBtn').addEventListener('click', () => {
  renderCart();
  document.getElementById('cartModal').classList.remove('hidden');
});

window.checkoutCart = function() {
  if (cart.length === 0) return alert("Your cart is empty!");
  
  const cartItemsDiv = document.getElementById('cartItems');
  let html = `<h3 style="color:var(--green-free); margin-bottom: 15px;">Checkout Successful! Here are your files:</h3>`;
  
  cart.forEach(item => {
    const dlLink = item.download_url ? item.download_url : '#';
    html += `
      <div style="margin-bottom: 10px; padding: 10px; background: rgba(34, 197, 94, 0.1); border: 1px solid var(--green-free); border-radius: 6px; display:flex; justify-content:space-between; align-items:center;">
        <span style="font-weight:500;">${item.name}</span>
        <a href="${dlLink}" target="_blank" class="btn-small" style="background:var(--green-free);">Download File</a>
      </div>
    `;
  });
  
  cartItemsDiv.innerHTML = html;
  document.getElementById('cartTotalContainer').classList.add('hidden');
  
  cart = [];
  localStorage.setItem('cadCart', JSON.stringify(cart));
  updateCounters();
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
  wishlistItemsDiv.innerHTML = '';
  
  if (wishlist.length === 0) {
    wishlistItemsDiv.innerHTML = '<p style="color:var(--text-muted);">Your wishlist is empty.</p>';
  } else {
    wishlist.forEach(id => {
      const item = allProducts.find(p => p.id === id);
      if(item) {
        wishlistItemsDiv.innerHTML += `
          <div class="cart-item" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 15px; border-bottom: 1px solid var(--border); padding-bottom: 15px;">
            <span style="font-weight: 500;">${item.name}</span>
            <div>
              <span style="color:var(--green-free); font-weight:bold; margin-right:10px;">$${item.price.toFixed(2)}</span>
              <button onclick="addToCart('${item.id}', '${item.name}', ${item.price}, '${item.download_url}')" class="btn-small">To Cart</button>
              <button onclick="toggleWishlist('${item.id}', null, true)" style="background:none; border:none; color:#ef4444; margin-left:10px; cursor:pointer; font-weight:bold;">X</button>
            </div>
          </div>
        `;
      }
    });
  }
}

document.getElementById('wishlistBtn').addEventListener('click', () => {
  renderWishlist();
  document.getElementById('wishlistModal').classList.remove('hidden');
});

// --- COMMENTS LOGIC ---
let currentCommentProductId = null;

window.openComments = function(id) {
  currentCommentProductId = id;
  const product = allProducts.find(p => p.id === id);
  const commentsList = document.getElementById('commentsList');
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
  
  document.getElementById('commentsModal').classList.remove('hidden');
}

document.getElementById('submitCommentBtn').addEventListener('click', async () => {
  const textInput = document.getElementById('newCommentText');
  const text = textInput.value.trim();
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
    
    textInput.value = '';
    document.getElementById('commentsModal').classList.add('hidden');
    alert("Comment posted successfully!");
    loadProducts(); 
  } catch (e) {
    alert("Failed to post comment.");
  }
});

// Init
updateCounters();
loadProducts();
