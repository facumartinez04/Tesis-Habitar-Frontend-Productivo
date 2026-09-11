import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.resolve(__dirname, '../public');
const iconsDir = path.join(publicDir, 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// SVG template with solid brand background #0F6E56 and crisp white Habitar symbol
function createHabitarIconSvg(size, symbolScale = 0.65) {
  const symbolPixelSize = size * symbolScale;
  const scale = symbolPixelSize / 256;
  const tx = (size - 256 * scale) / 2;
  const ty = (size - 256 * scale) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#0F6E56" />
  <g transform="translate(${tx.toFixed(2)}, ${ty.toFixed(2)}) scale(${scale.toFixed(4)})" stroke="#FFFFFF" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <!-- Cubierta exterior del libro -->
    <path d="M 44 60 L 44 168 C 72 172, 102 184, 128 202 C 154 184, 184 172, 212 168 L 212 60" />
    
    <!-- Páginas interiores del libro -->
    <path d="M 128 72 C 104 50, 74 46, 56 46 L 56 156 C 78 156, 106 166, 128 186 C 150 166, 178 156, 200 156 L 200 46 C 182 46, 152 50, 128 72 Z" stroke-width="10" />
    
    <!-- Hojas inferiores -->
    <path d="M 56 156 C 78 160, 106 172, 128 190 C 150 172, 178 160, 200 156" />
    <path d="M 44 168 C 72 174, 102 188, 128 204 C 154 188, 184 174, 212 168" />
    
    <!-- Techo de la casa -->
    <path d="M 74 98 L 128 48 L 182 98" stroke-width="13" />
    
    <!-- Chimenea -->
    <path d="M 162 76 L 162 48 L 172 48 L 172 85" stroke-width="7" fill="#FFFFFF" />
    
    <!-- Columnas / Paredes de la casa -->
    <line x1="94" y1="92" x2="94" y2="150" stroke-width="11" />
    <line x1="162" y1="92" x2="162" y2="150" stroke-width="11" />
  </g>
</svg>`;
}

async function generateIcons() {
  console.log('Generando iconos PWA de Habitar...');

  // 1. icon-192.png
  const svg192 = Buffer.from(createHabitarIconSvg(192, 0.68));
  await sharp(svg192).png().toFile(path.join(iconsDir, 'icon-192.png'));
  console.log('✓ icon-192.png generado');

  // 2. icon-512.png
  const svg512 = Buffer.from(createHabitarIconSvg(512, 0.68));
  await sharp(svg512).png().toFile(path.join(iconsDir, 'icon-512.png'));
  console.log('✓ icon-512.png generado');

  // 3. icon-maskable-512.png (safe area is 80%, so symbol scale around 0.55)
  const svgMaskable512 = Buffer.from(createHabitarIconSvg(512, 0.55));
  await sharp(svgMaskable512).png().toFile(path.join(iconsDir, 'icon-maskable-512.png'));
  console.log('✓ icon-maskable-512.png generado');

  // 4. apple-touch-icon.png (180x180)
  const svgApple = Buffer.from(createHabitarIconSvg(180, 0.65));
  await sharp(svgApple).png().toFile(path.join(iconsDir, 'apple-touch-icon.png'));
  console.log('✓ apple-touch-icon.png generado');

  // 5. favicon.ico (32x32 from 64x64 buffer)
  const svgFavicon = Buffer.from(createHabitarIconSvg(64, 0.72));
  await sharp(svgFavicon).resize(32, 32).png().toFile(path.join(publicDir, 'favicon.ico'));
  console.log('✓ favicon.ico generado');

  console.log('¡Todos los iconos PWA de Habitar fueron generados con éxito!');
}

generateIcons().catch(err => {
  console.error('Error generando iconos:', err);
  process.exit(1);
});
