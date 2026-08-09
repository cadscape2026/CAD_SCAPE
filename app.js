const API_BASE = "https://procad-backend.onrender.com/api"; 
const ADMIN_SECRET = "778899"; // SECURITY PIN TO PREVENT HACKING

// --- GLOBAL STATE ---
let cart = [];
let wishlist = [];
let allProducts = [];
let requestImages = {}; 

try { 
    cart = JSON.parse(localStorage.getItem('cadCart')) || []; 
} catch(e) {
    console.error("Could not load cart data", e);
}

try { 
    wishlist = JSON.parse(localStorage.getItem('cadWishlist')) || []; 
} catch(e) {
    console.error("Could not load wishlist data", e);
}

// ==========================================================================
// 1. LENIS SMOOTH SCROLL PHYSICS ENGINE (TRIONN STYLE)
// ==========================================================================
const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smooth: true,
    mouseMultiplier: 1,
});

function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
}
requestAnimationFrame(raf);


// ==========================================================================
// 2. MAGNETIC CUSTOM CURSOR LOGIC
// ==========================================================================
const cursor = document.getElementById('customCursor');
const follower = document.getElementById('customCursorFollower');
let mouseX = 0;
let mouseY = 0;
let followerX = 0;
let followerY = 0;

if (window.matchMedia("(pointer: fine)").matches) {
    // Only run custom cursor logic on desktop devices (where mouse exists)
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX; 
        mouseY = e.clientY;
        cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
    });
    
    // Smooth lagging follower physics
    function animateFollower() {
        followerX += (mouseX - followerX) * 0.15;
        followerY += (mouseY - followerY) * 0.15;
        follower.style.transform = `translate3d(${followerX}px, ${followerY}px, 0)`;
        requestAnimationFrame(animateFollower);
    }
    animateFollower();

    // Hover state expansion for interactive elements
    document.addEventListener('mouseover', (e) => {
        if(e.target.closest('button') || e.target.closest('a') || e.target.closest('.hover-target') || e.target.closest('.card') || e.target.closest('input') || e.target.closest('textarea')) {
            follower.classList.add('hovering');
        } else {
            follower.classList.remove('hovering');
        }
    });
}


// ==========================================================================
// 3. SCROLL REVEAL ANIMATIONS (INTERSECTION OBSERVER)
// ==========================================================================
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            // Stop observing once it has been revealed
            revealObserver.unobserve(entry.target); 
        }
    });
}, { 
    threshold: 0.1, 
    rootMargin: "0px 0px -50px 0px" 
});

function initReveals() {
    const revealElements = document.querySelectorAll('.reveal');
    revealElements.forEach(el => revealObserver.observe(el));
}


// ==========================================================================
// 4. NAVIGATION & VIEW ROUTING
// ==========================================================================
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
    // Hide all views
    Object.values(views).forEach(v => { 
        if(v) v.classList.add('hidden'); 
    });
    
    // Deactivate all nav links
    Object.values(navs).forEach(n => { 
        if(n) n.classList.remove('active'); 
    });
    
    // Show target view
    if(views[target]) views[target].classList.remove('hidden');
    if(navs[target]) navs[target].classList.add('active');

    // Load admin data if admin view is opened
    if(target === 'admin') {
        fetchAdminRequests();
    }
    
    // Reset lenis scroll to top instantly without smooth transition
    lenis.scrollTo(0, { immediate: true });
    
    // Re-initialize reveals for the newly opened view
    setTimeout(initReveals, 100); 
}

// Nav Click Listeners
document.getElementById('logoHomeBtn')?.addEventListener('click', (e) => { 
    e.preventDefault(); 
    switchView('home'); 
});

if(navs.market) {
    navs.market.addEventListener('click', (e) => { 
        e.preventDefault(); 
        switchView('market'); 
    });
}

if(navs.requests) {
    navs.requests.addEventListener('click', (e) => { 
        e.preventDefault(); 
        switchView('requests'); 
    });
}

if(navs.admin) {
    navs.admin.addEventListener('click', (e) => { 
        e.preventDefault(); 
        switchView('admin'); 
    });
}


// ==========================================================================
// 5. COMMAND PALETTE (CMD+K SEARCH)
// ==========================================================================
window.toggleCmdPalette = function() {
    const modal = document.getElementById('cmdPaletteOverlay');
    const input = document.getElementById('cmdSearchInput');
    
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        input.focus();
        follower?.classList.remove('hovering');
    } else {
        modal.classList.add('hidden');
        input.value = '';
        document.getElementById('cmdResults').innerHTML = '';
    }
}

// Keyboard shortcuts for search
window.addEventListener('keydown', (e) => {
    // CMD+K or CTRL+K
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { 
        e.preventDefault(); 
        toggleCmdPalette(); 
    }
    // ESC to close
    if (e.key === 'Escape' && !document.getElementById('cmdPaletteOverlay').classList.contains('hidden')) {
        toggleCmdPalette();
    }
});

document.getElementById('cmdSearchInput')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const resultsDiv = document.getElementById('cmdResults');
    
    if(!term) { 
        resultsDiv.innerHTML = ''; 
        return; 
    }
    
    const filtered = allProducts.filter(p => {
        return p.name.toLowerCase().includes(term) || 
               (p.description && p.description.toLowerCase().includes(term));
    });
    
    if(filtered.length === 0) { 
        resultsDiv.innerHTML = '<p style="color:var(--text-muted); padding: 10px;">No matching results found.</p>'; 
        return; 
    }
    
    resultsDiv.innerHTML = filtered.map(p => `
        <a href="#" class="cmd-item" onclick="openLightbox('${p.id}'); toggleCmdPalette(); return false;">
            <div style="display:flex; align-items:center;">
                <img src="${getDirectImageUrl(p.image_url)}" alt="Thumbnail">
                <div>
                    <strong>${p.name}</strong><br>
                    <span style="font-size:0.8rem; color:var(--text-muted)">₹${p.price.toFixed(2)}</span>
                </div>
            </div>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
        </a>
    `).join('');
});


