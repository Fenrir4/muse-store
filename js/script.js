// Функція завантаження компонентів
async function loadComponents() {
    const load = async (id, file) => {
        const response = await fetch(`components/${file}`);
        const text = await response.text();
        document.getElementById(id).innerHTML = text;
    };

    await load('header-container', 'header.html');
    await load('hero-container', 'hero.html');
    await load('products-container', 'products.html');
    await load('footer-container', 'footer.html');
}

// Запуск завантаження при старті
document.addEventListener('DOMContentLoaded', loadComponents);

// Функція оновлення ціни 
window.updatePrice = function(btn, price) {
    // Знаходимо картку товару, в якій натиснули кнопку
    const card = btn.closest('.product-card');
    
    // Прибираємо клас 'active' у всіх кнопок в цій картці
    const buttons = card.querySelectorAll('.vol-btn');
    buttons.forEach(b => b.classList.remove('active'));
    
    // Додаємо 'active' натиснутій кнопці
    btn.classList.add('active');
    
    // Оновлюємо текст ціни
    const priceDisplay = card.querySelector('.price');
    priceDisplay.textContent = price + ' ₴';
    
    // Додаємо ефект "блимання" ціни для краси
    priceDisplay.style.opacity = 0;
    setTimeout(() => priceDisplay.style.opacity = 1, 200);
}