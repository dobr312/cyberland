const sharp = require('sharp');
const fs = require('fs');

const INPUT = 'Emissive/texture.png'; 
const OUTPUT = 'Emissive/emissive-void.png';

async function bake() {
    console.log("🌌 Void Land v4: Максимальная изоляция неона от металла...");
    if (!fs.existsSync(INPUT)) return console.error("❌ Файл не найден!");

    try {
        const image = sharp(INPUT);
        const { width, height } = await image.metadata();
        const buffer = await image.raw().toBuffer();
        const data = new Uint8ClampedArray(buffer);

        for (let i = 0; i < data.length; i += 3) {
            let r = data[i], g = data[i+1], b = data[i+2];

            // 1. ПРОВЕРКА НА "ЯДОВИТОСТЬ" ЦВЕТА
            // В неоне и кристаллах на этой карте G (зеленый) почти отсутствует.
            // В металле G всегда выше 40-50 из-за серого подтона.
            const isPureNeon = (b > g * 2.2) && (r > g * 1.5);

            // 2. ПОРОГ НАСЫЩЕННОСТИ
            // Неон должен быть либо очень ярким, либо очень насыщенным.
            const isNotGray = (r + b) > 120;

            if (isPureNeon && isNotGray) {
                // Сохраняем РОДНОЙ ФИОЛЕТОВЫЙ без изменений
                data[i] = r; 
                data[i+1] = g;
                data[i+2] = b;
            } else {
                // Всё остальное - в тотальную тьму
                data[i] = data[i+1] = data[i+2] = 0;
            }
        }

        await sharp(Buffer.from(data), { raw: { width, height, channels: 3 } })
            .toFile(OUTPUT);

        console.log("✨ Готово! Теперь на карте должны остаться только острые жилы и грани.");
    } catch (e) { console.error("❌ Ошибка:", e.message); }
}
bake();
