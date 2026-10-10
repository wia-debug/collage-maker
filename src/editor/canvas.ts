import Konva from 'konva';
import type { Achtergrond, Element, Formaat, TekenGereedschap } from '../document/types';
import { maakTekening } from '../document/create';
import { penStijl } from '../elements/tekening';
import { FORMATEN } from '../document/formats';
import { renderElement, type RenderCtx } from '../elements/index';
import { renderAchtergrond } from '../elements/achtergrond';
import type { Editor, EditorState } from './store';
import { snap, type Gids } from './snap';
import { alleenTransform } from './vergelijk';
import { herUitsnede } from './uitsnede';
import { pinchDelta, type Punt } from './pinch';

export interface ControllerOpties { onVakTik?(id: string): void }

export type Gereedschap = 'selecteer' | 'teken' | 'gum';

const MIN_MAAT = 20;
const HOEK_ANKERS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
const VRIJE_ANKERS = [...HOEK_ANKERS, 'middle-left', 'middle-right', 'top-center', 'bottom-center'];

interface NodeInfo { el: Element; group: Konva.Group }

export class CanvasController {
  readonly stage: Konva.Stage;
  protected content = new Konva.Layer();
  protected ui = new Konva.Layer();
  protected transformer: Konva.Transformer;
  protected nodes = new Map<string, NodeInfo>();
  protected maat = { breedte: 1, hoogte: 1 };
  private achtergrond?: Konva.Shape;
  private laatsteAchtergrond?: Achtergrond;
  private formaat?: Formaat;
  private stopSync: () => void;
  private resizeObs: ResizeObserver;
  private gereedschap: Gereedschap = 'selecteer';
  private pen: { gereedschap: TekenGereedschap; kleur: string; dikte: number } = { gereedschap: 'pen', kleur: '#2D2A32', dikte: 14 };
  private streek: { lijn: Konva.Line; punten: number[]; pointerId: number } | null = null;
  private gumPointer: number | null = null;
  private gumGeraakt = new Map<string, Konva.Group>();
  private knijp: { id: string; p1: Punt; p2: Punt; x: number; y: number; sx: number; sy: number; rot: number } | null = null;
  private meerKiezen = false;
  private kader: { rect: Konva.Rect; start: { x: number; y: number }; scherm: { x: number; y: number }; erbij: boolean } | null = null;
  private negeerKlik = false;
  private samen: { id: string; anderen: Konva.Group[] } | null = null;

  constructor(private container: HTMLDivElement, protected editor: Editor, protected assets: RenderCtx, protected opties: ControllerOpties = {}) {
    this.stage = new Konva.Stage({ container, width: container.clientWidth || 1, height: container.clientHeight || 1 });
    this.transformer = new Konva.Transformer({
      rotateEnabled: true,
      flipEnabled: false,
      keepRatio: true,
      enabledAnchors: HOEK_ANKERS,
      anchorSize: 28,
      anchorCornerRadius: 14,
      anchorStroke: '#5AA9F2',
      anchorStrokeWidth: 3,
      anchorFill: '#FFFFFF',
      borderStroke: '#5AA9F2',
      borderStrokeWidth: 3,
      rotateAnchorOffset: 48,
      padding: 6,
      // Geen nul- of piepkleine vakken: weiger krimpen onder 20 schermpixels (draaien of vergroten van een klein vak blijft kunnen).
      boundBoxFunc: (oud, nieuw) => ((Math.abs(nieuw.width) < MIN_MAAT && Math.abs(nieuw.width) < Math.abs(oud.width)) || (Math.abs(nieuw.height) < MIN_MAAT && Math.abs(nieuw.height) < Math.abs(oud.height)) ? oud : nieuw),
    });
    this.ui.add(this.transformer);
    this.stage.add(this.content, this.ui);
    this.bindEvents();
    window.addEventListener('pointerup', this.opVensterLos);
    window.addEventListener('pointercancel', this.opVensterAnnuleer);
    this.stopSync = editor.state.subscribe((s) => this.sync(s));
    this.resizeObs = new ResizeObserver(() => this.fit());
    this.resizeObs.observe(container);
  }

