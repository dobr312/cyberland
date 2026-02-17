const sharp = require('sharp');
const fs = require('fs');

const INPUT = 'Emissive/texture.png'; 
const OUTPUT = 'Emissive/emissive-void.png';

async function bake() {
    console.log("🌌 Void Land v2: Фильтр по яркости! Только неон, никакого металла...");
    if (!fs.existsSync(INPUT)) return console.error("❌ Файл не найден!");

    try {
        const image = sharp(INPUT);
        const { width, height } = await image.metadata();
        const buffer = await image.raw().toBuffer();
        const data = new Uint8ClampedArray(buffer);

        for (let i = 0; i < data.length; i += 3) {
            let r = data[i], g = data[i+1], b = data[i+2];

            // 1. Считаем общую яркость пикселя
            const brightness = (r + g + b) / 3;
            
            // 2. Ищем "чистый фиолетовый" (Синий и Красный доминируют над Зеленым)
            const isPurple = (b > g * 1.5) && (r > g * 1.2);

            // 3. ЖЕСТКИЙ ПОРОГ ЯРКОСТИ (Главный щит против металла)
            // Неон на этой карте очень светлый (ближе к белому). 
            // Металл никогда не поднимается выше 100-120.
            const isBrightEnough = brightness > 150; 

            if (isPurple && isBrightEnough) {
                // Оставляем РОДНОЙ цвет из текстуры без изменений
                data[i] = r; 
                data[i+1] = g;
                data[i+2] = b;
            } else {
                // Все остальное (металл, тени) - в абсолютный ноль
                data[i] = data[i+1] = data[i+2] = 0;
            }
        }

        await sharp(Buffer.from(data), { raw: { width, height, channels: 3 } })
            .toFile(OUTPUT);

        console.log("✨ Чисто! Теперь в эмиссиве только жилы и кристаллы.");
    } catch (e) { console.error("❌ Ошибка:", e.message); }
}
bake();
