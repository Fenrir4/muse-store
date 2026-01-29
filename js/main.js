// --- 1. ФУНКЦІЯ ОНОВЛЕННЯ ЦІНИ (З html кнопок об'єму) ---
window.updatePrice = function(btn, price) {
    const card = btn.closest('.product-card');
    
    // Перемикаємо активну кнопку
    card.querySelectorAll('.vol-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Оновлюємо візуальну ціну
    const priceDisplay = card.querySelector('.price');
    priceDisplay.textContent = price.toLocaleString() + ' ₴'; // Додаємо пробіли (8 500)
    
    // Анімація
    priceDisplay.style.opacity = 0;
    setTimeout(() => priceDisplay.style.opacity = 1, 200);
}

document.addEventListener('DOMContentLoaded', () => {
    
    // ---0 ДИНАМІЧНА БАЗА ДАНИХ FIREBASE ---
    const catalogGrid = document.getElementById('catalog-grid');
    const productPageInfo = document.querySelector('.product-page');

    // 1. Слухаємо зміни в базі "products"
    db.ref('products').on('value', (snapshot) => {
        const data = snapshot.val();
        // Перетворюємо об'єкт бази в масив для зручності
        const productsList = data ? Object.values(data) : [];
        
        // Малюємо каталог (якщо ми на відповідній сторінці)
        if (catalogGrid) {
            renderCatalog(productsList);
        }

        // Заповнюємо сторінку товару (якщо ми на ній)
        if (productPageInfo) {
            renderProductPage(productsList);
        }
    });

    // Функція генерації карток (Catalog/Home)
    function renderCatalog(list) {
        catalogGrid.innerHTML = '';
        list.forEach(product => {
            const defaultPrice = product.price.toLocaleString();
            const cardHTML = `
                <div class="product-card" data-id="${product.id}">
                    <a href="product.html?id=${product.id}">
                        <img src="${product.image}" alt="${product.title}" class="product-img">
                    </a>
                    <div class="brand-name">${product.brand}</div>
                    <div class="product-title">
                        <a href="product.html?id=${product.id}" style="text-decoration: none; color: inherit;">${product.title}</a>
                    </div>
                    <div class="volume-selector">
                        ${product.options.map(opt => `<button class="vol-btn ${opt.active ? 'active' : ''}" onclick="updatePrice(this, ${opt.price})">${opt.volume}</button>`).join('')}
                    </div>
                    <div class="price-row">
                        <span class="price">${defaultPrice} ₴</span>
                        <div class="add-btn">+</div>
                    </div>
                </div>`;
            catalogGrid.insertAdjacentHTML('beforeend', cardHTML);
        });
        // Перепідключаємо кнопки додавання, бо вони нові
        reinitAddToCart();
    }

    // Функція для сторінки товару
    function renderProductPage(list) {
        const params = new URLSearchParams(window.location.search);
        const productId = parseInt(params.get('id'));
        const product = list.find(p => p.id === productId);

        if (product) {
            document.getElementById('p-img').src = product.image;
            document.getElementById('p-brand').textContent = product.brand;
            document.getElementById('p-title').textContent = product.title;
            document.getElementById('p-desc').textContent = product.description;
            document.getElementById('p-price').textContent = product.price.toLocaleString() + ' ₴';
            document.getElementById('p-breadcrumb-name').textContent = product.title;
            
            // Ноти та об'єми (аналогічно як раніше, через innerHTML)
            // ... (твій старий код для нот і кнопок об'єму сюди) ...
        }
    }

    // --- 1. ГЕНЕРАЦІЯ ТОВАРІВ (ДИНАМІЧНИЙ КАТАЛОГ) ---
    const catalogGrid = document.getElementById('catalog-grid');

    if (catalogGrid && typeof products !== 'undefined') {
        catalogGrid.innerHTML = ''; // Чистимо на всяк випадок

        products.forEach(product => {
            // 1. Знаходимо варіант за замовчуванням (active)
            const defaultOption = product.options.find(opt => opt.active) || product.options[0];

            // 2. Генеруємо кнопки об'єму
            let volumeButtonsHTML = '';
            product.options.forEach(opt => {
                const activeClass = opt.active ? 'active' : '';
                // Генеруємо кнопку з onclick
                volumeButtonsHTML += `<button class="vol-btn ${activeClass}" onclick="updatePrice(this, ${opt.price})">${opt.volume}</button> `;
            });

            // 3. Створюємо HTML картки
            const cardHTML = `
                <div class="product-card" data-id="${product.id}">
                    <a href="product.html?id=${product.id}">
                        <img src="${product.image}" alt="${product.title}" class="product-img">
                    </a>
                    <div class="brand-name">${product.brand}</div>
                    <div class="product-title">
                        <a href="product.html?id=${product.id}" style="text-decoration: none; color: inherit;">
                            ${product.title}
                        </a>
                    </div>
                    
                    <div class="volume-selector">
                        ${volumeButtonsHTML}
                    </div>

                    <div class="price-row">
                        <span class="price">${defaultOption.price.toLocaleString()} ₴</span>
                        <div class="add-btn">+</div>
                    </div>
                </div>
            `;
            
            // 4. Додаємо картку в сітку
            catalogGrid.insertAdjacentHTML('beforeend', cardHTML);
        });
    }

    // --- 2. ЗМІННІ ---
    // Завантажуємо кошик з пам'яті АБО створюємо пустий список
    let cart = JSON.parse(localStorage.getItem('MY_PERFUME_CART')) || [];
    
    const cartOverlay = document.querySelector('.cart-overlay');
    const cartItemsContainer = document.querySelector('.cart-items');
    const cartTotalElement = document.querySelector('.total-price');
    const cartCountElement = document.querySelector('.cart-count');

    // --- 3. ЗАПУСК ---
    // Одразу малюємо кошик (якщо там щось було збережено)
    renderCart();
    updateCartIcon();

    // --- 4. ДОДАВАННЯ ТОВАРУ (Клік на плюсик) ---
    document.querySelectorAll('.add-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const card = this.closest('.product-card');
            
            // Збираємо дані про товар з картки
            const product = {
                id: Date.now(), // Унікальний код (час в мілісекундах)
                brand: card.querySelector('.brand-name').textContent,
                title: card.querySelector('.product-title').textContent,
                image: card.querySelector('.product-img').src,
                // Беремо текст активної кнопки об'єму (напр. "5 мл")
                volume: card.querySelector('.vol-btn.active').textContent,
                // Беремо ціну і чистимо від "₴" та пробілів, щоб отримати чисте число
                price: parseInt(card.querySelector('.price').textContent.replace(/\D/g, ''))
            };

            // Додаємо в список
            cart.push(product);
            
            // Зберігаємо і оновлюємо вигляд
            saveCart();
            renderCart();
            updateCartIcon();
            
            // Відкриваємо кошик, щоб клієнт бачив результат
            openCart(); 
        });
    });

    // --- 5. МАЛЮВАННЯ КОШИКА (Рендер) ---
    function renderCart() {
        cartItemsContainer.innerHTML = ''; // Чистимо попереднє

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p class="empty-msg">Кошик порожній... Додайте аромат!</p>';
            cartTotalElement.textContent = '0 ₴';
            return;
        }

        let totalPrice = 0;

        cart.forEach(item => {
            totalPrice += item.price;

            // Створюємо HTML для одного товару в кошику
            const itemHTML = `
                <div class="cart-item" style="display: flex; gap: 15px; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
                    <img src="${item.image}" style="width: 60px; height: 80px; object-fit: cover; border-radius: 4px;">
                    <div style="flex: 1;">
                        <div style="font-size: 10px; color: #666; text-transform: uppercase;">${item.brand}</div>
                        <h4 style="font-size: 14px; margin: 2px 0;">${item.title}</h4>
                        <div style="font-size: 12px; color: #888;">Об'єм: ${item.volume}</div>
                        <div style="font-weight: 600; margin-top: 5px;">${item.price.toLocaleString()} ₴</div>
                    </div>
                    <div class="remove-item" data-id="${item.id}" style="cursor: pointer; color: #ff4444; font-size: 20px;">&times;</div>
                </div>
            `;
            cartItemsContainer.insertAdjacentHTML('beforeend', itemHTML);
        });

        cartTotalElement.textContent = totalPrice.toLocaleString() + ' ₴';

        // Навішуємо кнопки видалення (хрестики біля товарів)
        document.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idToDelete = parseInt(e.target.dataset.id);
                cart = cart.filter(item => item.id !== idToDelete); // Лишаємо все, крім цього ID
                saveCart();
                renderCart();
                updateCartIcon();
            });
        });
    }

    // --- 6. ДОПОМІЖНІ ФУНКЦІЇ ---
    function saveCart() {
        localStorage.setItem('MY_PERFUME_CART', JSON.stringify(cart));
    }

    function updateCartIcon() {
        cartCountElement.textContent = cart.length;
    }

    function openCart() {
        cartOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // --- 7. ВІДКРИТТЯ/ЗАКРИТТЯ (Код, що ми писали раніше) ---
    const cartBtn = document.querySelector('.cart-btn');
    const closeCartBtn = document.querySelector('.close-cart');

    if (cartBtn) cartBtn.addEventListener('click', openCart);
    
    if (closeCartBtn) closeCartBtn.addEventListener('click', () => {
        cartOverlay.classList.remove('active');
        document.body.style.overflow = '';
    });
    
    if (cartOverlay) cartOverlay.addEventListener('click', (e) => {
        if (e.target === cartOverlay) {
            cartOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
    
    // --- 8. БУРГЕР МЕНЮ (Код, що ми писали раніше) ---
    const burger = document.querySelector('.burger');
    const nav = document.querySelector('.nav-links');
    const navLinks = document.querySelectorAll('.nav-links li');

    if (burger) {
        burger.addEventListener('click', () => {
            nav.classList.toggle('nav-active');
            navLinks.forEach((link, index) => {
                if (link.style.animation) link.style.animation = '';
                else link.style.animation = `navLinkFade 0.5s ease forwards ${index / 7 + 0.3}s`;
            });
            burger.classList.toggle('toggle');
        });
    }

    // --- 9. РОЗУМНА СТОРІНКА ТОВАРУ ---
    const productPageInfo = document.querySelector('.product-page'); // Перевіряємо, чи ми на сторінці товару

    if (productPageInfo) {
        // 1. Отримуємо ID з URL (наприклад, product.html?id=2)
        const params = new URLSearchParams(window.location.search);
        const productId = parseInt(params.get('id'));

        // 2. Шукаємо товар в базі
        const product = products.find(p => p.id === productId);

        if (product) {
            // 3. Заповнюємо даними
            document.title = `${product.title} | 1 MILLILITER`; // Змінюємо заголовок вкладки
            document.getElementById('p-breadcrumb-name').textContent = product.title;
            
            document.getElementById('p-img').src = product.image;
            document.getElementById('p-brand').textContent = product.brand;
            document.getElementById('p-title').textContent = product.title;
            document.getElementById('p-desc').textContent = product.description;

            // 4. Малюємо ноти
            const notesContainer = document.getElementById('p-notes');
            notesContainer.innerHTML = `
                <h4>Піраміда аромату:</h4>
                <p>✨ <b>Верхні ноти:</b> ${product.notes.top}</p>
                <p>🌹 <b>Ноти серця:</b> ${product.notes.heart}</p>
                <p>🪵 <b>Базові ноти:</b> ${product.notes.base}</p>
            `;

            // 5. Малюємо кнопки об'єму
            const volContainer = document.getElementById('p-volumes');
            let volumesHTML = '';
            
            product.options.forEach(opt => {
                const activeClass = opt.active ? 'active' : '';
                volumesHTML += `<button class="vol-btn p-vol-btn ${activeClass}" onclick="updatePrice(this, ${opt.price})">${opt.volume}</button>`;
                
                // Якщо це активна опція, одразу ставимо ціну
                if (opt.active) {
                    document.getElementById('p-price').textContent = opt.price.toLocaleString() + ' ₴';
                }
            });
            volContainer.innerHTML = volumesHTML;

        } else {
            // Якщо товару з таким ID немає -> повертаємо в каталог
            window.location.href = 'catalog.html';
        }
    }

    // --- 10. ОФОРМЛЕННЯ ЗАМОВЛЕННЯ (TELEGRAM) ---
    const checkoutOverlay = document.querySelector('.checkout-overlay');
    const checkoutBtn = document.querySelector('.checkout-btn');
    const closeCheckoutBtn = document.querySelector('.close-checkout');
    const orderForm = document.getElementById('order-form'); // <--- ОСЬ ЦЕЙ РЯДОК БУВ ЗАГУБЛЕНИЙ

    // 1. Відкрити форму при кліку "Оформити"
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (cart.length === 0) {
                alert("Кошик порожній!");
                return;
            }
            cartOverlay.classList.remove('active'); // Ховаємо кошик
            checkoutOverlay.classList.add('active'); // Показуємо форму
        });
    }

    // 2. Закрити форму
    if (closeCheckoutBtn) {
        closeCheckoutBtn.addEventListener('click', () => {
            checkoutOverlay.classList.remove('active');
        });
    }

    // 3. ВІДПРАВКА В TELEGRAM
    if (orderForm) {
        orderForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // --- ТВОЇ НАЛАШТУВАННЯ ---
            const BOT_TOKEN = '8462484077:AAH4gFmymhN5OpjH25FFdHYLHWFZiXiMbs4'; 
            const CHAT_ID = '7085928669';
            // -------------------------

            const name = document.getElementById('client-name').value;
            const phone = document.getElementById('client-phone').value;
            const comment = document.getElementById('client-comment').value;

            let message = `<b>🔥 НОВЕ ЗАМОВЛЕННЯ!</b>\n`;
            message += `👤 <b>Клієнт:</b> ${name}\n`;
            message += `📞 <b>Телефон:</b> ${phone}\n`;
            if (comment) message += `💬 <b>Коментар:</b> ${comment}\n`;
            message += `------------------------\n`;

            let totalSum = 0;
            cart.forEach((item, index) => {
                message += `${index + 1}. ${item.brand} - ${item.title} (${item.volume}) - ${item.price} грн\n`;
                totalSum += item.price;
            });

            message += `------------------------\n`;
            message += `💰 <b>ВСЬОГО: ${totalSum} грн</b>`;

            fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: CHAT_ID,
                    text: message,
                    parse_mode: 'HTML'
                })
            })
            .then(response => {
                if (response.ok) {
                    alert("Замовлення прийнято!");
                    cart = [];
                    saveCart();
                    renderCart();
                    updateCartIcon();
                    checkoutOverlay.classList.remove('active');
                    orderForm.reset();
                } else {
                    alert("Помилка відправки. Перевірте, чи запустили ви бота (/start).");
                }
            })
            .catch(error => console.error('Error:', error));
        });
    }
});