  fit(): void {
    const w = this.container.clientWidth || 1, h = this.container.clientHeight || 1;
    this.stage.size({ width: w, height: h });
    const s = Math.min(w / this.maat.breedte, h / this.maat.hoogte) * 0.94;
    this.stage.scale({ x: s, y: s });
    this.stage.position({ x: (w - this.maat.breedte * s) / 2, y: (h - this.maat.hoogte * s) / 2 });
    this.stage.batchDraw();
  }

  naarCanvas(clientX: number, clientY: number): { x: number; y: number } {
    const r = this.container.getBoundingClientRect();
    return { x: (clientX - r.left - this.stage.x()) / this.stage.scaleX(), y: (clientY - r.top - this.stage.y()) / this.stage.scaleY() };
  }

  naarScherm(x: number, y: number): { x: number; y: number } {
    const r = this.container.getBoundingClientRect();
    return { x: r.left + this.stage.x() + x * this.stage.scaleX(), y: r.top + this.stage.y() + y * this.stage.scaleY() };
  }

  setGereedschap(g: Gereedschap, pen?: Partial<{ gereedschap: TekenGereedschap; kleur: string; dikte: number }>): void {
    this.verwerpStreek();
    this.gereedschap = g;
    if (pen) this.pen = { ...this.pen, ...pen };
    const tekenen = g !== 'selecteer';
    this.content.listening(g !== 'teken');
    for (const n of this.nodes.values()) n.group.draggable(!tekenen && !n.el.vergrendeld);
    if (tekenen && this.editor.get().selectedIds.length) this.editor.select(null);
  }

  private opVensterLos = (e: PointerEvent): void => { this.rondKaderAf(true, e.shiftKey); this.beeindigStreek(e.pointerId, true); };
  private opVensterAnnuleer = (e: PointerEvent): void => { this.rondKaderAf(false); this.beeindigStreek(e.pointerId, false); };

  /** "Meer kiezen": een tik voegt een element toe aan de keuze of haalt het eruit. */
  zetMeerKiezen(aan: boolean): void { this.meerKiezen = aan; }

  /** Kiest alle niet-vastgezette elementen die helemaal binnen r vallen (inhoudscoördinaten), met hun groep. */
  kiesInKader(r: { x: number; y: number; width: number; height: number }, erbij = false): void {
    const binnen = [...this.nodes.values()].filter((n) => {
      if (n.el.vergrendeld) return false;
      const b = n.group.getClientRect({ relativeTo: this.content });
      return b.x >= r.x && b.y >= r.y && b.x + b.width <= r.x + r.width && b.y + b.height <= r.y + r.height;
    }).map((n) => n.el.id);
    this.editor.selectMany(erbij ? [...this.editor.get().selectedIds, ...binnen] : binnen);
  }

  // Sluit een lopend selectiekader af; een beweging van minder dan 8 schermpixels telt als gewone tik.
  private rondKaderAf(commit: boolean, shift = false): void {
    const k = this.kader;
    if (!k) return;
    this.kader = null;
    const s = this.stage.getPointerPosition();
    const r = { x: k.rect.x(), y: k.rect.y(), width: k.rect.width(), height: k.rect.height() };
    k.rect.destroy();
    this.ui.batchDraw();
    if (commit && s && Math.hypot(s.x - k.scherm.x, s.y - k.scherm.y) >= 8) {
      this.negeerKlik = true;
      this.kiesInKader(r, k.erbij || shift);
    }
  }

  private transformPatch(el: Element, g: Konva.Group): Partial<Element> {
    const img = el.type === 'foto' && el.assetId ? this.assets.image(el.assetId) : undefined;
    if (el.type === 'foto' && img) {
      const bRuw = Math.max(MIN_MAAT, el.breedte * Math.abs(g.scaleX())), hRuw = Math.max(MIN_MAAT, el.hoogte * Math.abs(g.scaleY()));
      const i = img as HTMLImageElement;
      const bron = { breedte: i.naturalWidth || i.width, hoogte: i.naturalHeight || i.height };
      return { x: g.x(), y: g.y(), rotatie: g.rotation(), breedte: Math.round(bRuw), hoogte: Math.round(hRuw), schaalX: 1, schaalY: 1, uitsnede: herUitsnede(el.uitsnede, bron, bRuw, hRuw) };
    }
    return { x: g.x(), y: g.y(), rotatie: g.rotation(), schaalX: Math.abs(g.scaleX()), schaalY: g.scaleY() };
  }

