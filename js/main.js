// --- 1. ГЛОБАЛЬНА ФУНКЦІЯ ОНОВЛЕННЯ ЦІНИ ---
window.updatePrice = function(btn, price) {
    const card = btn.closest('.product-card') || btn.closest('.product-page');
    if (!card) return;

    card.querySelectorAll('.vol-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    const priceDisplay = card.querySelector('.price') || card.querySelector('#p-price');
    if (priceDisplay) {
        priceDisplay.style.opacity = 0;
        setTimeout(() => {
            priceDisplay.textContent = price.toLocaleString() + ' ₴';
            priceDisplay.style.opacity = 1;
        }, 150);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    
    // ==============================================
    // 1. ОГОЛОШЕННЯ ЗМІННИХ
    // ==============================================
    const catalogGrid = document.getElementById('catalog-grid');
    const productPageInfo = document.querySelector('.product-page');
    
    // Кошик
    const cartOverlay = document.querySelector('.cart-overlay');
    const cartItemsContainer = document.querySelector('.cart-items');
    const cartTotalElement = document.querySelector('.total-price');
    const cartCountElement = document.querySelector('.cart-count');
    const cartBtn = document.querySelector('.cart-btn');
    const closeCartBtn = document.querySelector('.close-cart');

    // Пошук (НОВЕ)
    const searchBtn = document.querySelector('.search-btn');
    const searchOverlay = document.querySelector('.search-overlay');
    const closeSearchBtn = document.querySelector('.close-search');
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');

    // Бургер меню
    const burger = document.querySelector('.burger');
    const nav = document.querySelector('.nav-links');
    const navLinks = document.querySelectorAll('.nav-links li');

    // Стан кошика
    let cart = JSON.parse(localStorage.getItem('MY_PERFUME_CART')) || [];
    // Глобальний список товарів для пошуку
    let allProductsGlobal = []; 

    // ==============================================
    // 2. ІНІЦІАЛІЗАЦІЯ
    // ==============================================
    updateCartIcon();
    renderCart();

    // ==============================================
    // 3. FIREBASE: ОТРИМАННЯ ДАНИХ
    // ==============================================
    if (typeof db !== 'undefined') {
        db.ref('products').on('value', (snapshot) => {
            const data = snapshot.val();
            const productsList = data ? Object.values(data) : [];
            
            // Зберігаємо для пошуку
            allProductsGlobal = productsList;

            if (catalogGrid) renderCatalog(productsList);
            if (productPageInfo) renderProductPage(productsList);
        });
    }

    // ==============================================
    // 4. ФУНКЦІЇ МАЛЮВАННЯ
    // ==============================================
    function renderCatalog(list) {
        catalogGrid.innerHTML = '';
        list.forEach(product => {
            const cardHTML = `
                <div class="product-card" data-id="${product.id}">
                    <a href="product.html?id=${product.id}">
                        <img src="${product.image}" class="product-img" alt="${product.title}">
                    </a>
                    <div class="brand-name">${product.brand}</div>
                    <div class="product-title">
                        <a href="product.html?id=${product.id}" style="text-decoration:none; color:inherit;">${product.title}</a>
                    </div>
                    <div class="volume-selector">
                        ${product.options.map(opt => `<button class="vol-btn ${opt.active ? 'active' : ''}" onclick="updatePrice(this, ${opt.price})">${opt.volume}</button>`).join('')}
                    </div>
                    <div class="price-row">
                        <span class="price">${product.price.toLocaleString()} ₴</span>
                        <div class="add-btn">+</div>
                    </div>
                </div>`;
            catalogGrid.insertAdjacentHTML('beforeend', cardHTML);
        });
        setupAddToCartButtons();
    }

    function renderProductPage(list) {
        const params = new URLSearchParams(window.location.search);
        const productId = parseInt(params.get('id'));
        const product = list.find(p => p.id === productId);

        if (product) {
            document.title = `${product.title} | 1 MILLILITER`;
            document.getElementById('p-img').src = product.image;
            document.getElementById('p-brand').textContent = product.brand;
            document.getElementById('p-title').textContent = product.title;
            document.getElementById('p-desc').textContent = product.description;
            document.getElementById('p-breadcrumb-name').textContent = product.title;
            document.getElementById('p-price').textContent = product.price.toLocaleString() + ' ₴';
            
            document.getElementById('p-notes').innerHTML = `
                <h4>Піраміда аромату:</h4>
                <p>✨ <b>Верхні:</b> ${product.notes.top}</p>
                <p>🌹 <b>Серце:</b> ${product.notes.heart}</p>
                <p>🪵 <b>База:</b> ${product.notes.base}</p>`;

            document.getElementById('p-volumes').innerHTML = product.options.map(opt => 
                `<button class="vol-btn p-vol-btn ${opt.active ? 'active' : ''}" onclick="updatePrice(this, ${opt.price})">${opt.volume}</button>`
            ).join('');
            setupAddToCartButtons();
        }
    }

    // ==============================================
    // 5. ЖИВИЙ ПОШУК (INLINE DROPDOWN) 🔍
    // ==============================================
    
    const searchDropdown = document.getElementById('search-dropdown');

    if (searchInput && searchDropdown) {
        
        // Слухаємо введення тексту
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            
            // Якщо пусто або мало букв — ховаємо
            if (query.length < 2) {
                searchDropdown.classList.remove('active');
                searchDropdown.innerHTML = '';
                return;
            }

            // Фільтруємо
            const filtered = allProductsGlobal.filter(p => 
                p.title.toLowerCase().includes(query) || 
                p.brand.toLowerCase().includes(query)
            );

            // Генеруємо HTML
            if (filtered.length === 0) {
                searchDropdown.innerHTML = '<div style="padding:15px; text-align:center; color:#888; font-size:13px;">Нічого не знайдено 😔</div>';
            } else {
                searchDropdown.innerHTML = filtered.map(p => `
                    <a href="product.html?id=${p.id}" class="search-item">
                        <img src="${p.image}" alt="${p.title}">
                        <div class="search-item-info">
                            <p>${p.brand}</p>
                            <h4>${p.title}</h4>
                        </div>
                        <div class="search-item-price">${p.price.toLocaleString()} ₴</div>
                    </a>
                `).join('');
            }
            
            // Показуємо випадайку
            searchDropdown.classList.add('active');
        });

        // Ховаємо при кліку за межі
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
                searchDropdown.classList.remove('active');
            }
        });

        // Показуємо знову, якщо клікнули в поле
        searchInput.addEventListener('focus', () => {
            if (searchInput.value.length >= 2) searchDropdown.classList.add('active');
        });
    }

    // ==============================================
    // 6. ЛОГІКА КОШИКА
    // ==============================================
    function setupAddToCartButtons() {
        document.querySelectorAll('.add-btn, .add-to-cart-big').forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', function() {
                const card = this.closest('.product-card') || this.closest('.product-page');
                const newItem = {
                    id: Date.now(),
                    brand: card.querySelector('.brand-name, #p-brand').textContent,
                    title: card.querySelector('.product-title, #p-title').textContent,
                    image: card.querySelector('.product-img, #p-img').src,
                    volume: card.querySelector('.vol-btn.active').textContent,
                    price: parseInt((card.querySelector('.price, #p-price')).textContent.replace(/\D/g, ''))
                };
                cart.push(newItem);
                saveCart();
                renderCart();
                updateCartIcon();
                openCart();
            });
        });
    }

    function renderCart() {
        if (!cartItemsContainer) return;
        cartItemsContainer.innerHTML = cart.length === 0 ? '<p class="empty-msg">Кошик порожній...</p>' : '';
        let total = 0;
        cart.forEach(item => {
            total += item.price;
            cartItemsContainer.insertAdjacentHTML('beforeend', `
                <div class="cart-item" style="display:flex; gap:10px; margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;">
                    <img src="${item.image}" style="width:50px; height:60px; object-fit:cover; border-radius:4px;">
                    <div style="flex:1">
                        <div style="font-size:10px; color:#666;">${item.brand}</div>
                        <h4 style="font-size:14px; margin:2px 0;">${item.title}</h4>
                        <div style="font-size:12px;">${item.volume} — <b>${item.price} ₴</b></div>
                    </div>
                    <span class="remove-item" data-id="${item.id}" style="cursor:pointer; color:#ff4444; font-size:20px;">&times;</span>
                </div>`);
        });
        if(cartTotalElement) cartTotalElement.textContent = total.toLocaleString() + ' ₴';
        
        document.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                cart = cart.filter(i => i.id !== parseInt(e.target.dataset.id));
                saveCart(); renderCart(); updateCartIcon();
                if(document.getElementById('checkout-items-list')) window.location.reload(); 
            });
        });
    }

    function saveCart() { localStorage.setItem('MY_PERFUME_CART', JSON.stringify(cart)); }
    function updateCartIcon() { if (cartCountElement) cartCountElement.textContent = cart.length; }
    function openCart() { if (cartOverlay) cartOverlay.classList.add('active'); document.body.style.overflow = 'hidden'; }
    function closeCartFunc() { if (cartOverlay) cartOverlay.classList.remove('active'); document.body.style.overflow = ''; }

    if (cartBtn) cartBtn.addEventListener('click', openCart);
    if (closeCartBtn) closeCartBtn.addEventListener('click', closeCartFunc);
    if (cartOverlay) cartOverlay.addEventListener('click', (e) => { if (e.target === cartOverlay) closeCartFunc(); });

    // Хедер при скролі
    const header = document.querySelector('header');
    window.addEventListener('scroll', () => {
        if(window.scrollY > 50) header.classList.add('scrolled');
        else header.classList.remove('scrolled');
    });

    // --- БУРГЕР МЕНЮ (З АНІМАЦІЄЮ) ---
    if (burger && nav) {
        burger.addEventListener('click', () => {
            // 1. Відкриваємо шторку
            nav.classList.toggle('nav-active');
            
            // 2. Анімуємо посилання (ось це ми загубили!)
            if (navLinks) {
                navLinks.forEach((link, index) => {
                    if (link.style.animation) {
                        link.style.animation = '';
                    } else {
                        // Затримка для кожного пункту, щоб вилітали по черзі
                        link.style.animation = `navLinkFade 0.5s ease forwards ${index / 7 + 0.3}s`;
                    }
                });
            }
            
            // 3. Перетворюємо бургер на хрестик
            burger.classList.toggle('toggle');
        });
    }

    // --- ПЕРЕХІД ДО ОФОРМЛЕННЯ ---
    const checkoutBtn = document.querySelector('.checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (cart.length === 0) { alert("Кошик порожній!"); return; }
            closeCartFunc();
            window.location.href = 'checkout.html';
        });
    }

    // --- ЛОГІКА CHECKOUT.HTML ---
    const checkoutList = document.getElementById('checkout-items-list');
    if (checkoutList) { 
        let total = 0;
        if (cart.length === 0) {
            checkoutList.innerHTML = '<p>Кошик порожній.</p>';
            const sBtn = document.querySelector('.submit-order-btn');
            if(sBtn) { sBtn.disabled = true; sBtn.style.opacity = 0.5; }
        } else {
            cart.forEach(item => {
                total += item.price;
                checkoutList.insertAdjacentHTML('beforeend', `
                    <div class="summary-item">
                        <img src="${item.image}">
                        <div class="summary-info">
                            <div class="summary-title">${item.title}</div>
                            <div class="summary-vol">${item.brand} | ${item.volume}</div>
                        </div>
                        <div class="summary-price">${item.price.toLocaleString()} ₴</div>
                    </div>`);
            });
        }
        const totalEl = document.getElementById('checkout-total');
        if(totalEl) totalEl.textContent = total.toLocaleString() + ' ₴';

        const checkoutForm = document.getElementById('checkout-form');
        if (checkoutForm) {
            checkoutForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const BOT_TOKEN = CONFIG.telegram.botToken; 
                const CHAT_ID = CONFIG.telegram.chatId;
                
                const name = document.getElementById('client-name').value;
                const phone = document.getElementById('client-phone').value;
                const city = document.getElementById('client-city').value;
                const comment = document.getElementById('client-comment').value;

                let msg = `<b>🔥 ЗАМОВЛЕННЯ (CHECKOUT)</b>\n👤 ${name}\n📞 ${phone}\n📍 ${city}\n💬 ${comment}\n\n`;
                let t = 0;
                cart.forEach((it, i) => { msg += `${i+1}. ${it.title} (${it.volume}) - ${it.price}\n`; t+=it.price; });
                msg += `\n💰 <b>${t} грн</b>`;

                fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: CHAT_ID, text: msg, parse_mode: 'HTML' })
                }).then(() => {
                    alert("Прийнято! Дякуємо.");
                    cart = []; saveCart(); window.location.href = 'index.html';
                });
            });
        }
    }
});