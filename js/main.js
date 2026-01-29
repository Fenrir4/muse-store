// --- 1. ГЛОБАЛЬНА ФУНКЦІЯ ОНОВЛЕННЯ ЦІНИ ---
// Вона має бути доступна для HTML onclick, тому винесена за межі DOMContentLoaded
window.updatePrice = function(btn, price) {
    const card = btn.closest('.product-card') || btn.closest('.product-page');
    if (!card) return;

    // Знімаємо клас active з усіх кнопок у цій картці
    card.querySelectorAll('.vol-btn').forEach(b => b.classList.remove('active'));
    // Додаємо активний клас натиснутій кнопці
    btn.classList.add('active');
    
    // Знаходимо ціну і оновлюємо з анімацією
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
    // 1. ОГОЛОШЕННЯ ЗМІННИХ (ТІЛЬКИ ОДИН РАЗ!)
    // ==============================================
    const catalogGrid = document.getElementById('catalog-grid');
    const productPageInfo = document.querySelector('.product-page');
    
    // Елементи кошика
    const cartOverlay = document.querySelector('.cart-overlay');
    const cartItemsContainer = document.querySelector('.cart-items');
    const cartTotalElement = document.querySelector('.total-price');
    const cartCountElement = document.querySelector('.cart-count');
    const cartBtn = document.querySelector('.cart-btn');
    const closeCartBtn = document.querySelector('.close-cart');

    // Елементи оформлення замовлення
    const checkoutOverlay = document.querySelector('.checkout-overlay');
    const checkoutBtn = document.querySelector('.checkout-btn');
    const closeCheckoutBtn = document.querySelector('.close-checkout');

    // Бургер меню
    const burger = document.querySelector('.burger');
    const nav = document.querySelector('.nav-links');
    const navLinks = document.querySelectorAll('.nav-links li');

    // Стан кошика (завантажуємо з пам'яті)
    let cart = JSON.parse(localStorage.getItem('MY_PERFUME_CART')) || [];

    // ==============================================
    // 2. ІНІЦІАЛІЗАЦІЯ ІНТЕРФЕЙСУ
    // ==============================================
    updateCartIcon();
    renderCart();

    // ==============================================
    // 3. FIREBASE: ОТРИМАННЯ ДАНИХ
    // ==============================================
    if (typeof db !== 'undefined') {
        // Слухаємо базу даних в реальному часі
        db.ref('products').on('value', (snapshot) => {
            const data = snapshot.val();
            const productsList = data ? Object.values(data) : [];
            
            // Якщо ми на сторінці каталогу/головній
            if (catalogGrid) {
                renderCatalog(productsList);
            }

            // Якщо ми на сторінці одного товару
            if (productPageInfo) {
                renderProductPage(productsList);
            }
        });
    }

    // ==============================================
    // 4. ФУНКЦІЇ МАЛЮВАННЯ (RENDER)
    // ==============================================
    
    // Малювання сітки товарів
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
                        ${product.options.map(opt => `
                            <button class="vol-btn ${opt.active ? 'active' : ''}" 
                                    onclick="updatePrice(this, ${opt.price})">${opt.volume}</button>
                        `).join('')}
                    </div>

                    <div class="price-row">
                        <span class="price">${product.price.toLocaleString()} ₴</span>
                        <div class="add-btn">+</div>
                    </div>
                </div>`;
            catalogGrid.insertAdjacentHTML('beforeend', cardHTML);
        });
        
        // ВАЖЛИВО: Після малювання нових карток треба "увімкнути" кнопки "Додати в кошик"
        setupAddToCartButtons();
    }

    // Заповнення сторінки товару
    function renderProductPage(list) {
        const params = new URLSearchParams(window.location.search);
        const productId = parseInt(params.get('id'));
        const product = list.find(p => p.id === productId);

        if (product) {
            document.title = `${product.title} | 1 MILLILITER`;
            
            // Текстові поля
            const ids = {
                'p-img': 'src',
                'p-brand': 'textContent',
                'p-title': 'textContent',
                'p-desc': 'textContent',
                'p-breadcrumb-name': 'textContent'
            };
            
            // Безпечне заповнення (перевіряємо чи елемент існує)
            for (const [id, prop] of Object.entries(ids)) {
                const el = document.getElementById(id);
                if (el) {
                    if (prop === 'src') el.src = product.image;
                    else el.textContent = product[id.replace('p-', '')] || product.title; // fallback
                }
            }

            // Ціна окремо
            const priceEl = document.getElementById('p-price');
            if (priceEl) priceEl.textContent = product.price.toLocaleString() + ' ₴';

            // Ноти
            const notesEl = document.getElementById('p-notes');
            if (notesEl) {
                notesEl.innerHTML = `
                    <h4>Піраміда аромату:</h4>
                    <p>✨ <b>Верхні:</b> ${product.notes.top}</p>
                    <p>🌹 <b>Серце:</b> ${product.notes.heart}</p>
                    <p>🪵 <b>База:</b> ${product.notes.base}</p>`;
            }

            // Кнопки об'єму
            const volEl = document.getElementById('p-volumes');
            if (volEl) {
                volEl.innerHTML = product.options.map(opt => 
                    `<button class="vol-btn p-vol-btn ${opt.active ? 'active' : ''}" 
                            onclick="updatePrice(this, ${opt.price})">${opt.volume}</button>`
                ).join('');
            }

            // Вмикаємо кнопку кошика
            setupAddToCartButtons();
        }
    }

    // ==============================================
    // 5. ЛОГІКА КОШИКА
    // ==============================================
    
    function setupAddToCartButtons() {
        // Знаходимо всі кнопки "плюсики" і "велику кнопку купити"
        document.querySelectorAll('.add-btn, .add-to-cart-big').forEach(btn => {
            // Клон ноди видаляє старі слухачі, щоб не додавати по 10 разів
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', function() {
                const card = this.closest('.product-card') || this.closest('.product-page');
                
                // Збираємо дані
                const newItem = {
                    id: Date.now(), // Унікальний ID для кошика
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
                openCart(); // Відкриваємо кошик
            });
        });
    }

    function renderCart() {
        if (!cartItemsContainer) return;
        
        cartItemsContainer.innerHTML = '';
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p class="empty-msg">Кошик порожній...</p>';
            cartTotalElement.textContent = '0 ₴';
            return;
        }

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
        cartTotalElement.textContent = total.toLocaleString() + ' ₴';

        // Кнопки видалення
        document.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idToDelete = parseInt(e.target.dataset.id);
                cart = cart.filter(i => i.id !== idToDelete);
                saveCart();
                renderCart();
                updateCartIcon();
            });
        });
    }

    function saveCart() { localStorage.setItem('MY_PERFUME_CART', JSON.stringify(cart)); }
    function updateCartIcon() { if (cartCountElement) cartCountElement.textContent = cart.length; }
    function openCart() { if (cartOverlay) cartOverlay.classList.add('active'); document.body.style.overflow = 'hidden'; }
    function closeCartFunc() { if (cartOverlay) cartOverlay.classList.remove('active'); document.body.style.overflow = ''; }

    // Слухачі кнопок кошика
    if (cartBtn) cartBtn.addEventListener('click', openCart);
    if (closeCartBtn) closeCartBtn.addEventListener('click', closeCartFunc);
    if (cartOverlay) cartOverlay.addEventListener('click', (e) => {
        if (e.target === cartOverlay) closeCartFunc();
    });

    // ==============================================
    // 6. БУРГЕР МЕНЮ
    // ==============================================
    if (burger && nav) {
        burger.addEventListener('click', () => {
            // Перемикаємо клас навігації
            nav.classList.toggle('nav-active');
            
            // Анімація посилань
            navLinks.forEach((link, index) => {
                if (link.style.animation) {
                    link.style.animation = '';
                } else {
                    link.style.animation = `navLinkFade 0.5s ease forwards ${index / 7 + 0.3}s`;
                }
            });
            
            // Анімація самого бургера (хрестик)
            burger.classList.toggle('toggle');
        });
    }

    // ==============================================
    // 7. ОФОРМЛЕННЯ ЗАМОВЛЕННЯ (MODAL + TELEGRAM)
    // ==============================================
    
    // Відкриття форми
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (cart.length === 0) {
                alert("Кошик порожній!");
                return;
            }
            closeCartFunc(); // Закриваємо кошик
            checkoutOverlay.classList.add('active'); // Відкриваємо форму
        });
    }

    // Закриття форми
    if (closeCheckoutBtn) {
        closeCheckoutBtn.addEventListener('click', () => {
            checkoutOverlay.classList.remove('active');
        });
    }
    // Закриття по кліку на фон
    if (checkoutOverlay) {
        checkoutOverlay.addEventListener('click', (e) => {
            if (e.target === checkoutOverlay) checkoutOverlay.classList.remove('active');
        });
    }

    // Відправка в Telegram
    const orderForm = document.getElementById('order-form');
    if (orderForm) {
        orderForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const BOT_TOKEN = '8462484077:AAH4gFmymhN5OpjH25FFdHYLHWFZiXiMbs4';
            const CHAT_ID = '7085928669';

            const name = document.getElementById('client-name').value;
            const phone = document.getElementById('client-phone').value;
            const comment = document.getElementById('client-comment').value;

            let msg = `<b>🔥 НОВЕ ЗАМОВЛЕННЯ!</b>\n`;
            msg += `👤 <b>Клієнт:</b> ${name}\n`;
            msg += `📞 <b>Телефон:</b> ${phone}\n`;
            if (comment) msg += `💬 <b>Коментар:</b> ${comment}\n`;
            msg += `------------------------\n`;

            let total = 0;
            cart.forEach((item, index) => {
                msg += `${index + 1}. ${item.brand} - ${item.title} (${item.volume}) - ${item.price} грн\n`;
                total += item.price;
            });

            msg += `------------------------\n`;
            msg += `💰 <b>ВСЬОГО: ${total} грн</b>`;

            fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: CHAT_ID, text: msg, parse_mode: 'HTML' })
            })
            .then(res => {
                if (res.ok) {
                    alert("Дякуємо! Менеджер зв'яжеться з вами.");
                    cart = [];
                    saveCart();
                    renderCart();
                    updateCartIcon();
                    checkoutOverlay.classList.remove('active');
                    orderForm.reset();
                } else {
                    alert("Помилка. Перевірте бота.");
                }
            })
            .catch(err => console.error(err));
        });
    }
});