  private verwerpStreek(): void {
    this.streek?.lijn.destroy();
    this.streek = null;
    this.gumPointer = null;
    this.gumHerstel();
    this.ui.batchDraw();
  }

  private gumHerstel(): void {
    for (const g of this.gumGeraakt.values()) g.show();
    this.gumGeraakt.clear();
    this.content.batchDraw();
  }

  private beeindigStreek(pointerId: number, commit: boolean): void {
    if (this.gumPointer === pointerId) {
      this.gumPointer = null;
      if (!commit) { this.gumHerstel(); return; }
      const ids = [...this.gumGeraakt.keys()];
      this.gumGeraakt.clear();
      this.editor.removeMany(ids);
      return;
    }
    if (!this.streek || this.streek.pointerId !== pointerId) return;
    const { lijn, punten } = this.streek;
    this.streek = null;
    lijn.destroy();
    this.ui.batchDraw();
    if (!commit) return;
    this.editor.add(maakTekening(punten, this.pen.gereedschap, this.pen.kleur, this.pen.dikte));
    this.editor.select(null);
  }

  private gum(): void {
    const pos = this.stage.getPointerPosition();
    const shape = pos ? this.stage.getIntersection(pos) : null;
    const n = shape ? this.elementVan(shape) : undefined;
    if (n?.el.type !== 'tekening' || this.gumGeraakt.has(n.el.id)) return;
    n.group.hide();
    this.gumGeraakt.set(n.el.id, n.group);
    this.content.batchDraw();
  }

  group(id: string): Konva.Group | undefined { return this.nodes.get(id)?.group; }

  springOp(id: string): void {
    const n = this.nodes.get(id);
    if (!n) return;
    const sx = n.group.scaleX(), sy = n.group.scaleY();
    n.group.scale({ x: sx * 0.8, y: sy * 0.8 });
    new Konva.Tween({
      node: n.group, duration: 0.15, scaleX: sx * 1.05, scaleY: sy * 1.05, easing: Konva.Easings.EaseOut,
      onFinish: () => new Konva.Tween({ node: n.group, duration: 0.1, scaleX: sx, scaleY: sy, onFinish: () => this.transformer.forceUpdate() }).play(),
    }).play();
  }

  destroy(): void {
    this.stopSync();
    this.verwerpStreek();
    window.removeEventListener('pointerup', this.opVensterLos);
    window.removeEventListener('pointercancel', this.opVensterAnnuleer);
    this.resizeObs.disconnect();
    this.stage.destroy();
  }

  exportPng(pixelRatio = 2): string {
    const s = this.stage.scaleX();
    const verborgen = this.content.find('.leeg-vak').filter((n) => n.visible());
    verborgen.forEach((n) => n.hide());
    this.ui.hide();
    const gefilterd = this.content.find('Image').filter((n) => (n as Konva.Image).filters()?.length) as Konva.Image[];
    for (const n of gefilterd) n.cache({ pixelRatio: this.cachePixelRatio(n, pixelRatio) });
    try {
      return this.stage.toDataURL({ x: this.stage.x(), y: this.stage.y(), width: this.maat.breedte * s, height: this.maat.hoogte * s, pixelRatio: pixelRatio / s, mimeType: 'image/png' });
    } finally {
      for (const n of gefilterd) if (n.getStage()) n.cache({ pixelRatio: 1 });
      verborgen.forEach((n) => n.show());
      this.ui.show();
      this.stage.batchDraw();
    }
  }

