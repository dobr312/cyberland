const sharp = require('sharp');
const fs = require('fs');

const INPUT = 'Emissive/texture.jpeg';
const OUTPUT = 'Emissive/emissive-mythic.png';

async function bake() {
    console.log("💎 Mythic v6: Ювелирная настройка глубины и текстуры...");
    if (!fs.existsSync(INPUT)) {
        console.error("❌ Файл не найден: " + INPUT);
        return;
    }

    try {
        const image = sharp(INPUT);
        const { width, height } = await image.metadata();
        const buffer = await image.raw().toBuffer();
        const data = new Uint8ClampedArray(buffer);

        for (let i = 0; i < data.length; i += 3) {
            let r = data[i], g = data[i+1], b = data[i+2];

            const purpleScore = (r + b) / 2 - g;
            const cyanScore = (g + b) / 2 - r;

            const isPurple = purpleScore > 10;
            const isCyan = cyanScore > 15;

            if (!isCyan && !isPurple) {
                data[i] = data[i+1] = data[i+2] = 0;
            } else {
                if (isCyan) {
                    // БИРЮЗА (Неон + Кристаллы)
                    // Снижаем множители, чтобы проявить текстуру на кристаллах.
                    // Неон останется ярким, но кристаллы перестанут быть "плоскими".
                    data[i] = r * 0.05; 
                    data[i+1] = Math.min(255, g * 1.1); // Было 1.25, стало 1.1
                    data[i+2] = Math.min(255, b * 1.2); // Было 1.35, стало 1.2
                } else {
                    // ФИОЛЕТОВЫЙ (Главный кристалл)
                    // Делаем его еще темнее для благородного, глубокого свечения.
                    data[i] = Math.min(255, r * 0.9);   // Было 1.1, стало 0.9
                    data[i+1] = g * 0.05;
                    data[i+2] = Math.min(255, b * 1.0); // Было 1.2, стало 1.0 (оригинальная яркость синего)
                }
            }
        }

        await sharp(Buffer.from(data), { raw: { width, height, channels: 3 } })
            .blur(3.0)
            .toFile(OUTPUT);

        console.log("✨ Успех! v6 готова. Кристаллы должны стать глубже.");
    } catch (e) { 
        console.error("❌ Ошибка:", e.message); 
    }
}
bake();
