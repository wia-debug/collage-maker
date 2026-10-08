import Konva from 'konva';
import type { FotoElement } from '../document/types';
import { baseGroup, type RenderCtx } from './base';
import { kaderNodes } from './kaders';
import { pasFilterToe } from './filters';
import { tracePad, type PathCtx } from './paths';

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
  const node = new Konva.Image({
    image: img, width: el.breedte, height: el.hoogte,
    ...(u ? { crop: { x: u.x, y: u.y, width: u.breedte, height: u.hoogte } } : {}),
  });
  if (el.filter !== 'normaal' || el.helderheid || el.contrast) {
    node.filters([(d: ImageData) => pasFilterToe(d, el.filter, el.helderheid, el.contrast)]);
    node.cache({ pixelRatio: 1 });
  }
  return node;
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
  const leeg = node.name() === 'leeg-vak';
  const binnen = new Konva.Group({ name: 'foto-binnen' });
  if (el.masker !== 'rechthoek' && !leeg) {
    binnen.clipFunc((c) => tracePad(c as unknown as PathCtx, el.masker, el.breedte, el.hoogte));
  }
  binnen.add(node);
  const { achter, voor } = leeg ? { achter: [], voor: [] } : kaderNodes(el.kader.stijl, el.kader.kleur, el.breedte, el.hoogte, el.masker);
  g.add(...achter);
  g.add(binnen);
  if (leeg) g.add(plusTeken(el));
  g.add(...voor);
  return g;
}
