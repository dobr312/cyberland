const sharp = require('sharp');
const fs = require('fs');

const INPUT = 'Emissive/texture.jpeg';
const OUTPUT = 'Emissive/emissive-mythic.png';

async function bake() {
    console.log("💎 Mythic v7: Эффект глубокого стекла (Кристаллы без пересвета)...");
    if (!fs.existsSync(INPUT)) return console.error("❌ Нет файла: " + INPUT);

    try {
        const image = sharp(INPUT);
        const { width, height } = await image.metadata();
        const buffer = await image.raw().toBuffer();
        const data = new Uint8ClampedArray(buffer);

        for (let i = 0; i < data.length; i += 3) {
            let r = data[i], g = data[i+1], b = data[i+2];

            // 1. Улучшенное детектирование (ловим все оттенки кристаллов)
            const purpleScore = (r + b) / 2 - g;
            const cyanScore = (g + b) / 2 - r;

            const isPurple = purpleScore > 8; 
            const isCyan = cyanScore > 10;

            if (!isCyan && !isPurple) {
                data[i] = data[i+1] = data[i+2] = 0;
            } else {
                if (isCyan) {
                    // КРИСТАЛЛЫ И НЕОН: Срезаем яркость до 60-70%.
                    // Это сохранит грани кристалла черными/темными, а свечение будет только на бликах.
                    data[i] = r * 0.05; 
                    data[i+1] = g * 0.65; // Было 1.1, стало 0.65 (Убираем заливку)
                    data[i+2] = b * 0.75; // Было 1.2, стало 0.75
                } else {
                    // ФИОЛЕТОВЫЙ: Делаем ОЧЕНЬ глубоким и темным.
                    data[i] = r * 0.6;   // Было 0.9, стало 0.6
                    data[i+1] = g * 0.05;
                    data[i+2] = b * 0.7;   // Было 1.0, стало 0.7
                }
            }
        }

        await sharp(Buffer.from(data), { raw: { width, height, channels: 3 } })
            .blur(2.0) // Чуть меньше блюра, чтобы грани были четче
            .toFile(OUTPUT);

        console.log("✨ Успех! Карта v7 готова. Теперь кристаллы 'стеклянные'.");
    } catch (e) { console.error("❌ Ошибка:", e.message); }
}
bake();
