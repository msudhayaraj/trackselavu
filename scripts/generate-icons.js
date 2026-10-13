const sharp = require('sharp');
const path = require('path');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const SRC = path.join(__dirname, 'icon-source.svg');
const OUT_DIR = path.join(__dirname, '..', 'public', 'icons');

async function main() {
  for (const size of SIZES) {
    const outFile = path.join(OUT_DIR, `icon-${size}x${size}.png`);
    await sharp(SRC).resize(size, size).png().toFile(outFile);
    console.log(`wrote ${outFile}`);
  }

  // Also produce a plain favicon-sized PNG for the browser tab.
  await sharp(SRC).resize(32, 32).png().toFile(path.join(__dirname, '..', 'public', 'favicon-32.png'));
  console.log('wrote favicon-32.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
