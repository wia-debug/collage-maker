import { describe, it, expect, afterEach } from 'vitest';
import Konva from 'konva';
import { CanvasController } from './canvas';
import { createEditor } from './store';
import { maakFoto, maakTekening, maakVorm, nieuweCollage } from '../document/create';

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

  it('voegt nodes toe, hergebruikt bij verplaatsen en verwijdert gewiste', () => {
    const { editor, ctrl } = opzet();
    const v = maakVorm({ x: 100, y: 100, vorm: 'rechthoek', breedte: 50, hoogte: 50 });
    editor.add(v);
    const eerst = ctrl.group(v.id)!;
    expect(eerst.x()).toBe(100);
    editor.update(v.id, { x: 400 });
    const daarna = ctrl.group(v.id)!;
    expect(daarna).toBe(eerst);
    expect(daarna.x()).toBe(400);
    editor.remove(v.id);
    expect(ctrl.group(v.id)).toBeUndefined();
    expect(ctrl.stage.find('.element')).toHaveLength(0);
  });

  it('hergebruikt de node bij spiegelen en vergrendelen, maakt een nieuwe bij andere wijzigingen', () => {
    const { editor, ctrl } = opzet();
    const v = maakVorm({ x: 100, y: 100, vorm: 'rechthoek', breedte: 50, hoogte: 50 });
    editor.add(v);
    const eerst = ctrl.group(v.id)!;
    editor.update(v.id, { gespiegeld: true });
    expect(ctrl.group(v.id)).toBe(eerst);
    expect(eerst.scaleX()).toBeLessThan(0);
    editor.update(v.id, { vergrendeld: true });
    expect(ctrl.group(v.id)).toBe(eerst);
    expect(eerst.draggable()).toBe(false);
    editor.update(v.id, { vulling: '#112233' });
    expect(ctrl.group(v.id)).not.toBe(eerst);
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

  it('foto met afbeelding: vrij schalen past breedte, hoogte en uitsnede aan in een stap', () => {
    const img = document.createElement('canvas');
    img.width = 100; img.height = 100;
    div = document.createElement('div');
    div.style.cssText = 'width:800px;height:600px;position:fixed;left:0;top:0';
    document.body.append(div);
    const ed = createEditor(nieuweCollage('vierkant'));
    const c2 = new CanvasController(div, ed, { image: () => img });
    ctrl = c2;
    const f = maakFoto({ x: 300, y: 300, breedte: 100, hoogte: 100, assetId: 'a' });
    ed.add(f);
    expect(transformer(c2).keepRatio()).toBe(false);
    expect(transformer(c2).enabledAnchors()).toEqual(expect.arrayContaining(['middle-left', 'middle-right', 'top-center', 'bottom-center']));
    c2.group(f.id)!.setAttrs({ scaleX: 2, scaleY: 1 });
    transformer(c2).fire('transformend');
    const el = ed.get().collage.elementen[0] as ReturnType<typeof maakFoto>;
    expect(el.breedte).toBe(200);
    expect(el.hoogte).toBe(100);
    expect(el.schaalX).toBe(1);
    expect(el.schaalY).toBe(1);
    expect(el.uitsnede!.breedte / el.uitsnede!.hoogte).toBeCloseTo(2);
    ed.undo();
    expect(ed.get().collage.elementen[0].breedte).toBe(100);
  });

  it('foto: draaien of evenredig schalen houdt de uitsnede; nul-schaal geeft geen NaN', () => {
    const img = document.createElement('canvas');
    img.width = 400; img.height = 300;
    div = document.createElement('div');
    div.style.cssText = 'width:800px;height:600px;position:fixed;left:0;top:0';
    document.body.append(div);
    const ed = createEditor(nieuweCollage('vierkant'));
    const c2 = new CanvasController(div, ed, { image: () => img });
    ctrl = c2;
    const uitsnede = { x: 100, y: 50, breedte: 100, hoogte: 100 };
    const f = { ...maakFoto({ x: 300, y: 300, breedte: 100, hoogte: 100, assetId: 'a' }), uitsnede };
    ed.add(f);
    c2.group(f.id)!.setAttrs({ rotation: 30 });
    transformer(c2).fire('transformend');
    expect((ed.get().collage.elementen[0] as typeof f).uitsnede).toEqual(uitsnede);
    c2.group(f.id)!.setAttrs({ scaleX: 2, scaleY: 2 });
    transformer(c2).fire('transformend');
    let el = ed.get().collage.elementen[0] as typeof f;
    expect(el.breedte).toBe(200);
    expect(el.uitsnede).toEqual(uitsnede);
    c2.group(f.id)!.setAttrs({ scaleX: 0, scaleY: 0 });
    transformer(c2).fire('transformend');
    el = ed.get().collage.elementen[0] as typeof f;
    expect(el.breedte).toBe(20);
    expect(el.hoogte).toBe(20);
    for (const v of Object.values(el.uitsnede!)) expect(Number.isFinite(v)).toBe(true);
  });

  it('transformer weigert vakken kleiner dan 20 schermpixels', () => {
    const { ctrl } = opzet();
    const f = transformer(ctrl).boundBoxFunc()!;
    const oud = { x: 0, y: 0, width: 100, height: 100, rotation: 0 };
    expect(f(oud, { ...oud, width: 5 })).toBe(oud);
    expect(f(oud, { ...oud, height: 0 })).toBe(oud);
    const ok = { ...oud, width: 40, height: 30 };
    expect(f(oud, ok)).toBe(ok);
    // Een al klein vak: draaien (zelfde maat) en vergroten mag, krimpen onder het minimum niet.
    const klein = { x: 0, y: 0, width: 80, height: 15, rotation: 0 };
    const gedraaid = { ...klein, rotation: 0.5 };
    expect(f(klein, gedraaid)).toBe(gedraaid);
    const groter = { ...klein, height: 18 };
    expect(f(klein, groter)).toBe(groter);
    expect(f(klein, { ...klein, height: 10 })).toBe(klein);
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

  it('één sleepgebaar met veel bewegingen is één undo-stap', () => {
    const { editor, ctrl } = opzet();
    const v = maakVorm({ x: 100, y: 100, vorm: 'rechthoek', breedte: 50, hoogte: 50 });
    editor.add(v);
    const g = ctrl.group(v.id)!;
    for (let i = 1; i <= 10; i++) { g.x(100 + i * 7); g.fire('dragmove', { target: g }, true); }
    g.fire('dragend', { target: g }, true);
    expect(editor.get().collage.elementen[0].x).not.toBe(100);
    editor.undo();
    expect(editor.get().collage.elementen[0].x).toBe(100);
    editor.undo();
    expect(editor.get().collage.elementen).toHaveLength(0);
  });

  it('dragmove klikt vast op het midden en toont een hulplijn', () => {
    const { editor, ctrl } = opzet();
    const v = maakVorm({ x: 100, y: 100, vorm: 'rechthoek', breedte: 100, hoogte: 100 });
    editor.add(v);
    const g = ctrl.group(v.id)!;
    g.x(603);
    g.fire('dragmove', { target: g }, true);
    expect(g.x()).toBeCloseTo(600, 0);
    expect(ctrl.stage.find('.gids').length).toBeGreaterThan(0);
    g.fire('dragend', { target: g }, true);
    expect(ctrl.stage.find('.gids')).toHaveLength(0);
  });
  describe('knijpen', () => {
    const vingers = (a: [number, number], b: [number, number]) =>
      ({ evt: { touches: [{ clientX: a[0], clientY: a[1] }, { clientX: b[0], clientY: b[1] }], preventDefault() {} } }) as any;
    const los = () => ({ evt: { touches: [] } }) as any;

    it('knijpen op het geselecteerde element is één undo-stap', () => {
      const { editor, ctrl } = opzet();
      const v = maakVorm({ x: 100, y: 100, vorm: 'rechthoek', breedte: 50, hoogte: 50 });
      editor.add(v);
      ctrl.stage.fire('touchmove', vingers([100, 100], [200, 100]));
      ctrl.stage.fire('touchmove', vingers([50, 100], [250, 100]));
      ctrl.stage.fire('touchend', los());
      expect(editor.get().collage.elementen[0].schaalX).toBeCloseTo(2, 5);
      editor.undo();
      expect(editor.get().collage.elementen[0].schaalX).toBe(1);
      editor.undo();
      expect(editor.get().collage.elementen).toHaveLength(0);
    });

    it('slepen gevolgd door knijpen is één undo-stap', () => {
      const { editor, ctrl } = opzet();
      const v = maakVorm({ x: 100, y: 100, vorm: 'rechthoek', breedte: 50, hoogte: 50 });
      editor.add(v);
      const g = ctrl.group(v.id)!;
      g.x(160);
      ctrl.stage.fire('touchmove', vingers([100, 100], [200, 100]));
      g.fire('dragend', { target: g }, true);
      ctrl.stage.fire('touchmove', vingers([50, 100], [250, 100]));
      ctrl.stage.fire('touchend', los());
      expect(editor.get().collage.elementen[0].schaalX).toBeCloseTo(2, 5);
      editor.undo();
      expect(editor.get().collage.elementen[0].x).toBe(100);
      expect(editor.get().collage.elementen[0].schaalX).toBe(1);
      editor.undo();
      expect(editor.get().collage.elementen).toHaveLength(0);
    });

    it('knijpen op een vergrendeld element of zonder selectie doet niets', () => {
      const { editor, ctrl } = opzet();
      const v = maakVorm({ x: 100, y: 100, vorm: 'rechthoek', breedte: 50, hoogte: 50 });
      editor.add(v);
      editor.update(v.id, { vergrendeld: true });
      const voor = editor.get().collage;
      ctrl.stage.fire('touchmove', vingers([100, 100], [200, 100]));
      ctrl.stage.fire('touchmove', vingers([50, 100], [250, 100]));
      ctrl.stage.fire('touchend', los());
      editor.select(null);
      ctrl.stage.fire('touchmove', vingers([100, 100], [200, 100]));
      ctrl.stage.fire('touchmove', vingers([50, 100], [250, 100]));
      ctrl.stage.fire('touchend', los());
      expect(editor.get().collage).toBe(voor);
    });
  });

  it('tekenmodus: elementen niet versleepbaar en selectie gewist', () => {
    const { editor, ctrl } = opzet();
    const v = maakVorm({ x: 100, y: 100, vorm: 'rechthoek', breedte: 50, hoogte: 50 });
    editor.add(v);
    ctrl.setGereedschap('teken');
    expect(editor.get().selectedId).toBeNull();
    expect(ctrl.group(v.id)!.draggable()).toBe(false);
    editor.update(v.id, { x: 200 });
    expect(ctrl.group(v.id)!.draggable()).toBe(false);
    ctrl.setGereedschap('selecteer');
    expect(ctrl.group(v.id)!.draggable()).toBe(true);
  });

  describe('tekenen en gummen', () => {
    const ev = (pointerId: number) => ({ evt: { pointerId } }) as any;
    const stubPos = (c: CanvasController, pos: { x: number; y: number }) => {
      (c as any).content.getRelativePointerPosition = () => pos;
    };
    const aantal = (e: ReturnType<typeof opzet>['editor']) => e.get().collage.elementen.length;
    const uiLijnen = (c: CanvasController) => (c as any).ui.find('Line').length;

    function streek(c: CanvasController, id = 1) {
      stubPos(c, { x: 10, y: 10 });
      c.stage.fire('pointerdown', ev(id));
      stubPos(c, { x: 60, y: 60 });
      c.stage.fire('pointermove', ev(id));
    }

    it('een streek is precies één geschiedenisstap', () => {
      const { editor, ctrl } = opzet();
      ctrl.setGereedschap('teken');
      streek(ctrl);
      ctrl.stage.fire('pointerup', ev(1));
      expect(aantal(editor)).toBe(1);
      expect(editor.get().collage.elementen[0].type).toBe('tekening');
      editor.undo();
      expect(aantal(editor)).toBe(0);
      expect(editor.get().canUndo).toBe(false);
    });

    it('een tweede pointerId tijdens een streek wordt genegeerd', () => {
      const { editor, ctrl } = opzet();
      ctrl.setGereedschap('teken');
      streek(ctrl, 1);
      stubPos(ctrl, { x: 300, y: 300 });
      ctrl.stage.fire('pointerdown', ev(2));
      ctrl.stage.fire('pointermove', ev(2));
      ctrl.stage.fire('pointerup', ev(2));
      expect(aantal(editor)).toBe(0);
      ctrl.stage.fire('pointerup', ev(1));
      expect(aantal(editor)).toBe(1);
    });

    it('pointerup op window rondt een streek af en een nieuwe kan beginnen', () => {
      const { editor, ctrl } = opzet();
      ctrl.setGereedschap('teken');
      streek(ctrl);
      window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));
      expect(aantal(editor)).toBe(1);
      expect(uiLijnen(ctrl)).toBe(0);
      streek(ctrl);
      window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));
      expect(aantal(editor)).toBe(2);
    });

    it('pointercancel voegt niets toe', () => {
      const { editor, ctrl } = opzet();
      ctrl.setGereedschap('teken');
      streek(ctrl);
      ctrl.stage.fire('pointercancel', ev(1));
      expect(aantal(editor)).toBe(0);
      expect(uiLijnen(ctrl)).toBe(0);
      streek(ctrl);
      window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1 }));
      expect(aantal(editor)).toBe(0);
    });

    it('van gereedschap wisselen tijdens een streek voegt niets toe', () => {
      const { editor, ctrl } = opzet();
      ctrl.setGereedschap('teken');
      streek(ctrl);
      expect(uiLijnen(ctrl)).toBe(1);
      ctrl.setGereedschap('selecteer');
      expect(uiLijnen(ctrl)).toBe(0);
      window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));
      expect(aantal(editor)).toBe(0);
    });

    it('gum verwijdert een tekening maar geen vorm op dezelfde plek', () => {
      const { editor, ctrl } = opzet();
      const v = maakVorm({ x: 100, y: 100, vorm: 'rechthoek', breedte: 50, hoogte: 50 });
      editor.add(v);
      ctrl.setGereedschap('teken');
      streek(ctrl);
      ctrl.stage.fire('pointerup', ev(1));
      const t = editor.get().collage.elementen.find((e) => e.type === 'tekening')!;
      ctrl.setGereedschap('gum');
      const s = ctrl.stage as any;
      s.getPointerPosition = () => ({ x: 1, y: 1 });
      s.getIntersection = () => ctrl.group(v.id)!.findOne('Shape');
      ctrl.stage.fire('pointerdown', ev(1));
      ctrl.stage.fire('pointerup', ev(1));
      expect(aantal(editor)).toBe(2);
      s.getIntersection = () => ctrl.group(t.id)!.findOne('Line');
      ctrl.stage.fire('pointerdown', ev(1));
      ctrl.stage.fire('pointerup', ev(1));
      expect(editor.get().collage.elementen.map((e) => e.id)).toEqual([v.id]);
    });
  });

  describe('gum-veeg', () => {
    const ev = (pointerId: number) => ({ evt: { pointerId } }) as any;
    function opzetMetTekeningen() {
      const o = opzet();
      const t1 = maakTekening([10, 10, 60, 60], 'pen', '#000000', 14);
      const t2 = maakTekening([300, 300, 360, 360], 'pen', '#000000', 14);
      o.editor.add(t1); o.editor.add(t2);
      o.ctrl.setGereedschap('gum');
      const s = o.ctrl.stage as any;
      s.getPointerPosition = () => ({ x: 1, y: 1 });
      const raak = (t: { id: string }) => { s.getIntersection = () => o.ctrl.group(t.id)!.findOne('Line'); };
      return { ...o, t1, t2, raak };
    }

    it('een veeg over twee tekeningen is één undo-stap', () => {
      const { editor, ctrl, t1, t2, raak } = opzetMetTekeningen();
      raak(t1);
      ctrl.stage.fire('pointerdown', ev(1));
      raak(t2);
      ctrl.stage.fire('pointermove', ev(1));
      expect(ctrl.group(t1.id)!.visible()).toBe(false);
      expect(ctrl.group(t2.id)!.visible()).toBe(false);
      expect(editor.get().collage.elementen).toHaveLength(2);
      ctrl.stage.fire('pointerup', ev(1));
      expect(editor.get().collage.elementen).toHaveLength(0);
      editor.undo();
      expect(editor.get().collage.elementen.map((e) => e.id)).toEqual([t1.id, t2.id]);
    });

    it('pointercancel en gereedschapswissel laten alles staan', () => {
      const { editor, ctrl, t1, t2, raak } = opzetMetTekeningen();
      raak(t1);
      ctrl.stage.fire('pointerdown', ev(1));
      raak(t2);
      ctrl.stage.fire('pointermove', ev(1));
      ctrl.stage.fire('pointercancel', ev(1));
      expect(editor.get().collage.elementen).toHaveLength(2);
      expect(ctrl.group(t1.id)!.visible()).toBe(true);
      expect(ctrl.group(t2.id)!.visible()).toBe(true);
      raak(t1);
      ctrl.stage.fire('pointerdown', ev(1));
      ctrl.setGereedschap('selecteer');
      expect(ctrl.group(t1.id)!.visible()).toBe(true);
      window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));
      expect(editor.get().collage.elementen).toHaveLength(2);
    });
  });

  it('exportPng cachet gefilterde fotos op export-resolutie en herstelt daarna', () => {
    const bron = document.createElement('canvas');
    bron.width = 100; bron.height = 100;
    div = document.createElement('div');
    div.style.cssText = 'width:800px;height:600px;position:fixed;left:0;top:0';
    document.body.append(div);
    const editor = createEditor(nieuweCollage('vierkant'));
    ctrl = new CanvasController(div, editor, { image: () => bron as unknown as HTMLImageElement });
    editor.add({ ...maakFoto({ x: 100, y: 100, breedte: 400, hoogte: 400, assetId: 'a' }), filter: 'zwartwit' });
    const img = ctrl.group(editor.get().collage.elementen[0].id)!.findOne('Image') as Konva.Image;
    const cacheBreedte = () => (img as any)._getCanvasCache().scene._canvas.width as number;
    expect(cacheBreedte()).toBe(400);
    const gezien: number[] = [];
    const toData = ctrl.stage.toDataURL.bind(ctrl.stage);
    (ctrl.stage as any).toDataURL = (cfg: any) => { gezien.push(cacheBreedte()); return toData(cfg); };
    ctrl.exportPng(2);
    expect(gezien[0]).toBeGreaterThanOrEqual(800);
    expect(cacheBreedte()).toBe(400);
  });

  async function pixel(url: string, x: number, y: number) {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    return { w: img.width, h: img.height, rgb: [...ctx.getImageData(x, y, 1, 1).data.slice(0, 3)] };
  }

  it('exportPng: exact canvasformaat, zonder selectie en zonder lege vakken', async () => {
    const { editor, ctrl } = opzet();
    editor.add(maakFoto({ x: 600, y: 600, breedte: 800, hoogte: 800, assetId: null }));
    expect(editor.get().selectedId).not.toBeNull();
    const url = ctrl.exportPng(1);
    const p = await pixel(url, 600, 600);
    expect(Math.abs(p.w - 1200)).toBeLessThanOrEqual(1);
    expect(Math.abs(p.h - 1200)).toBeLessThanOrEqual(1);
    expect(p.rgb).toEqual([255, 255, 255]);
    expect(p.rgb).toEqual((await pixel(url, 210, 210)).rgb);
    expect(ctrl.stage.findOne('Transformer')!.isVisible()).toBe(true);
    expect(ctrl.stage.findOne('.leeg-vak')!.isVisible()).toBe(true);
  });

  it('exportPng met pixelRatio 2 verdubbelt de maat', async () => {
    const { ctrl } = opzet();
    expect(Math.abs((await pixel(ctrl.exportPng(2), 0, 0)).w - 2400)).toBeLessThanOrEqual(1);
  });
});
