export interface Punt { x: number; y: number }

const hoek = (p: Punt, q: Punt) => Math.atan2(q.y - p.y, q.x - p.x);

export function pinchDelta(a1: Punt, a2: Punt, b1: Punt, b2: Punt): { schaal: number; rotatie: number; dx: number; dy: number } {
  const da = Math.hypot(a2.x - a1.x, a2.y - a1.y);
  const db = Math.hypot(b2.x - b1.x, b2.y - b1.y);
  return {
    schaal: da === 0 ? 1 : db / da,
    rotatie: ((hoek(b1, b2) - hoek(a1, a2)) * 180) / Math.PI,
    dx: (b1.x + b2.x) / 2 - (a1.x + a2.x) / 2,
    dy: (b1.y + b2.y) / 2 - (a1.y + a2.y) / 2,
  };
}