  // Pixels per elementeenheid in de export, begrensd zodat de cache hooguit 4096 px lang wordt.
  private cachePixelRatio(n: Konva.Image, pixelRatio: number): number {
    const schaal = Math.abs(n.getAbsoluteScale().x) / this.stage.scaleX();
    const lang = Math.max(n.width(), n.height()) || 1;
    return Math.max(1, Math.min(pixelRatio * schaal, 4096 / lang));
  }

  protected sync(s: EditorState): void {
    const c = s.collage;
    if (c.formaat !== this.formaat) {
      this.formaat = c.formaat;
      this.maat = { breedte: FORMATEN[c.formaat].breedte, hoogte: FORMATEN[c.formaat].hoogte };
      this.content.clip({ x: 0, y: 0, width: this.maat.breedte, height: this.maat.hoogte });
      this.laatsteAchtergrond = undefined;
      this.fit();
    }
    if (c.achtergrond !== this.laatsteAchtergrond) {
      this.achtergrond?.destroy();
      this.achtergrond = renderAchtergrond(c.achtergrond, this.maat.breedte, this.maat.hoogte, this.assets);
      this.content.add(this.achtergrond);
      this.laatsteAchtergrond = c.achtergrond;
    }
    const gezien = new Set<string>();
    for (const el of c.elementen) {
      gezien.add(el.id);
      const huidig = this.nodes.get(el.id);
      if (huidig && huidig.el === el) continue;
      if (huidig && alleenTransform(huidig.el, el)) {
        huidig.group.setAttrs({
          x: el.x, y: el.y, rotation: el.rotatie,
          scaleX: el.schaalX * (el.gespiegeld ? -1 : 1), scaleY: el.schaalY,
          draggable: this.gereedschap === 'selecteer' && !el.vergrendeld,
        });
        huidig.el = el;
        continue;
      }
      huidig?.group.destroy();
      const group = renderElement(el, this.assets);
      this.content.add(group);
      this.nodes.set(el.id, { el, group });
      if (this.gereedschap !== 'selecteer') group.draggable(false);
    }
    for (const [id, n] of this.nodes) {
      if (!gezien.has(id)) { n.group.destroy(); this.nodes.delete(id); }
    }
    this.achtergrond!.zIndex(0);
    c.elementen.forEach((el, i) => this.nodes.get(el.id)!.group.zIndex(i + 1));
    this.updateTransformer(s.selectedIds);
    this.stage.batchDraw();
  }

  protected updateTransformer(ids: string[]): void {
    const gekozen = ids.map((id) => this.nodes.get(id)).filter((n): n is NodeInfo => !!n && !n.el.vergrendeld);
    this.transformer.nodes(gekozen.map((n) => n.group));
    if (gekozen.length > 1) { this.transformer.keepRatio(true); this.transformer.enabledAnchors(HOEK_ANKERS); return; }
    const sel = gekozen[0];
    const vrij = sel?.el.type === 'foto' && !!sel.el.assetId && !sel.el.verhoudingVast;
    this.transformer.keepRatio(sel?.el.type !== 'vorm' && !vrij);
    this.transformer.enabledAnchors(vrij ? VRIJE_ANKERS : HOEK_ANKERS);
  }

  protected elementVan(target: Konva.Node): NodeInfo | undefined {
    const g = target.findAncestor('.element', true) as Konva.Group | null | undefined;
    return g ? this.nodes.get(g.id()) : undefined;
  }

  protected tekenGidsen(gidsen: Gids[]): void {
    this.ui.find('.gids').forEach((n) => n.destroy());
    const dik = 2 / this.stage.scaleX();
    for (const g of gidsen) {
      const punten = g.richting === 'v' ? [g.pos, 0, g.pos, this.maat.hoogte] : [0, g.pos, this.maat.breedte, g.pos];
      this.ui.add(new Konva.Line({ name: 'gids', points: punten, stroke: '#FF6B6B', strokeWidth: dik, dash: [8 * dik, 6 * dik], listening: false }));
    }
    this.ui.batchDraw();
  }

  private touchPunten(e: TouchEvent): [Punt, Punt] {
    const t = e.touches;
    return [{ x: t[0].clientX, y: t[0].clientY }, { x: t[1].clientX, y: t[1].clientY }];
  }

