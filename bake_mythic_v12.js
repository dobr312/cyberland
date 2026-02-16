const sharp = require('sharp');
const fs = require('fs');

const INPUT = 'Emissive/texture.jpeg';
const OUTPUT = 'Emissive/emissive-mythic.png';

async function bake() {
    console.log("🎯 Mythic v12: Возврат к стилистике v9 + чистка кристаллов...");
    if (!fs.existsSync(INPUT)) return console.error("❌ Файл не найден");

    try {
        const image = sharp(INPUT);
        const { width, height } = await image.metadata();
        const buffer = await image.raw().toBuffer();
        const data = new Uint8ClampedArray(buffer);

        for (let i = 0; i < data.length; i += 3) {
            let r = data[i], g = data[i+1], b = data[i+2];

            // Логика из v9: вычисляем "силу" цвета
            const cyanScore = (g + b) / 2 - r;
            const purpleScore = (r + b) / 2 - g;

            // СТРОГИЙ ФИЛЬТР (чтобы шпили были черными)
            // Если красного много - это металл, обнуляем.
            const isCyan = (cyanScore > 25) && (r < (g + b) * 0.35);
            const isPurple = (purpleScore > 30) && (g < (r + b) * 0.35);

            if (!isCyan && !isPurple) {
                data[i] = data[i+1] = data[i+2] = 0;
            } else {
                if (isCyan) {
                    // Убираем "грязь": если пиксель кристалла темный, 
                    // мы не даем ему упасть в ноль, а оставляем "тлеть"
                    const brightness = (g + b) / 2;
                    const minLume = 40; // Минимальный порог, чтобы не было черных точек
                    
                    data[i] = 0; // В циане красный не нужен вообще
                    data[i+1] = brightness < minLume ? minLume * 0.8 : g * 0.85;
                    data[i+2] = brightness < minLume ? minLume : b * 0.95;
                } else {
                    // Фиолетовый оставляем как в v9, он был хорош
                    data[i] = r * 0.7;
                    data[i+1] = 0;
                    data[i+2] = b * 0.8;
                }
            }
        }

        await sharp(Buffer.from(data), { raw: { width, height, channels: 3 } })
            .blur(1.2) // Легкое размытие как в v9
            .toFile(OUTPUT);

        console.log("✨ Готово! Проверяй v12 в Sandbox.");
    } catch (e) { console.error(e.message); }
}
bake();
