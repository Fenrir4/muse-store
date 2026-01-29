// НАША БАЗА ДАНИХ ТОВАРІВ
const products = [
    {
        id: 1,
        brand: "Tom Ford",
        title: "Lost Cherry",
        price: 8500, // Ціна за флакон (за замовчуванням)
        image: "https://placehold.co/300x400/eeeeee/333333?text=Tom+Ford",
        description: "Насичений аромат, що відкриває двері у колись заборонений світ. Спокуслива подвійність заснована на контрасті грайливої, блискучої вивороту з соковитою м'якоттю всередині.",
        notes: {
            top: "Чорна вишня, Вишневий лікер, Гіркий мигдаль",
            heart: "Турецька троянда, Жасмин самбак",
            base: "Перуанський бальзам, Боби тонка, Сандал"
        },
        // Варіанти об'єму і цін
        options: [
            { volume: "2 мл", price: 180 },
            { volume: "5 мл", price: 450 },
            { volume: "10 мл", price: 850 },
            { volume: "Флакон", price: 8500, active: true } // active: true означає вибраний за замовчуванням
        ]
    },
    {
        id: 2,
        brand: "Maison Francis Kurkdjian",
        title: "Baccarat Rouge 540",
        price: 12000,
        image: "https://placehold.co/300x400/eeeeee/333333?text=Baccarat",
        description: "Світлий та насичений парфум лягає на шкіру як амбровий, квітковий та деревний бриз. Поетична алхімія.",
        notes: {
            top: "Жасмин, Шафран",
            heart: "Деревний бурштин",
            base: "Білий кедр, Ялинова смола"
        },
        options: [
            { volume: "2 мл", price: 250 },
            { volume: "5 мл", price: 600 },
            { volume: "10 мл", price: 1100 },
            { volume: "Флакон", price: 12000, active: true }
        ]
    },
    {
        id: 3,
        brand: "Kilian",
        title: "Angels' Share",
        price: 9000,
        image: "https://placehold.co/300x400/eeeeee/333333?text=Kilian",
        description: "Аромат натхненний коньячними бочками. Це данина пам'яті спадщини сім'ї Хеннессі.",
        notes: {
            top: "Коньяк",
            heart: "Кориця, Боби тонка, Дуб",
            base: "Праліне, Ваніль, Сандал"
        },
        options: [
            { volume: "2 мл", price: 200 },
            { volume: "5 мл", price: 500 },
            { volume: "10 мл", price: 950 },
            { volume: "Флакон", price: 9000, active: true }
        ]
    },
    {
        id: 4,
        brand: "Creed",
        title: "Aventus",
        price: 11500,
        image: "https://placehold.co/300x400/eeeeee/333333?text=Creed",
        description: "Чуттєвий, зухвалий та сучасний аромат. Натхненний драматичним життям імператора Наполеона.",
        notes: {
            top: "Ананас, Бергамот, Чорна смородина",
            heart: "Береза, Пачулі, Жасмин",
            base: "Мох, Мускус, Ваніль"
        },
        options: [
            { volume: "2 мл", price: 220 },
            { volume: "5 мл", price: 550 },
            { volume: "10 мл", price: 1000 },
            { volume: "Флакон", price: 11500, active: true }
        ]
    }
];