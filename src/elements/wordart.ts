import Konva from 'konva';
import type { TekstElement } from '../document/types';
import { familie, fontStijl, meet } from '../assets/fonts';
import { baseGroup } from './base';
import { legLetters, letterKleur, mengKleur } from './wordart-layout';
import { wordartPreset } from '../assets/wordart-presets';
import { maakTekst } from '../document/create';

export function renderWordArt(el: TekstElement): Konva.Group {
  const wa = el.wordart!;
  const fam = familie(el.lettertype);
  const stijl = fontStijl(el);
  const letters = [...el.tekst.replace(/\n/g, ' ')];
  const breedtes = letters.map((ch) => meet(ch, fam, el.grootte, stijl));
  const { posities, breedte, hoogte } = legLetters(breedtes, wa.vorm, el.grootte);
  const g = baseGroup({ ...el, breedte, hoogte });
  g.add(new Konva.Rect({ name: 'raakvlak', width: breedte, height: hoogte, fill: 'rgba(0,0,0,0)' }));
  const zichtbaar = letters.filter((c) => c.trim()).length;
  let k = 0;
  const diepte = el.grootte * 0.025;
  letters.forEach((ch, i) => {
    if (!ch.trim()) return;
    const p = posities[i];
    const kleur = letterKleur(wa.vulling, k++, zichtbaar);
    const basis = { text: ch, fontFamily: fam, fontSize: el.grootte, fontStyle: stijl, x: p.x, y: p.y, rotation: p.rotatie, offsetX: breedtes[i] / 2, offsetY: el.grootte / 2, lineJoin: 'round' as const, listening: false };
    if (wa.effect === '3d') {
      for (let l = 6; l >= 1; l--) g.add(new Konva.Text({ ...basis, x: p.x + l * diepte, y: p.y + l * diepte, fill: mengKleur(kleur, '#000000', 0.45) }));
    }
    if (wa.tweedeOmlijning) {
      g.add(new Konva.Text({ ...basis, fill: wa.tweedeOmlijning.kleur, stroke: wa.tweedeOmlijning.kleur, strokeWidth: (wa.omlijning?.dikte ?? 0) * 2 + wa.tweedeOmlijning.dikte * 2 }));
    }
    const neon = wa.effect === 'neon';
    g.add(new Konva.Text({
      ...basis,
      fill: kleur,
      stroke: wa.omlijning?.kleur,
      strokeWidth: wa.omlijning?.dikte ?? 0,
      fillAfterStrokeEnabled: true,
      shadowEnabled: neon || wa.effect === 'schaduw',
      shadowColor: neon ? kleur : 'rgba(0,0,0,0.45)',
      shadowBlur: neon ? el.grootte * 0.35 : el.grootte * 0.08,
      shadowOffset: neon ? { x: 0, y: 0 } : { x: el.grootte * 0.07, y: el.grootte * 0.09 },
    }));
  });
  return g;
}

const voorbeeldCache = new Map<string, string>();

export function wordartVoorbeeld(id: string): string {
  const klaar = voorbeeldCache.get(id);
  if (klaar) return klaar;
  const el = { ...maakTekst({ x: 0, y: 0, tekst: 'Abc', grootte: 48, lettertype: 'luckiest' }), wordart: wordartPreset(id) };
  const g = renderWordArt(el);
  const r = g.getClientRect();
  const s = Math.min(150 / r.width, 70 / r.height);
  const div = document.createElement('div');
  const stage = new Konva.Stage({ container: div, width: 160, height: 80 });
  const laag = new Konva.Layer();
  g.setAttrs({ x: 80, y: 40, scaleX: s, scaleY: s, rotation: 0 });
  laag.add(g);
  stage.add(laag);
  const url = stage.toDataURL({ pixelRatio: 2 });
  stage.destroy();
  voorbeeldCache.set(id, url);
  return url;
}