// ==========================================================================
// 6. SIDEBAR & PERSISTENT THEME TOGGLE
// ==========================================================================
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
    
    const sunIcon = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
    const moonIcon = `<svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

    if (setDark) {
        document.body.classList.remove('light-mode');
        document.body.classList.add('dark-mode');
        if(themeToggleBtn) themeToggleBtn.innerHTML = `${sunIcon} <span>Switch to Light Mode</span>`;
        if(mainLogoImg) mainLogoImg.src = 'logo_4.png';
        localStorage.setItem('cadTheme', 'dark'); 
    } else {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
        if(themeToggleBtn) themeToggleBtn.innerHTML = `${moonIcon} <span>Switch to Dark Mode</span>`;
        if(mainLogoImg) mainLogoImg.src = 'logo_light.png';
        localStorage.setItem('cadTheme', 'light'); 
    }
}

document.getElementById('themeToggleBtn')?.addEventListener('click', () => { 
    const isCurrentlyDark = document.body.classList.contains('dark-mode');
    updateThemeUI(!isCurrentlyDark); 
});

document.addEventListener('DOMContentLoaded', () => { 
    updateThemeUI(document.body.classList.contains('dark-mode')); 
    initReveals();
});


// ==========================================================================
// 7. GOOGLE AUTHENTICATION & USER STATE
// ==========================================================================
const adminEmails = ["deekshith123pi@gmail.com", "cadscape2026@gmail.com"]; 
let savedUser = null; 

try { 
    savedUser = JSON.parse(localStorage.getItem('cadUser')); 
} catch(e) {
    console.error("Could not parse saved user data");
}

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

    const isAdmin = adminEmails.includes(email);
    if(navs.admin) navs.admin.classList.toggle('hidden', !isAdmin);
    if(document.getElementById('sidebarNavAdmin')) document.getElementById('sidebarNavAdmin').classList.toggle('hidden', !isAdmin);
    
    // Re-render grid to show/hide admin edit controls
    if(allProducts.length > 0) renderGrid(allProducts);
}

// Auto-login if previously saved
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
        console.warn("Google Auth not configured properly on this environment."); 
    }
};

document.getElementById('customLoginBtn')?.addEventListener('click', () => { 
    if (tokenClient) {
        tokenClient.requestAccessToken(); 
    } else {
        // Fallback for testing environments without working Google Client ID
        handleSuccessfulLogin("Admin Demo", "cadscape2026@gmail.com", "https://via.placeholder.com/64"); 
    }
});

document.getElementById('logoutBtn')?.addEventListener('click', () => { 
    currentUser = { name: "Guest", email: null }; 
    localStorage.removeItem('cadUser'); 
    window.location.reload(); 
});

function updateCounters() {
    if(document.getElementById('cartCount')) {
        document.getElementById('cartCount').textContent = cart.length;
    }
    if(document.getElementById('wishlistCount')) {
        document.getElementById('wishlistCount').textContent = wishlist.length;
    }
}

function getDirectImageUrl(url) {
    if (!url) return '';
    // Fix Google Drive links to be directly displayable as images
    if (url.includes('drive.google.com/file/d/')) { 
        const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/); 
        if (match && match[1]) {
            return `https://drive.google.com/uc?export=view&id=${match[1]}`; 
        }
    }
    return url; 
}


// ==========================================================================
// 8. 3D SCROLL-SCRUB PING-PONG ANIMATION
// ==========================================================================
const heroScrubModel = document.getElementById('heroScrubModel');

function updateScrollAnimation() {
    const track = document.getElementById('heroScrollTrack');
    const overlay = document.getElementById('heroTextOverlay');
    
    if (!views.home.classList.contains('hidden') && track && heroScrubModel) {
        const rect = track.getBoundingClientRect();
        let rawProgress = -rect.top / (rect.height - window.innerHeight);
        if (isNaN(rawProgress)) rawProgress = 0; 
        
        const scrollProgress = Math.max(0, Math.min(1, rawProgress)); 
        
        // Ping-pong calculation: Disassemble from 0-50%, Reassemble from 50-100%
        const animProgress = scrollProgress <= 0.5 ? (scrollProgress * 2) : (2 - (scrollProgress * 2));
        
        if (heroScrubModel.availableAnimations && heroScrubModel.availableAnimations.length > 0) { 
            heroScrubModel.pause(); 
            heroScrubModel.currentTime = animProgress * heroScrubModel.duration; 
        }
        
        // Centering Math: Move from right edge to center
        let shiftX = 0;
        if (window.innerWidth > 850) {
            shiftX = 25 - (animProgress * 25);
        }
        heroScrubModel.style.transform = `translateX(${shiftX}vw)`;
        
        // Text fading
        if (overlay) {
            const fade = Math.min(1, scrollProgress * 3); 
            overlay.style.opacity = 1 - fade;
            overlay.style.transform = `translateY(calc(-50% - ${fade * 50}px))`;
            overlay.style.pointerEvents = fade > 0.5 ? 'none' : 'auto';
        }
    }
}

