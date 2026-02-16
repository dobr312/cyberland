const sharp = require('sharp');
const fs = require('fs');

const INPUT = 'Emissive/texture.jpeg'; 
const OUTPUT = 'Emissive/emissive-mythic.png';

async function bake() {
    console.log("💎 Mythic v3: Возвращаем объем кристаллам и мягкий фиолетовый...");
    if (!fs.existsSync(INPUT)) return console.error("❌ Нет файла: " + INPUT);

    try {
        const image = sharp(INPUT);
        const { width, height } = await image.metadata();
        const buffer = await image.raw().toBuffer();
        const data = new Uint8ClampedArray(buffer);

        for (let i = 0; i < data.length; i += 3) {
            let r = data[i], g = data[i+1], b = data[i+2];

            // 1. МЯГКИЕ ДЕТЕКТОРЫ (Порог 15 вместо 60)
            // Это позволит захватить весь кристалл, а не только "верхушку айсберга"
            const purpleScore = (r + b) / 2 - g;
            const cyanScore = (g + b) / 2 - r;

            const isPurple = purpleScore > 12; 
            const isCyan = cyanScore > 15;

            if (!isCyan && !isPurple) {
                data[i] = data[i+1] = data[i+2] = 0;
            } else {
                // 2. БЕРЕЖНОЕ УСИЛЕНИЕ (Сохраняем детали)
                // Используем множители 1.3-1.4 вместо 2.0, чтобы не было "пересвета"
                if (isCyan) {
                    data[i] = r * 0.1; 
                    data[i+1] = Math.min(255, g * 1.3); // Снизили с 1.8
                    data[i+2] = Math.min(255, b * 1.4); // Снизили с 2.0
                } else {
                    data[i] = Math.min(255, r * 1.4);   // Снизили с 1.6
                    data[i+1] = g * 0.1;
                    data[i+2] = Math.min(255, b * 1.5); // Снизили с 1.9
                }
            }
        }

        // 3. ФИНАЛЬНЫЙ БЛЮР
        // Оставляем 3.0 - он идеально связывает неон и объем кристаллов
        await sharp(Buffer.from(data), { raw: { width, height, channels: 3 } })
            .blur(3.0) 
            .toFile(OUTPUT);

        console.log("✨ Успех! Фиолетовый теперь будет целым, а бирюза - объемной.");
    } catch (e) { console.error("❌ Ошибка:", e.message); }
}
bake();
