const sharp = require('sharp');
const fs = require('fs');

// Используем путь из твоего терминала
const INPUT = 'Emissive/texture.jpeg'; 
const OUTPUT = 'Emissive/emissive-mythic.png';

async function bake() {
    console.log("💎 Запуск 'Mythic Protocol'...");
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

                if (isCyan) {
                    data[i] = r * 0.05; 
                    data[i+1] = Math.min(255, g * 1.5 * intensity);
                    data[i+2] = Math.min(255, b * 1.8 * intensity);
                } else {
                    data[i] = Math.min(255, r * 1.7 * intensity);
                    data[i+1] = g * 0.05; 
                    data[i+2] = Math.min(255, b * 1.9 * intensity);
                }
            }
        }

        await sharp(Buffer.from(data), { raw: { width, height, channels: 3 } })
            .blur(3.0) 
            .toFile(OUTPUT);

        console.log("✨ Успех! Файл создан: " + OUTPUT);
    } catch (e) { console.error("❌ Ошибка:", e.message); }
}
bake();
