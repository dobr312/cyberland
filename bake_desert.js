const sharp = require('sharp');
const fs = require('fs');

const INPUT = 'Emissive/texture-ia.jpeg'; 
const OUTPUT = 'Emissive/emissive-desert.png';

async function bake() {
    console.log("🌵 Усиленная фильтрация: Вырезаем песок полностью...");
    try {
        const image = sharp(INPUT);
        const { width, height } = await image.metadata();
        const buffer = await image.raw().toBuffer();
        const data = new Uint8ClampedArray(buffer);

        for (let i = 0; i < data.length; i += 3) {
            let r = data[i], g = data[i+1], b = data[i+2];

            // 1. УЖЕСТОЧЕННЫЙ ДЕТЕКТОР
            // Увеличиваем разрыв между R и B до 110. Песок точно не пройдет.
            const saturation = r - b; 
            
            // Добавляем условие: R должен быть больше 160, чтобы отсечь тусклый песок
            const isCrystal = (saturation > 110 && r > 160);
            
            let intensity = isCrystal ? Math.max(0, Math.min(1, (saturation - 110) / 50)) : 0;

            if (intensity === 0) {
                data[i] = data[i+1] = data[i+2] = 0;
            } else {
                // 2. ФОРМИРУЕМ ЦВЕТ
                data[i] = Math.min(255, r * 1.8 * intensity); // Усиливаем яркость неона
                data[i+1] = Math.min(255, g * 0.7 * intensity); // Делаем цвет более "оранжевым", а не желтым
                data[i+2] = 0; // Никакого синего - защита от белизны
            }
        }

        // 3. СГЛАЖИВАНИЕ (3.0 достаточно для чистого результата)
        await sharp(Buffer.from(data), { raw: { width, height, channels: 3 } })
            .blur(3.0) 
            .toFile(OUTPUT);

        console.log("✨ Готово! Проверь теперь, песок должен исчезнуть.");
    } catch (e) { console.error("❌ Ошибка:", e.message); }
}
bake();
