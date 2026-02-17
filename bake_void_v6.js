const sharp = require('sharp');
const fs = require('fs');

const INPUT = 'Emissive/texture.png'; 
const OUTPUT = 'Emissive/emissive-void.png';

async function bake() {
    console.log("🌌 Void Land v6: Очистка жил без потери цвета...");
    if (!fs.existsSync(INPUT)) return console.error("❌ Файл не найден!");

    try {
        const image = sharp(INPUT);
        const { width, height } = await image.metadata();
        const buffer = await image.raw().toBuffer();
        const data = new Uint8ClampedArray(buffer);

        for (let i = 0; i < data.length; i += 3) {
            let r = data[i], g = data[i+1], b = data[i+2];

            // 1. ПРОВЕРКА НА "ГРЯЗНЫЙ" ФИОЛЕТОВЫЙ (ПОВЕРХНОСТИ)
            // Поверхности платформ всегда имеют g > 35. Настоящий неон - ниже.
            const isSurface = g > 35; 

            // 2. ПРОВЕРКА НА ЯДОВИТОСТЬ (ЖИЛЫ)
            // В жилах синий (b) доминирует над зеленым (g) колоссально.
            const isNeon = (b > g * 4.0) && (r > g * 2.0);

            // 3. ИСКЛЮЧЕНИЕ ДЛЯ ЯДРА
            // Центр очень яркий, там g может быть высоким, но r и b там зашкаливают.
            const isBrightCore = (r > 210 && b > 210);

            if ((isNeon || isBrightCore) && !isSurface) {
                // ВАЖНО: Оставляем оригинальные R, G, B без изменений!
                // Чтобы жилы не мутнели и не меняли оттенок.
                data[i] = r; 
                data[i+1] = g;
                data[i+2] = b;
            } else {
                data[i] = data[i+1] = data[i+2] = 0;
            }
        }

        await sharp(Buffer.from(data), { raw: { width, height, channels: 3 } })
            .toFile(OUTPUT);

        console.log("✨ Версия v6 готова. Поверхности платформ должны исчезнуть.");
    } catch (e) { console.error("❌ Ошибка:", e.message); }
}
bake();
