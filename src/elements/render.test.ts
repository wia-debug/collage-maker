import { describe, it, expect } from 'vitest';
import Konva from 'konva';
import { renderElement } from './index';
import { maakFoto, maakSticker, maakTekening, maakTekst, maakVorm } from '../document/create';
import { stickerKey } from '../assets/store';
import { renderFoto } from './foto';
import { renderTekst } from './tekst';
import { wordartPreset } from '../assets/wordart-presets';

const leeg = { image: () => undefined };

describe('renderElement', () => {
  it('vorm: groep met id, naam, middelpunt-oorsprong en rotatie', () => {
    const v = { ...maakVorm({ x: 300, y: 200, vorm: 'hart', breedte: 100, hoogte: 80 }), rotatie: 30 };
    const g = renderElement(v, leeg);
    expect(g.id()).toBe(v.id);
    expect(g.name()).toBe('element');
    expect(g.x()).toBe(300);
    expect(g.offsetX()).toBe(50);
    expect(g.offsetY()).toBe(40);
    expect(g.rotation()).toBe(30);
    expect(g.draggable()).toBe(true);
    expect(g.getChildren()[0]).toBeInstanceOf(Konva.Shape);
  });

  it('gespiegeld geeft negatieve scaleX, vergrendeld is niet versleepbaar', () => {
    const v = { ...maakVorm({ x: 0, y: 0, vorm: 'ster', breedte: 10, hoogte: 10 }), gespiegeld: true, schaalX: 2, vergrendeld: true };
    const g = renderElement(v, leeg);
    expect(g.scaleX()).toBe(-2);
    expect(g.draggable()).toBe(false);
  });

  it('lijn wordt een Konva.Line met brede raakzone', () => {
    const l = maakVorm({ x: 0, y: 0, vorm: 'lijn', breedte: 400, hoogte: 40 });
    const line = renderElement(l, leeg).getChildren()[0] as Konva.Line;
    expect(line).toBeInstanceOf(Konva.Line);
    expect(line.hitStrokeWidth()).toBeGreaterThanOrEqual(40);
  });

  it('sticker gebruikt de geladen afbeelding uit de context', () => {
    const s = maakSticker({ x: 0, y: 0, sticker: 'dieren/cat', kleur: '#FF0000', grootte: 200 });
    const img = new Image();
    const ctx = { image: (k: string) => (k === stickerKey('dieren/cat', '#FF0000') ? img : undefined) };
    const kind = renderElement(s, ctx).getChildren()[0] as Konva.Image;
    expect(kind).toBeInstanceOf(Konva.Image);
    expect(kind.image()).toBe(img);
    expect(kind.width()).toBe(200);
  });

  it('sticker past doorzichtigheid toe, standaard volledig zichtbaar', () => {
    const s = maakSticker({ x: 0, y: 0, sticker: 'dieren/cat', kleur: '#FF0000', grootte: 200 });
    expect(renderElement(s, leeg).opacity()).toBe(1);
    expect(renderElement({ ...s, doorzichtigheid: 0.4 }, leeg).opacity()).toBe(0.4);
  });

  it('klemt doorzichtigheid van sticker en vorm op 0.1..1', () => {
    const s = maakSticker({ x: 0, y: 0, sticker: 'dieren/cat', kleur: '#FF0000', grootte: 200 });
    expect(renderElement({ ...s, doorzichtigheid: 0 }, leeg).opacity()).toBe(0.1);
    expect(renderElement({ ...s, doorzichtigheid: 7 }, leeg).opacity()).toBe(1);
    expect(renderElement({ ...s, doorzichtigheid: NaN }, leeg).opacity()).toBe(1);
    const v = maakVorm({ x: 0, y: 0, vorm: 'rond', breedte: 50, hoogte: 50 });
    expect((renderElement({ ...v, doorzichtigheid: 0 }, leeg).getChildren()[0]).opacity()).toBe(0.1);
    expect((renderElement({ ...v, doorzichtigheid: 3 }, leeg).getChildren()[0]).opacity()).toBe(1);
  });

  it('onbekend type geeft een duidelijke fout (tot de renderer bestaat)', () => {
    const f = maakFoto({ x: 0, y: 0, breedte: 10, hoogte: 10, assetId: null });
    expect(() => renderElement({ ...f, type: 'onbekend' } as never, leeg)).toThrow('Geen renderer voor onbekend');
  });
});

