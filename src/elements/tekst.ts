import Konva from 'konva';
import type { TekstElement } from '../document/types';
import { familie, fontStijl } from '../assets/fonts';
import { baseGroup, type RenderCtx } from './base';
import { renderWordArt } from './wordart';

export function renderTekst(el: TekstElement, _ctx: RenderCtx): Konva.Group {
  if (el.wordart) return renderWordArt(el);
  const t = new Konva.Text({
    text: el.tekst,
    fontFamily: familie(el.lettertype),
    fontSize: el.grootte,
    fontStyle: fontStijl(el),
    fill: el.kleur,
    align: el.uitlijning,
    lineHeight: el.regelafstand,
    width: el.breedte,
    padding: el.ballon ? el.grootte * 0.5 : 0,
    stroke: el.omlijning?.kleur,
    strokeWidth: el.omlijning?.dikte ?? 0,
    fillAfterStrokeEnabled: true,
    lineJoin: 'round',
    shadowEnabled: el.schaduw,
    shadowColor: 'rgba(0,0,0,0.35)',
    shadowBlur: el.grootte * 0.12,
    shadowOffset: { x: el.grootte * 0.06, y: el.grootte * 0.08 },
  });
  const g = baseGroup({ ...el, hoogte: t.height() });
  if (el.ballon) {
    g.add(new Konva.Rect({ width: el.breedte, height: t.height(), fill: el.ballon, cornerRadius: el.grootte * 0.6, shadowColor: 'rgba(0,0,0,0.15)', shadowBlur: 10, shadowOffset: { x: 0, y: 3 } }));
  }
  g.add(t);
  return g;
}
