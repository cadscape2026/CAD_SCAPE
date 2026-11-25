const API_BASE = "https://procad-backend.onrender.com/api";
const ADMIN_SECRET = "778899"; // SECURITY PIN TO PREVENT HACKING

// --- GLOBAL STATE ---
let cart = [];
let wishlist = [];
let allProducts = [];
let allProjects = [];
let requestImages = {};

try {
    cart = JSON.parse(localStorage.getItem('cadCart')) || [];
} catch (e) {
    console.error("Could not load cart data", e);
}

try {
    wishlist = JSON.parse(localStorage.getItem('cadWishlist')) || [];
} catch (e) {
    console.error("Could not load wishlist data", e);
}

// ==========================================================================
// 1. LENIS SMOOTH SCROLL PHYSICS ENGINE & PROGRESS BAR
// ==========================================================================
const lenis = typeof Lenis !== 'undefined'
    ? new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smooth: true,
        mouseMultiplier: 1,
    })
    : null;

function raf(time) {
    if (lenis) lenis.raf(time);
    requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

const progressBar = document.getElementById('scrollProgress');
if (lenis) {
    lenis.on('scroll', () => {
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
        if (progressBar) {
            progressBar.style.width = `${scrollPercent}%`;
        }
    });
}

// ==========================================================================
// 2. MAGNETIC CUSTOM CURSOR LOGIC
// ==========================================================================
const cursor = document.getElementById('customCursor');
const follower = document.getElementById('customCursorFollower');
let mouseX = 0;
let mouseY = 0;
let followerX = 0;
let followerY = 0;

if (window.matchMedia("(pointer: fine)").matches && cursor && follower) {
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
    });

    function animateFollower() {
        followerX += (mouseX - followerX) * 0.15;
        followerY += (mouseY - followerY) * 0.15;
        follower.style.transform = `translate3d(${followerX}px, ${followerY}px, 0)`;
        requestAnimationFrame(animateFollower);
    }
    animateFollower();

    document.addEventListener('mouseover', (e) => {
        if (e.target.closest('button, a, .hover-target, .card, input, textarea')) {
            follower.classList.add('hovering');
        } else {
            follower.classList.remove('hovering');
        }
    });
}

// ==========================================================================
// 3. SCROLL REVEAL ANIMATIONS
// ==========================================================================
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

function initReveals() {
    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
}

// ==========================================================================
// 4. NAVIGATION & VIEW ROUTING (HOME, ABOUT ME, PROJECTS, STORE, CUSTOM, ADMIN)
// ==========================================================================
const views = {
    home: document.getElementById('viewHome'),
    profile: document.getElementById('viewProfile'),   // About Me & Portfolio
    projects: document.getElementById('viewProjects'), // Projects Route
    market: document.getElementById('viewMarketplace'),
    requests: document.getElementById('viewRequests'),
    admin: document.getElementById('viewAdmin')
};

const navs = {
    home: document.getElementById('navHome'),
    profile: document.getElementById('navAbout'),
    projects: document.getElementById('navProjects'),
    market: document.getElementById('navMarket'),
    requests: document.getElementById('navRequests'),
    admin: document.getElementById('navAdmin')
};

function switchView(target) {
    const resolvedTarget = views[target] ? target : 'home';

    Object.values(views).forEach(v => {
        if (v) v.classList.add('hidden');
    });

    Object.values(navs).forEach(n => {
        if (n) n.classList.remove('active');
    });

    if (views[resolvedTarget]) views[resolvedTarget].classList.remove('hidden');
    if (navs[resolvedTarget]) navs[resolvedTarget].classList.add('active');

    if (resolvedTarget === 'admin' && typeof fetchAdminRequests === 'function') {
        fetchAdminRequests();
    }
    if (resolvedTarget === 'projects' && allProjects.length === 0) {
        loadPortfolioProjects();
    }

    const hashName = resolvedTarget === 'profile' ? 'about' : resolvedTarget;
    if (history.replaceState) {
        history.replaceState(null, '', `#${hashName}`);
    }

    if (lenis) {
        lenis.scrollTo(0, { immediate: true });
    } else {
        window.scrollTo(0, 0);
    }

    setTimeout(initReveals, 100);
}

window.switchView = switchView;

document.getElementById('logoHomeBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    switchView('home');
});

navs.home?.addEventListener('click', (e) => {
    e.preventDefault();
    switchView('home');
});

