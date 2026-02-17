const sharp = require('sharp');
const fs = require('fs');

// Исправленный путь к файлу
const INPUT = 'Emissive/texture.png'; 
const OUTPUT = 'Emissive/emissive-void.png';

async function bake() {
    console.log("🌌 Void Land: Извлекаем фиолетовую энергию...");
    if (!fs.existsSync(INPUT)) {
        return console.error("❌ Ошибка: Файл не найден по пути " + INPUT + ". Проверь, что он лежит в папке Emissive!");
    }

    try {
        const image = sharp(INPUT);
        const { width, height } = await image.metadata();
        const buffer = await image.raw().toBuffer();
        const data = new Uint8ClampedArray(buffer);

        for (let i = 0; i < data.length; i += 3) {
            let r = data[i], g = data[i+1], b = data[i+2];

            // ФОРМУЛА ДЛЯ ФИОЛЕТОВОГО НЕОНА
            // Мы ищем чистый фиолетовый (высокие R и B при низком G)
            const purpleScore = (r + b) / 2 - g;

            // Жесткий фильтр для отсечения металла (грязного фиолетового)
            const isNeon = (purpleScore > 55) && (r > 60 || b > 60);

            if (!isNeon) {
                data[i] = data[i+1] = data[i+2] = 0;
            } else {
                // Оставляем как есть, чтобы не пережечь текстуру
                data[i] = r; 
                data[i+1] = g;
                data[i+2] = b;
            }
        }

        await sharp(Buffer.from(data), { raw: { width, height, channels: 3 } })
            .blur(0.5) 
            .toFile(OUTPUT);

        console.log("✨ Успех! Карта " + OUTPUT + " создана.");
    } catch (e) { console.error("❌ Ошибка обработки:", e.message); }
}
bake();
