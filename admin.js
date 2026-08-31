(() => {
'use strict';

if (window.__ceylonAdminInitialized) {
    console.warn('Admin script already initialized. Skipping duplicate load.');
    return;
}
window.__ceylonAdminInitialized = true;

const MENU_STORAGE_KEY = 'ceylonChaiMenuItems';
const STORE_STORAGE_KEY = 'ceylonChaiStoreInfo';
const AUTH_TOKEN_KEY = 'ceylonAdminToken';
const AUTH_USERNAME_KEY = 'ceylonAdminUsername';
const DEFAULT_LOGO_IMAGE = 'images/logo.svg';

const DEFAULT_MENU_ITEMS = [
    { id: 1, category: 'tea', name: 'Baathaam Tea', description: 'Rich aromatic tea with traditional spices and herbs', price: 'Rs. 250', image: 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=500', badge: 'Popular' },
    { id: 2, category: 'tea', name: 'Masala Chai', description: 'Authentic spiced tea with cardamom, ginger, and cloves', price: 'Rs. 280', image: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=500', badge: 'Hot' },
    { id: 3, category: 'tea', name: 'Milk Tea', description: 'Creamy milk tea with perfect sweetness', price: 'Rs. 200', image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500', badge: 'Bestseller' },
    { id: 4, category: 'food', name: 'Chicken Shawarma', description: 'Tender marinated chicken with fresh vegetables and special sauce', price: 'Rs. 450', image: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=500', badge: 'Signature' },
    { id: 5, category: 'food', name: 'Beef Burger', description: 'Juicy beef patty with cheese, lettuce, and our special sauce', price: 'Rs. 550', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500', badge: 'New' },
    { id: 6, category: 'food', name: 'Submarine', description: 'Loaded submarine with chicken, vegetables, and sauces', price: 'Rs. 400', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500', badge: 'Popular' },
    { id: 7, category: 'drinks', name: 'Mango Mojito', description: 'Refreshing mango mojito with fresh mint and lime', price: 'Rs. 350', image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500', badge: 'Refreshing' },
    { id: 8, category: 'drinks', name: 'Fresh Juice', description: 'Seasonal fresh fruit juice packed with vitamins', price: 'Rs. 300', image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=500', badge: 'Healthy' },
    { id: 9, category: 'food', name: 'Buns', description: 'Soft freshly baked buns with various fillings', price: 'Rs. 150', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500', badge: 'Fresh' }
];

const DEFAULT_STORE_INFO = {
    openingDays: 'Every Day',
    openingHours: '5:00 PM - 2:00 AM',
    phone: '+94 70 392 3931',
    address: 'Sri Lanka',
    mapUrl: 'https://maps.app.goo.gl/CTwFqKEPF2g95mrE9',
    instagramHandle: '@ceylon_chaii',
    instagramUrl: 'https://www.instagram.com/ceylon_chaii',
    announcement: 'Weekend offer: 10% off selected tea and food combos.',
    logoImage: DEFAULT_LOGO_IMAGE
};

let menuItems = [];
let storeInfo = {};

const apiURL = window.API_URL;

/* ============================== Auth ============================== */

function getToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

function setSession(token, username) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USERNAME_KEY, username);
}

function clearSession() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USERNAME_KEY);
}

// fetch wrapper for authenticated (write) requests. Attaches the bearer
// token and, on a 401, drops the stored session and bounces back to the
// login screen -- the token is expired/invalid either way, so there's
// nothing more a caller can do with the response.
async function authFetch(url, options = {}) {
    const token = getToken();
    const headers = { ...(options.headers || {}) };
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        clearSession();
        showAuthScreen('login', 'Your session expired. Please sign in again.');
    }

    return response;
}

// Authoritative validation lives on the server (backend/auth.js); this is
// only for live UI feedback and must stay in sync with it.
const PASSWORD_RULES = [
    { id: 'length', label: 'At least 12 characters', test: (pw) => pw.length >= 12 },
    { id: 'lower', label: 'One lowercase letter', test: (pw) => /[a-z]/.test(pw) },
    { id: 'upper', label: 'One uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
    { id: 'digit', label: 'One number', test: (pw) => /[0-9]/.test(pw) },
    { id: 'special', label: 'One special character', test: (pw) => /[^A-Za-z0-9]/.test(pw) }
];

function renderPasswordRules(listEl, password) {
    if (!listEl) return false;
    listEl.innerHTML = '';
    let allMet = true;

    PASSWORD_RULES.forEach((rule) => {
        const met = rule.test(password || '');
        if (!met) allMet = false;

        const li = document.createElement('li');
        li.textContent = rule.label;
        li.className = met ? 'met' : '';
        listEl.appendChild(li);
    });

    return allMet;
}

function showAuthScreen(mode, message) {
    document.getElementById('adminShell').hidden = true;
    document.getElementById('authScreen').hidden = false;

    const loginForm = document.getElementById('loginForm');
    const forgotForm = document.getElementById('forgotForm');
    const showForgotBtn = document.getElementById('showForgotBtn');
    const showLoginBtn = document.getElementById('showLoginBtn');

    if (mode === 'forgot') {
        loginForm.hidden = true;
        forgotForm.hidden = false;
        showForgotBtn.hidden = true;
        showLoginBtn.hidden = false;
    } else {
        loginForm.hidden = false;
        forgotForm.hidden = true;
        showForgotBtn.hidden = false;
        showLoginBtn.hidden = true;
    }

    document.getElementById('loginError').textContent = mode === 'login' && message ? message : '';
}

async function showAdminShellFor(username) {
    document.getElementById('authScreen').hidden = true;
    document.getElementById('adminShell').hidden = false;
    document.getElementById('sessionUsername').textContent = username;

    try {
        await loadFromApi();
        showStatus('Connected to server database.');
    } catch (error) {
        console.error(error);
        showStatus('Failed to load menu/store data from the server.', true);
        menuItems = [];
        storeInfo = { ...DEFAULT_STORE_INFO };
    }

    fillStoreForm();
    renderMenuItems();
}

async function handleLoginSubmit(event) {
    event.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    errorEl.textContent = '';

    try {
        const response = await fetch(`${apiURL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            errorEl.textContent = data.error || 'Sign in failed.';
            return;
        }

        setSession(data.token, data.username);
        document.getElementById('loginPassword').value = '';
        await showAdminShellFor(data.username);
    } catch (error) {
        console.error(error);
        errorEl.textContent = 'Could not reach the server. Please try again.';
    }
}

async function handleForgotSubmit(event) {
    event.preventDefault();
    const username = document.getElementById('forgotUsername').value.trim();
    const recoveryCode = document.getElementById('forgotRecoveryCode').value.trim();
    const newPassword = document.getElementById('forgotNewPassword').value;
    const confirmPassword = document.getElementById('forgotConfirmPassword').value;
    const errorEl = document.getElementById('forgotError');
    const successEl = document.getElementById('forgotSuccess');
    const codeBox = document.getElementById('forgotRecoveryCodeBox');

    errorEl.textContent = '';
    successEl.hidden = true;
    codeBox.hidden = true;

    if (newPassword !== confirmPassword) {
        errorEl.textContent = 'New password and confirmation do not match.';
        return;
    }

    try {
        const response = await fetch(`${apiURL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, recoveryCode, newPassword })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            errorEl.textContent = data.error || 'Password reset failed.';
            return;
        }

        successEl.textContent = 'Password reset. Save your new recovery code below, then sign in.';
        successEl.hidden = false;
        codeBox.textContent = data.recoveryCode;
        codeBox.hidden = false;
        document.getElementById('forgotForm').reset();
        renderPasswordRules(document.getElementById('forgotPasswordRules'), '');
    } catch (error) {
        console.error(error);
        errorEl.textContent = 'Could not reach the server. Please try again.';
    }
}

async function handleChangePasswordSubmit(event) {
    event.preventDefault();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    const statusEl = document.getElementById('changePasswordStatus');
    statusEl.style.color = '';
    statusEl.textContent = '';

    if (newPassword !== confirmNewPassword) {
        statusEl.textContent = 'New password and confirmation do not match.';
        return;
    }

    try {
        const response = await authFetch(`${apiURL}/auth/change-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            statusEl.textContent = data.error || 'Could not update password.';
            return;
        }

        statusEl.style.color = '#9de5a6';
        statusEl.textContent = 'Password updated.';
        document.getElementById('changePasswordForm').reset();
        renderPasswordRules(document.getElementById('changePasswordRules'), '');
    } catch (error) {
        console.error(error);
        statusEl.textContent = 'Could not reach the server. Please try again.';
    }
}

function handleLogout() {
    clearSession();
    showAuthScreen('login');
    document.getElementById('loginForm').reset();
}

/* ============================ Button ripple ============================ */

document.addEventListener('click', (event) => {
    const btn = event.target.closest('.btn');
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.6;
    const ripple = document.createElement('span');
    ripple.className = 'btn-ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${event.clientY - rect.top - size / 2}px`;

    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
});

/* ============================== Store data ============================== */

function parseStoredData(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) {
            return fallback;
        }

        const parsed = JSON.parse(raw);
        return parsed || fallback;
    } catch (error) {
        console.error('Storage parse error:', error);
        return fallback;
    }
}

function showStatus(message, isError = false) {
    const status = document.getElementById('statusMessage');
    status.textContent = message;
    status.style.color = isError ? '#ff8f8f' : '#9de5a6';

    setTimeout(() => {
        status.textContent = '';
    }, 3200);
}

function fillStoreForm() {
    document.getElementById('storePhone').value = storeInfo.phone || '';
    document.getElementById('storeAddress').value = storeInfo.address || '';
    document.getElementById('storeOpeningDays').value = storeInfo.openingDays || '';
    document.getElementById('storeOpeningHours').value = storeInfo.openingHours || '';
    document.getElementById('storeInstagramHandle').value = storeInfo.instagramHandle || '';
    document.getElementById('storeInstagramUrl').value = storeInfo.instagramUrl || '';
    document.getElementById('storeMapUrl').value = storeInfo.mapUrl || '';
    document.getElementById('storeAnnouncement').value = storeInfo.announcement || '';
    document.getElementById('storeLogoPreview').src = storeInfo.logoImage || DEFAULT_LOGO_IMAGE;

    if (storeInfo.gallery && Array.isArray(storeInfo.gallery)) {
        for (let i = 0; i < 3; i++) {
            const item = storeInfo.gallery[i] || {};
            const titleInput = document.getElementById(`galleryTitle${i+1}`);
            const previewImg = document.getElementById(`galleryPreview${i+1}`);
            if (titleInput) titleInput.value = item.title || '';
            if (previewImg) previewImg.src = item.url || '';
        }
    }
}

function collectStoreForm() {
    return {
        phone: document.getElementById('storePhone').value.trim(),
        address: document.getElementById('storeAddress').value.trim(),
        openingDays: document.getElementById('storeOpeningDays').value.trim(),
        openingHours: document.getElementById('storeOpeningHours').value.trim(),
        instagramHandle: document.getElementById('storeInstagramHandle').value.trim(),
        instagramUrl: document.getElementById('storeInstagramUrl').value.trim(),
        mapUrl: document.getElementById('storeMapUrl').value.trim(),
        announcement: document.getElementById('storeAnnouncement').value.trim(),
        logoImage: storeInfo.logoImage || DEFAULT_LOGO_IMAGE,
        gallery: [
            {
                title: document.getElementById('galleryTitle1') ? document.getElementById('galleryTitle1').value.trim() : '',
                url: document.getElementById('galleryPreview1') ? document.getElementById('galleryPreview1').src : ''
            },
            {
                title: document.getElementById('galleryTitle2') ? document.getElementById('galleryTitle2').value.trim() : '',
                url: document.getElementById('galleryPreview2') ? document.getElementById('galleryPreview2').src : ''
            },
            {
                title: document.getElementById('galleryTitle3') ? document.getElementById('galleryTitle3').value.trim() : '',
                url: document.getElementById('galleryPreview3') ? document.getElementById('galleryPreview3').src : ''
            }
        ]
    };
}

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Image read failed'));
        reader.readAsDataURL(file);
    });
}

async function uploadImageFile(file, folder) {
    const formData = new FormData();
    formData.append('image', file);

    const response = await authFetch(`${apiURL}/upload`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        throw new Error('Image upload failed');
    }

    const result = await response.json();
    return result.imageUrl;
}

function renderMenuItems() {
    const container = document.getElementById('menuItemsContainer');
    container.innerHTML = '';

    menuItems.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'menu-item';
        row.innerHTML = `
            <div class="menu-item-head">
                <h3 class="menu-item-title">${item.name || 'New Item'}</h3>
                <button class="btn btn-danger" type="button" data-action="delete" data-index="${index}">Delete</button>
            </div>
            <div class="menu-item-grid">
                <label>Name
                    <input type="text" data-field="name" data-index="${index}" value="${escapeHtml(item.name || '')}">
                </label>
                <label>Category
                    <select data-field="category" data-index="${index}">
                        <option value="tea" ${item.category === 'tea' ? 'selected' : ''}>Tea</option>
                        <option value="food" ${item.category === 'food' ? 'selected' : ''}>Food</option>
                        <option value="drinks" ${item.category === 'drinks' ? 'selected' : ''}>Drinks</option>
                    </select>
                </label>
                <label>Price
                    <input type="text" data-field="price" data-index="${index}" value="${escapeHtml(item.price || '')}">
                </label>
                <label>Badge
                    <input type="text" data-field="badge" data-index="${index}" value="${escapeHtml(item.badge || '')}">
                </label>
                <label class="full">Food Image
                    <div class="image-field-head">
                        <span>Food Image Upload</span>
                        <button class="btn btn-secondary btn-sm" type="button" data-action="clear-image" data-index="${index}">Clear Image</button>
                    </div>
                    <input type="file" accept="image/*" data-file-field="image" data-index="${index}">
                    <div class="image-preview-wrap">
                        <img class="image-preview" src="${escapeHtml(item.image || '')}" alt="${escapeHtml(item.name || 'menu image')} preview">
                    </div>
                </label>
                <label class="full">Description
                    <textarea rows="2" data-field="description" data-index="${index}">${escapeHtml(item.description || '')}</textarea>
                </label>
            </div>
        `;

        container.appendChild(row);
    });
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function addMenuItem() {
    const maxId = menuItems.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
    menuItems.push({
        id: maxId + 1,
        category: 'food',
        name: 'New Item',
        description: '',
        price: 'Rs. 0',
        image: '',
        badge: 'New'
    });

    renderMenuItems();
}

async function saveAll() {
    storeInfo = collectStoreForm();

    try {
        const storeResponse = await authFetch(`${apiURL}/store-settings`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(storeInfo)
        });

        if (!storeResponse.ok) {
            throw new Error('Failed to save store settings to server.');
        }

        const menuResponse = await authFetch(`${apiURL}/products/bulk`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(menuItems)
        });

        if (!menuResponse.ok) {
            throw new Error('Failed to save menu items to server.');
        }

        // Local cache only -- a resilience fallback for display, not a security boundary.
        localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(menuItems));
        localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(storeInfo));

        showStatus('Saved to server successfully.');
    } catch (error) {
        console.error(error);
        showStatus('Server save failed. Changes were not published.', true);
    }
}