navs.profile?.addEventListener('click', (e) => {
    e.preventDefault();
    switchView('profile');
});

navs.projects?.addEventListener('click', (e) => {
    e.preventDefault();
    switchView('projects');
});

navs.market?.addEventListener('click', (e) => {
    e.preventDefault();
    switchView('market');
});

navs.requests?.addEventListener('click', (e) => {
    e.preventDefault();
    switchView('requests');
});

navs.admin?.addEventListener('click', (e) => {
    e.preventDefault();
    switchView('admin');
});

document.getElementById('heroBrowseBtn')?.addEventListener('click', () => {
    switchView('market');
});

// ==========================================================================
// 5. COMMAND PALETTE (CMD+K SEARCH)
// ==========================================================================
window.toggleCmdPalette = function () {
    const modal = document.getElementById('cmdPaletteOverlay');
    const input = document.getElementById('cmdSearchInput');
    if (!modal || !input) return;

    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        input.focus();
        follower?.classList.remove('hovering');
    } else {
        modal.classList.add('hidden');
        input.value = '';
        const resultsEl = document.getElementById('cmdResults');
        if (resultsEl) resultsEl.innerHTML = '';
    }
};

window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleCmdPalette();
    }
    const overlay = document.getElementById('cmdPaletteOverlay');
    if (e.key === 'Escape' && overlay && !overlay.classList.contains('hidden')) {
        toggleCmdPalette();
    }
});

document.getElementById('cmdSearchInput')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    const resultsDiv = document.getElementById('cmdResults');
    if (!resultsDiv) return;

    if (!term) {
        resultsDiv.innerHTML = '';
        return;
    }

    const filtered = allProducts.filter(p =>
        p.name.toLowerCase().includes(term) ||
        (p.description && p.description.toLowerCase().includes(term))
    );

    if (filtered.length === 0) {
        resultsDiv.innerHTML = '<p style="color:var(--text-muted); padding: 10px;">No matching results found.</p>';
        return;
    }

    resultsDiv.innerHTML = filtered.map(p => `
        <a href="#" class="cmd-item" onclick="if(typeof openLightbox==='function') openLightbox('${p.id}'); toggleCmdPalette(); return false;">
            <div style="display:flex; align-items:center;">
                <img src="${getDirectImageUrl(p.image_url)}" alt="Thumbnail">
                <div>
                    <strong>${p.name}</strong><br>
                    <span style="font-size:0.8rem; color:var(--text-muted)">₹${Number(p.price || 0).toFixed(2)}</span>
                </div>
            </div>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
        </a>
    `).join('');
});

// ==========================================================================
// 6. SIDEBAR & THEME TOGGLE
// ==========================================================================
function toggleSidebar() {
    document.getElementById('sidebar')?.classList.toggle('open');
    document.getElementById('sidebarOverlay')?.classList.toggle('hidden');
}
window.toggleSidebar = toggleSidebar;

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
        if (themeToggleBtn) themeToggleBtn.innerHTML = `${sunIcon} <span>Switch to Light Mode</span>`;
        if (mainLogoImg) mainLogoImg.src = 'logo_4.png';
        localStorage.setItem('cadTheme', 'dark');
    } else {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
        if (themeToggleBtn) themeToggleBtn.innerHTML = `${moonIcon} <span>Switch to Dark Mode</span>`;
        if (mainLogoImg) mainLogoImg.src = 'logo_light.png';
        localStorage.setItem('cadTheme', 'light');
    }
}

document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
    updateThemeUI(!document.body.classList.contains('dark-mode'));
});

// ==========================================================================
// 7. GOOGLE AUTHENTICATION
// ==========================================================================
const adminEmails = ["deekshith123pi@gmail.com", "cadscape2026@gmail.com"];
let savedUser = null;

try {
    savedUser = JSON.parse(localStorage.getItem('cadUser'));
} catch (e) {
    console.error("Could not parse saved user data");
}

let currentUser = (savedUser && savedUser.email) ? savedUser : { name: "Guest", email: null };
let tokenClient;

