// Maakt pwa-bron/logo-rond.png: het logo zonder witte rand (transparante hoeken), bijgesneden tot het blauwe vlak.
// De witte rand wordt vanaf de randen van de afbeelding weggehaald (flood fill), zodat wit binnen het logo blijft.
import sharp from 'sharp';

const BLAUW = [31, 99, 234];
const { data, info } = await sharp('pwa-bron/logo.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = info;
const idx = (x, y) => (y * w + x) * 4;
// Alleen bijna-wit (licht en grijs) hoort bij de rand; de gele hand en het crème kader niet.
const isLicht = (i) => Math.min(data[i], data[i + 1], data[i + 2]) > 200 && Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]) < 25;

const gezien = new Uint8Array(w * h);
const stapel = [];
for (let x = 0; x < w; x++) stapel.push([x, 0], [x, h - 1]);
for (let y = 0; y < h; y++) stapel.push([0, y], [w - 1, y]);
while (stapel.length) {
  const [x, y] = stapel.pop();
  if (x < 0 || y < 0 || x >= w || y >= h || gezien[y * w + x]) continue;
  const i = idx(x, y);
  if (!isLicht(i)) continue;
  gezien[y * w + x] = 1;
  data[i + 3] = 0;
  stapel.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
}

// Zachte rand: blauwige pixels naast de weggehaalde rand krijgen een dekking uit hun rode kanaal (mengsel wit/blauw).
const randZacht = new Uint8Array(w * h);
for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
  if (gezien[y * w + x]) continue;
  const buur = gezien[y * w + x - 1] || gezien[y * w + x + 1] || gezien[(y - 1) * w + x] || gezien[(y + 1) * w + x];
  if (buur) randZacht[y * w + x] = 1;
}
for (let k = 0; k < 3; k++) {
  // Twee pixels diep: ook de buren van de eerste randring.
  const volgende = new Uint8Array(randZacht);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    if (gezien[y * w + x] || randZacht[y * w + x]) continue;
    if (randZacht[y * w + x - 1] || randZacht[y * w + x + 1] || randZacht[(y - 1) * w + x] || randZacht[(y + 1) * w + x]) volgende[y * w + x] = 1;
  }
  randZacht.set(volgende);
}
for (let p = 0; p < w * h; p++) {
  if (!randZacht[p]) continue;
  const i = p * 4;
  if (data[i + 2] < data[i] + 40) continue; // niet blauwig (bv. de gele hand): laten staan
  const a = Math.max(0, Math.min(1, (255 - data[i]) / (255 - BLAUW[0])));
  data[i] = BLAUW[0]; data[i + 1] = BLAUW[1]; data[i + 2] = BLAUW[2]; data[i + 3] = Math.round(a * 255);
}

let minX = w, minY = h, maxX = 0, maxY = 0;
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[idx(x, y) + 3] > 16) {
  if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
}
const zijde = Math.max(maxX - minX + 1, maxY - minY + 1);
await sharp(data, { raw: { width: w, height: h, channels: 4 } })
  .extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 })
  .resize(zijde, zijde, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile('pwa-bron/logo-rond.png');
console.log(`logo-rond.png: ${zijde}x${zijde}`);
