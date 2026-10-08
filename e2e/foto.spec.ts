import { test, expect, openNieuweCollage, elementen, maakPng } from './helpers';

test('foto kiezen via het fotopaneel', async ({ page }) => {
  await openNieuweCollage(page);
  await page.click('#tool-foto');
  const chooser = page.waitForEvent('filechooser');
  await page.click('#foto-kiezen');
  await (await chooser).setFiles({ name: 'foto.png', mimeType: 'image/png', buffer: await maakPng(page) });
  await page.waitForFunction(() => window.__collage.editor.get().collage.elementen.length === 1);
  const [f] = await elementen(page);
  expect(f.type).toBe('foto');
  expect(f.assetId).toBeTruthy();
});

test('foto slepen op het canvas', async ({ page }) => {
  await openNieuweCollage(page);
  const b64 = (await maakPng(page)).toString('base64');
  await page.evaluate(async (data) => {
    const blob = await (await fetch(`data:image/png;base64,${data}`)).blob();
    const dt = new DataTransfer();
    dt.items.add(new File([blob], 'x.png', { type: 'image/png' }));
    const vak = document.querySelector('#canvas-vlak')!;
    const r = vak.getBoundingClientRect();
    vak.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }));
  }, b64);
  await page.waitForFunction(() => window.__collage.editor.get().collage.elementen.length === 1);
});

test('tekstbestand slepen geeft een melding en voegt niets toe', async ({ page }) => {
  await openNieuweCollage(page);
  await page.evaluate(() => {
    const dt = new DataTransfer();
    dt.items.add(new File(['hallo'], 'x.txt', { type: 'text/plain' }));
    document.querySelector('#canvas-vlak')!.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  });
  await expect(page.getByText('Dat is geen foto. Probeer een foto.')).toBeVisible();
  expect(await elementen(page)).toHaveLength(0);
});

test('geblokkeerde foto-URL slepen geeft een melding en voegt niets toe', async ({ page }) => {
  await openNieuweCollage(page);
  await page.evaluate(() => {
    const dt = new DataTransfer();
    dt.setData('text/uri-list', 'https://voorbeeld.invalid/x.jpg');
    document.querySelector('#canvas-vlak')!.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  });
  await expect(page.getByText('Deze foto kan ik niet ophalen. Bewaar hem eerst en voeg hem dan toe.')).toBeVisible();
  expect(await elementen(page)).toHaveLength(0);
});

async function kanKlembordEvent(page: import('@playwright/test').Page): Promise<boolean> {
  return page.evaluate(() => {
    try { return new ClipboardEvent('paste', { clipboardData: new DataTransfer() }).clipboardData !== null; } catch { return false; }
  });
}

test('tekstbestand plakken geeft een melding en voegt niets toe', async ({ page }) => {
  await openNieuweCollage(page);
  test.skip(!(await kanKlembordEvent(page)), 'ClipboardEvent met clipboardData wordt niet ondersteund in deze browser');
  await page.evaluate(() => {
    const dt = new DataTransfer();
    dt.items.add(new File(['hallo'], 'x.txt', { type: 'text/plain' }));
    document.body.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await expect(page.getByText('Dat is geen foto. Probeer een foto.')).toBeVisible();
  expect(await elementen(page)).toHaveLength(0);
});

test('foto plakken voegt een foto toe', async ({ page }) => {
  await openNieuweCollage(page);
  test.skip(!(await kanKlembordEvent(page)), 'ClipboardEvent met clipboardData wordt niet ondersteund in deze browser');
  const b64 = (await maakPng(page)).toString('base64');
  await page.evaluate(async (data) => {
    const blob = await (await fetch(`data:image/png;base64,${data}`)).blob();
    const dt = new DataTransfer();
    dt.items.add(new File([blob], 'x.png', { type: 'image/png' }));
    document.body.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  }, b64);
  await page.waitForFunction(() => window.__collage.editor.get().collage.elementen.length === 1);
});

test('foto slepen naast het canvas voegt de foto toe en laat de pagina staan', async ({ page }) => {
  await openNieuweCollage(page);
  const url = page.url();
  const b64 = (await maakPng(page)).toString('base64');
  const verwerkt = await page.evaluate(async (data) => {
    const blob = await (await fetch(`data:image/png;base64,${data}`)).blob();
    const dt = new DataTransfer();
    dt.items.add(new File([blob], 'x.png', { type: 'image/png' }));
    const ev = new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true });
    document.querySelector('#tool-foto')!.dispatchEvent(ev);
    return ev.defaultPrevented;
  }, b64);
  expect(verwerkt).toBe(true);
  await page.waitForFunction(() => window.__collage.editor.get().collage.elementen.length === 1);
  expect(page.url()).toBe(url);
});
