const sharp = require('sharp');
const fs = require('fs');

const INPUT = 'Emissive/texture.png'; 
const OUTPUT = 'Emissive/emissive-void.png';

async function bake() {
    console.log("🌌 Void Land v11: Гибридный порог. Вытягиваем края жил...");
    if (!fs.existsSync(INPUT)) return console.error("❌ Файл не найден!");

    try {
        const image = sharp(INPUT);
        const { width, height } = await image.metadata();
        const buffer = await image.raw().toBuffer();
        const data = new Uint8ClampedArray(buffer);

        for (let i = 0; i < data.length; i += 3) {
            let r = data[i], g = data[i+1], b = data[i+2];
            const brightness = (r * 0.299 + g * 0.587 + b * 0.114);

            // 1. Проверка на "чистоту" фиолетового (неон)
            const isPurePurple = (b > g * 2.5); 

            // 2. ГИБРИДНАЯ ЛОГИКА:
            // Если пиксель очень фиолетовый, пускаем его с порога 105 (вытаскиваем края).
            // Если пиксель "грязный" (как плита), пускаем только если он ярче 125.
            const passByPurple = isPurePurple && (brightness > 105);
            const passByBrightness = (brightness > 125);

            if (passByPurple || passByBrightness) {
                data[i] = r;
                data[i+1] = g;
                data[i+2] = b;
            } else {
                data[i] = data[i+1] = data[i+2] = 0;
            }
        }

        await sharp(Buffer.from(data), { raw: { width, height, channels: 3 } })
            .blur(1.0) 
            .toFile(OUTPUT);

        console.log("✨ Готово! Жилы стали объемнее, плиты остались в тени.");
    } catch (e) { console.error("❌ Ошибка:", e.message); }
}
bake();
