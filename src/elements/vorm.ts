import Konva from 'konva';
import type { Pad, VormElement } from '../document/types';
import { baseGroup } from './base';
import { tracePad, type PathCtx } from './paths';

export function renderVorm(el: VormElement): Konva.Group {
  const g = baseGroup(el);
  if (el.vorm === 'lijn') {
    g.add(new Konva.Line({
      points: [0, el.hoogte / 2, el.breedte, el.hoogte / 2],
      stroke: el.rand ?? el.vulling ?? '#2D2A32',
      strokeWidth: el.randDikte,
      lineCap: 'round',
      hitStrokeWidth: Math.max(el.randDikte, 44),
      opacity: el.doorzichtigheid,
    }));
    return g;
  }
  const pad = el.vorm as Pad;
  g.add(new Konva.Shape({
    width: el.breedte,
    height: el.hoogte,
    fill: el.vulling ?? undefined,
    stroke: el.rand ?? undefined,
    strokeWidth: el.rand ? el.randDikte : 0,
    lineJoin: 'round',
    opacity: el.doorzichtigheid,
    sceneFunc(ctx, shape) {
      tracePad(ctx as unknown as PathCtx, pad, el.breedte, el.hoogte);
      ctx.fillStrokeShape(shape);
    },
  }));
  return g;
}
