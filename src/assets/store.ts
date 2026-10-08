import type { Collage, StickerElement } from '../document/types';
import { nieuwId } from '../document/create';
import { recolorSvg, stickerUrl } from './stickers';
import type { RenderCtx } from '../elements/base';

export const stickerKey = (sticker: string, kleur: string): string => `sticker:${sticker}:${kleur}`;

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Afbeelding laden mislukt'));
    img.src = src;
  });
}

export class AssetStore implements RenderCtx {
  private images = new Map<string, HTMLImageElement>();
  private blobs = new Map<string, Blob>();
  private svgCache = new Map<string, Promise<string>>();

  image(key: string): HTMLImageElement | undefined { return this.images.get(key); }
  blob(id: string): Blob | undefined { return this.blobs.get(id); }

  async addBlob(blob: Blob, id: string = nieuwId()): Promise<string> {
    const img = await loadImage(URL.createObjectURL(blob));
    this.blobs.set(id, blob);
    this.images.set(id, img);
    return id;
  }

  async ensureSticker(sticker: string, kleur: string): Promise<string> {
    const key = stickerKey(sticker, kleur);
    if (this.images.has(key)) return key;
    let svg = this.svgCache.get(sticker);
    if (!svg) {
      svg = fetch(stickerUrl(sticker)).then((r) => {
        if (!r.ok) throw new Error(`Sticker ${sticker} niet gevonden`);
        return r.text();
      });
      this.svgCache.set(sticker, svg);
    }
    const url = URL.createObjectURL(new Blob([recolorSvg(await svg, kleur)], { type: 'image/svg+xml' }));
    this.images.set(key, await loadImage(url));
    return key;
  }

  async preload(c: Collage): Promise<void> {
    const stickers = c.elementen.filter((e): e is StickerElement => e.type === 'sticker');
    await Promise.all(stickers.map((s) => this.ensureSticker(s.sticker, s.kleur)));
  }
}
