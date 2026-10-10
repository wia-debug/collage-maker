import Konva from 'konva';
import type { Collage } from '../document/types';
import { FORMATEN } from '../document/formats';
import { renderElement } from '../elements/index';
import { renderAchtergrond } from '../elements/achtergrond';
import { laadLettertypes } from '../assets/fonts';
import type { AssetStore } from '../assets/store';

export async function maakVoorbeeld(c: Collage, assets: AssetStore, breedte = 320): Promise<string> {
  await Promise.all([assets.preload(c), laadLettertypes()]);
  const f = FORMATEN[c.formaat];
  const s = breedte / f.breedte;
  const div = document.createElement('div');
  const stage = new Konva.Stage({ container: div, width: breedte, height: Math.round(f.hoogte * s) });
  const laag = new Konva.Layer({ scaleX: s, scaleY: s });
  laag.add(renderAchtergrond(c.achtergrond, f.breedte, f.hoogte, assets));
  for (const el of c.elementen) laag.add(renderElement(el, assets));
  stage.add(laag);
  laag.find('.leeg-vak').forEach((n) => n.hide());
  const url = stage.toDataURL({ pixelRatio: 1 });
  stage.destroy();
  return url;
}
