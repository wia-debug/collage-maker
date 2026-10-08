import Konva from 'konva';
import type { FotoElement } from '../document/types';
import { baseGroup, type RenderCtx } from './base';

export function fotoNode(el: FotoElement, ctx: RenderCtx): Konva.Shape {
  const img = el.assetId ? ctx.image(el.assetId) : undefined;
  if (!img) {
    return new Konva.Rect({
      name: 'leeg-vak', width: el.breedte, height: el.hoogte,
      fill: '#FFF3E0', stroke: '#FF9F1C', strokeWidth: Math.max(4, el.breedte / 80),
      dash: [18, 12], cornerRadius: 12,
    });
  }
  const u = el.uitsnede;
  return new Konva.Image({
    image: img, width: el.breedte, height: el.hoogte,
    ...(u ? { crop: { x: u.x, y: u.y, width: u.breedte, height: u.hoogte } } : {}),
  });
}

function plusTeken(el: FotoElement): Konva.Shape {
  const r = Math.min(el.breedte, el.hoogte) * 0.12;
  return new Konva.Shape({
    listening: false, stroke: '#FF9F1C', strokeWidth: r * 0.35, lineCap: 'round',
    sceneFunc(c, s) {
      c.beginPath();
      c.moveTo(el.breedte / 2 - r, el.hoogte / 2); c.lineTo(el.breedte / 2 + r, el.hoogte / 2);
      c.moveTo(el.breedte / 2, el.hoogte / 2 - r); c.lineTo(el.breedte / 2, el.hoogte / 2 + r);
      c.strokeShape(s);
    },
    name: 'leeg-vak',
  });
}

export function renderFoto(el: FotoElement, ctx: RenderCtx): Konva.Group {
  const g = baseGroup(el);
  const node = fotoNode(el, ctx);
  g.add(node);
  if (node.name() === 'leeg-vak') g.add(plusTeken(el));
  return g;
}