  protected bindEvents(): void {
    this.stage.on('click tap', (e) => {
      if (this.gereedschap !== 'selecteer') return;
      if (this.negeerKlik) { this.negeerKlik = false; return; }
      if (e.target.getLayer() === this.ui) return;
      const n = this.elementVan(e.target);
      const meer = this.meerKiezen || !!(e.evt as MouseEvent | undefined)?.shiftKey;
      if (!n) { if (!meer) this.editor.select(null); return; }
      if (meer) { this.editor.toggleSelect(n.el.id); return; }
      this.editor.select(n.el.id);
      if (n.el.type === 'foto' && !n.el.assetId) this.opties.onVakTik?.(n.el.id);
    });
    this.stage.on('pointerdown', (e) => {
      if (this.gereedschap === 'selecteer') {
        // Selectiekader: alleen vanaf een lege plek (geen element geraakt).
        if (e.target !== this.stage || this.kader) return;
        const p = this.content.getRelativePointerPosition();
        const sp = this.stage.getPointerPosition();
        if (!p || !sp) return;
        const z = 1 / this.stage.scaleX();
        const rect = new Konva.Rect({ name: 'selectiekader', x: p.x, y: p.y, width: 0, height: 0, stroke: '#5AA9F2', strokeWidth: 2 * z, dash: [8 * z, 6 * z], fill: 'rgba(90,169,242,0.12)', listening: false });
        this.ui.add(rect);
        this.kader = { rect, start: p, scherm: sp, erbij: this.meerKiezen || !!(e.evt as PointerEvent).shiftKey };
        return;
      }
      const evt = e.evt as PointerEvent;
      if (this.streek || this.gumPointer !== null) return;
      if (this.gereedschap === 'gum') { this.gumPointer = evt.pointerId; this.gum(); return; }
      const p = this.content.getRelativePointerPosition();
      if (!p) return;
      const lijn = new Konva.Line({ points: [p.x, p.y, p.x + 0.5, p.y + 0.5], stroke: this.pen.kleur, strokeWidth: this.pen.dikte, listening: false, ...penStijl(this.pen.gereedschap, this.pen.dikte) });
      this.ui.add(lijn);
      this.streek = { lijn, punten: [p.x, p.y], pointerId: evt.pointerId };
    });
    this.stage.on('pointermove', (e) => {
      if (this.kader) {
        const p = this.content.getRelativePointerPosition();
        if (!p) return;
        const s = this.kader.start;
        this.kader.rect.setAttrs({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), width: Math.abs(p.x - s.x), height: Math.abs(p.y - s.y) });
        this.ui.batchDraw();
        return;
      }
      const evt = e.evt as PointerEvent;
      if (this.gumPointer === evt.pointerId) { this.gum(); return; }
      if (!this.streek || this.streek.pointerId !== evt.pointerId) return;
      const p = this.content.getRelativePointerPosition();
      if (!p) return;
      const pts = this.streek.punten;
      if (Math.hypot(p.x - pts[pts.length - 2], p.y - pts[pts.length - 1]) < 2) return;
      pts.push(p.x, p.y);
      this.streek.lijn.points(pts);
      this.ui.batchDraw();
    });
    this.stage.on('pointerup pointercancel', (e) => {
      if (this.kader) { this.rondKaderAf(e.type === 'pointerup', !!(e.evt as PointerEvent).shiftKey); return; }
      this.beeindigStreek((e.evt as PointerEvent).pointerId, e.type === 'pointerup');
    });
    this.stage.on('contextmenu', (e) => {
      e.evt.preventDefault();
      if (this.gereedschap !== 'selecteer') return;
      const n = this.elementVan(e.target);
      if (n) this.editor.select(n.el.id);
    });
    this.content.on('dragstart', (e) => {
      if (e.target.name() !== 'element' || this.samen) return;
      const id = e.target.id();
      if (!this.editor.get().selectedIds.includes(id)) this.editor.select(id);
      const ids = this.editor.get().selectedIds;
      // Meerdere gekozen: de transformer sleept de andere gekozen nodes mee; bij loslaten één stap.
      this.samen = ids.length > 1 ? {
        id,
        anderen: ids.filter((x) => x !== id).map((x) => this.nodes.get(x)).filter((n): n is NodeInfo => !!n && !n.el.vergrendeld).map((n) => n.group),
      } : null;
    });
    this.content.on('dragend', (e) => {
      const g = e.target;
      if (g.name() !== 'element' || this.knijp) return;
      if (this.samen) {
        if (g.id() !== this.samen.id) return;
        const patches: Record<string, Partial<Element>> = { [g.id()]: { x: g.x(), y: g.y() } };
        for (const a of this.samen.anderen) patches[a.id()] = { x: a.x(), y: a.y() };
        this.samen = null;
        this.editor.updateMany(patches);
        return;
      }
      // Een node die meesleepte en al bewaard is, verandert niets meer: geen extra stap.
      const el = this.nodes.get(g.id())?.el;
      if (el && el.x === g.x() && el.y === g.y()) return;
      this.editor.update(g.id(), { x: g.x(), y: g.y() });
    });
    this.transformer.on('transformend', () => {
      const groepen = this.transformer.nodes() as Konva.Group[];
      if (!groepen.length) return;
      const patches: Record<string, Partial<Element>> = {};
      for (const g of groepen) {
        const el = this.nodes.get(g.id())?.el;
        if (el) patches[g.id()] = this.transformPatch(el, g);
      }
      const eerste = groepen[0].id();
      if (groepen.length === 1) { if (patches[eerste]) this.editor.update(eerste, patches[eerste]); }
      else this.editor.updateMany(patches);
    });

