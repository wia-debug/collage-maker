import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const core = join(root, 'node_modules/@phosphor-icons/core/assets');
const icons = JSON.parse(readFileSync(join(root, 'src/assets/icon-names.json'), 'utf8'));
const packs = JSON.parse(readFileSync(join(root, 'src/assets/sticker-packs.json'), 'utf8'));
const missing = [];

const uiOut = join(root, 'src/assets/icons');
mkdirSync(uiOut, { recursive: true });
for (const name of icons) {
  const src = join(core, 'bold', `${name}-bold.svg`);
  if (!existsSync(src)) { missing.push(`bold/${name}`); continue; }
  copyFileSync(src, join(uiOut, `${name}.svg`));
}

for (const pack of packs) {
  const out = join(root, 'public/stickers', pack.id);
  mkdirSync(out, { recursive: true });
  for (const name of pack.stickers) {
    const src = join(core, 'duotone', `${name}-duotone.svg`);
    if (!existsSync(src)) { missing.push(`duotone/${name} (pakket ${pack.id})`); continue; }
    copyFileSync(src, join(out, `${name}.svg`));
  }
}

if (missing.length) {
  console.error('Ontbrekende Phosphor-iconen:\n' + missing.join('\n'));
  process.exit(1);
}
console.log(`Gekopieerd: ${icons.length} UI-iconen, ${packs.reduce((n, p) => n + p.stickers.length, 0)} stickers.`);
