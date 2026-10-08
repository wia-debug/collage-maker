import Konva from 'konva';
import type { Basis } from '../document/types';

export interface RenderCtx { image(key: string): CanvasImageSource | undefined }

export function baseGroup(b: Basis): Konva.Group {
  return new Konva.Group({
    id: b.id,
    name: 'element',
    x: b.x,
    y: b.y,
    offsetX: b.breedte / 2,
    offsetY: b.hoogte / 2,
    rotation: b.rotatie,
    scaleX: b.schaalX * (b.gespiegeld ? -1 : 1),
    scaleY: b.schaalY,
    draggable: !b.vergrendeld,
  });
}