function handleSuccessfulLogin(name, email, avatarUrl) {
    currentUser = { name, email, avatar: avatarUrl };
    localStorage.setItem('cadUser', JSON.stringify(currentUser));

    document.getElementById('customLoginBtn')?.classList.add('hidden');
    document.getElementById('sidebarGuestInfo')?.classList.add('hidden');
    document.getElementById('sidebarUserInfo')?.classList.remove('hidden');

    if (document.getElementById('userAvatar')) document.getElementById('userAvatar').src = avatarUrl || '';
    if (document.getElementById('userNameDisplay')) document.getElementById('userNameDisplay').textContent = name || '';
    if (document.getElementById('userEmailDisplay')) document.getElementById('userEmailDisplay').textContent = email || '';
    document.getElementById('logoutBtn')?.classList.remove('hidden');

    const isAdmin = adminEmails.includes(email);
    if (navs.admin) navs.admin.classList.toggle('hidden', !isAdmin);
    if (document.getElementById('sidebarNavAdmin')) {
        document.getElementById('sidebarNavAdmin').classList.toggle('hidden', !isAdmin);
    }

    if (allProducts.length > 0) renderGrid(allProducts);
    if (allProjects.length > 0) renderPortfolioProjects(allProjects);
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
        console.warn("Google Auth not configured properly.");
    }
};

document.getElementById('customLoginBtn')?.addEventListener('click', () => {
    if (tokenClient) {
        tokenClient.requestAccessToken();
    } else {
        handleSuccessfulLogin("Admin Demo", "cadscape2026@gmail.com", "https://via.placeholder.com/64");
    }
});

document.getElementById('logoutBtn')?.addEventListener('click', () => {
    currentUser = { name: "Guest", email: null };
    localStorage.removeItem('cadUser');
    window.location.reload();
});