function resetToDefault() {
    if (!window.confirm('Reset all menu and store details to default values?')) {
        return;
    }

    menuItems = JSON.parse(JSON.stringify(DEFAULT_MENU_ITEMS));
    storeInfo = { ...DEFAULT_STORE_INFO };

    fillStoreForm();
    renderMenuItems();
    showStatus('Defaults restored. Click Save to publish them.');
}

document.addEventListener('click', (event) => {
    const target = event.target;
    const action = target.dataset.action;
    const index = Number(target.dataset.index);

    if (action === 'delete' && Number.isInteger(index)) {
        menuItems.splice(index, 1);
        renderMenuItems();
        return;
    }

    if (action === 'clear-image' && Number.isInteger(index) && menuItems[index]) {
        menuItems[index].image = '';
        renderMenuItems();
        return;
    }

    if (action === 'clear-gallery' && Number.isInteger(index)) {
        if (!storeInfo.gallery) storeInfo.gallery = [];
        if (!storeInfo.gallery[index - 1]) storeInfo.gallery[index - 1] = {};
        storeInfo.gallery[index - 1].url = '';
        storeInfo.gallery[index - 1].title = '';

        const previewImg = document.getElementById(`galleryPreview${index}`);
        if (previewImg) previewImg.src = '';

        const titleInput = document.getElementById(`galleryTitle${index}`);
        if (titleInput) titleInput.value = '';

        const fileInput = document.getElementById(`galleryFile${index}`);
        if (fileInput) fileInput.value = '';
        return;
    }

    if (target.id === 'clearStoreLogoBtn') {
        storeInfo.logoImage = DEFAULT_LOGO_IMAGE;
        document.getElementById('storeLogoPreview').src = storeInfo.logoImage;
    }
});

