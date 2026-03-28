(() => {
'use strict';

if (window.__ceylonAdminInitialized) {
    console.warn('Admin script already initialized. Skipping duplicate load.');
    return;
}
window.__ceylonAdminInitialized = true;

const MENU_STORAGE_KEY = 'ceylonChaiMenuItems';
const STORE_STORAGE_KEY = 'ceylonChaiStoreInfo';
const MENU_TABLE = window.SUPABASE_MENU_TABLE || 'menu_items';
const STORE_TABLE = window.SUPABASE_STORE_TABLE || 'store_settings';
const STORAGE_BUCKET = window.SUPABASE_STORAGE_BUCKET || 'assets';
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

function getSupabaseClient() {
    if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
        return null;
    }

    return window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
}

const supabaseClient = getSupabaseClient();

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
        logoImage: storeInfo.logoImage || DEFAULT_LOGO_IMAGE
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
    if (!supabaseClient) {
        return fileToDataUrl(file);
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const filePath = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;
    const { error } = await supabaseClient.storage.from(STORAGE_BUCKET).upload(filePath, file, { upsert: true });

    if (error) {
        throw error;
    }

    const { data } = supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
    return data.publicUrl;
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

    if (!supabaseClient) {
        localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(menuItems));
        localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(storeInfo));
        showStatus('Saved locally in this browser.');
        return;
    }

    try {
        const menuPayload = menuItems.map(item => ({
            id: Number(item.id),
            category: item.category,
            name: item.name,
            description: item.description || '',
            price: item.price || '',
            image: item.image || '',
            badge: item.badge || ''
        }));

        if (menuPayload.length > 0) {
            const { error: upsertMenuError } = await supabaseClient
                .from(MENU_TABLE)
                .upsert(menuPayload, { onConflict: 'id' });
            if (upsertMenuError) {
                throw upsertMenuError;
            }

            const { data: existingMenu, error: existingMenuError } = await supabaseClient
                .from(MENU_TABLE)
                .select('id');
            if (existingMenuError) {
                throw existingMenuError;
            }

            const currentIds = menuPayload.map(item => item.id);
            const staleIds = (existingMenu || [])
                .map(item => item.id)
                .filter(id => !currentIds.includes(id));

            if (staleIds.length > 0) {
                const { error: deleteMenuError } = await supabaseClient
                    .from(MENU_TABLE)
                    .delete()
                    .in('id', staleIds);
                if (deleteMenuError) {
                    throw deleteMenuError;
                }
            }
        }

        const storePayload = {
            id: 1,
            opening_days: storeInfo.openingDays,
            opening_hours: storeInfo.openingHours,
            phone: storeInfo.phone,
            address: storeInfo.address,
            map_url: storeInfo.mapUrl,
            instagram_handle: storeInfo.instagramHandle,
            instagram_url: storeInfo.instagramUrl,
            announcement: storeInfo.announcement,
            logo_image: storeInfo.logoImage
        };

        const { error: upsertStoreError } = await supabaseClient
            .from(STORE_TABLE)
            .upsert(storePayload, { onConflict: 'id' });
        if (upsertStoreError) {
            throw upsertStoreError;
        }

        showStatus('Saved to cloud successfully. All devices will see updates.');
    } catch (error) {
        console.error(error);
        showStatus('Cloud save failed. Check Supabase setup and policies.', true);
    }
}

function resetToDefault() {
    if (!window.confirm('Reset all menu and store details to default values?')) {
        return;
    }

    localStorage.removeItem(MENU_STORAGE_KEY);
    localStorage.removeItem(STORE_STORAGE_KEY);

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

    if (target.id === 'clearStoreLogoBtn') {
        storeInfo.logoImage = DEFAULT_LOGO_IMAGE;
        document.getElementById('storeLogoPreview').src = storeInfo.logoImage;
    }
});

document.addEventListener('input', (event) => {
    const target = event.target;
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
            showStatus('Logo uploaded. Click Save All Changes.');
        } catch (error) {
            console.error(error);
            showStatus('Failed to upload logo image.', true);
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
        showStatus('Menu image uploaded. Click Save All Changes.');
    } catch (error) {
        console.error(error);
        showStatus('Failed to upload menu image.', true);
    }
});

async function loadFromSupabase() {
    const { data: menuData, error: menuError } = await supabaseClient
        .from(MENU_TABLE)
        .select('*')
        .order('id', { ascending: true });

    if (menuError) {
        throw menuError;
    }

    if (Array.isArray(menuData) && menuData.length > 0) {
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

    const { data: storeData, error: storeError } = await supabaseClient
        .from(STORE_TABLE)
        .select('*')
        .eq('id', 1)
        .single();

    if (storeError && storeError.code !== 'PGRST116') {
        throw storeError;
    }

    storeInfo = {
        ...DEFAULT_STORE_INFO,
        ...(storeData
            ? {
                openingDays: storeData.opening_days || DEFAULT_STORE_INFO.openingDays,
                openingHours: storeData.opening_hours || DEFAULT_STORE_INFO.openingHours,
                phone: storeData.phone || DEFAULT_STORE_INFO.phone,
                address: storeData.address || DEFAULT_STORE_INFO.address,
                mapUrl: storeData.map_url || DEFAULT_STORE_INFO.mapUrl,
                instagramHandle: storeData.instagram_handle || DEFAULT_STORE_INFO.instagramHandle,
                instagramUrl: storeData.instagram_url || DEFAULT_STORE_INFO.instagramUrl,
                announcement: storeData.announcement || DEFAULT_STORE_INFO.announcement,
                logoImage: storeData.logo_image || DEFAULT_STORE_INFO.logoImage
            }
            : {})
    };
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        if (supabaseClient) {
            await loadFromSupabase();
            showStatus('Connected to Supabase cloud data.');
        } else {
            menuItems = parseStoredData(MENU_STORAGE_KEY, JSON.parse(JSON.stringify(DEFAULT_MENU_ITEMS)));
            storeInfo = { ...DEFAULT_STORE_INFO, ...parseStoredData(STORE_STORAGE_KEY, {}) };
            showStatus('Supabase not configured. Local browser mode is active.');
        }
    } catch (error) {
        console.error(error);
        menuItems = parseStoredData(MENU_STORAGE_KEY, JSON.parse(JSON.stringify(DEFAULT_MENU_ITEMS)));
        storeInfo = { ...DEFAULT_STORE_INFO, ...parseStoredData(STORE_STORAGE_KEY, {}) };
        showStatus('Cloud load failed. Local browser mode is active.');
    }

    fillStoreForm();
    renderMenuItems();

    document.getElementById('addMenuItemBtn').addEventListener('click', addMenuItem);
    document.getElementById('saveAllBtn').addEventListener('click', saveAll);
    document.getElementById('resetBtn').addEventListener('click', resetToDefault);
});

})();