// Bind to Lenis event instead of window scroll for butter-smooth sync
lenis.on('scroll', updateScrollAnimation);
window.addEventListener('resize', updateScrollAnimation); 

if(heroScrubModel) { 
    heroScrubModel.addEventListener('load', () => { 
        heroScrubModel.pause(); 
        heroScrubModel.currentTime = 0; 
        updateScrollAnimation(); 
    }); 
}
updateScrollAnimation();


// ==========================================================================
// 9. PRODUCT GRID RENDERING & STORE LOGIC
// ==========================================================================
function generateProductCardHTML(product, isAdmin, isWishlisted) {
    const priceDisplay = product.price === 0 
        ? `<span class="price text-green">Free</span>` 
        : `<span class="price">₹${product.price.toFixed(2)}</span>`;
        
    const actionHtml = `<button onclick="addToCart('${product.id}', '${product.name}', ${product.price}, '${product.download_url}')" class="btn-small hover-target">Add to Cart</button>`;
    
    const previewBadge = product.model_3d_url 
        ? `<div style="position:absolute; top:12px; right:12px; background:rgba(0,0,0,0.8); color:#fff; padding:6px 12px; border-radius:20px; font-size:0.7rem; font-weight:700; letter-spacing:1px; backdrop-filter:blur(5px);">3D VIEW</div>` 
        : '';
        
    const adminControls = isAdmin 
        ? `
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); display: flex; gap: 8px;">
            <button onclick="openEditModal('${product.id}')" class="btn-small hover-target" style="background:transparent; border-color:#f59e0b; color:#f59e0b; flex:1;">Edit</button>
            <button onclick="deleteProduct('${product.id}')" class="btn-small hover-target" style="background:transparent; border-color:#ef4444; color:#ef4444; flex:1;">Delete</button>
        </div>` 
        : '';

    const commentsLength = product.comments ? product.comments.length : 0;

    return `
        <div class="card reveal">
            <div class="card-img-wrapper hover-target" onclick="openLightbox('${product.id}')">
                <img src="${getDirectImageUrl(product.image_url)}" alt="${product.name}" loading="lazy">
                ${previewBadge}
            </div>
            <div class="card-info">
                <h3 class="card-title hover-target" onclick="openLightbox('${product.id}')" style="cursor:pointer;">${product.name}</h3>
                <p class="card-desc">${product.description || 'No description provided.'}</p>
                <div class="card-social">
                    <button class="social-btn hover-target" onclick="toggleWishlist('${product.id}', this)">★ ${isWishlisted}</button>
                    <button class="social-btn hover-target" onclick="openComments('${product.id}')">💬 Comments (${commentsLength})</button>
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

function renderGrid(productsToRender) {
    const grid = document.getElementById('productGrid');
    const homeGrid = document.getElementById('homeRecentGrid');
    
    if(grid) grid.innerHTML = '';
    if(homeGrid) homeGrid.innerHTML = '';
    
    if (productsToRender.length === 0) { 
        if(grid) grid.innerHTML = '<p style="color:var(--text-muted)">No models found matching that filter.</p>'; 
        return; 
    }
    
    const isAdmin = adminEmails.includes(currentUser.email);
    
    productsToRender.forEach((product, index) => {
        const isWishlisted = wishlist.includes(product.id) ? 'Remove' : 'Wishlist';
        const cardHTML = generateProductCardHTML(product, isAdmin, isWishlisted);
        
        if(grid) grid.innerHTML += cardHTML;
        if(homeGrid && index < 3) homeGrid.innerHTML += cardHTML;
    });
    
    // Re-initialize intersection observers for the newly rendered cards
    initReveals();
}

// Store Filter Chips Logic
document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
        // Remove active class from all chips
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        // Add to clicked chip
        e.target.classList.add('active');
        
        const filterText = e.target.textContent;
        if(filterText === 'All Models') {
            renderGrid(allProducts);
        } else {
            const filtered = allProducts.filter(p => {
                return p.name.toLowerCase().includes(filterText.toLowerCase()) || 
                       (p.description && p.description.toLowerCase().includes(filterText.toLowerCase()));
            });
            renderGrid(filtered);
        }
    });
});

async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE}/products`);
        if (!response.ok) return; 
        
        allProducts = await response.json();
        
        // Clean up invalid items from local storage
        const validIds = allProducts.map(p => p.id);
        wishlist = wishlist.filter(id => validIds.includes(id));
        localStorage.setItem('cadWishlist', JSON.stringify(wishlist));
        
        cart = cart.filter(item => validIds.includes(item.id));
        localStorage.setItem('cadCart', JSON.stringify(cart));
        
        updateCounters();
        
        // Render Edge-to-Edge Cinematic Store Hero
        const track = document.getElementById('carouselTrack');
        if(track && allProducts.length > 0) {
            track.innerHTML = allProducts.slice(0, 3).map(p => `
                <div class="carousel-slide">
                    <img src="${getDirectImageUrl(p.image_url)}" alt="${p.name}">
                </div>
            `).join('');
            
            // Carousel Auto-play logic
            setInterval(() => {
                let currentSlide = parseInt(track.dataset.slide || 0);
                currentSlide = (currentSlide + 1) % Math.min(3, allProducts.length);
                track.style.transform = `translateX(-${currentSlide * 100}%)`;
                track.dataset.slide = currentSlide;
            }, 5000); 
        }
        
        renderGrid(allProducts);
    } catch (error) { 
        console.warn("Backend not connected yet or server error.", error); 
    }
}


