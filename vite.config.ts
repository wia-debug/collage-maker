import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { playwright } from '@vitest/browser-playwright';
import { VitePWA } from 'vite-plugin-pwa';
import basicSsl from '@vitejs/plugin-basic-ssl';

const pwa = VitePWA({
  registerType: 'prompt',
  pwaAssets: { config: true },
  manifest: {
    name: 'Collagemaker',
    short_name: 'Collage',
    description: 'Maak je eigen collages met foto\'s, stickers en tekst.',
    lang: 'nl',
    start_url: '.',
    display: 'standalone',
    orientation: 'any',
    background_color: '#FFF8EE',
    theme_color: '#FF6B6B',
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,woff2,png,ico}'],
    maximumFileSizeToCacheInBytes: 5_000_000,
    cleanupOutdatedCaches: true,
    clientsClaim: true,
    skipWaiting: false,
  },
});

// Onder Vitest is er geen PWA-plugin; dan lossen we de virtuele registratie-module op als lege stub.
const pwaStub = {
  name: 'pwa-register-stub',
  resolveId: (id: string) => (id === 'virtual:pwa-register' ? '\0pwa-register-stub' : undefined),
  load: (id: string) => (id === '\0pwa-register-stub' ? 'export const registerSW = () => () => {};' : undefined),
};

export default defineConfig(({ mode }) => ({
  plugins: [svelte(), ...(process.env.VITEST ? [pwaStub] : [pwa]), ...(mode === 'lan' ? [basicSsl()] : [])],
  optimizeDeps: { include: ['peerjs'] },
  test: {
    include: ['src/**/*.test.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
  },
}));
