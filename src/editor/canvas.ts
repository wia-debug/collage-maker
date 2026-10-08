import Konva from 'konva';
import type { Achtergrond, Element, Formaat } from '../document/types';
import { FORMATEN } from '../document/formats';
import { renderElement, type RenderCtx } from '../elements/index';
import { renderAchtergrond } from '../elements/achtergrond';
import type { Editor, EditorState } from './store';

export interface ControllerOpties { onVakTik?(id: string): void }

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

  constructor(private container: HTMLDivElement, protected editor: Editor, protected assets: RenderCtx, protected opties: ControllerOpties = {}) {
    this.stage = new Konva.Stage({ container, width: container.clientWidth || 1, height: container.clientHeight || 1 });
    this.transformer = new Konva.Transformer({
      rotateEnabled: true,
      flipEnabled: false,
      keepRatio: true,
      enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
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

  group(id: string): Konva.Group | undefined { return this.nodes.get(id)?.group; }

  destroy(): void {
    this.stopSync();
    this.resizeObs.disconnect();
    this.stage.destroy();
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
      huidig?.group.destroy();
      const group = renderElement(el, this.assets);
      this.content.add(group);
      this.nodes.set(el.id, { el, group });
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
    this.transformer.keepRatio(sel?.el.type !== 'vorm');
  }

  protected elementVan(target: Konva.Node): NodeInfo | undefined {
    const g = target.findAncestor('.element', true) as Konva.Group | null | undefined;
    return g ? this.nodes.get(g.id()) : undefined;
  }

  protected bindEvents(): void {
    this.stage.on('click tap', (e) => {
      if (e.target.getLayer() === this.ui) return;
      const n = this.elementVan(e.target);
      if (!n) { this.editor.select(null); return; }
      this.editor.select(n.el.id);
      if (n.el.type === 'foto' && !n.el.assetId) this.opties.onVakTik?.(n.el.id);
    });
    this.stage.on('contextmenu', (e) => {
      e.evt.preventDefault();
      const n = this.elementVan(e.target);
      if (n) this.editor.select(n.el.id);
    });
    this.content.on('dragstart', (e) => {
      if (e.target.name() === 'element') this.editor.select(e.target.id());
    });
    this.content.on('dragend', (e) => {
      const g = e.target;
      if (g.name() !== 'element') return;
      this.editor.update(g.id(), { x: g.x(), y: g.y() });
    });
    this.transformer.on('transformend', () => {
      const g = this.transformer.nodes()[0];
      if (!g) return;
      this.editor.update(g.id(), { x: g.x(), y: g.y(), rotatie: g.rotation(), schaalX: Math.abs(g.scaleX()), schaalY: g.scaleY() });
    });
  }
}
