import Konva from 'konva';
import type { StickerElement } from '../document/types';
import { stickerKey } from '../assets/store';
import { baseGroup, zichtbaarheid, type RenderCtx } from './base';

export function renderSticker(el: StickerElement, ctx: RenderCtx): Konva.Group {
  const g = baseGroup(el);
  g.opacity(zichtbaarheid(el.doorzichtigheid));
  const img = ctx.image(stickerKey(el.sticker, el.kleur));
  g.add(img
    ? new Konva.Image({ image: img, width: el.breedte, height: el.hoogte })
    : new Konva.Rect({ width: el.breedte, height: el.hoogte, fill: '#EDE3D3', cornerRadius: 16 }));
  return g;
}
