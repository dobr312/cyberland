const sharp = require('sharp');
const fs = require('fs');

const INPUT = 'Emissive/texture.JPG'; 
const OUTPUT = 'Emissive/emissive-ice.png';

async function bake() {
    console.log("❄️ Ice Land v3: Хирургия неона. Вырезаем снег по цветовому вектору...");
    if (!fs.existsSync(INPUT)) return console.error("❌ Файл texture.JPG не найден!");

    try {
        const image = sharp(INPUT);
        const { width, height } = await image.metadata();
        const buffer = await image.raw().toBuffer();
        const data = new Uint8ClampedArray(buffer);

        for (let i = 0; i < data.length; i += 3) {
            let r = data[i], g = data[i+1], b = data[i+2];
            
            // 1. ЖЕСТКИЙ ЦВЕТОВОЙ ФИЛЬТР
            // Чтобы не зацепить снег, синий должен доминировать радикально.
            // В голубом неоне (Cyan) синий и зеленый высокие, а красный - низкий.
            const isNeonColor = (b > r * 1.6) && (b > 60); 

            // 2. ПОРОГ ЯРКОСТИ (только для цветных зон)
            // Мы берем только те зоны, которые реально "горят" на твоих фото
            const isBrightNeon = (b + g > 250);

            if (isNeonColor && isBrightNeon) {
                // Сохраняем чистый цвет неона
                data[i] = r;
                data[i+1] = g;
                data[i+2] = b;
            } else {
                // Всё остальное (снег, металл, тени) - в ноль
                data[i] = data[i+1] = data[i+2] = 0;
            }
        }

        await sharp(Buffer.from(data), { raw: { width, height, channels: 3 } })
            .blur(0.8) // Совсем легкий блюр, чтобы края не были "зубчатыми"
            .toFile(OUTPUT);

        console.log("✨ Ice v3 готова. Проверь карту - она должна быть почти черной с тонкими синими линиями.");
    } catch (e) { console.error("❌ Ошибка:", e.message); }
}
bake();
