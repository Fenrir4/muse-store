const CONFIG = {
    // Налаштування Firebase (публічні, але захищені правилами бази)
    firebase: {
        apiKey: "AIzaSyCn8FeDaouYV-tXRn9RNG2os-2A89OXscY",
        authDomain: "milliliter-shop.firebaseapp.com",
        databaseURL: "https://milliliter-shop-default-rtdb.europe-west1.firebasedatabase.app",
        projectId: "milliliter-shop",
        storageBucket: "milliliter-shop.firebasestorage.app",
        messagingSenderId: "799244023149",
        appId: "1:799244023149:web:cfbafca4f1c2c028205664"
    },
    // Налаштування Telegram (будемо використовувати обережно)
    telegram: {
        botToken: "8462484077:AAH4gFmymhN5OpjH25FFdHYLHWFZiXiMbs4", // Токен бота
        chatId: "7085928669" // Твій ID
    },
    // Тут пізніше будуть налаштування оплати (Monobank/LiqPay)
    payment: {
        enabled: false, // Поки вимкнено
        merchantId: "" 
    }
};