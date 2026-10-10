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
    if (tekenen && this.editor.get().selectedId) this.editor.select(null);
  }

  private opVensterLos = (e: PointerEvent): void => this.beeindigStreek(e.pointerId, true);
  private opVensterAnnuleer = (e: PointerEvent): void => this.beeindigStreek(e.pointerId, false);

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
    this.updateTransformer(s.selectedId);
    this.stage.batchDraw();
  }

  protected updateTransformer(selectedId: string | null): void {
    const sel = selectedId ? this.nodes.get(selectedId) : undefined;
    this.transformer.nodes(sel && !sel.el.vergrendeld ? [sel.group] : []);
    const vrij = sel?.el.type === 'foto' && !!sel.el.assetId;
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
      if (e.target.getLayer() === this.ui) return;
      const n = this.elementVan(e.target);
      if (!n) { this.editor.select(null); return; }
      this.editor.select(n.el.id);
      if (n.el.type === 'foto' && !n.el.assetId) this.opties.onVakTik?.(n.el.id);
    });
    this.stage.on('pointerdown', (e) => {
      if (this.gereedschap === 'selecteer') return;
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
      this.beeindigStreek((e.evt as PointerEvent).pointerId, e.type === 'pointerup');
    });
    this.stage.on('contextmenu', (e) => {
      e.evt.preventDefault();
      if (this.gereedschap !== 'selecteer') return;
      const n = this.elementVan(e.target);
      if (n) this.editor.select(n.el.id);
    });
    this.content.on('dragstart', (e) => {
      if (e.target.name() === 'element') this.editor.select(e.target.id());
    });
    this.content.on('dragend', (e) => {
      const g = e.target;
      if (g.name() !== 'element' || this.knijp) return;
      this.editor.update(g.id(), { x: g.x(), y: g.y() });
    });
    this.transformer.on('transformend', () => {
      const g = this.transformer.nodes()[0];
      if (!g) return;
      const el = this.nodes.get(g.id())?.el;
      const img = el?.type === 'foto' && el.assetId ? this.assets.image(el.assetId) : undefined;
      if (el?.type === 'foto' && img) {
        const b = Math.round(el.breedte * Math.abs(g.scaleX())), h = Math.round(el.hoogte * Math.abs(g.scaleY()));
        const i = img as HTMLImageElement;
        const bron = { breedte: i.naturalWidth || i.width, hoogte: i.naturalHeight || i.height };
        this.editor.update(g.id(), {
          x: g.x(), y: g.y(), rotatie: g.rotation(), breedte: b, hoogte: h, schaalX: 1, schaalY: 1,
          uitsnede: herUitsnede(el.uitsnede, bron, b, h),
        });
        return;
      }
      this.editor.update(g.id(), { x: g.x(), y: g.y(), rotatie: g.rotation(), schaalX: Math.abs(g.scaleX()), schaalY: g.scaleY() });
    });

    this.content.on('dragmove', (e) => {
      const g = e.target as unknown as Konva.Group;
      if (g.name() !== 'element') return;
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
