import Konva from 'konva';
import type { LineConfig } from 'konva/lib/shapes/Line';
import type { TekenGereedschap, TekeningElement } from '../document/types';
import { baseGroup } from './base';

export function penStijl(gereedschap: TekenGereedschap, dikte: number): Partial<LineConfig> {
  switch (gereedschap) {
    case 'pen': return { tension: 0.4, lineCap: 'round', lineJoin: 'round' };
    case 'stift': return { tension: 0.3, lineCap: 'round', lineJoin: 'round', opacity: 0.75 };
    case 'krijt': return { tension: 0.2, lineCap: 'butt', lineJoin: 'round', dash: [dikte * 0.9, dikte * 0.35], opacity: 0.85 };
  }
}

export function renderTekening(el: TekeningElement): Konva.Group {
  const g = baseGroup(el);
  g.add(new Konva.Line({ points: el.punten, stroke: el.kleur, strokeWidth: el.dikte, hitStrokeWidth: Math.max(el.dikte, 30), ...penStijl(el.gereedschap, el.dikte) }));
  return g;
}
