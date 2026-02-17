const sharp = require('sharp');
const fs = require('fs');

const INPUT = 'Emissive/texture.png'; 
const OUTPUT = 'Emissive/emissive-void.png';

async function bake() {
    console.log("🌌 Void Land v5: Пипетка-фильтр. Изолируем чистый неон...");
    if (!fs.existsSync(INPUT)) return console.error("❌ Файл не найден!");

    try {
        const image = sharp(INPUT);
        const { width, height } = await image.metadata();
        const buffer = await image.raw().toBuffer();
        const data = new Uint8ClampedArray(buffer);

        for (let i = 0; i < data.length; i += 3) {
            let r = data[i], g = data[i+1], b = data[i+2];

            // МАТЕМАТИКА ПИПЕТКИ:
            // 1. Неон на этой карте имеет G в 3-4 раза меньше, чем B.
            // 2. Сумма R + B должна быть высокой, чтобы отсечь темный металл.
            
            const isVibrantPurple = (b > g * 3.0) && (r > g * 1.8);
            const hasHighSaturation = (r + b) > 130; 

            // Специфическая проверка для самых ярких белых жил (ядро)
            const isCore = (r > 200 && g > 150 && b > 200);

            if (isVibrantPurple || isCore) {
                // Оставляем РОДНОЙ ЦВЕТ как он есть
                data[i] = r; 
                data[i+1] = g;
                data[i+2] = b;
            } else {
                data[i] = data[i+1] = data[i+2] = 0;
            }
        }

        await sharp(Buffer.from(data), { raw: { width, height, channels: 3 } })
            .toFile(OUTPUT);

        console.log("✨ Готово! Маска стала максимально острой.");
    } catch (e) { console.error("❌ Ошибка:", e.message); }
}
bake();
