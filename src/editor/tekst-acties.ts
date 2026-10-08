import { familie, fontStijl, meet } from '../assets/fonts';
import { maakTekst } from '../document/create';
import { FORMATEN } from '../document/formats';
import type { TekstElement } from '../document/types';
import type { Editor } from './store';

export function natuurlijkeBreedte(el: Pick<TekstElement, 'tekst' | 'lettertype' | 'grootte' | 'vet' | 'schuin' | 'ballon'>, max: number): number {
  const regels = el.tekst.split('\n');
  const w = Math.max(...regels.map((r) => meet(r || ' ', familie(el.lettertype), el.grootte, fontStijl(el))));
  const pad = el.ballon ? el.grootte : 0;
  return Math.min(max, Math.ceil(w + pad + 4));
}

export function tekstKlaar(editor: Editor, id: string | null, tekst: string): void {
  const schoon = tekst.replace(/\s+$/, '');
  const { collage } = editor.get();
  const f = FORMATEN[collage.formaat];
  const max = f.breedte * 0.8;
  if (!id) {
    if (!schoon.trim()) return;
    const el = maakTekst({ x: f.breedte / 2, y: f.hoogte / 2, tekst: schoon });
    editor.add({ ...el, breedte: natuurlijkeBreedte(el, max) });
    return;
  }
  const el = collage.elementen.find((e) => e.id === id);
  if (!el || el.type !== 'tekst') return;
  if (!schoon.trim()) { editor.remove(id); return; }
  editor.update(id, { tekst: schoon, breedte: natuurlijkeBreedte({ ...el, tekst: schoon }, max) });
}

export function tekstStijlPatch(el: TekstElement, patch: Partial<TekstElement>, canvasBreedte: number): Partial<TekstElement> {
  return { ...patch, breedte: natuurlijkeBreedte({ ...el, ...patch }, canvasBreedte * 0.8) };
}
