import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bron = join(root, 'node_modules/@imgly/background-removal-data/dist');
const doel = join(root, 'public/modellen/achtergrond');
// In @imgly/background-removal 1.4.5 heet het isnet_quint8-model 'small' (sleutel /models/small).
const MODEL = '/models/small';

if (!existsSync(join(bron, 'resources.json'))) {
  console.error('Achtergrondmodel niet gevonden in node_modules/@imgly/background-removal-data.');
  process.exit(1);
}
const alles = JSON.parse(readFileSync(join(bron, 'resources.json'), 'utf8'));
const nodig = Object.fromEntries(Object.entries(alles).filter(([k]) => k === MODEL || k.startsWith('/onnxruntime-web/')));
if (!nodig[MODEL]) {
  console.error(`Model ${MODEL} ontbreekt in resources.json.`);
  process.exit(1);
}
mkdirSync(doel, { recursive: true });
let n = 0;
for (const r of Object.values(nodig)) {
  for (const c of r.chunks) {
    const naam = c.name ?? c.hash;
    copyFileSync(join(bron, naam), join(doel, naam));
    n++;
  }
}
writeFileSync(join(doel, 'resources.json'), JSON.stringify(nodig));
console.log(`Achtergrondmodel gekopieerd: ${n} bestanden.`);