    this.content.on('dragmove', (e) => {
      const g = e.target as unknown as Konva.Group;
      if (g.name() !== 'element') return;
      // Samen slepen: de transformer zet de andere gekozen nodes mee; geen magneetlijnen.
      if (this.samen) return;
      const box = g.getClientRect({ relativeTo: this.content });
      const andere = [...this.nodes.values()].filter((n) => n.group !== g).map((n) => n.group.getClientRect({ relativeTo: this.content }));
      const r = snap(box, andere, this.maat, 12 / this.stage.scaleX());
      g.x(g.x() + r.dx);
      g.y(g.y() + r.dy);
      this.tekenGidsen(r.gidsen);
    });
    this.content.on('dragend', () => this.tekenGidsen([]));

    this.stage.on('touchmove', (e) => {
      const evt = e.evt as TouchEvent;
      if (evt.touches.length !== 2) return;
      const id = this.editor.get().selectedId;
      const n = id ? this.nodes.get(id) : undefined;
      if (!n || n.el.vergrendeld) return;
      evt.preventDefault();
      const [p1, p2] = this.touchPunten(evt);
      if (!this.knijp || this.knijp.id !== n.el.id) {
        this.knijp = { id: n.el.id, p1, p2, x: n.group.x(), y: n.group.y(), sx: n.group.scaleX(), sy: n.group.scaleY(), rot: n.group.rotation() };
        n.group.stopDrag();
        return;
      }
      const d = pinchDelta(this.knijp.p1, this.knijp.p2, p1, p2);
      const s = this.stage.scaleX();
      const klem = (v: number) => Math.sign(v) * Math.min(20, Math.max(0.05, Math.abs(v)));
      n.group.setAttrs({
        scaleX: klem(this.knijp.sx * d.schaal),
        scaleY: klem(this.knijp.sy * d.schaal),
        rotation: this.knijp.rot + d.rotatie,
        x: this.knijp.x + d.dx / s,
        y: this.knijp.y + d.dy / s,
      });
      this.transformer.forceUpdate();
      this.stage.batchDraw();
    });
    this.stage.on('touchend touchcancel', (e) => {
      if (!this.knijp || (e.evt as TouchEvent).touches.length >= 2) return;
      const g = this.nodes.get(this.knijp.id)?.group;
      this.knijp = null;
      if (g) this.editor.update(g.id(), { x: g.x(), y: g.y(), rotatie: g.rotation(), schaalX: Math.abs(g.scaleX()), schaalY: g.scaleY() });
    });
  }
}
