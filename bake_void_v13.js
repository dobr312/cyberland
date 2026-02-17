const sharp = require('sharp');
const fs = require('fs');

const INPUT = 'Emissive/texture.png'; 
const OUTPUT = 'Emissive/emissive-void.png';

async function bake() {
    console.log("🌌 Void Land v13: Финальная хирургия. Удаляем синий ореол и плиты...");
    if (!fs.existsSync(INPUT)) return console.error("❌ Файл не найден!");

    try {
        const image = sharp(INPUT);
        const { width, height } = await image.metadata();
        const buffer = await image.raw().toBuffer();
        const data = new Uint8ClampedArray(buffer);

        for (let i = 0; i < data.length; i += 3) {
            let r = data[i], g = data[i+1], b = data[i+2];
            const luma = (r * 0.299 + g * 0.587 + b * 0.114);

            // 1. ПУРПУРНЫЙ НЕОН (Жилы)
            // Увеличиваем требование к Красному (r > g * 1.8), чтобы убить синий ореол.
            // b > g * 2.0 гарантирует глубину фиолетового.
            const isStrictPurple = (b > g * 2.0) && (r > g * 1.8) && (luma > 65);

            // 2. БИРЮЗОВЫЕ ГРАНИ (Контуры)
            // Порог яркости 160! Это убьет плиты, но оставит свет на углах.
            const isStrictCyanEdge = (b > r * 1.5) && (g > r * 1.2) && (luma > 160);

            // 3. БЕЛОЕ ЯДРО (Центры шпилей)
            const isBrightCore = (luma > 180);

            if (isStrictPurple || isStrictCyanEdge || isBrightCore) {
                data[i] = r;
                data[i+1] = g;
                data[i+2] = b;
            } else {
                data[i] = 0;
                data[i+1] = 0;
                data[i+2] = 0;
            }
        }

        await sharp(Buffer.from(data), { raw: { width, height, channels: 3 } })
            .blur(0.6) // Еще меньше блюра для максимальной четкости жил
            .toFile(OUTPUT);

        console.log("✨ v13 готова. Проверь плиты и синеву вокруг жил.");
    } catch (e) { console.error("❌ Ошибка:", e.message); }
}
bake();
