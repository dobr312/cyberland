const sharp = require('sharp');
const fs = require('fs');

// ИСПОЛЬЗУЕМ ТВОЕ НАЗВАНИЕ: texture.JPG
const INPUT = 'Emissive/texture.JPG'; 
const OUTPUT = 'Emissive/emissive-ice.png';

async function bake() {
    console.log("❄️ Ice Land v1: Хроматическая фильтрация (texture.JPG)...");
    
    if (!fs.existsSync(INPUT)) {
        console.error(`❌ Файл ${INPUT} не найден! Проверь папку Emissive.`);
        return;
    }

    try {
        const image = sharp(INPUT);
        const { width, height } = await image.metadata();
        const buffer = await image.raw().toBuffer();
        const data = new Uint8ClampedArray(buffer);

        for (let i = 0; i < data.length; i += 3) {
            let r = data[i], g = data[i+1], b = data[i+2];
            const luma = (r * 0.299 + g * 0.587 + b * 0.114);

            // ЗАЩИТА ОТ СНЕГА: 
            // Снег белый/серый (R ≈ G ≈ B). 
            // В неоне и синем льду Синего (B) всегда минимум на 20-30% больше.
            const isBlueSpectrum = (b > r * 1.25) && (b > g * 1.1);

            // 1. Яркий неон (голубые панели)
            const isNeon = isBlueSpectrum && (luma > 140);

            // 2. Синий низ (глубокие тени льда)
            const isDeepIce = isBlueSpectrum && (b > 70);

            if (isNeon || isDeepIce) {
                // Оставляем родной цвет
                data[i] = r;
                data[i+1] = g;
                data[i+2] = b;
            } else {
                // Снег и металл - в полную темноту
                data[i] = 0;
                data[i+1] = 0;
                data[i+2] = 0;
            }
        }

        await sharp(Buffer.from(data), { raw: { width, height, channels: 3 } })
            // Блюр 2.0 сгладит кривые линии неона, сделав их "дорогими"
            .blur(2.0) 
            .toFile(OUTPUT);

        console.log("✨ Готово! Эмиссив для льда создан без засвета снега.");
    } catch (e) { console.error("❌ Ошибка:", e.message); }
}
bake();
