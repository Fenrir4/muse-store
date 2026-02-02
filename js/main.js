/* =========================================
   MUSE CLOTHES - CORE LOGIC
   Version: 2.0 (Stable)
   ========================================= */

// 1. ГЛОБАЛЬНА ФУНКЦІЯ (для HTML onclick)
// Дозволяє вибирати розмір (S, M, L) натисканням на кнопку
window.selectSize = function(btn) {
    const container = btn.parentElement;
    if (!container) return;
    
    // Прибираємо клас active з усіх сусідніх кнопок
    container.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    
    // Робимо натиснуту кнопку активною
    btn.classList.add('active');
}

document.addEventListener('DOMContentLoaded', () => {
    
    // --- ЗМІННІ ТА ЕЛЕМЕНТИ DOM ---
    const catalogGrid = document.getElementById('catalog-grid');
    const productPageInfo = document.querySelector('.product-page');
    const searchInput = document.getElementById('search-input');
    const searchDropdown = document.getElementById('search-dropdown');
    
    // Елементи кошика
    const cartOverlay = document.querySelector('.cart-overlay');
    const cartItemsContainer = document.querySelector('.cart-items');
    const cartTotalElement = document.querySelector('.total-price');
    const cartCountElement = document.querySelector('.cart-count');
    const cartBtn = document.querySelector('.cart-btn');
    const closeCartBtn = document.querySelector('.close-cart');
    
    // Кнопка переходу до оформлення
    const checkoutBtn = document.querySelector('.checkout-btn');
    
    // --- СТАН ДАНИХ ---
    let cart = JSON.parse(localStorage.getItem('MUSE_CART')) || [];
    let allProductsGlobal = []; // Тут зберігатимемо всі товари для пошуку

    // --- ІНІЦІАЛІЗАЦІЯ ---
    updateCartIcon();
    renderCart();

    // ==============================================
    // ЛОГІКА FIREBASE (ЗАВАНТАЖЕННЯ ДАНИХ)
    // ==============================================
    if (typeof db !== 'undefined') {
        
        // СЦЕНАРІЙ 1: Ми на сторінці конкретного товару (product.html)
        const params = new URLSearchParams(window.location.search);
        const pid = params.get('id');

        if (productPageInfo && pid) {
            // Вантажимо ТІЛЬКИ цей товар (для швидкості)
            db.ref('products/' + pid).on('value', (snapshot) => {
                const product = snapshot.val();
                if (product) {
                    renderProductPage(product);
                } else {
                    document.getElementById('p-title').textContent = "Товар не знайдено";
                    document.getElementById('p-desc').textContent = "Можливо, його було видалено.";
                    // Ховаємо лоадер ціни
                    document.getElementById('p-price').textContent = "";
                }
            });

            // Паралельно вантажимо список для пошуку (але не блокуємо екран)
            db.ref('products').get().then(snap => {
                const data = snap.val();
                if(data) allProductsGlobal = Object.values(data);
            });

        } 
        // СЦЕНАРІЙ 2: Ми в каталозі або на головній
        else {
            // Підписуємось на зміни всіх товарів (Realtime)
            db.ref('products').on('value', (snapshot) => {
                const data = snapshot.val();
                const productsList = data ? Object.values(data) : [];
                
                // Зберігаємо глобально для пошуку
                allProductsGlobal = productsList;

                // Якщо є сітка каталогу — малюємо її
                if (catalogGrid) renderCatalog(productsList);
            });
        }
    }

    // ==============================================
    // ФУНКЦІЇ ВІДОБРАЖЕННЯ (RENDER)
    // ==============================================
    
    // Рендер каталогу (картки товарів)
    function renderCatalog(list) {
        if(!catalogGrid) return;
        catalogGrid.innerHTML = '';
        
        // Сортуємо: нові зверху (якщо є timestamp), інакше як є
        const sortedList = list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        sortedList.forEach(product => {
            // Генерація кнопок розмірів
            let sizesHTML = '';
            if (product.sizes && Array.isArray(product.sizes) && product.sizes.length > 0) {
                sizesHTML = product.sizes.map(size => 
                    `<button class="size-btn" onclick="selectSize(this)">${size}</button>`
                ).join('');
            } else {
                sizesHTML = '<span style="font-size:11px; color:#999;">One Size</span>';
            }

            const cardHTML = `
                <div class="product-card" data-id="${product.id}">
                    <a href="product.html?id=${product.id}">
                        <img src="${product.image}" class="product-img" alt="${product.title}" loading="lazy">
                    </a>
                    <div class="brand-name">${product.brand || 'MUSE'}</div>
                    <div class="product-title">
                        <a href="product.html?id=${product.id}">${product.title}</a>
                    </div>
                    
                    <div class="size-selector">
                        ${sizesHTML}
                    </div>

                    <div class="price-row">
                        <span class="price">${parseInt(product.price).toLocaleString()} ₴</span>
                        <div class="add-btn">+</div>
                    </div>
                </div>`;
            catalogGrid.insertAdjacentHTML('beforeend', cardHTML);
        });
        
        // Перепідключаємо кнопки "Додати в кошик"
        setupAddToCartButtons();
    }

    // Рендер сторінки одного товару
    function renderProductPage(product) {
        document.title = `${product.title} | MUSE`;
        
        // Хелпер для безпечної вставки тексту
        const setText = (id, txt) => { const el = document.getElementById(id); if(el) el.textContent = txt; };
        
        const imgEl = document.getElementById('p-img'); 
        if(imgEl) imgEl.src = product.image;
        
        setText('p-brand', product.brand || 'MUSE Collection');
        setText('p-title', product.title);
        setText('p-desc', product.description);
        setText('p-breadcrumb-name', product.title);
        setText('p-price', parseInt(product.price).toLocaleString() + ' ₴');
        
        // Блок деталей (Склад, Колір)
        const detailsEl = document.getElementById('p-details');
        if(detailsEl) {
            detailsEl.innerHTML = `
                <div class="details-item"><span class="details-label">Склад:</span> <span class="details-value">${product.composition || '—'}</span></div>
                <div class="details-item"><span class="details-label">Колір:</span> <span class="details-value">${product.color || '—'}</span></div>
            `;
        }

        // Блок розмірів (Великі кнопки)
        const sizesContainer = document.getElementById('p-sizes');
        if(sizesContainer) {
            if (product.sizes && Array.isArray(product.sizes) && product.sizes.length > 0) {
                sizesContainer.innerHTML = product.sizes.map(size => 
                    `<button class="size-option-btn" onclick="selectSize(this)">${size}</button>`
                ).join('');
            } else {
                sizesContainer.innerHTML = '<span style="color:#555; font-size:14px;">Універсальний розмір</span>';
            }
        }
        
        // Підключаємо кнопку "Додати в кошик"
        setupAddToCartButtons();
    }

    // ==============================================
    // ЛОГІКА КОШИКА
    // ==============================================
    function setupAddToCartButtons() {
        // Знаходимо всі кнопки додавання (і в каталозі, і на сторінці товару)
        const buttons = document.querySelectorAll('.add-btn, .add-to-cart-big');
        
        buttons.forEach(btn => {
            // Клонуємо кнопку, щоб очистити старі обробники подій (prevent duplicate listeners)
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', function() {
                // Знаходимо картку товару (батьківський елемент)
                const card = this.closest('.product-card') || this.closest('.product-page');
                
                // Шукаємо активну кнопку розміру
                const activeSizeBtn = card.querySelector('.size-btn.active') || card.querySelector('.size-option-btn.active');
                
                let selectedSize = 'One Size';
                
                if (activeSizeBtn) {
                    selectedSize = activeSizeBtn.textContent;
                } else {
                    // Якщо користувач не вибрав, пробуємо взяти перший доступний розмір
                    const firstSize = card.querySelector('.size-btn') || card.querySelector('.size-option-btn');
                    if(firstSize) selectedSize = firstSize.textContent;
                }

                // Створюємо об'єкт для кошика
                const newItem = {
                    id: Date.now(), // Унікальний ID
                    title: card.querySelector('.product-title, #p-title').textContent,
                    image: card.querySelector('.product-img, #p-img').src,
                    price: parseInt((card.querySelector('.price, #p-price')).textContent.replace(/\D/g, '')),
                    size: selectedSize
                };

                // Додаємо в масив і зберігаємо
                cart.push(newItem);
                saveCart();
                renderCart();
                updateCartIcon();
                
                // Відкриваємо кошик, щоб показати результат
                openCart();
            });
        });
    }

    function renderCart() {
        if (!cartItemsContainer) return;
        
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p class="empty-msg">Ваш кошик порожній</p>';
        } else {
            cartItemsContainer.innerHTML = '';
            let total = 0;
            
            cart.forEach(item => {
                total += item.price;
                cartItemsContainer.insertAdjacentHTML('beforeend', `
                    <div class="cart-item" style="display:flex; gap:15px; margin-bottom:20px; border-bottom:1px solid #eee; padding-bottom:15px;">
                        <img src="${item.image}" style="width:60px; height:80px; object-fit:cover;">
                        <div style="flex:1">
                            <h4 style="font-size:14px; margin:0 0 5px; font-family:var(--font-heading);">${item.title}</h4>
                            <div style="font-size:12px; color:#666;">Розмір: <b>${item.size}</b></div>
                            <div style="font-weight:600;">${item.price.toLocaleString()} ₴</div>
                        </div>
                        <span class="remove-item" data-id="${item.id}" style="cursor:pointer; color:#999; font-size:20px;">&times;</span>
                    </div>`);
            });
            
            if(cartTotalElement) cartTotalElement.textContent = total.toLocaleString() + ' ₴';
        }

        // Обробка видалення товарів
        document.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idToRemove = parseInt(e.target.dataset.id);
                cart = cart.filter(i => i.id !== idToRemove);
                saveCart(); 
                renderCart(); 
                updateCartIcon();
                // Оновлюємо сторінку оформлення, якщо ми там
                if(document.getElementById('checkout-items-list')) window.location.reload(); 
            });
        });
    }

    function saveCart() { localStorage.setItem('MUSE_CART', JSON.stringify(cart)); }
    function updateCartIcon() { if (cartCountElement) cartCountElement.textContent = cart.length; }
    
    function openCart() { 
        if (cartOverlay) cartOverlay.classList.add('active'); 
        document.body.style.overflow = 'hidden'; // Блокуємо скрол сторінки
    }
    
    function closeCartFunc() { 
        if (cartOverlay) cartOverlay.classList.remove('active'); 
        document.body.style.overflow = ''; 
    }

    // Події кошика
    if (cartBtn) cartBtn.addEventListener('click', openCart);
    if (closeCartBtn) closeCartBtn.addEventListener('click', closeCartFunc);
    if (cartOverlay) cartOverlay.addEventListener('click', (e) => { 
        if (e.target === cartOverlay) closeCartFunc(); 
    });

    // ==============================================
    // ПОШУК (SEARCH)
    // ==============================================
    if (searchInput && searchDropdown) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            
            if (query.length < 2) { 
                searchDropdown.classList.remove('active'); 
                return; 
            }
            
            // Шукаємо по глобальному масиву
            const filtered = allProductsGlobal.filter(p => 
                p.title.toLowerCase().includes(query)
            );
            
            if (filtered.length === 0) {
                searchDropdown.innerHTML = '<div style="padding:15px; text-align:center; font-size:12px;">Нічого не знайдено</div>';
            } else {
                searchDropdown.innerHTML = filtered.map(p => `
                    <a href="product.html?id=${p.id}" class="search-item">
                        <img src="${p.image}" alt="${p.title}">
                        <div class="search-item-info">
                            <h4>${p.title}</h4>
                            <p>${parseInt(p.price).toLocaleString()} ₴</p>
                        </div>
                    </a>`).join('');
            }
            searchDropdown.classList.add('active');
        });

        // Закриття пошуку при кліку поза ним
        document.addEventListener('click', (e) => { 
            if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
                searchDropdown.classList.remove('active');
            }
        });
    }

    // ==============================================
    // ІНШЕ (НАВІГАЦІЯ, СКРОЛ, CHECKOUT)
    // ==============================================
    
    // Перехід до Checkout з кошика
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (cart.length === 0) { alert("Ваш кошик порожній"); return; }
            closeCartFunc();
            window.location.href = 'checkout.html';
        });
    }

    // Бургер меню
    const burger = document.querySelector('.burger');
    const nav = document.querySelector('.nav-links');
    if (burger && nav) {
        burger.addEventListener('click', () => { 
            nav.classList.toggle('nav-active'); 
            burger.classList.toggle('toggle'); 
        });
    }
    
    // Ефект прозорості хедера при скролі
    const header = document.querySelector('header');
    if (header) {
        window.addEventListener('scroll', () => {
            if(window.scrollY > 50) header.classList.add('scrolled'); 
            else header.classList.remove('scrolled');
        });
    }

    // Логіка сторінки оформлення замовлення (Checkout)
    const checkoutList = document.getElementById('checkout-items-list');
    if (checkoutList) { 
        let total = 0;
        
        if (cart.length === 0) {
            checkoutList.innerHTML = '<p>Ваш кошик порожній</p>';
            const submitBtn = document.querySelector('.submit-order-btn');
            if(submitBtn) { submitBtn.style.opacity = '0.5'; submitBtn.disabled = true; }
        } else {
            cart.forEach(item => {
                total += item.price;
                checkoutList.insertAdjacentHTML('beforeend', `
                    <div class="summary-item">
                        <img src="${item.image}">
                        <div class="summary-info">
                            <div class="summary-title">${item.title}</div>
                            <div class="summary-vol">Розмір: ${item.size}</div>
                        </div>
                        <div class="summary-price">${item.price.toLocaleString()} ₴</div>
                    </div>`);
            });
        }
        
        const totalEl = document.getElementById('checkout-total');
        if(totalEl) totalEl.textContent = total.toLocaleString() + ' ₴';
        
        // Відправка форми
        const checkoutForm = document.getElementById('checkout-form');
        if (checkoutForm) {
            checkoutForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // 1. Збираємо дані
                const name = document.getElementById('client-name').value;
                const phone = document.getElementById('client-phone').value;
                const city = document.getElementById('client-city').value;
                const delivery = document.getElementById('delivery-method').value;
                const comment = document.getElementById('client-comment').value;

                // 2. Перевірка конфігу Telegram
                if (typeof CONFIG === 'undefined' || !CONFIG.telegram) {
                    alert("Помилка налаштувань Telegram. Зверніться до адміністратора.");
                    return;
                }

                const BOT_TOKEN = CONFIG.telegram.botToken; 
                const CHAT_ID = CONFIG.telegram.chatId;

                // 3. Формуємо повідомлення
                let msg = `<b>✨ НОВЕ ЗАМОВЛЕННЯ (MUSE)</b>\n\n`;
                msg += `👤 <b>Клієнт:</b> ${name}\n`;
                msg += `📞 <b>Телефон:</b> ${phone}\n`;
                msg += `📍 <b>Адреса:</b> ${city} (${delivery})\n`;
                if(comment) msg += `💬 <b>Коментар:</b> ${comment}\n`;
                
                msg += `\n<b>🛒 ТОВАРИ:</b>\n`;
                let orderTotal = 0;
                cart.forEach((it, i) => { 
                    msg += `${i+1}. ${it.title}\n   └ 📏 ${it.size} | 💰 ${it.price} грн\n`; 
                    orderTotal += it.price; 
                });
                
                msg += `\n💰 <b>СУМА: ${orderTotal} грн</b>`;

                // 4. Відправка (fetch)
                fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: CHAT_ID, text: msg, parse_mode: 'HTML' })
                })
                .then(response => {
                    if (response.ok) {
                        alert("Дякуємо! Ваше замовлення прийнято. Ми зв'яжемося з вами.");
                        cart = []; 
                        saveCart(); 
                        window.location.href = 'index.html';
                    } else {
                        alert("Помилка при відправці. Спробуйте ще раз.");
                    }
                })
                .catch(error => {
                    console.error(error);
                    alert("Перевірте інтернет-з'єднання.");
                });
            });
        }
    }
});