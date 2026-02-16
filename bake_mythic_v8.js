const sharp = require('sharp');
const fs = require('fs');

const INPUT = 'Emissive/texture.jpeg';
const OUTPUT = 'Emissive/emissive-mythic.png';

async function bake() {
    console.log("🛡️ Mythic v8: Операция 'Чистый пол'. Сохраняем кристаллы, убираем металл...");
    if (!fs.existsSync(INPUT)) return console.error("❌ Нет файла: " + INPUT);

    try {
        const image = sharp(INPUT);
        const { width, height } = await image.metadata();
        const buffer = await image.raw().toBuffer();
        const data = new Uint8ClampedArray(buffer);

        for (let i = 0; i < data.length; i += 3) {
            let r = data[i], g = data[i+1], b = data[i+2];

            // 1. ВЫЧИСЛЯЕМ ЦВЕТНОСТЬ
            const purpleScore = (r + b) / 2 - g;
            const cyanScore = (g + b) / 2 - r;

            // 2. ЖЕСТКИЙ ФИЛЬТР (Главное изменение)
            // Металл имеет score около 10-15. Неон имеет > 50.
            // Ставим отсечку на 40, чтобы убить металл наповал.
            const isPurple = purpleScore > 25; 
            const isCyan = cyanScore > 45;     

            // 3. ДОПОЛНИТЕЛЬНАЯ ЗАЩИТА ОТ ТЕМНОТЫ
            // Если пиксель сам по себе темный (грязь, тени на полу) - сразу удаляем.
            const isDark = (r + g + b) < 100; 

            if ((!isCyan && !isPurple) || isDark) {
                // Полная темнота для фона и металла
                data[i] = data[i+1] = data[i+2] = 0;
            } else {
                if (isCyan) {
                    // КРИСТАЛЛЫ (Оставляем настройки v7 - они были супер)
                    data[i] = r * 0.02; 
                    data[i+1] = g * 0.7; // Мягкая яркость для глубины
                    data[i+2] = b * 0.8; 
                } else {
                    // ФИОЛЕТОВЫЙ (Тоже оставляем как в v7)
                    data[i] = r * 0.6;   
                    data[i+1] = g * 0.02;
                    data[i+2] = b * 0.7;  
                }
            }
        }

        // Блюр минимальный, чтобы не размазать свет обратно на пол
        await sharp(Buffer.from(data), { raw: { width, height, channels: 3 } })
            .blur(1.5) 
            .toFile(OUTPUT);

        console.log("✨ Готово! Фон должен стать идеально черным.");
    } catch (e) { console.error("❌ Ошибка:", e.message); }
}
bake();