// ==========================================================================
// 10. ADMIN DASHBOARD & PRODUCT MANAGEMENT
// ==========================================================================
document.getElementById('btnShowUpload')?.addEventListener('click', () => {
    document.getElementById('adminUploadSection')?.classList.remove('hidden');
    document.getElementById('adminRequestsSection')?.classList.add('hidden');
    document.getElementById('btnShowUpload').className = "btn-primary hover-target";
    document.getElementById('btnShowRequests').className = "btn-secondary hover-target";
});

document.getElementById('btnShowRequests')?.addEventListener('click', () => {
    document.getElementById('adminUploadSection')?.classList.add('hidden');
    document.getElementById('adminRequestsSection')?.classList.remove('hidden');
    document.getElementById('btnShowUpload').className = "btn-secondary hover-target";
    document.getElementById('btnShowRequests').className = "btn-primary hover-target";
    fetchAdminRequests();
});

window.submitNewProduct = async function() {
    const btn = document.getElementById('uploadBtn');
    const name = document.getElementById('modelName').value;
    const desc = document.getElementById('modelDesc').value;
    const priceInput = document.getElementById('modelPrice').value;
    const file = document.getElementById('modelFile').value;
    const url3d = document.getElementById('model3dUrl')?.value || '';

    if (!name || !desc || !currentUploadBase64 || !file || priceInput === '') {
        alert("Please fill in all required fields! (Enter 0 if the product is free)");
        return;
    }

    if(btn) { 
        btn.textContent = "Uploading... Please wait"; 
        btn.style.pointerEvents = "none"; 
    }

    const payload = { 
        name: name, 
        description: desc, 
        price: parseFloat(priceInput) || 0, 
        image_url: currentUploadBase64, 
        download_url: file, 
        model_3d_url: url3d 
    };

    try {
        const res = await fetch(`${API_BASE}/products`, {
            method: 'POST', 
            headers: { 
                'Content-Type': 'application/json', 
                'X-Admin-Key': ADMIN_SECRET 
            },
            body: JSON.stringify(payload)
        });
        
        if (res.ok) { 
            alert("Product Uploaded Successfully!"); 
            document.getElementById('uploadForm').reset(); 
            resetDropZone("uploadDropZone"); 
            loadProducts(); 
        } else {
            alert("Unauthorized: Hack attempt blocked or wrong Admin PIN.");
        }
    } catch (e) { 
        alert("Error communicating with backend."); 
    } finally { 
        if(btn){ 
            btn.textContent = "Upload to Database"; 
            btn.style.pointerEvents = "auto"; 
        } 
    }
};

// Drag and Drop Logic
let currentUploadBase64 = "";
let currentEditBase64 = "";

function setupDropZone(dropId, inputId, isEdit) {
    const dropZone = document.getElementById(dropId);
    const inputElement = document.getElementById(inputId);
    
    if(!dropZone || !inputElement) return;
    
    dropZone.addEventListener("click", e => { 
        if(e.target !== inputElement) inputElement.click(); 
    });
    
    inputElement.addEventListener("change", () => { 
        if (inputElement.files.length) { 
            const reader = new FileReader(); 
            reader.onload = () => { 
                dropZone.innerHTML = `<div class="drop-zone__thumb" style="background-image:url('${reader.result}')"></div>`; 
                if(isEdit) {
                    currentEditBase64 = reader.result; 
                } else {
                    currentUploadBase64 = reader.result; 
                }
            }; 
            reader.readAsDataURL(inputElement.files[0]); 
        } 
    });
    
    ['dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, e => { 
            e.preventDefault(); 
            dropZone.classList.toggle('drop-zone--over', eventName === 'dragover'); 
            if(eventName === 'drop' && e.dataTransfer.files.length) { 
                inputElement.files = e.dataTransfer.files; 
                inputElement.dispatchEvent(new Event('change')); 
            } 
        });
    });
}

function resetDropZone(id) { 
    const drop = document.getElementById(id); 
    if(drop) {
        drop.innerHTML = `<span class="drop-zone__prompt">Drag & Drop Image Here</span><input type="file" class="drop-zone__input" accept="image/*">`; 
    }
    currentUploadBase64 = ""; 
    currentEditBase64 = ""; 
    setupDropZone("uploadDropZone", "modelImageFile", false); 
    setupDropZone("editDropZone", "editModelImageFile", true); 
}

setupDropZone("uploadDropZone", "modelImageFile", false);
setupDropZone("editDropZone", "editModelImageFile", true);

let currentEditId = null;

window.openEditModal = function(id) {
    const product = allProducts.find(x => x.id === id); 
    if(!product) return;
    
    currentEditId = id;
    
    document.getElementById('editModelName').value = product.name;
    document.getElementById('editModelDesc').value = product.description;
    document.getElementById('editModelPrice').value = product.price;
    document.getElementById('editModelFile').value = product.download_url;
    document.getElementById('editModel3dUrl').value = product.model_3d_url || '';
    
    currentEditBase64 = product.image_url;
    document.getElementById('editDropZone').innerHTML = `<div class="drop-zone__thumb" style="background-image:url('${getDirectImageUrl(product.image_url)}')"></div>`;
    
    document.getElementById('editModal').classList.remove('hidden');
}

