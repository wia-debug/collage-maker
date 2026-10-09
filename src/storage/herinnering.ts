export function startHerinnering(o: { interval: number; moet: () => boolean; toon: () => void }): () => void {
  const t = setInterval(() => { if (o.moet()) o.toon(); }, o.interval);
  return () => clearInterval(t);
}