document.addEventListener('input', (event) => {
    const target = event.target;

    if (target.id === 'forgotNewPassword') {
        renderPasswordRules(document.getElementById('forgotPasswordRules'), target.value);
        return;
    }

    if (target.id === 'newPassword') {
        renderPasswordRules(document.getElementById('changePasswordRules'), target.value);
        return;
    }

    const field = target.dataset.field;
    const index = Number(target.dataset.index);

    if (!field || !Number.isInteger(index) || !menuItems[index]) {
        return;
    }

    menuItems[index][field] = target.value;

    if (field === 'name') {
        const title = target.closest('.menu-item').querySelector('.menu-item-title');
        title.textContent = target.value || 'New Item';
    }
});

document.addEventListener('change', async (event) => {
    const target = event.target;

    if (target.id === 'storeLogoFile') {
        const file = target.files && target.files[0];
        if (!file) {
            return;
        }

        try {
            storeInfo.logoImage = await uploadImageFile(file, 'logos');
            document.getElementById('storeLogoPreview').src = storeInfo.logoImage;
            await saveAll();
        } catch (error) {
            console.error(error);
            showStatus('Failed to upload logo image.', true);
        }

        target.value = '';
        return;
    }

    if (target.id && target.id.startsWith('galleryFile')) {
        const indexStr = target.id.replace('galleryFile', '');
        const index = parseInt(indexStr, 10);

        const file = target.files && target.files[0];
        if (!file) return;

        try {
            const uploadedUrl = await uploadImageFile(file, 'gallery');
            const preview = document.getElementById(`galleryPreview${index}`);
            if (preview) {
                preview.src = uploadedUrl;
            }
            if (!storeInfo.gallery) storeInfo.gallery = [];
            if (!storeInfo.gallery[index - 1]) storeInfo.gallery[index - 1] = {};
            storeInfo.gallery[index - 1].url = uploadedUrl;

            await saveAll();
        } catch (error) {
            console.error(error);
            showStatus(`Failed to upload gallery image ${index}.`, true);
        }

        target.value = '';
        return;
    }

    const fileField = target.dataset.fileField;
    const index = Number(target.dataset.index);
    if (fileField !== 'image' || !Number.isInteger(index) || !menuItems[index]) {
        return;
    }

    const file = target.files && target.files[0];
    if (!file) {
        return;
    }

    try {
        menuItems[index].image = await uploadImageFile(file, 'menu');
        renderMenuItems();
        await saveAll();
    } catch (error) {
        console.error(error);
        showStatus('Failed to upload menu image.', true);
    }
});