window.submitEditProduct = async function() {
    const btn = document.getElementById('editBtn');
    const name = document.getElementById('editModelName').value;
    const desc = document.getElementById('editModelDesc').value;
    const price = document.getElementById('editModelPrice').value;
    const file = document.getElementById('editModelFile').value;
    const url3d = document.getElementById('editModel3dUrl').value;
    
    if (!name || !desc || !currentEditBase64 || !file || price === '') {
        return alert("Fill all fields! (Enter 0 if the product is free)");
    }
    
    if(btn){ 
        btn.textContent = "Saving..."; 
        btn.style.pointerEvents = "none"; 
    }
    
    const payload = { 
        name: name, 
        description: desc, 
        price: parseFloat(price) || 0, 
        image_url: currentEditBase64, 
        download_url: file, 
        model_3d_url: url3d 
    };

    try {
        const res = await fetch(`${API_BASE}/products/${currentEditId}`, { 
            method: 'PUT', 
            headers: { 
                'Content-Type': 'application/json', 
                'X-Admin-Key': ADMIN_SECRET 
            }, 
            body: JSON.stringify(payload) 
        });
        
        if(res.ok) { 
            alert("Updated successfully!"); 
            document.getElementById('editModal').classList.add('hidden'); 
            resetDropZone('editDropZone'); 
            loadProducts(); 
        } else {
            alert("Unauthorized: Hack attempt blocked or wrong Admin PIN.");
        }
    } catch (e) { 
        alert("Error communicating with backend."); 
    } finally { 
        if(btn){ 
            btn.textContent = "Save Changes"; 
            btn.style.pointerEvents = "auto"; 
        } 
    }
};

window.deleteProduct = async function(id) {
    if(!confirm("Permanently delete this product?")) return;
    
    try { 
        const res = await fetch(`${API_BASE}/products/${id}`, { 
            method: 'DELETE', 
            headers: { 'X-Admin-Key': ADMIN_SECRET } 
        }); 
        
        if(res.ok) { 
            alert("Product Deleted!"); 
            loadProducts(); 
        } else {
            alert("Unauthorized: Hack attempt blocked or wrong Admin PIN.");
        }
    } catch (e) { 
        alert("Error communicating with backend."); 
    }
}


// ==========================================================================
// 11. REQUESTS, ADMIN GRIDS & E-COMMERCE LOGIC
// ==========================================================================
window.submitDesignRequest = async function() {
    const btn = document.getElementById('requestBtn');
    const phone = document.getElementById('reqPhone').value;
    const details = document.getElementById('reqDetails').value;
    const link = document.getElementById('reqLink').value;
    
    if(!phone || !details) return alert("Please provide your phone number and requirements.");
    
    if(btn) { 
        btn.textContent = "Submitting..."; 
        btn.style.pointerEvents = "none"; 
    }
    
    const email = currentUser.email || 'guest@example.com';
    
    const payload = { 
        req_type: "Custom Design", 
        details: details, 
        reference_link: link, 
        phone: phone, 
        user_email: email 
    };

    try {
        const res = await fetch(`${API_BASE}/requests`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        });
        
        if(res.ok) { 
            document.getElementById('requestForm').reset(); 
            const waMessage = encodeURIComponent(`Hi, I just submitted a new CAD design request.\nEmail: ${email}\nDetails: ${details}`);
            if(confirm("Request Submitted Successfully!\n\nWould you like to open WhatsApp now to discuss your project details with us?")) {
                window.open(`https://wa.me/919446308229?text=${waMessage}`, '_blank');
            }
        } else {
            alert("Failed to submit request.");
        }
    } catch (e) { 
        alert("Network Error."); 
    } finally { 
        if(btn){ 
            btn.textContent = "Submit Request"; 
            btn.style.pointerEvents = "auto"; 
        } 
    }
};

