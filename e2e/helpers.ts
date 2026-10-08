import { test as base, expect, type Page } from '@playwright/test';

export const test = base;
export { expect };

declare global {
  interface Window { __collage: any }
}

export async function openNieuweCollage(page: Page, formaat = 'vierkant'): Promise<void> {
  await page.goto('/');
  await page.click('#start-nieuw');
  await page.click(`#formaat-${formaat}`);
  await page.waitForFunction(() => window.__collage?.controller);
}

export function elementen(page: Page): Promise<any[]> {
  return page.evaluate(() => window.__collage.editor.get().collage.elementen);
}

// Echte PNG van 400x300, in de browser gemaakt (geen vaste base64 nodig)
export async function maakPng(page: Page): Promise<Buffer> {
  const b64 = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 400;
    c.height = 300;
    const x = c.getContext('2d')!;
    x.fillStyle = '#4ECDC4';
    x.fillRect(0, 0, 400, 300);
    x.fillStyle = '#FF6B6B';
    x.fillRect(100, 75, 200, 150);
    return c.toDataURL('image/png').split(',')[1];
  });
  return Buffer.from(b64, 'base64');
}

export async function tikOpCanvas(page: Page, x: number, y: number): Promise<void> {
  // Konva tekent (ook de hit-laag) via batchDraw in een animatieframe; wacht tot dat gebeurd is.
  await page.evaluate(() => new Promise<void>((klaar) => requestAnimationFrame(() => requestAnimationFrame(() => klaar()))));
  const p = await page.evaluate(([cx, cy]) => window.__collage.controller.naarScherm(cx, cy), [x, y]);
  await page.mouse.click(p.x, p.y);
}
