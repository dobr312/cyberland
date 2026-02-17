const sharp = require('sharp');
const fs = require('fs');

const INPUT = 'Emissive/texture.png'; 
const OUTPUT = 'Emissive/emissive-void.png';

async function bake() {
    console.log("🌌 Void Land v8: Хирургическое выделение (High Threshold)...");
    if (!fs.existsSync(INPUT)) return console.error("❌ Файл не найден!");

    try {
        const image = sharp(INPUT);
        const { width, height } = await image.metadata();
        const buffer = await image.raw().toBuffer();
        const data = new Uint8ClampedArray(buffer);

        // СТРОГИЙ ПОРОГ ЯРКОСТИ
        // Металл обычно имеет яркость до 100-110.
        // Жилы и яркие центры начинаются от 140+.
        // Ставим 145, чтобы гарантированно убить фон.
        const THRESHOLD = 145;

        for (let i = 0; i < data.length; i += 3) {
            let r = data[i], g = data[i+1], b = data[i+2];

            // Расчет Luma (воспринимаемая яркость)
            const brightness = (r * 0.299 + g * 0.587 + b * 0.114);

            if (brightness > THRESHOLD) {
                // ПРОШЕЛ ПРОВЕРКУ:
                // Оставляем пиксель КАК ЕСТЬ. 
                // Не задираем яркость, не меняем цвет.
                data[i] = r;
                data[i+1] = g;
                data[i+2] = b;
            } else {
                // НЕ ПРОШЕЛ:
                // Уходит в полную тьму.
                data[i] = 0;
                data[i+1] = 0;
                data[i+2] = 0;
            }
        }

        await sharp(Buffer.from(data), { raw: { width, height, channels: 3 } })
            // Минимальный блюр (0.8) - работает как сглаживание краев (anti-aliasing),
            // чтобы жилы не выглядели рваными пикселями.
            .blur(0.8) 
            .toFile(OUTPUT);

        console.log("✨ Готово! Вырезаны только зоны экстремальной яркости.");
    } catch (e) { console.error("❌ Ошибка:", e.message); }
}
bake();