window.encodeRequestImage = function(input, reqId) { 
    if(input.files && input.files[0]) { 
        const reader = new FileReader(); 
        reader.onload = e => { 
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
    const payload = { 
        status: document.getElementById(`status_${id}`).value, 
        payment_status: document.getElementById(`pay_${id}`).value, 
        price: document.getElementById(`price_${id}`).value, 
        completed_link: document.getElementById(`link_${id}`).value 
    };
    
    if(requestImages[id]) {
        payload.completed_image = requestImages[id];
    }

    try { 
        const res = await fetch(`${API_BASE}/requests/${id}`, { 
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json', 'X-Admin-Key': ADMIN_SECRET }, 
            body: JSON.stringify(payload) 
        }); 
        
        if(res.ok) { 
            alert("Order saved successfully!"); 
            fetchAdminRequests(); 
        } else {
            alert("Unauthorized: Hack attempt blocked or wrong Admin PIN.");
        }
    } catch(e) { 
        alert("Error connecting to server."); 
    }
};

async function fetchAdminRequests() {
    try {
        const res = await fetch(`${API_BASE}/requests`); 
        const reqs = await res.json();
        const list = document.getElementById('adminRequestsList'); 
        if(!list) return;
        
        if(reqs.length === 0) { 
            list.innerHTML = "<p>No custom requests or orders yet.</p>"; 
            return; 
        }
        
        list.innerHTML = reqs.map(r => {
            const dateStr = r.created_at ? new Date(r.created_at).toLocaleString('en-IN') : 'Date Unknown';
            const linkHtml = r.reference_link && r.reference_link !== "None provided" && r.reference_link !== ""
                ? `<a href="${r.reference_link}" target="_blank">View Attached Files (Drive)</a>`
                : `<span style="color:var(--text-muted)">No files attached</span>`;
            
            let badgeClass = "status-pending";
            if(r.status === "In Progress") badgeClass = "status-progress";
            if(r.status === "Completed") badgeClass = "status-completed";

            return `
            <div class="admin-req-card reveal" style="background:var(--bg-card); border:1px solid var(--border);">
                <div style="display:flex; justify-content:space-between; margin-bottom: 10px;">
                    <span class="status-badge" style="background:transparent; border-color:var(--text-main); color:var(--text-main);">${r.req_type}</span>
                    <span class="status-badge ${badgeClass}" style="margin:0">${r.status}</span>
                </div>
                
                <span class="timestamp">Ordered: ${dateStr}</span>
                <p><strong>Client:</strong> ${r.user_email}</p>
                <p><strong>Phone:</strong> ${r.phone}</p>
                <p style="margin-top:5px;"><strong>Details:</strong><br>${r.details.replace(/\n/g, '<br>')}</p>
                <p style="margin-top:10px;">${linkHtml}</p>
                
                <div style="background:var(--bg-dimmer); padding: 16px; border-radius: 16px; margin-top: 20px; display: flex; flex-direction: column; gap: 12px; border: 1px solid var(--border);">
                    <label style="font-size:0.85rem; color:var(--text-muted); font-weight:700;">Admin Controls:</label>
                    
                    <div style="display:flex; gap: 12px;">
                        <select id="status_${r.id}" class="admin-input" style="flex:1;">
                            <option value="Pending" ${r.status==='Pending'?'selected':''}>Pending</option>
                            <option value="In Progress" ${r.status==='In Progress'?'selected':''}>In Progress</option>
                            <option value="Completed" ${r.status==='Completed'?'selected':''}>Completed</option>
                        </select>
                        <select id="pay_${r.id}" class="admin-input" style="flex:1;">
                            <option value="Unpaid" ${r.payment_status==='Unpaid'?'selected':''}>Unpaid</option>
                            <option value="Paid" ${r.payment_status==='Paid'?'selected':''}>Paid</option>
                        </select>
                    </div>
                    
                    <input type="number" id="price_${r.id}" value="${r.price || 0}" class="admin-input" placeholder="Price (₹)">
                    <textarea id="link_${r.id}" class="admin-input" rows="2" placeholder="Completed Drive Link...">${r.completed_link || ''}</textarea>
                    
                    <div style="border: 2px dashed var(--border); padding: 12px; border-radius: 12px; text-align: center;">
                        <label style="cursor:pointer; color:var(--blue-primary); font-size:0.9rem; font-weight:600;">
                            📷 Upload Preview Image
                            <input type="file" accept="image/*" class="hidden hover-target" onchange="encodeRequestImage(this, '${r.id}')">
                        </label>
                        <img id="preview_${r.id}" src="${r.completed_image || ''}" class="${r.completed_image ? '' : 'hidden'}" style="max-width:100%; height:140px; object-fit:cover; border-radius:8px; margin-top:12px;">
                    </div>
                    
                    <button onclick="saveAdminUpdate('${r.id}')" class="btn-primary hover-target" style="margin-top:8px;">Save Settings</button>
                </div>
            </div>`;
        }).join('');
        
        setTimeout(initReveals, 100); 
    } catch (err) {
        console.error("Could not fetch requests");
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
    document.getElementById('ordersModal').classList.remove('hidden');
    
    fetch(`${API_BASE}/requests`)
        .then(res => res.json())
        .then(allReqs => {
            const myReqs = allReqs.filter(r => r.user_email === currentUser.email);
            
            if(myReqs.length === 0) {
                list.innerHTML = '<p style="color:var(--text-muted)">You have no active orders or design requests yet.</p>';
                return;
            }
            
            list.innerHTML = myReqs.map(r => {
                const dateStr = r.created_at ? new Date(r.created_at).toLocaleString('en-IN') : 'Date Unknown';
                
                let badgeClass = "status-pending";
                if(r.status === "In Progress") badgeClass = "status-progress";
                if(r.status === "Completed") badgeClass = "status-completed";

                let imageHtml = r.completed_image ? `<img src="${r.completed_image}" style="width:100%; max-height:240px; object-fit:cover; border-radius:12px; margin-bottom:12px; border:1px solid var(--border);">` : '';
                
                const waPayText = encodeURIComponent(`Hello! I want to pay for my CAD order.\nEmail: ${currentUser.email}\nOrder Details: ${r.details}\nTotal: ₹${r.price}`);
                const waDiscussText = encodeURIComponent(`Hello! I'd like to discuss my CAD request.\nEmail: ${currentUser.email}\nOrder Details: ${r.details}`);
                
                const discussBtn = `<a href="https://wa.me/919446308229?text=${waDiscussText}" target="_blank" class="btn-small hover-target" style="background:#25D366; color:#fff; border:none; display:inline-block; margin-top:8px; text-decoration:none;">💬 Discuss on WhatsApp</a>`;

                let actionHtml = '';
                if (r.payment_status === 'Paid') {
                    actionHtml = `
                        ${imageHtml}
                        <div style="margin-top:10px; padding:12px; background:rgba(16, 185, 129, 0.1); border:1px solid var(--green-free); border-radius:12px;">
                            <p style="color:var(--green-free); font-weight:700; margin-bottom:6px;">✅ Payment Confirmed</p>
                            <p style="word-break: break-all; color:var(--text-main);"><strong>Your Download Files:</strong><br>${(r.completed_link || 'No links attached.').replace(/\n/g, '<br>')}</p>
                        </div>
                        ${discussBtn}
                    `;
                } else if (r.price > 0 && r.payment_status === 'Unpaid') {
                    actionHtml = `
                        ${imageHtml}
                        <div style="margin-top:10px; padding:12px; background:rgba(245, 158, 11, 0.1); border:1px solid #f59e0b; border-radius:12px;">
                            <p style="color:#f59e0b; font-weight:700; margin-bottom:6px;">⚠️ Pending Payment: ₹${r.price}</p>
                            <a href="https://wa.me/919446308229?text=${waPayText}" target="_blank" class="btn-small hover-target" style="background:#f59e0b; color:#fff; border:none; display:inline-block; margin-top:4px; margin-right:8px; text-decoration:none;">Pay via WhatsApp</a>
                        </div>
                        ${discussBtn}
                    `;
                } else {
                    actionHtml = `
                        ${imageHtml}
                        <p style="margin-top:10px; color:var(--text-muted); font-size: 0.9rem;"><em>Waiting for Admin to review and quote price.</em></p>
                        ${discussBtn}
                    `;
                }

                return `
                <div class="admin-req-card" style="background:var(--bg-input); border:1px solid var(--border); margin-bottom: 20px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom: 10px;">
                        <span class="status-badge ${badgeClass}" style="margin-bottom:0;">${r.status}</span>
                        <span style="font-size:0.8rem; color:var(--text-muted);">${dateStr}</span>
                    </div>
                    <p style="color:var(--text-muted); font-size:0.85rem; font-weight:700; text-transform: uppercase;">${r.req_type}</p>
                    <p style="font-size: 1rem; margin-bottom: 16px;">${r.details.replace(/\n/g, '<br>')}</p>
                    ${actionHtml}
                </div>`;
            }).join('');
        })
        .catch(() => {
            list.innerHTML = '<p style="color:var(--grabcad-red)">Failed to load orders.</p>';
        });
});


// ==========================================================================
// 12. CART, WISHLIST, MODALS & COMMENTS LOGIC
// ==========================================================================
window.openLightbox = function(id) {
    const product = allProducts.find(x => x.id === id); 
    if(!product) return;
    
    document.getElementById('lightboxTitle').textContent = product.name;
    document.getElementById('lightboxMainImg').src = getDirectImageUrl(product.image_url);
    
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
    
    document.getElementById('lightboxModal').classList.remove('hidden');
};

window.toggleLightboxView = function(view) {
    const imgContainer = document.getElementById('lightboxImgContainer');
    const threeDContainer = document.getElementById('lightbox3DContainer');
    const btnImg = document.getElementById('btnViewImg');
    const btn3D = document.getElementById('btnView3D');
    
    if (view === '3d') { 
        imgContainer.classList.add('hidden'); 
        threeDContainer.classList.remove('hidden'); 
        btn3D.classList.add('active'); 
        btnImg.classList.remove('active'); 
    } else { 
        threeDContainer.classList.add('hidden'); 
        imgContainer.classList.remove('hidden'); 
        btnImg.classList.add('active'); 
        btn3D.classList.remove('active'); 
    }
};

window.addToCart = function(id, name, price, link) { 
    cart.push({ id, name, price: parseFloat(price), link }); 
    localStorage.setItem('cadCart', JSON.stringify(cart)); 
    updateCounters(); 
    
    // Magnetic pulse to show addition
    follower?.classList.add('hovering'); 
    setTimeout(() => follower?.classList.remove('hovering'), 300); 
    alert(`${name} added to cart!`);
}

window.toggleWishlist = function(id) { 
    const index = wishlist.indexOf(id); 
    if(index > -1) {
        wishlist.splice(index, 1); 
    } else {
        wishlist.push(id); 
    }
    localStorage.setItem('cadWishlist', JSON.stringify(wishlist)); 
    updateCounters(); 
    renderGrid(allProducts); 
}

function renderWishlist() {
    const div = document.getElementById('wishlistItems'); 
    if(!div) return; 
    div.innerHTML = '';
    
    if (wishlist.length === 0) {
        return div.innerHTML = '<p style="color:var(--text-muted);">Your wishlist is empty.</p>';
    }
    
    wishlist.forEach(id => { 
        const item = allProducts.find(p => p.id === id); 
        if(item) {
            div.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:16px; border-bottom:1px solid var(--border); background:var(--bg-input); border-radius:12px; margin-bottom:10px;">
                <span style="font-weight:600;">${item.name}</span>
                <div style="display:flex; align-items:center;">
                    <span style="color:var(--green-free); font-weight:700; margin-right:16px; font-size:1.1rem;">₹${item.price.toFixed(2)}</span>
                    <button onclick="addToCart('${item.id}', '${item.name}', ${item.price}, '${item.download_url}')" class="btn-small hover-target">Add to Cart</button>
                    <button onclick="toggleWishlist('${item.id}'); renderWishlist()" class="hover-target" style="background:none; border:none; color:var(--grabcad-red); margin-left:16px; cursor:pointer; font-size:1.2rem; font-weight:bold;">&times;</button>
                </div>
            </div>`; 
        }
    });
}
document.getElementById('wishlistBtn')?.addEventListener('click', () => { 
    renderWishlist(); 
    document.getElementById('wishlistModal').classList.remove('hidden'); 
});

function renderCart() {
    const div = document.getElementById('cartItems'); 
    const cartTotalContainer = document.getElementById('cartTotalContainer');
    const cartTotalSpan = document.getElementById('cartTotal');
    
    if(!div) return; 
    
    let total = 0;
    cartTotalContainer.classList.remove('hidden');
    
    if (cart.length === 0) {
        return div.innerHTML = '<p style="color:var(--text-muted);">Your cart is empty.</p>';
    }
    
    div.innerHTML = cart.map((item, i) => { 
        total += item.price; 
        return `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:16px; border-bottom:1px solid var(--border); background:var(--bg-input); border-radius:12px; margin-bottom:10px;">
            <span style="font-weight:600;">${item.name}</span>
            <div style="display:flex; align-items:center;">
                <span style="color:var(--green-free); font-weight:700; font-size:1.1rem;">₹${item.price.toFixed(2)}</span>
                <button onclick="cart.splice(${i},1); localStorage.setItem('cadCart', JSON.stringify(cart)); updateCounters(); renderCart();" class="hover-target" style="background:none; border:none; color:var(--grabcad-red); margin-left:16px; cursor:pointer; font-size:1.2rem; font-weight:bold;">&times;</button>
            </div>
        </div>`; 
    }).join('');
    
    if(cartTotalSpan) cartTotalSpan.textContent = total.toFixed(2);
}
document.getElementById('cartBtn')?.addEventListener('click', () => { 
    renderCart(); 
    document.getElementById('cartModal').classList.remove('hidden'); 
});

window.checkoutCart = async function() {
    if (cart.length === 0) return alert("Your cart is empty!");
    
    const email = currentUser.email || 'guest@example.com'; 
    const total = cart.reduce((sum, item) => sum + item.price, 0); 
    const div = document.getElementById('cartItems');

    // Instant Free Download Logic
    if (total === 0) {
        div.innerHTML = `<h3 style="color:var(--green-free); margin-bottom:16px;">Success! Here are your free files:</h3>` + 
            cart.map(i => `
            <div style="padding:16px; background:rgba(16,185,129,0.1); border:1px solid var(--green-free); border-radius:12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:600; color:var(--text-main);">${i.name}</span>
                <a href="${i.link||'#'}" target="_blank" class="btn-small hover-target" style="background:var(--green-free); color:#fff; border:none; text-decoration:none;">Download File</a>
            </div>`).join('');
            
        document.getElementById('cartTotalContainer').classList.add('hidden'); 
        cart = []; 
        localStorage.setItem('cadCart', JSON.stringify(cart)); 
        updateCounters();
    } else {
        // Paid Checkout Logic
        const btn = document.querySelector('#cartTotalContainer button'); 
        if(btn){ 
            btn.textContent = "Processing Order..."; 
            btn.style.pointerEvents = "none"; 
        }

        const items = cart.map(i => i.name).join(", ");
        const links = cart.map(i => `${i.name}:\n${i.link}`).join("\n\n");

        const payload = { 
            req_type: "Store Checkout", 
            details: `Store Purchase:\n${items}`, 
            phone: "N/A", 
            user_email: email, 
            price: total, 
            completed_link: links, 
            payment_status: "Unpaid", 
            status: "Pending" 
        };

        try {
            const res = await fetch(`${API_BASE}/requests`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(payload) 
            });
            
            if(res.ok) { 
                cart = []; 
                localStorage.setItem('cadCart', JSON.stringify(cart)); 
                updateCounters(); 
                document.getElementById('cartModal').classList.add('hidden'); 
                
                const waMessage = encodeURIComponent(`Hello! I want to pay for my CAD order.\nEmail: ${email}\nItems: ${items}\nTotal: ₹${total}`);
                window.open(`https://wa.me/919446308229?text=${waMessage}`, '_blank');
                
                alert("Order placed! Complete your payment on WhatsApp. You can track this in your Order History.");
            } else {
                alert("Error saving order. Please try again.");
            }
        } catch(e) { 
            alert("Network Error. Cannot connect to database."); 
        } finally { 
            if(btn){ 
                btn.textContent = "Checkout"; 
                btn.style.pointerEvents = "auto"; 
            } 
        }
    }
}

// Comments Logic
let currentCommentProductId = null;

window.openComments = function(id) {
    currentCommentProductId = id; 
    const product = allProducts.find(x => x.id === id); 
    const div = document.getElementById('commentsList'); 
    if(!div) return;
    
    if (product && product.comments && product.comments.length > 0) {
        div.innerHTML = product.comments.map(c => `
            <div style="padding:16px; background:var(--bg-input); border:1px solid var(--border); border-radius:12px; margin-bottom:12px;">
                <div style="font-weight:700; margin-bottom:6px; color:var(--blue-primary);">${c.user_name}</div>
                <div style="color:var(--text-main); font-size:1rem; line-height:1.5;">${c.text}</div>
            </div>
        `).join(''); 
    } else {
        div.innerHTML = '<p style="color:var(--text-muted);">No comments yet. Be the first to share your thoughts!</p>';
    }
    document.getElementById('commentsModal').classList.remove('hidden');
}

document.getElementById('submitCommentBtn')?.addEventListener('click', async () => {
    const inputEl = document.getElementById('newCommentText');
    const text = inputEl.value.trim(); 
    
    if (!text || !currentCommentProductId) return;

    const payload = { 
        product_id: currentCommentProductId, 
        user_name: currentUser.name || "Guest", 
        text: text 
    };

    try { 
        await fetch(`${API_BASE}/comments`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        }); 
        inputEl.value = ''; 
        document.getElementById('commentsModal').classList.add('hidden'); 
        alert("Comment posted successfully!");
        loadProducts(); 
    } catch (e) { 
        alert("Failed to post comment. Network error."); 
    }
});

// Initialization
updateCounters();
loadProducts();
