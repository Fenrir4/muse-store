/* =========================================
   MUSE CLOTHES - CORE LOGIC
   Version: 10.0 (Final Polished & Secure)
   ========================================= */

// 1. ІНІЦІАЛІЗАЦІЯ FIREBASE
if (typeof firebase !== 'undefined' && typeof CONFIG !== 'undefined') {
    firebase.initializeApp(CONFIG.firebase);
}
const db = firebase.database();

// 2. ГЛОБАЛЬНІ ЗМІННІ
let cart = JSON.parse(localStorage.getItem('MUSE_CART')) || [];
let allProductsGlobal = []; 
let currentCategory = 'all';
let currentSort = 'default';

// 3. ГЛОБАЛЬНІ ФУНКЦІЇ (HTML ONCLICK)
window.setCategory = function(cat, btn) {
    currentCategory = cat;
    if (btn) {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }
    applyFiltersAndRender();
}

window.setSort = function(sortType) {
    currentSort = sortType;
    applyFiltersAndRender();
}

window.selectSize = function(btn) {
    const container = btn.parentElement;
    if (!container) return;
    container.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

window.changeMainImage = function(src, thumb) {
    const mainImg = document.getElementById('p-img');
    if (mainImg) mainImg.src = src;
    document.querySelectorAll('.thumb-img').forEach(t => t.classList.remove('active'));
    thumb.classList.add('active');
}

// 4. ГОЛОВНИЙ ЗАПУСК
document.addEventListener('DOMContentLoaded', () => {
    
    // Елементи сторінок
    const catalogGrid = document.getElementById('catalog-grid');
    const trendsGrid = document.getElementById('trends-grid'); 
    const productPageInfo = document.querySelector('.product-page');
    
    // Елементи інтерфейсу
    const cartOverlay = document.querySelector('.cart-overlay');
    const cartItemsContainer = document.querySelector('.cart-items');
    const cartTotalElement = document.querySelector('.total-price');
    const cartCountElement = document.querySelector('.cart-count');
    const cartBtn = document.querySelector('.cart-btn');
    const closeCartBtn = document.querySelector('.close-cart');

    // Старт
    updateCartIcon();
    renderCart();

    // ==============================================
    // А. СИСТЕМА ПОВІДОМЛЕНЬ (TOASTS)
    // ==============================================
    function showNotification(message, type = 'info') {
        let container = document.getElementById('notification-area');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-area';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `muse-toast ${type}`;
        
        let icon = 'info';
        if (type === 'success') icon = 'check-circle';
        else if (type === 'error') icon = 'warning-circle';

        toast.innerHTML = `<span>${message}</span><i class="ph ph-${icon}" style="font-size:20px; margin-left:10px;"></i>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    }

    // ==============================================
    // Б. ГЛОБАЛЬНА ОБРОБКА КЛІКІВ (DELEGATION)
    // ==============================================
    document.body.addEventListener('click', function(e) {
        const target = e.target;

        // 1. КНОПКА "ОФОРМИТИ ЗАМОВЛЕННЯ"
        if (target.classList.contains('checkout-btn')) {
            if (cart.length === 0) { 
                showNotification("Ваш кошик порожній", "error"); 
                return; 
            }
            closeCartFunc(); 
            window.location.href = 'checkout.html';
        }

        // 2. КНОПКА "ДОДАТИ В КОШИК"
        if (target.closest('.add-btn') || target.closest('.add-to-cart-big')) {
            const btn = target.closest('.add-btn') || target.closest('.add-to-cart-big');
            if (btn.disabled) return; 

            const card = btn.closest('.product-card') || btn.closest('.product-page');
            if (!card) return;

            // Розмір
            const activeSizeBtn = card.querySelector('.size-btn.active') || card.querySelector('.size-option-btn.active');
            let selectedSize = activeSizeBtn ? activeSizeBtn.textContent : 'One Size';
            
            // Якщо не обрано - беремо перший
            if (!activeSizeBtn) {
                const firstSize = card.querySelector('.size-btn') || card.querySelector('.size-option-btn');
                if(firstSize) selectedSize = firstSize.textContent;
            }

            // Ціна (очищаємо від валюти)
            const priceText = card.querySelector('.price, #p-price').textContent;
            const price = parseInt(priceText.replace(/\D/g, ''));

            const newItem = {
                id: Date.now(),
                title: card.querySelector('.product-title, #p-title').textContent.trim(),
                image: card.querySelector('.product-img, #p-img').src,
                price: price,
                size: selectedSize
            };

            cart.push(newItem);
            saveCart(); renderCart(); updateCartIcon(); openCart();
            showNotification("Товар додано в кошик", "success");
        }

        // 3. КНОПКА "ВИДАЛИТИ З КОШИКА"
        if (target.classList.contains('remove-item')) {
            const idToRemove = parseInt(target.dataset.id);
            cart = cart.filter(i => i.id !== idToRemove);
            saveCart(); renderCart(); updateCartIcon();
            // Оновлюємо сторінку checkout, якщо ми там
            if(document.getElementById('checkout-items-list')) window.location.reload();
        }

        // 4. ЗАКРИТИ КОШИК (фон)
        if (target.classList.contains('cart-overlay')) { closeCartFunc(); }
    });

    if (cartBtn) cartBtn.addEventListener('click', openCart);
    if (closeCartBtn) closeCartBtn.addEventListener('click', closeCartFunc);

    function openCart() { if (cartOverlay) cartOverlay.classList.add('active'); document.body.style.overflow = 'hidden'; }
    function closeCartFunc() { if (cartOverlay) cartOverlay.classList.remove('active'); document.body.style.overflow = ''; }


    // ==============================================
    // В. ЗАВАНТАЖЕННЯ ДАНИХ (Realtime)
    // ==============================================
    if (catalogGrid || trendsGrid) {
        db.ref('products').on('value', (snapshot) => {
            const data = snapshot.val();
            const list = data ? Object.values(data) : [];
            allProductsGlobal = list;

            if (catalogGrid) applyFiltersAndRender();

            if (trendsGrid) {
                const hits = list.filter(p => p.tags && p.tags.includes('hit'));
                const productsToShow = hits.length > 0 ? hits : list.slice(0, 4);
                renderTrends(productsToShow.slice(0, 4), trendsGrid);
            }
        });
    }

    // ==============================================
    // Г. ЛОГІКА КАТАЛОГУ
    // ==============================================
    window.applyFiltersAndRender = function() {
        if (!allProductsGlobal || allProductsGlobal.length === 0) return;
        let list = [...allProductsGlobal];

        if (currentCategory !== 'all') list = list.filter(p => p.category === currentCategory);

        list.sort((a, b) => {
            const stockA = a.inStock !== false ? 1 : 0;
            const stockB = b.inStock !== false ? 1 : 0;
            if (stockA !== stockB) return stockB - stockA;

            const priceA = parseInt(a.price) || 0;
            const priceB = parseInt(b.price) || 0;
            const dateA = a.timestamp || 0;
            const dateB = b.timestamp || 0;
            const orderA = a.orderIndex !== undefined ? a.orderIndex : 9999;
            const orderB = b.orderIndex !== undefined ? b.orderIndex : 9999;

            switch (currentSort) {
                case 'price_asc': return priceA - priceB;
                case 'price_desc': return priceB - priceA;
                case 'newest': return dateB - dateA;
                default: return orderA - orderB;
            }
        });
        renderCatalog(list);
    }

    function renderCatalog(list) {
        if(!catalogGrid) return;
        catalogGrid.innerHTML = '';
        if (list.length === 0) { catalogGrid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; padding: 40px; color:#888;">Товарів немає.</p>'; return; }

        list.forEach(p => {
            const mainImg = (p.images && p.images.length > 0) ? p.images[0] : p.image;
            let sizesHTML = (p.sizes && p.sizes.length > 0) ? p.sizes.map(s => `<button class="size-btn" onclick="selectSize(this)">${s}</button>`).join('') : '<span style="font-size:11px; color:#999;">One Size</span>';
            
            let tagsHTML = '';
            if (p.tags && p.tags.length > 0) {
                tagsHTML = `<div class="tags-container">` + p.tags.map(t => `<span class="tag tag-${t}">${t}</span>`).join('') + `</div>`;
            }

            let priceHTML = `<span class="price">${p.price} ₴</span>`;
            if (p.oldPrice && p.oldPrice > p.price) {
                priceHTML = `<span class="old-price">${p.oldPrice} ₴</span> <span class="price" style="color:#c0392b">${p.price} ₴</span>`;
            }

            const inStock = p.inStock !== false;
            const stockClass = inStock ? '' : 'out-of-stock';
            const stockOverlay = inStock ? '' : '<div class="stock-label">Продано</div>';

            const cardHTML = `
                <div class="product-card ${stockClass}" data-id="${p.id}">
                    ${tagsHTML}
                    <a href="product.html?id=${p.id}" style="position:relative;">${stockOverlay}<img src="${mainImg}" class="product-img" loading="lazy"></a>
                    <div class="brand-name">${p.brand || 'MUSE'}</div>
                    <div class="product-title"><a href="product.html?id=${p.id}">${p.title}</a></div>
                    <div class="size-selector">${sizesHTML}</div>
                    <div class="price-row"><div class="price-wrap">${priceHTML}</div>${inStock ? '<div class="add-btn">+</div>' : ''}</div>
                </div>`;
            catalogGrid.insertAdjacentHTML('beforeend', cardHTML);
        });
    }

    function renderTrends(list, container) {
        container.innerHTML = '';
        if (list.length === 0) { container.innerHTML = '<p style="text-align:center; width:100%;">Скоро тут з\'являться хіти!</p>'; return; }
        list.forEach(p => {
            const mainImg = (p.images && p.images.length > 0) ? p.images[0] : p.image;
            const html = `
                <div class="product-card">
                    <div class="tags-container"><span class="tag tag-hit">ХІТ</span></div>
                    <a href="product.html?id=${p.id}"><img src="${mainImg}" class="product-img" loading="lazy"></a>
                    <div class="product-title" style="margin-top:10px;"><a href="product.html?id=${p.id}">${p.title}</a></div>
                    <div class="price" style="font-weight:600;">${p.price} ₴</div>
                </div>`;
            container.insertAdjacentHTML('beforeend', html);
        });
    }

    // ==============================================
    // Д. СТОРІНКА ТОВАРУ
    // ==============================================
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('id');

    if (productPageInfo && pid) {
        db.ref('products/' + pid).on('value', (snapshot) => {
            const product = snapshot.val();
            if (product) renderProductPage(product);
            else document.getElementById('p-title').textContent = "Товар не знайдено";
        });
        db.ref('products').get().then(snap => { if(snap.val()) allProductsGlobal = Object.values(snap.val()); });
    }

    function renderProductPage(p) {
        document.title = `${p.title} | MUSE`;
        const setText = (id, txt) => { const el = document.getElementById(id); if(el) el.textContent = txt; };
        
        setText('p-brand', p.brand || 'MUSE Collection');
        setText('p-title', p.title);
        const descEl = document.getElementById('p-desc');
        if (descEl) descEl.innerHTML = p.description;
        setText('p-breadcrumb-name', p.title);
        
        const priceEl = document.getElementById('p-price');
        if (p.oldPrice && p.oldPrice > p.price) {
            priceEl.innerHTML = `<span class="old-price" style="font-size:18px;">${p.oldPrice} ₴</span> <span style="color:#c0392b">${p.price} ₴</span>`;
        } else { priceEl.textContent = p.price + ' ₴'; }

        const imgEl = document.getElementById('p-img');
        const thumbsEl = document.getElementById('p-thumbnails');
        let imagesList = (p.images && Array.isArray(p.images)) ? p.images : [p.image];
        if(imagesList.length > 0) imgEl.src = imagesList[0];

        if (thumbsEl) {
            if (imagesList.length > 1) {
                thumbsEl.innerHTML = imagesList.map((src, idx) => `<img src="${src}" class="thumb-img ${idx===0?'active':''}" onclick="changeMainImage('${src}', this)">`).join('');
            } else { thumbsEl.innerHTML = ''; }
        }

        const detailsEl = document.getElementById('p-details');
        if(detailsEl) {
            detailsEl.innerHTML = `<div class="spec-item"><span class="spec-label">Склад:</span> <span class="spec-val">${p.composition || '—'}</span></div><div class="spec-item"><span class="spec-label">Колір:</span> <span class="spec-val">${p.color || '—'}</span></div>`;
        }

        const sizesContainer = document.getElementById('p-sizes');
        if(sizesContainer) {
            if (p.sizes && p.sizes.length > 0) {
                sizesContainer.innerHTML = p.sizes.map(s => `<button class="size-option-btn" onclick="selectSize(this)">${s}</button>`).join('');
            } else { sizesContainer.innerHTML = '<span style="color:#555;">Універсальний розмір</span>'; }
        }
        
        const buyBtn = document.querySelector('.add-to-cart-big');
        if (buyBtn) {
            if (p.inStock === false) {
                buyBtn.textContent = "НЕМАЄ В НАЯВНОСТІ"; buyBtn.disabled = true; buyBtn.style.background = "#ccc";
            } else {
                buyBtn.textContent = "ДОДАТИ В КОШИК"; buyBtn.disabled = false; buyBtn.style.background = "";
            }
        }
    }


    // ==============================================
    // Е. РЕНДЕР КОШИКА
    // ==============================================
    function renderCart() {
        if (!cartItemsContainer) return;
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p class="empty-msg">Ваш кошик порожній</p>';
            if(cartTotalElement) cartTotalElement.textContent = '0 ₴';
        } else {
            cartItemsContainer.innerHTML = '';
            let total = 0;
            cart.forEach(item => {
                total += item.price;
                cartItemsContainer.insertAdjacentHTML('beforeend', `
                    <div class="cart-item" style="display:flex; gap:15px; margin-bottom:20px; border-bottom:1px solid #eee; padding-bottom:15px;">
                        <img src="${item.image}" style="width:60px; height:80px; object-fit:cover;">
                        <div style="flex:1">
                            <h4 style="font-size:14px; margin:0 0 5px;">${item.title}</h4>
                            <div style="font-size:12px; color:#666;">Розмір: <b>${item.size}</b></div>
                            <div style="font-weight:600;">${item.price.toLocaleString()} ₴</div>
                        </div>
                        <span class="remove-item" data-id="${item.id}" style="cursor:pointer; color:#999; font-size:20px;">&times;</span>
                    </div>`);
            });
            if(cartTotalElement) cartTotalElement.textContent = total.toLocaleString() + ' ₴';
        }
    }

    function saveCart() { localStorage.setItem('MUSE_CART', JSON.stringify(cart)); }
    function updateCartIcon() { if (cartCountElement) cartCountElement.textContent = cart.length; }


    // ==============================================
    // Ж. ОФОРМЛЕННЯ ЗАМОВЛЕННЯ (CHECKOUT)
    // ==============================================
    const checkoutList = document.getElementById('checkout-items-list');
    
    // --- 1. ЛОГІКА ПОКАЗУ ПОЛІВ ДОСТАВКИ ---
    const deliveryMethodSelect = document.getElementById('delivery-method');
    if (deliveryMethodSelect) {
        const detailsBlock = document.getElementById('delivery-details-block');
        
        function toggleDeliveryFields() {
            if (deliveryMethodSelect.value === 'pickup') {
                detailsBlock.style.display = 'none';
                document.getElementById('client-city').required = false;
                document.getElementById('client-branch').required = false;
            } else {
                detailsBlock.style.display = 'block';
                document.getElementById('client-city').required = true;
                document.getElementById('client-branch').required = true;
            }
        }
        
        deliveryMethodSelect.addEventListener('change', toggleDeliveryFields);
        toggleDeliveryFields();
    }

    // --- 2. РЕНДЕР ТОВАРІВ ---
    if (checkoutList) { 
        // Спочатку рендеримо візуально
        let displayTotal = 0;
        if (cart.length === 0) {
            checkoutList.innerHTML = '<p>Ваш кошик порожній</p>';
            const submitBtn = document.querySelector('.submit-order-btn');
            if(submitBtn) { submitBtn.style.opacity = '0.5'; submitBtn.disabled = true; }
        } else {
            cart.forEach(item => {
                displayTotal += item.price;
                checkoutList.insertAdjacentHTML('beforeend', `
                    <div class="summary-item">
                        <img src="${item.image}">
                        <div class="summary-info"><div class="summary-title">${item.title}</div><div class="summary-vol">Розмір: ${item.size}</div></div>
                        <div class="summary-price">${item.price.toLocaleString()} ₴</div>
                    </div>`);
            });
        }
        const totalEl = document.getElementById('checkout-total');
        if(totalEl) totalEl.textContent = displayTotal.toLocaleString() + ' ₴';
        
        // --- 3. ВІДПРАВКА ФОРМИ ---
        const checkoutForm = document.getElementById('checkout-form');
        if (checkoutForm) {
            checkoutForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // Збираємо дані
                const lastName = document.getElementById('client-lastname').value.trim();
                const firstName = document.getElementById('client-firstname').value.trim();
                const fullName = `${lastName} ${firstName}`;
                const phone = document.getElementById('client-phone').value;
                const deliveryType = document.getElementById('delivery-method').value;
                
                let city = '';
                let branch = '';
                let deliveryText = '';

                // Валідація і логіка
                if (deliveryType === 'pickup') {
                    city = 'Львів';
                    branch = 'Самовивіз';
                    deliveryText = 'Самовивіз (Львів)';
                } else {
                    city = document.getElementById('client-city').value.trim();
                    branch = document.getElementById('client-branch').value.trim();
                    if(!city || !branch) {
                        showNotification("Будь ласка, вкажіть місто і відділення", "error");
                        return;
                    }
                    const methodText = deliveryType === 'np_branch' ? 'Відділення' : 'Поштомат';
                    deliveryText = `Нова Пошта (${methodText}): ${branch}`;
                }

                const comment = document.getElementById('client-comment').value;

                if (typeof CONFIG === 'undefined' || !CONFIG.telegram) { 
                    showNotification("Помилка налаштувань. Зверніться до адміністратора.", "error");
                    return; 
                }

                // ВАЖЛИВО: Перераховуємо суму тут, щоб дані були точними на момент кліку
                const finalTotal = cart.reduce((sum, item) => sum + item.price, 0);

                const orderData = {
                    id: Date.now(),
                    date: new Date().toLocaleString(),
                    client: { name: fullName, phone: phone, city: city, delivery: deliveryText, comment: comment },
                    items: cart,
                    total: finalTotal,
                    status: 'new'
                };

                // Відправка
                db.ref('orders/' + orderData.id).set(orderData)
                .then(() => {
                    // TELEGRAM SEND
                    const BOT_TOKEN = CONFIG.telegram.botToken; 
                    const CHAT_ID = CONFIG.telegram.chatId;
                    let msg = `<b>✨ НОВЕ ЗАМОВЛЕННЯ #${orderData.id}</b>\n\n`;
                    msg += `👤 <b>Клієнт:</b> ${fullName}\n📞 <b>Тел:</b> ${phone}\n📍 <b>Адреса:</b> ${city}\n🚚 <b>Доставка:</b> ${deliveryText}\n`;
                    if(comment) msg += `💬 <b>Коментар:</b> ${comment}\n`;
                    msg += `\n<b>🛒 ТОВАРИ:</b>\n`;
                    cart.forEach((it, i) => { msg += `${i+1}. ${it.title} (${it.size}) - ${it.price} грн\n`; });
                    msg += `\n💰 <b>СУМА: ${finalTotal} грн</b>`;
                    
                    return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ chat_id: CHAT_ID, text: msg, parse_mode: 'HTML' })
                    });
                })
                .then(response => {
                    if (response.ok) {
                        showNotification("Замовлення успішно створено! Дякуємо.", "success");
                        cart = []; saveCart(); 
                        setTimeout(() => { window.location.href = 'index.html'; }, 2000); 
                    } else {
                        showNotification("Замовлення в базі, але помилка Telegram.", "error");
                    }
                })
                .catch(error => { 
                    console.error(error); 
                    showNotification("Помилка з'єднання: " + error.message, "error"); 
                });
            });
        }
    }

    // ПОШУК І ХЕДЕР
    const searchInput = document.getElementById('search-input');
    const searchDropdown = document.getElementById('search-dropdown');
    if (searchInput && searchDropdown) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (query.length < 2) { searchDropdown.classList.remove('active'); return; }
            const filtered = allProductsGlobal.filter(p => p.title.toLowerCase().includes(query));
            if (filtered.length === 0) { searchDropdown.innerHTML = '<div style="padding:15px; text-align:center; font-size:12px;">Нічого не знайдено</div>'; } 
            else {
                searchDropdown.innerHTML = filtered.map(p => {
                    const img = (p.images && p.images[0]) ? p.images[0] : p.image;
                    return `<a href="product.html?id=${p.id}" class="search-item"><img src="${img}" alt="${p.title}"><div class="search-item-info"><h4>${p.title}</h4><p>${p.price} ₴</p></div></a>`;
                }).join('');
            }
            searchDropdown.classList.add('active');
        });
        document.addEventListener('click', (e) => { 
            if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) searchDropdown.classList.remove('active');
        });
    }

    const burger = document.querySelector('.burger');
    const nav = document.querySelector('.nav-links');
    if (burger && nav) { burger.addEventListener('click', () => { nav.classList.toggle('nav-active'); burger.classList.toggle('toggle'); }); }
    
    const header = document.querySelector('header');
    if (header) {
        window.addEventListener('scroll', () => {
            if(window.scrollY > 50) header.classList.add('scrolled'); else header.classList.remove('scrolled');
        });
    }
});