import { defineConfig, minimal2023Preset as basis } from '@vite-pwa/assets-generator/config';

// Bron: pwa-bron/logo-rond.png (gemaakt met `node scripts/maak-logo.mjs`): logo met transparante hoeken.
// Transparante iconen zonder extra rand; iPad- en maskable-icoon op het blauw van het logo (die mogen niet transparant zijn).
const BLAUW = '#1F63EA';

export default defineConfig({
  preset: {
    ...basis,
    transparent: { ...basis.transparent, padding: 0 },
    maskable: { ...basis.maskable, padding: 0.1, resizeOptions: { background: BLAUW } },
    apple: { ...basis.apple, padding: 0, resizeOptions: { background: BLAUW } },
  },
  images: ['pwa-bron/logo-rond.png'],
});
