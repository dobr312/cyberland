const sharp = require('sharp');
const fs = require('fs');

const INPUT = 'Emissive/texture.jpeg';
const OUTPUT = 'Emissive/emissive-mythic.png';

async function bake() {
    console.log("💎 Mythic v5: Сочный неон + Текстурные кристаллы...");
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

            const purpleScore = (r + b) / 2 - g;
            const cyanScore = (g + b) / 2 - r;

            const isPurple = purpleScore > 10;
            const isCyan = cyanScore > 15;

            if (!isCyan && !isPurple) {
                data[i] = data[i+1] = data[i+2] = 0;
            } else {
                if (isCyan) {
                    data[i] = r * 0.05; 
                    data[i+1] = Math.min(255, g * 1.25); 
                    data[i+2] = Math.min(255, b * 1.35); 
                } else {
                    data[i] = Math.min(255, r * 1.1); 
                    data[i+1] = g * 0.05;
                    data[i+2] = Math.min(255, b * 1.2); 
                }
            }
        }

        await sharp(Buffer.from(data), { raw: { width, height, channels: 3 } })
            .blur(3.0)
            .toFile(OUTPUT);

        console.log("✨ Успех! Файл создан: " + OUTPUT);
    } catch (e) { 
        console.error("❌ Ошибка:", e.message); 
    }
}
bake();