function updateCounters() {
    if (document.getElementById('cartCount')) {
        document.getElementById('cartCount').textContent = cart.length;
    }
    if (document.getElementById('wishlistCount')) {
        document.getElementById('wishlistCount').textContent = wishlist.length;
    }
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

// ==========================================================================
// 8. 3D SCROLL-SCRUB PING-PONG ANIMATION
// ==========================================================================
const heroScrubModel = document.getElementById('heroScrubModel');

function updateScrollAnimation() {
    const track = document.getElementById('heroScrollTrack');
    const overlay = document.getElementById('heroTextOverlay');

    if (views.home && !views.home.classList.contains('hidden') && track && heroScrubModel) {
        const rect = track.getBoundingClientRect();
        let rawProgress = -rect.top / (rect.height - window.innerHeight);
        if (isNaN(rawProgress)) rawProgress = 0;

        const scrollProgress = Math.max(0, Math.min(1, rawProgress));
        const animProgress = scrollProgress <= 0.5 ? (scrollProgress * 2) : (2 - (scrollProgress * 2));

        if (heroScrubModel.availableAnimations && heroScrubModel.availableAnimations.length > 0) {
            heroScrubModel.pause();
            heroScrubModel.currentTime = animProgress * heroScrubModel.duration;
        }

        let shiftX = 0;
        if (window.innerWidth > 850) {
            shiftX = 25 - (animProgress * 25);
        }
        heroScrubModel.style.transform = `translateX(${shiftX}vw)`;

        if (overlay) {
            const fade = Math.min(1, scrollProgress * 3);
            overlay.style.opacity = 1 - fade;
            overlay.style.transform = `translateY(calc(-50% - ${fade * 50}px))`;
            overlay.style.pointerEvents = fade > 0.5 ? 'none' : 'auto';
        }
    }
}

if (lenis) lenis.on('scroll', updateScrollAnimation);
window.addEventListener('resize', updateScrollAnimation);

if (heroScrubModel) {
    heroScrubModel.addEventListener('load', () => {
        heroScrubModel.pause();
        heroScrubModel.currentTime = 0;
        updateScrollAnimation();
    });
}
updateScrollAnimation();

// ==========================================================================
// 9. 3D TILT PRODUCT GRID RENDERING
// ==========================================================================
function generateProductCardHTML(product, isAdmin, isWishlisted) {
    const numericPrice = Number(product.price || 0);
    const priceDisplay = numericPrice === 0
        ? `<span class="price text-green">Free</span>`
        : `<span class="price">₹${numericPrice.toFixed(2)}</span>`;

    const safeName = String(product.name || '').replace(/'/g, "\\'");
    const safeUrl = String(product.download_url || '').replace(/'/g, "\\'");
    const actionHtml = `<button onclick="if(typeof addToCart==='function') addToCart('${product.id}', '${safeName}', ${numericPrice}, '${safeUrl}')" class="btn-small hover-target">Add to Cart</button>`;

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
            <div class="card-img-wrapper hover-target" onclick="if(typeof openLightbox==='function') openLightbox('${product.id}')">
                <img src="${getDirectImageUrl(product.image_url)}" alt="${product.name}" loading="lazy">
                ${previewBadge}
            </div>
            <div class="card-info">
                <h3 class="card-title hover-target" onclick="if(typeof openLightbox==='function') openLightbox('${product.id}')" style="cursor:pointer;">${product.name}</h3>
                <p class="card-desc">${product.description || 'No description provided.'}</p>
                <div class="card-social">
                    <button class="social-btn hover-target" onclick="if(typeof toggleWishlist==='function') toggleWishlist('${product.id}', this)">★ ${isWishlisted}</button>
                    <button class="social-btn hover-target" onclick="if(typeof openComments==='function') openComments('${product.id}')">💬 Comments (${commentsLength})</button>
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

function init3DTilt() {
    if (!window.matchMedia("(pointer: fine)").matches) return;

    document.querySelectorAll('.card').forEach(card => {
        if (card.dataset.tiltBound) return;
        card.dataset.tiltBound = "true";

        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / centerY) * -8;
            const rotateY = ((x - centerX) / centerX) * 8;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
        });
    });
}

function renderGrid(productsToRender) {
    const grid = document.getElementById('productGrid');
    const homeGrid = document.getElementById('homeRecentGrid');

    if (grid) grid.innerHTML = '';
    if (homeGrid) homeGrid.innerHTML = '';

    if (productsToRender.length === 0) {
        if (grid) grid.innerHTML = '<p style="color:var(--text-muted)">No models found matching that filter.</p>';
        return;
    }

    const isAdmin = adminEmails.includes(currentUser.email);
    const gridHTML = [];
    const homeHTML = [];

    productsToRender.forEach((product, index) => {
        const isWishlisted = wishlist.includes(product.id) ? 'Remove' : 'Wishlist';
        const cardHTML = generateProductCardHTML(product, isAdmin, isWishlisted);
        gridHTML.push(cardHTML);
        if (index < 3) homeHTML.push(cardHTML);
    });

    if (grid) grid.innerHTML = gridHTML.join('');
    if (homeGrid) homeGrid.innerHTML = homeHTML.join('');

    initReveals();
    init3DTilt();
}

document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        e.target.classList.add('active');

        const filterText = e.target.textContent.trim();
        if (filterText === 'All Models') {
            renderGrid(allProducts);
        } else {
            const filtered = allProducts.filter(p =>
                p.name.toLowerCase().includes(filterText.toLowerCase()) ||
                (p.description && p.description.toLowerCase().includes(filterText.toLowerCase()))
            );
            renderGrid(filtered);
        }
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

        const track = document.getElementById('carouselTrack');
        if (track && allProducts.length > 0) {
            track.innerHTML = allProducts.slice(0, 3).map(p => `
                <div class="carousel-slide">
                    <img src="${getDirectImageUrl(p.image_url)}" alt="${p.name}">
                </div>
            `).join('');

            if (!track.dataset.carouselStarted) {
                track.dataset.carouselStarted = "true";
                setInterval(() => {
                    let currentSlide = parseInt(track.dataset.slide || 0, 10);
                    const slideCount = Math.min(3, allProducts.length);
                    if (slideCount > 0) {
                        currentSlide = (currentSlide + 1) % slideCount;
                        track.style.transform = `translateX(-${currentSlide * 100}%)`;
                        track.dataset.slide = currentSlide;
                    }
                }, 5000);
            }
        }

        renderGrid(allProducts);
    } catch (error) {
        console.error("Backend not connected yet.", error);
    }
}

// ==========================================================================
// 10. PORTFOLIO PROJECTS (BACKEND-DRIVEN) & ADMIN MANAGEMENT
// ==========================================================================
async function loadPortfolioProjects() {
    try {
        const res = await fetch(`${API_BASE}/projects`);
        if (!res.ok) return;
        allProjects = await res.json();
        renderPortfolioProjects(allProjects);
    } catch (err) {
        console.error("Failed to load portfolio projects:", err);
    }
}

