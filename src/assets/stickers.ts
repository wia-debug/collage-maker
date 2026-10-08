import packs from './sticker-packs.json';

export interface StickerPack { id: string; naam: string; icoon: string; stickers: string[] }

export const STICKER_PACKS: StickerPack[] = packs;

export function stickerUrl(sticker: string): string {
  return `${import.meta.env.BASE_URL}stickers/${sticker}.svg`;
}

export function recolorSvg(svg: string, kleur: string, px = 512): string {
  return svg
    .replace(/currentColor/g, kleur)
    .replace(/<svg\b([^>]*)>/, (_m, attrs: string) => {
      const zonderMaat = attrs.replace(/\s(width|height)="[^"]*"/g, '');
      return `<svg${zonderMaat} width="${px}" height="${px}">`;
    });
}
