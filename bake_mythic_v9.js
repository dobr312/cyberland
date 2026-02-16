const sharp = require('sharp');
const fs = require('fs');

const INPUT = 'Emissive/texture.jpeg';
const OUTPUT = 'Emissive/emissive-mythic.png';

async function bake() {
    console.log("💎 Mythic v9: Умное восстановление. Лечим кристаллы, держим пол черным...");
    if (!fs.existsSync(INPUT)) return console.error("❌ Нет файла: " + INPUT);

    try {
        const image = sharp(INPUT);
        const { width, height } = await image.metadata();
        const buffer = await image.raw().toBuffer();
        const data = new Uint8ClampedArray(buffer);

        for (let i = 0; i < data.length; i += 3) {
            let r = data[i], g = data[i+1], b = data[i+2];

            // 1. ОЦЕНКА ЦВЕТА
            const purpleScore = (r + b) / 2 - g;
            const cyanScore = (g + b) / 2 - r;

            // 2. УМНЫЙ ФИЛЬТР
            // Снижаем порог входа с 45 до 30, чтобы заполнить "дыры" в кристаллах
            const isCyanScoreGood = cyanScore > 30; 
            
            // НО! Добавляем проверку на чистоту. 
            // У кристалла Красный канал должен быть намного слабее Синего.
            // У металла r примерно равен b.
            // Если r > b * 0.8, значит это скорее всего серый металл -> FALSE.
            const isCleanCyan = isCyanScoreGood && (r < b * 0.8);

            const isPurple = purpleScore > 25; 

            // Доп. защита: совсем темные пиксели убираем, чтобы не шумели
            const isDark = (r + g + b) < 80;

            if ((!isCleanCyan && !isPurple) || isDark) {
                // Если не прошел проверку на чистоту цвета - в темноту
                data[i] = data[i+1] = data[i+2] = 0;
            } else {
                if (isCleanCyan) {
                    // КРИСТАЛЛЫ (Восстанавливаем плавность)
                    // Чуть подняли яркость грани (0.75), чтобы убрать "грязь"
                    data[i] = r * 0.02; 
                    data[i+1] = g * 0.75; 
                    data[i+2] = b * 0.85; 
                } else {
                    // ФИОЛЕТОВЫЙ (Идеален, не трогаем)
                    data[i] = r * 0.6;   
                    data[i+1] = g * 0.02;
                    data[i+2] = b * 0.7;  
                }
            }
        }

        // Вернули блюр 2.0, чтобы сгладить микро-шум на кристаллах
        await sharp(Buffer.from(data), { raw: { width, height, channels: 3 } })
            .blur(2.0) 
            .toFile(OUTPUT);

        console.log("✨ Готово! v9: Пол чистый, кристаллы гладкие.");
    } catch (e) { console.error("❌ Ошибка:", e.message); }
}
bake();