async function loadFromApi() {
    const menuResponse = await fetch(`${apiURL}/products`);
    if (!menuResponse.ok) {
        throw new Error('Failed to fetch products');
    }
    const menuData = await menuResponse.json();

    if (Array.isArray(menuData)) {
        menuItems = menuData.map(item => ({
            id: item.id,
            category: item.category,
            name: item.name,
            description: item.description || '',
            price: item.price || '',
            image: item.image || '',
            badge: item.badge || ''
        }));
    } else {
        menuItems = JSON.parse(JSON.stringify(DEFAULT_MENU_ITEMS));
    }

    const storeResponse = await fetch(`${apiURL}/store-settings`);
    if (!storeResponse.ok) {
        throw new Error('Failed to fetch store settings');
    }
    const storeData = await storeResponse.json();

    storeInfo = {
        ...DEFAULT_STORE_INFO,
        ...(storeData
            ? {
                openingDays: storeData.openingDays || storeData.opening_days || DEFAULT_STORE_INFO.openingDays,
                openingHours: storeData.openingHours || storeData.opening_hours || DEFAULT_STORE_INFO.openingHours,
                phone: storeData.phone || DEFAULT_STORE_INFO.phone,
                address: storeData.address || DEFAULT_STORE_INFO.address,
                mapUrl: storeData.mapUrl || storeData.map_url || DEFAULT_STORE_INFO.mapUrl,
                instagramHandle: storeData.instagramHandle || storeData.instagram_handle || DEFAULT_STORE_INFO.instagramHandle,
                instagramUrl: storeData.instagramUrl || storeData.instagram_url || DEFAULT_STORE_INFO.instagramUrl,
                announcement: storeData.announcement || DEFAULT_STORE_INFO.announcement,
                logoImage: storeData.logoImage || storeData.logo_image || DEFAULT_STORE_INFO.logoImage,
                gallery: storeData.gallery || DEFAULT_STORE_INFO.gallery
            }
            : {})
    };
}

