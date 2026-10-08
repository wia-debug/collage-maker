import Konva from 'konva';
import type { Achtergrond } from '../document/types';
import type { RenderCtx } from './base';
import { maakPatroon } from './patronen';
import { dekUitsnede } from '../editor/uitsnede';

export function verloopPunten(hoek: number, b: number, h: number) {
  const r = (hoek * Math.PI) / 180;
  const half = Math.hypot(b, h) / 2;
  const dx = Math.cos(r) * half, dy = Math.sin(r) * half;
  return { start: { x: b / 2 - dx, y: h / 2 - dy }, eind: { x: b / 2 + dx, y: h / 2 + dy } };
}

export function renderAchtergrond(a: Achtergrond, breedte: number, hoogte: number, ctx: RenderCtx): Konva.Shape {
  const basis = { x: 0, y: 0, width: breedte, height: hoogte, listening: false, name: 'achtergrond' };
  switch (a.soort) {
    case 'kleur':
      return new Konva.Rect({ ...basis, fill: a.kleur });
    case 'verloop': {
      const p = verloopPunten(a.hoek, breedte, hoogte);
      return new Konva.Rect({ ...basis, fillLinearGradientStartPoint: p.start, fillLinearGradientEndPoint: p.eind, fillLinearGradientColorStops: [0, a.van, 1, a.naar] });
    }
    case 'patroon':
      return new Konva.Rect({ ...basis, fillPatternImage: maakPatroon(a.patroon, a.kleur, a.achtergrondkleur) as unknown as HTMLImageElement, fillPatternRepeat: 'repeat' });
    case 'foto': {
      const img = ctx.image(a.assetId);
      if (!img) return new Konva.Rect({ ...basis, fill: '#FFFFFF' });
      const bw = (img as HTMLImageElement).naturalWidth || (img as HTMLCanvasElement).width;
      const bh = (img as HTMLImageElement).naturalHeight || (img as HTMLCanvasElement).height;
      const u = dekUitsnede(bw, bh, breedte, hoogte);
      return new Konva.Image({ ...basis, image: img as HTMLImageElement, crop: { x: u.x, y: u.y, width: u.breedte, height: u.hoogte } });
    }
  }
}