function renderPortfolioProjects(projects) {
    const fullContainer = document.getElementById('dynamicProjectsList');
    const homePreview = document.getElementById('homePortfolioGrid');
    const isAdmin = adminEmails.includes(currentUser.email);

    if (homePreview) {
        homePreview.innerHTML = projects.slice(0, 3).map(proj => `
            <div class="card reveal home-portfolio-card">
                <div>
                    <span class="project-number">${proj.badge || 'PROJECT'}</span>
                    <h3 class="card-title">${proj.title}</h3>
                    <p class="card-desc">${proj.description}</p>
                    <div class="tool-pills">
                        ${(proj.tools || []).map(t => `<span class="tool-pill">${t}</span>`).join('')}
                    </div>
                </div>
                <div>
                    <button class="btn-small hover-target" onclick="switchView('projects')">View Project</button>
                </div>
            </div>
        `).join('');
    }

    if (fullContainer) {
        fullContainer.innerHTML = projects.map(proj => `
            <article class="portfolio-project-card glass-panel reveal">
                <div class="project-header-bar">
                    <div>
                        <span class="project-number">${proj.badge || ''}</span>
                        <h3 class="project-title">${proj.title}</h3>
                        ${proj.role ? `<div class="project-role-banner"><span class="role-highlight">${proj.role}</span></div>` : ''}
                    </div>
                    <div class="project-domain-tags">
                        ${(proj.domain || []).map(d => `<span class="domain-tag">${d}</span>`).join('')}
                    </div>
                </div>

                <div class="project-body-grid">
                    <div class="project-narrative">
                        <p>${proj.description}</p>
                        ${(proj.contributions || []).length ? `
                            <div class="project-contributions">
                                <h4>My Contributions:</h4>
                                <ul>${proj.contributions.map(c => `<li>${c}</li>`).join('')}</ul>
                            </div>` : ''}
                        <div class="project-meta-footer">
                            <div class="meta-item">
                                <span class="meta-label">Tools Used</span>
                                <div class="tool-pills">
                                    ${(proj.tools || []).map(t => `<span class="tool-pill">${t}</span>`).join('')}
                                </div>
                            </div>
                        </div>
                        ${isAdmin ? `
                            <div style="margin-top:16px;">
                                <button onclick="deletePortfolioProject('${proj.id}')" class="btn-small hover-target" style="border-color:#ef4444; color:#ef4444;">Delete Project</button>
                            </div>` : ''}
                    </div>

                    <div class="project-gallery">
                        ${(proj.images || []).map((img, i) => `
                            <div class="${i === 0 ? 'gallery-main-frame' : 'gallery-sub-frame'}">
                                <img src="${getDirectImageUrl(img)}" alt="${proj.title}" class="gallery-img hover-target" loading="lazy">
                            </div>
                        `).join('')}
                    </div>
                </div>
            </article>
        `).join('');
    }

    initReveals();
    init3DTilt();
}

function setAdminTab(activeTab) {
    const uploadSec = document.getElementById('adminUploadSection');
    const reqSec = document.getElementById('adminRequestsSection');
    const projSec = document.getElementById('adminProjectSection');

    uploadSec?.classList.toggle('hidden', activeTab !== 'upload');
    reqSec?.classList.toggle('hidden', activeTab !== 'requests');
    projSec?.classList.toggle('hidden', activeTab !== 'project');

    const btnUpload = document.getElementById('btnShowUpload');
    const btnReq = document.getElementById('btnShowRequests');
    const btnProj = document.getElementById('btnShowAddProject');

    if (btnUpload) btnUpload.className = activeTab === 'upload' ? 'btn-primary hover-target' : 'btn-secondary hover-target';
    if (btnReq) btnReq.className = activeTab === 'requests' ? 'btn-primary hover-target' : 'btn-secondary hover-target';
    if (btnProj) btnProj.className = activeTab === 'project' ? 'btn-primary hover-target' : 'btn-secondary hover-target';

    if (activeTab === 'requests' && typeof fetchAdminRequests === 'function') {
        fetchAdminRequests();
    }
}

document.getElementById('btnShowUpload')?.addEventListener('click', () => setAdminTab('upload'));
document.getElementById('btnShowRequests')?.addEventListener('click', () => setAdminTab('requests'));
document.getElementById('btnShowAddProject')?.addEventListener('click', () => setAdminTab('project'));

