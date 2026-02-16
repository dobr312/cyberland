const sharp = require('sharp');
const fs = require('fs');

const INPUT = 'Emissive/texture.jpeg'; 
const OUTPUT = 'Emissive/emissive-mythic.png';

async function bake() {
    console.log("💎 Запуск 'Mythic' (Blur 3.0 + .jpeg вход)...");
    try {
        const image = sharp(INPUT);
        const { width, height } = await image.metadata();
        const buffer = await image.raw().toBuffer();
        const data = new Uint8ClampedArray(buffer);

        for (let i = 0; i < data.length; i += 3) {
            let r = data[i], g = data[i+1], b = data[i+2];

            // 1. Детекторы циана и фиолета
            const cyanPower = (g + b) / 2 - r;
            const purplePower = (r + b) / 2 - g;

            const isCyan = cyanPower > 55;
            const isPurple = purplePower > 55;

            if (!isCyan && !isPurple) {
                data[i] = data[i+1] = data[i+2] = 0;
            } else {
                let intensity = isCyan 
                    ? Math.max(0, Math.min(1, (cyanPower - 50) / 60))
                    : Math.max(0, Math.min(1, (purplePower - 50) / 60));

                // 2. Насыщенный цвет (Блокировка белизны)
                if (isCyan) {
                    data[i] = r * 0.1 * intensity;
                    data[i+1] = Math.min(255, g * 1.6 * intensity);
                    data[i+2] = Math.min(255, b * 1.8 * intensity);
                } else {
                    data[i] = Math.min(255, r * 1.7 * intensity);
                    data[i+1] = g * 0.1 * intensity;
                    data[i+2] = Math.min(255, b * 1.9 * intensity);
                }
            }
        }

        // 3. СГЛАЖИВАНИЕ ПЕРЕХОДОВ (Blur 3.0)
        await sharp(Buffer.from(data), { raw: { width, height, channels: 3 } })
            .blur(3.0) 
            .toFile(OUTPUT);

        console.log("✨ Готово! Файл emissive-mythic.png успешно создан из .jpeg");
    } catch (e) { console.error("❌ Ошибка:", e.message); }
}
bake();
