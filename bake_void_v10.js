const sharp = require('sharp');
const fs = require('fs');

const INPUT = 'Emissive/texture.png'; 
const OUTPUT = 'Emissive/emissive-void.png';

async function bake() {
    console.log("🌌 Void Land v10: Убираем засвет плиты (Threshold 120)...");
    if (!fs.existsSync(INPUT)) return console.error("❌ Файл не найден!");

    try {
        const image = sharp(INPUT);
        const { width, height } = await image.metadata();
        const buffer = await image.raw().toBuffer();
        const data = new Uint8ClampedArray(buffer);

        // ПОРОГ 120: Идеально, чтобы убить яркость плит (100-110),
        // но оставить энергию жил и кристаллов (130+).
        const THRESHOLD = 120;

        for (let i = 0; i < data.length; i += 3) {
            let r = data[i], g = data[i+1], b = data[i+2];
            const brightness = (r * 0.299 + g * 0.587 + b * 0.114);

            if (brightness > THRESHOLD) {
                // Оставляем родной фиолетовый/синий цвет
                data[i] = r;
                data[i+1] = g;
                data[i+2] = b;
            } else {
                data[i] = data[i+1] = data[i+2] = 0;
            }
        }

        await sharp(Buffer.from(data), { raw: { width, height, channels: 3 } })
            .blur(1.0) // Ювелирное сглаживание
            .toFile(OUTPUT);

        console.log("✨ Готово! Плита должна исчезнуть, жилы — остаться.");
    } catch (e) { console.error("❌ Ошибка:", e.message); }
}
bake();