window.submitNewProject = async function () {
    const btn = document.getElementById('addProjBtn');
    const title = document.getElementById('projTitle')?.value.trim() || '';
    const desc = document.getElementById('projDesc')?.value.trim() || '';

    if (!title || !desc) {
        alert("Please provide at least a Project Title and Description.");
        return;
    }

    if (btn) {
        btn.textContent = "Saving Project...";
        btn.style.pointerEvents = "none";
    }

    const payload = {
        badge: document.getElementById('projBadge')?.value.trim() || "PORTFOLIO PROJECT",
        title,
        role: document.getElementById('projRole')?.value.trim() || "",
        domain: (document.getElementById('projDomain')?.value || '').split(',').map(s => s.trim()).filter(Boolean),
        tools: (document.getElementById('projTools')?.value || '').split(',').map(s => s.trim()).filter(Boolean),
        description: desc,
        contributions: (document.getElementById('projContribs')?.value || '').split('\n').map(s => s.trim()).filter(Boolean),
        images: (document.getElementById('projImages')?.value || '').split(',').map(s => s.trim()).filter(Boolean)
    };

    try {
        const res = await fetch(`${API_BASE}/projects`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Key': ADMIN_SECRET
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert("Project added to backend portfolio!");
            document.getElementById('projectForm')?.reset();
            await loadPortfolioProjects();
        } else {
            alert("Unauthorized or failed to save project.");
        }
    } catch (e) {
        console.error(e);
        alert("Network error while saving project.");
    } finally {
        if (btn) {
            btn.textContent = "Save Project to Portfolio";
            btn.style.pointerEvents = "auto";
        }
    }
};

window.deletePortfolioProject = async function (id) {
    if (!confirm("Delete this portfolio project?")) return;
    try {
        const res = await fetch(`${API_BASE}/projects/${id}`, {
            method: 'DELETE',
            headers: { 'X-Admin-Key': ADMIN_SECRET }
        });
        if (res.ok) {
            await loadPortfolioProjects();
        } else {
            alert("Failed to delete project.");
        }
    } catch (e) {
        console.error(e);
        alert("Network error while deleting project.");
    }
};

// ==========================================================================
// 11. ADMIN PRODUCT UPLOAD, EDIT, DELETE & DROPZONES
// ==========================================================================
let currentUploadBase64 = "";
let currentEditBase64 = "";
let currentEditId = null;

window.submitNewProduct = async function () {
    const btn = document.getElementById('uploadBtn');
    const name = document.getElementById('modelName')?.value || '';
    const desc = document.getElementById('modelDesc')?.value || '';
    const priceInput = document.getElementById('modelPrice')?.value || '';
    const file = document.getElementById('modelFile')?.value || '';
    const url3d = document.getElementById('model3dUrl')?.value || '';

    if (!name || !desc || !currentUploadBase64 || !file || priceInput === '') {
        alert("Please fill in all required fields! (Enter 0 if the product is free)");
        return;
    }

    if (btn) {
        btn.textContent = "Uploading... Please wait";
        btn.style.pointerEvents = "none";
    }

    const payload = {
        name,
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
            document.getElementById('uploadForm')?.reset();
            resetDropZone("uploadDropZone");
            loadProducts();
        } else {
            alert("Unauthorized: Hack attempt blocked or wrong Admin PIN.");
        }
    } catch (e) {
        alert("Error communicating with backend. Check console.");
        console.error(e);
    } finally {
        if (btn) {
            btn.textContent = "Upload to Database";
            btn.style.pointerEvents = "auto";
        }
    }
};

