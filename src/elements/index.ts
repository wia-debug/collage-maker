import type Konva from 'konva';
import type { Element } from '../document/types';
import type { RenderCtx } from './base';
import { renderVorm } from './vorm';
import { renderSticker } from './sticker';
import { renderFoto } from './foto';
import { renderTekst } from './tekst';
import { renderTekening } from './tekening';

type Renderer = (el: never, ctx: RenderCtx) => Konva.Group;

const RENDERERS: Partial<Record<Element['type'], Renderer>> = {
  vorm: renderVorm as Renderer,
  sticker: renderSticker as Renderer,
  foto: renderFoto as Renderer,
  tekst: renderTekst as Renderer,
  tekening: renderTekening as Renderer,
};

export function renderElement(el: Element, ctx: RenderCtx): Konva.Group {
  const fn = RENDERERS[el.type];
  if (!fn) throw new Error(`Geen renderer voor ${el.type}`);
  return fn(el as never, ctx);
}

export type { RenderCtx };
