export interface Box { x: number; y: number; width: number; height: number }
export interface Gids { richting: 'v' | 'h'; pos: number }

const xs = (b: Box) => [b.x, b.x + b.width / 2, b.x + b.width];
const ys = (b: Box) => [b.y, b.y + b.height / 2, b.y + b.height];

function beste(eigen: number[], doelen: number[], drempel: number): { d: number; pos: number } | null {
  let r: { d: number; pos: number } | null = null;
  for (const e of eigen) {
    for (const t of doelen) {
      const d = t - e;
      if (Math.abs(d) <= drempel && (!r || Math.abs(d) < Math.abs(r.d))) r = { d, pos: t };
    }
  }
  return r;
}

export function snap(moving: Box, others: Box[], canvas: { breedte: number; hoogte: number }, drempel: number): { dx: number; dy: number; gidsen: Gids[] } {
  const bx = beste(xs(moving), [0, canvas.breedte / 2, canvas.breedte, ...others.flatMap(xs)], drempel);
  const by = beste(ys(moving), [0, canvas.hoogte / 2, canvas.hoogte, ...others.flatMap(ys)], drempel);
  const gidsen: Gids[] = [];
  if (bx) gidsen.push({ richting: 'v', pos: bx.pos });
  if (by) gidsen.push({ richting: 'h', pos: by.pos });
  return { dx: bx?.d ?? 0, dy: by?.d ?? 0, gidsen };
}
