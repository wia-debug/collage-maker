import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  // WebKit (ipad-project) laat pagina's crashen bij meer parallelle workers op deze machine.
  workers: process.env.CI ? 1 : 2,
  use: { baseURL: 'http://localhost:4173', serviceWorkers: 'block' },
  webServer: [
    { command: 'npx peerjs --port 9000 --path / --expire_timeout 1000', port: 9000, reuseExistingServer: !process.env.CI, timeout: 60_000 },
    {
      command: 'npx vite build --mode e2e && npx vite preview --port 4173 --strictPort',
      port: 4173,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
  projects: [
    { name: 'ipad', use: { ...devices['iPad Pro 11 landscape'] } },
    { name: 'chromebook', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } } },
  ],
});
