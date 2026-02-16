const sharp = require('sharp');
const fs = require('fs');

const INPUT = 'Emissive/texture.jpeg';
const OUTPUT = 'Emissive/emissive-mythic.png';

async function bake() {
    console.log("💎 Mythic v11: Алмазная полировка. Уничтожаем грязь на циане...");
    if (!fs.existsSync(INPUT)) return console.error("❌ Файл не найден");

    try {
        const image = sharp(INPUT);
        const { width, height } = await image.metadata();
        const buffer = await image.raw().toBuffer();
        const data = new Uint8ClampedArray(buffer);

        for (let i = 0; i < data.length; i += 3) {
            let r = data[i], g = data[i+1], b = data[i+2];

            const cyanScore = (g + b) / 2 - r;
            const purpleScore = (r + b) / 2 - g;

            // Ловим циан (теперь чуть мягче порог - 20)
            const isCyan = (cyanScore > 20) && (r < (g + b) * 0.45);
            const isPurple = (purpleScore > 25);

            if (!isCyan && !isPurple) {
                data[i] = data[i+1] = data[i+2] = 0;
            } else {
                if (isCyan) {
                    // ГЛАВНАЯ ФИШКА: Убираем грязь. 
                    // Если пиксель синий, но темный (lum < 90), мы его бустим (умножаем яркость)
                    const lum = (g + b) / 2;
                    const boost = lum < 90 ? 1.7 : 1.0; 

                    data[i] = r * 0.01; 
                    data[i+1] = Math.min(255, g * 0.85 * boost); 
                    data[i+2] = Math.min(255, b * 0.95 * boost); 
                } else {
                    data[i] = r * 0.7;   
                    data[i+1] = g * 0.01;
                    data[i+2] = b * 0.8;  
                }
            }
        }

        await sharp(Buffer.from(data), { raw: { width, height, channels: 3 } })
            .blur(1.5) // Легкое размытие для финального лоска
            .toFile(OUTPUT);

        console.log("✨ Готово! v11: Кристаллы чисты, грязь удалена.");
    } catch (e) { console.error(e.message); }
}
bake();
