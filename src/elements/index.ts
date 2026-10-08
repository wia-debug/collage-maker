import type Konva from 'konva';
import type { Element } from '../document/types';
import type { RenderCtx } from './base';
import { renderVorm } from './vorm';
import { renderSticker } from './sticker';
import { renderFoto } from './foto';

type Renderer = (el: never, ctx: RenderCtx) => Konva.Group;

const RENDERERS: Partial<Record<Element['type'], Renderer>> = {
  vorm: renderVorm as Renderer,
  sticker: renderSticker as Renderer,
  foto: renderFoto as Renderer,
};

export function renderElement(el: Element, ctx: RenderCtx): Konva.Group {
  const fn = RENDERERS[el.type];
  if (!fn) throw new Error(`Geen renderer voor ${el.type}`);
  return fn(el as never, ctx);
}

export type { RenderCtx };