function setupDropZone(dropId, inputId, isEdit) {
    const dropZone = document.getElementById(dropId);
    const inputElement = document.getElementById(inputId);

    if (!dropZone || !inputElement) return;

    dropZone.addEventListener("click", e => {
        if (e.target !== inputElement) inputElement.click();
    });

    inputElement.addEventListener("change", () => {
        if (inputElement.files.length) {
            const reader = new FileReader();
            reader.onload = () => {
                dropZone.innerHTML = `<div class="drop-zone__thumb" style="background-image:url('${reader.result}')"></div>`;
                if (isEdit) {
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
            if (eventName === 'drop' && e.dataTransfer.files.length) {
                inputElement.files = e.dataTransfer.files;
                inputElement.dispatchEvent(new Event('change'));
            }
        });
    });
}

function resetDropZone(id) {
    const drop = document.getElementById(id);
    if (drop) {
        drop.innerHTML = `<span class="drop-zone__prompt">Drag & Drop Image Here</span><input type="file" class="drop-zone__input" accept="image/*">`;
    }
    currentUploadBase64 = "";
    currentEditBase64 = "";
    setupDropZone("uploadDropZone", "modelImageFile", false);
    setupDropZone("editDropZone", "editModelImageFile", true);
}

setupDropZone("uploadDropZone", "modelImageFile", false);
setupDropZone("editDropZone", "editModelImageFile", true);

window.openEditModal = function (id) {
    const product = allProducts.find(x => x.id === id);
    if (!product) return;

    currentEditId = id;
    document.getElementById('editModelName').value = product.name;
    document.getElementById('editModelDesc').value = product.description;
    document.getElementById('editModelPrice').value = product.price;
    document.getElementById('editModelFile').value = product.download_url;
    document.getElementById('editModel3dUrl').value = product.model_3d_url || '';

    currentEditBase64 = product.image_url;
    document.getElementById('editDropZone').innerHTML = `<div class="drop-zone__thumb" style="background-image:url('${getDirectImageUrl(product.image_url)}')"></div>`;
    document.getElementById('editModal')?.classList.remove('hidden');
};

window.submitEditProduct = async function () {
    const btn = document.getElementById('editBtn');
    const name = document.getElementById('editModelName')?.value || '';
    const desc = document.getElementById('editModelDesc')?.value || '';
    const price = document.getElementById('editModelPrice')?.value || '';
    const file = document.getElementById('editModelFile')?.value || '';
    const url3d = document.getElementById('editModel3dUrl')?.value || '';

    if (!name || !desc || !currentEditBase64 || !file || price === '') {
        return alert("Fill all fields! (Enter 0 if the product is free)");
    }

    if (btn) {
        btn.textContent = "Saving...";
        btn.style.pointerEvents = "none";
    }

    const payload = {
        name,
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

        if (res.ok) {
            alert("Updated successfully!");
            document.getElementById('editModal')?.classList.add('hidden');
            resetDropZone('editDropZone');
            loadProducts();
        } else {
            alert("Unauthorized: Hack attempt blocked or wrong Admin PIN.");
        }
    } catch (e) {
        alert("Error communicating with backend.");
        console.error(e);
    } finally {
        if (btn) {
            btn.textContent = "Save Changes";
            btn.style.pointerEvents = "auto";
        }
    }
};

window.deleteProduct = async function (id) {
    if (!confirm("Permanently delete this product?")) return;

    try {
        const res = await fetch(`${API_BASE}/products/${id}`, {
            method: 'DELETE',
            headers: { 'X-Admin-Key': ADMIN_SECRET }
        });

        if (res.ok) {
            alert("Product Deleted!");
            loadProducts();
        } else {
            alert("Unauthorized: Hack attempt blocked or wrong Admin PIN.");
        }
    } catch (e) {
        alert("Error communicating with backend.");
        console.error(e);
    }
};

// ==========================================================================
// 12. CUSTOM DESIGN REQUESTS & STARTUP
// ==========================================================================
window.submitDesignRequest = async function () {
    const btn = document.getElementById('requestBtn');
    const phone = document.getElementById('reqPhone')?.value || '';
    const details = document.getElementById('reqDetails')?.value || '';
    const link = document.getElementById('reqLink')?.value || '';

    if (!phone || !details) return alert("Please provide your phone number and requirements.");

    if (btn) {
        btn.textContent = "Submitting...";
        btn.style.pointerEvents = "none";
    }

    const email = currentUser.email || 'guest@example.com';

    const payload = {
        req_type: "Custom Design",
        details,
        reference_link: link,
        phone,
        user_email: email
    };

    try {
        const res = await fetch(`${API_BASE}/requests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            document.getElementById('requestForm')?.reset();
            const waMessage = encodeURIComponent(`Hi, I just submitted a new CAD design request.\nEmail: ${email}\nDetails: ${details}`);
            if (confirm("Request Submitted Successfully!\n\nWould you like to open WhatsApp now to discuss your project details with us?")) {
                window.open(`https://wa.me/919446308229?text=${waMessage}`, '_blank');
            }
        } else {
            alert("Failed to submit request.");
        }
    } catch (e) {
        console.error(e);
        alert("Network Error.");
    } finally {
        if (btn) {
            btn.textContent = "Submit Request";
            btn.style.pointerEvents = "auto";
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    updateThemeUI(document.body.classList.contains('dark-mode'));
    updateCounters();
    loadProducts();
    loadPortfolioProjects();
    initReveals();

    const initialHash = window.location.hash.replace('#', '');
    if (initialHash === 'about') {
        switchView('profile');
    } else if (views[initialHash]) {
        switchView(initialHash);
    }
});
