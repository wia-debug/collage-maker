import { describe, it, expect, afterEach } from 'vitest';
import Konva from 'konva';
import { CanvasController } from './canvas';
import { createEditor } from './store';
import { maakVorm, nieuweCollage } from '../document/create';

const leeg = { image: () => undefined };
let ctrl: CanvasController | null = null;
let div: HTMLDivElement | null = null;

function opzet(w = 800, h = 600) {
  div = document.createElement('div');
  div.style.cssText = `width:${w}px;height:${h}px;position:fixed;left:0;top:0`;
  document.body.append(div);
  const editor = createEditor(nieuweCollage('vierkant'));
  ctrl = new CanvasController(div, editor, leeg);
  return { editor, ctrl };
}

afterEach(() => { ctrl?.destroy(); div?.remove(); ctrl = null; div = null; });

const transformer = (c: CanvasController) => c.stage.findOne('Transformer') as Konva.Transformer;

describe('CanvasController', () => {
  it('schaalt het canvas passend en gecentreerd', () => {
    const { ctrl } = opzet(800, 600);
    const s = ctrl.stage.scaleX();
    expect(s).toBeCloseTo((600 / 1200) * 0.94, 5);
    expect(ctrl.stage.x()).toBeCloseTo((800 - 1200 * s) / 2, 5);
  });

  it('voegt nodes toe, vervangt gewijzigde en verwijdert gewiste', () => {
    const { editor, ctrl } = opzet();
    const v = maakVorm({ x: 100, y: 100, vorm: 'rechthoek', breedte: 50, hoogte: 50 });
    editor.add(v);
    const eerst = ctrl.group(v.id)!;
    expect(eerst.x()).toBe(100);
    editor.update(v.id, { x: 400 });
    const daarna = ctrl.group(v.id)!;
    expect(daarna).not.toBe(eerst);
    expect(daarna.x()).toBe(400);
    editor.remove(v.id);
    expect(ctrl.group(v.id)).toBeUndefined();
    expect(ctrl.stage.find('.element')).toHaveLength(0);
  });

  it('houdt de laagvolgorde van het document aan, achtergrond onderaan', () => {
    const { editor, ctrl } = opzet();
    const a = maakVorm({ x: 1, y: 1, vorm: 'rond', breedte: 5, hoogte: 5 });
    const b = maakVorm({ x: 2, y: 2, vorm: 'rond', breedte: 5, hoogte: 5 });
    editor.add(a); editor.add(b);
    expect(ctrl.group(a.id)!.zIndex()).toBeLessThan(ctrl.group(b.id)!.zIndex());
    editor.move(a.id, 'voorste');
    expect(ctrl.group(a.id)!.zIndex()).toBeGreaterThan(ctrl.group(b.id)!.zIndex());
    expect(ctrl.stage.findOne('.achtergrond')!.zIndex()).toBe(0);
  });

  it('selectie toont de transformer, vergrendeld element niet', () => {
    const { editor, ctrl } = opzet();
    const v = maakVorm({ x: 100, y: 100, vorm: 'rechthoek', breedte: 50, hoogte: 50 });
    editor.add(v);
    expect(transformer(ctrl).nodes()[0]).toBe(ctrl.group(v.id));
    editor.update(v.id, { vergrendeld: true });
    expect(transformer(ctrl).nodes()).toHaveLength(0);
    editor.select(null);
    expect(transformer(ctrl).nodes()).toHaveLength(0);
  });

  it('dragend schrijft de nieuwe positie naar de store', () => {
    const { editor, ctrl } = opzet();
    const v = maakVorm({ x: 100, y: 100, vorm: 'rechthoek', breedte: 50, hoogte: 50 });
    editor.add(v);
    const g = ctrl.group(v.id)!;
    g.x(555);
    g.fire('dragend', { target: g }, true);
    expect(editor.get().collage.elementen[0].x).toBe(555);
  });

  it('transformend schrijft schaal en rotatie, ook bij gespiegeld element', () => {
    const { editor, ctrl } = opzet();
    const v = { ...maakVorm({ x: 100, y: 100, vorm: 'rechthoek', breedte: 50, hoogte: 50 }), gespiegeld: true };
    editor.add(v);
    const g = ctrl.group(v.id)!;
    g.setAttrs({ scaleX: -2, scaleY: 2, rotation: 45 });
    transformer(ctrl).fire('transformend');
    const el = editor.get().collage.elementen[0];
    expect(el.schaalX).toBe(2);
    expect(el.schaalY).toBe(2);
    expect(el.rotatie).toBe(45);
    expect(el.gespiegeld).toBe(true);
  });

  it('naarCanvas en naarScherm zijn elkaars inverse', () => {
    const { ctrl } = opzet();
    const p = ctrl.naarScherm(600, 300);
    const q = ctrl.naarCanvas(p.x, p.y);
    expect(q.x).toBeCloseTo(600, 5);
    expect(q.y).toBeCloseTo(300, 5);
  });

  it('past zich aan bij een andere containergrootte (draaien van iPad)', async () => {
    const { ctrl } = opzet(800, 600);
    div!.style.width = '600px';
    div!.style.height = '800px';
    await new Promise((r) => setTimeout(r, 50));
    expect(ctrl.stage.width()).toBe(600);
    expect(ctrl.stage.scaleX()).toBeCloseTo((600 / 1200) * 0.94, 5);
  });

  it('formaatwissel via load past de clip aan', () => {
    const { editor, ctrl } = opzet();
    editor.load(nieuweCollage('poster'));
    const laag = ctrl.stage.getLayers()[0];
    expect(laag.clipHeight()).toBe(1800);
  });
});
