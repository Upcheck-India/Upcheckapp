const sharp = require('sharp');
const path = require('path');

const SVG_INPUT = path.join(process.cwd(), 'assets', 'Icon.svg');
const ASSETS_DIR = path.join(process.cwd(), 'assets');

async function generateIcons() {
    try {
        // Load the SVG and extract the central portion (making it square)
        const svgBuffer = await sharp(SVG_INPUT).toBuffer();

        // Generate icon.png (1024x1024)
        await sharp(SVG_INPUT)
            .resize(1024, 1024, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
            .png()
            .toFile(path.join(ASSETS_DIR, 'icon.png'));
        console.log('Generated icon.png (1024x1024)');

        // Generate adaptive-icon.png (1024x1024)
        await sharp(SVG_INPUT)
            .resize(1024, 1024, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
            .png()
            .toFile(path.join(ASSETS_DIR, 'adaptive-icon.png'));
        console.log('Generated adaptive-icon.png (1024x1024)');

        // Generate splash-icon.png (200x200)
        await sharp(SVG_INPUT)
            .resize(200, 200, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
            .png()
            .toFile(path.join(ASSETS_DIR, 'splash-icon.png'));
        console.log('Generated splash-icon.png (200x200)');

        // Generate favicon.png (48x48)
        await sharp(SVG_INPUT)
            .resize(48, 48, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
            .png()
            .toFile(path.join(ASSETS_DIR, 'favicon.png'));
        console.log('Generated favicon.png (48x48)');

        console.log('\nAll icons generated successfully!');
    } catch (error) {
        console.error('Error generating icons:', error);
    }
}

generateIcons();
