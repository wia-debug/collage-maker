import { describe, it, expect } from 'vitest';
import Konva from 'konva';
import { renderElement } from './index';
import { maakFoto, maakSticker, maakVorm } from '../document/create';
import { stickerKey } from '../assets/store';
import { renderFoto } from './foto';

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

  it('onbekend type geeft een duidelijke fout (tot de renderer bestaat)', () => {
    const f = maakFoto({ x: 0, y: 0, breedte: 10, hoogte: 10, assetId: null });
    expect(() => renderElement({ ...f, type: 'onbekend' } as never, leeg)).toThrow('Geen renderer voor onbekend');
  });
});

describe('renderFoto', () => {
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
});
