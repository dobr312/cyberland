const sharp = require('sharp');
const fs = require('fs');

const INPUT = 'Emissive/texture.jpeg';
const OUTPUT = 'Emissive/emissive-mythic.png';

async function bake() {
    console.log("🚀 Mythic v10: ФИНАЛЬНАЯ ЧИСТКА. Убираем остатки грязи...");
    if (!fs.existsSync(INPUT)) return console.error("❌ Нет файла: " + INPUT);

    try {
        const image = sharp(INPUT);
        const { width, height } = await image.metadata();
        const buffer = await image.raw().toBuffer();
        const data = new Uint8ClampedArray(buffer);

        for (let i = 0; i < data.length; i += 3) {
            let r = data[i], g = data[i+1], b = data[i+2];

            const purpleScore = (r + b) / 2 - g;
            const cyanScore = (g + b) / 2 - r;

            // 1. Усиленный фильтр чистоты
            // Теперь мы требуем, чтобы сумма полезных каналов была значительно выше "шумного" канала
            const isCyan = (cyanScore > 35) && (r < (g + b) * 0.3); 
            const isPurple = (purpleScore > 30) && (g < (r + b) * 0.3);

            // 2. Порог яркости (убираем тусклую "пыль")
            const brightness = (r + g + b) / 3;
            const isBrightEnough = brightness > 50; 

            if ((!isCyan && !isPurple) || !isBrightEnough) {
                data[i] = data[i+1] = data[i+2] = 0;
            } else {
                if (isCyan) {
                    // Синие кристаллы: делаем их чуть контрастнее
                    data[i] = r * 0.01; 
                    data[i+1] = g * 0.8; 
                    data[i+2] = b * 0.9; 
                } else {
                    // Фиолетовый: сохраняем глубину
                    data[i] = r * 0.65;   
                    data[i+1] = g * 0.01;
                    data[i+2] = b * 0.75;  
                }
            }
        }

        await sharp(Buffer.from(data), { raw: { width, height, channels: 3 } })
            .blur(1.2) // Минимальный блюр, чтобы не раздувать грязь
            .toFile(OUTPUT);

        console.log("✨ ВЫПОЛНЕНО: Карта v10 стерильна.");
    } catch (e) { console.error("❌ Ошибка:", e.message); }
}
bake();