/* ============================== Bootstrap ============================== */

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('addMenuItemBtn').addEventListener('click', addMenuItem);
    document.getElementById('saveAllBtn').addEventListener('click', saveAll);
    document.getElementById('resetBtn').addEventListener('click', resetToDefault);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('loginForm').addEventListener('submit', handleLoginSubmit);
    document.getElementById('forgotForm').addEventListener('submit', handleForgotSubmit);
    document.getElementById('changePasswordForm').addEventListener('submit', handleChangePasswordSubmit);

    document.getElementById('showForgotBtn').addEventListener('click', () => showAuthScreen('forgot'));
    document.getElementById('showLoginBtn').addEventListener('click', () => showAuthScreen('login'));

    if (!apiURL) {
        document.getElementById('authScreen').hidden = false;
        document.getElementById('adminShell').hidden = true;
        document.getElementById('loginForm').hidden = true;
        document.getElementById('forgotForm').hidden = true;
        document.getElementById('showForgotBtn').hidden = true;
        document.querySelector('.auth-footer').insertAdjacentHTML(
            'afterbegin',
            '<p style="color:#e9776c;">No backend is configured (api-config.js). The admin panel requires a connected server and cannot run in an unauthenticated local-only mode.</p>'
        );
        return;
    }

    try {
        const statusResponse = await fetch(`${apiURL}/auth/status`);
        const statusData = await statusResponse.json().catch(() => ({}));

        if (!statusData.configured) {
            showAuthScreen('login');
            document.getElementById('loginForm').hidden = true;
            document.getElementById('showForgotBtn').hidden = true;
            document.querySelector('.auth-footer').insertAdjacentHTML(
                'afterbegin',
                '<p style="color:#e9776c;">No admin account exists yet. Set ADMIN_USERNAME and ADMIN_PASSWORD in the backend environment and restart the server.</p>'
            );
            return;
        }
    } catch (error) {
        console.error(error);
        showAuthScreen('login', 'Could not reach the server.');
        return;
    }

    const token = getToken();
    if (!token) {
        showAuthScreen('login');
        return;
    }

    try {
        const meResponse = await authFetch(`${apiURL}/auth/me`);
        if (!meResponse.ok) {
            throw new Error('Session invalid');
        }
        const meData = await meResponse.json();
        await showAdminShellFor(meData.username);
    } catch (error) {
        clearSession();
        showAuthScreen('login');
    }
});

})();