describe('renderFoto', () => {
  it('filter zet een gecachte node met filter', () => {
    const img = document.createElement('canvas');
    img.width = 10; img.height = 10;
    const f = { ...maakFoto({ x: 0, y: 0, breedte: 10, hoogte: 10, assetId: 'a1' }), filter: 'sepia' as const };
    const node = renderFoto(f, { image: () => img }).findOne('Image') as Konva.Image;
    expect(node.filters()).toHaveLength(1);
    expect(node.isCached()).toBe(true);
  });

  it('leeg vak toont een gestreepte rechthoek met naam leeg-vak', () => {
    const f = maakFoto({ x: 50, y: 50, breedte: 100, hoogte: 80, assetId: null });
    const g = renderFoto(f, leeg);
    expect(g.findOne('.leeg-vak')).toBeDefined();
  });

  it('foto met afbeelding gebruikt uitsnede als crop', () => {
    const img = document.createElement('canvas');
    img.width = 400; img.height = 200;
    const f = { ...maakFoto({ x: 0, y: 0, breedte: 100, hoogte: 100, assetId: 'a1' }), uitsnede: { x: 100, y: 0, breedte: 200, hoogte: 200 } };
    const node = renderFoto(f, { image: (k) => (k === 'a1' ? img : undefined) }).findOne('Image') as Konva.Image;
    expect(node.image()).toBe(img);
    expect(node.crop()).toEqual({ x: 100, y: 0, width: 200, height: 200 });
    expect(node.width()).toBe(100);
  });

  it('niet-rechthoekig masker knipt de foto via clipFunc', () => {
    const img = document.createElement('canvas');
    const f = { ...maakFoto({ x: 0, y: 0, breedte: 100, hoogte: 100, assetId: 'a1' }), masker: 'hart' as const };
    const g = renderFoto(f, { image: () => img });
    const binnen = g.findOne('.foto-binnen') as Konva.Group;
    expect(binnen.clipFunc()).toBeTypeOf('function');
  });

  it('kader effen komt boven de foto', () => {
    const img = document.createElement('canvas');
    const f = { ...maakFoto({ x: 0, y: 0, breedte: 100, hoogte: 100, assetId: 'a1' }), kader: { stijl: 'effen' as const, kleur: '#FF0000' } };
    const g = renderFoto(f, { image: () => img });
    const kinderen = g.getChildren();
    expect(kinderen[kinderen.length - 1].name()).toBe('kader');
  });
});

describe('renderTekst', () => {
  it('tekst met ballon heeft eerst een rechthoek, offset op de echte hoogte', () => {
    const t = { ...maakTekst({ x: 0, y: 0, tekst: 'Hallo\nwereld', grootte: 50, breedte: 300 }), ballon: '#FFE14D' };
    const g = renderTekst(t, leeg);
    const [rect, text] = g.getChildren();
    expect(rect).toBeInstanceOf(Konva.Rect);
    expect((text as Konva.Text).text()).toBe('Hallo\nwereld');
    expect(g.offsetY()).toBeCloseTo((text as Konva.Text).height() / 2, 3);
  });

  it('vet en schuin worden fontStyle', () => {
    const t = { ...maakTekst({ x: 0, y: 0, tekst: 'A' }), vet: true, schuin: true };
    const text = renderTekst(t, leeg).findOne('Text') as Konva.Text;
    expect(text.fontStyle()).toBe('italic bold');
  });
});

describe('renderWordArt', () => {
  it('tekent één Text per letter (spaties overgeslagen) plus een raakvlak', () => {
    const t = { ...maakTekst({ x: 0, y: 0, tekst: 'Hoi jij' }), wordart: wordartPreset('regenboog') };
    const g = renderTekst(t, leeg);
    expect(g.find('Text')).toHaveLength(6);
    expect(g.findOne('.raakvlak')).toBeDefined();
  });

  it('3d tekent extra lagen onder elke letter', () => {
    const t = { ...maakTekst({ x: 0, y: 0, tekst: 'AB' }), wordart: wordartPreset('3d') };
    expect(renderTekst(t, leeg).find('Text').length).toBeGreaterThan(2 * 5);
  });
});

describe('renderTekening', () => {
  it('tekent een lijn met brede raakzone', () => {
    const t = maakTekening([0, 0, 100, 50], 'pen', '#000000', 6);
    const line = renderElement(t, leeg).findOne('Line') as Konva.Line;
    expect(line.points()).toEqual(t.punten);
    expect(line.hitStrokeWidth()).toBeGreaterThanOrEqual(30);
  });
});
