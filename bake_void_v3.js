const sharp = require('sharp');
const fs = require('fs');

const INPUT = 'Emissive/texture.png'; 
const OUTPUT = 'Emissive/emissive-void.png';

async function bake() {
    console.log("🌌 Void Land v3: Вытаскиваем все фиолетовые жилы и кристаллы...");
    if (!fs.existsSync(INPUT)) return console.error("❌ Файл не найден!");

    try {
        const image = sharp(INPUT);
        const { width, height } = await image.metadata();
        const buffer = await image.raw().toBuffer();
        const data = new Uint8ClampedArray(buffer);

        for (let i = 0; i < data.length; i += 3) {
            let r = data[i], g = data[i+1], b = data[i+2];

            // 1. ПРОВЕРКА НА ФИОЛЕТОВЫЙ СПЕКТР
            // В чистом неоне Синий (B) должен быть минимум в 1.4 раза больше Зеленого (G)
            // И Красный (R) должен быть значимым.
            const isPurpleSpectrum = (b > g * 1.3) && (r > g * 1.1);

            // 2. ОТСЕКАЕМ ТЕМНЫЙ МУСОР
            // Металл в тенях очень тусклый. Нам нужны только те пиксели, 
            // где хотя бы один канал (R или B) выше 80.
            const isNotTooDark = (r > 80 || b > 80);

            if (isPurpleSpectrum && isNotTooDark) {
                // Оставляем РОДНОЙ цвет
                data[i] = r; 
                data[i+1] = g;
                data[i+2] = b;
            } else {
                data[i] = data[i+1] = data[i+2] = 0;
            }
        }

        await sharp(Buffer.from(data), { raw: { width, height, channels: 3 } })
            .toFile(OUTPUT);

        console.log("✨ Готово! Теперь все жилы должны быть на месте.");
    } catch (e) { console.error("❌ Ошибка:", e.message); }
}
bake();
