const sharp = require('sharp');
const fs = require('fs');

async function bake() {
    const INPUT = 'Emissive/texture.jpg';
    const OUTPUT = 'Emissive/emissive-ice.png';
    const THRESHOLD = 250; 

    if (!fs.existsSync(INPUT)) {
        return console.error("❌ texture.jpg не найден в Emissive/");
    }

    try {
        const { data, info } = await sharp(INPUT).raw().toBuffer({ resolveWithObject: true });
        const pixels = new Uint8ClampedArray(data);

        for (let i = 0; i < pixels.length; i += 3) {
            // Если пиксель очень яркий (белый), красим в ледяной голубой
            if (pixels[i] >= THRESHOLD && pixels[i+1] >= THRESHOLD && pixels[i+2] >= THRESHOLD) {
                pixels[i] = 0;     // R
                pixels[i+1] = 191; // G (Cyan-ish)
                pixels[i+2] = 255; // B (Deep Sky Blue)
            } else {
                pixels[i] = 0; pixels[i+1] = 0; pixels[i+2] = 0;
            }
        }

        await sharp(pixels, { raw: { width: info.width, height: info.height, channels: 3 } })
            .toFile(OUTPUT);
        console.log("💎 v31: Ледяной голубой неон готов!");
    } catch (e) { console.error(e); }
}
bake();
