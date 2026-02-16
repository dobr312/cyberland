const sharp = require('sharp');
const fs = require('fs');

const INPUT = 'Emissive/texture-ia.jpeg'; 
const OUTPUT = 'Emissive/emissive-desert.png';

async function bake() {
    console.log("🌵 Обработка 'Desert Dune': Убираем песок, создаем мягкий янтарь...");
    if (!fs.existsSync(INPUT)) {
        console.error("❌ Файл не найден: " + INPUT);
        return;
    }

    try {
        const image = sharp(INPUT);
        const { width, height } = await image.metadata();
        const buffer = await image.raw().toBuffer();
        const data = new Uint8ClampedArray(buffer);

        for (let i = 0; i < data.length; i += 3) {
            let r = data[i], g = data[i+1], b = data[i+2];

            // 1. Детектор "Чистого Янтаря"
            // Песок содержит много синего (b), кристаллы — почти ноль.
            // Увеличиваем порог отсечки до 85, чтобы песок гарантированно стал черным.
            const saturation = r - b; 
            let intensity = Math.max(0, Math.min(1, (saturation - 85) / 45));

            if (intensity === 0) {
                data[i] = data[i+1] = data[i+2] = 0;
            } else {
                // 2. Цветовой баланс для мягкости и сочности
                // Полностью убираем Синий, чтобы избежать белых пересветов
                data[i] = Math.min(255, r * 1.6 * intensity);
                data[i+1] = Math.min(255, g * 0.9 * intensity); 
                data[i+2] = 0; 
            }
        }

        // 3. Тот самый Блюр для мягких переходов
        // Поднимаю до 4.0, так как в пустыне очень дробная текстура песка
        await sharp(Buffer.from(data), { raw: { width, height, channels: 3 } })
            .blur(4.0) 
            .toFile(OUTPUT);

        console.log("✨ Успех! Карта для пустыни: " + OUTPUT);
    } catch (e) { console.error("❌ Ошибка:", e.message); }
}
bake();
