export type Geluid = 'plop' | 'zoef' | 'feest';

let aan = true;
let ctx: AudioContext | null = null;

export function zetGeluid(v: boolean): void { aan = v; }

// iOS laat geluid pas toe na een aanraking: maak of hervat de context dan.
export function ontgrendelGeluid(): void {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch { ctx = null; }
}

function toon(c: AudioContext, start: number, van: number, naar: number, duur: number, type: OscillatorType = 'sine', volume = 0.2): void {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(van, start);
  o.frequency.exponentialRampToValueAtTime(naar, start + duur);
  g.gain.setValueAtTime(volume, start);
  g.gain.exponentialRampToValueAtTime(0.001, start + duur);
  o.connect(g).connect(c.destination);
  o.start(start);
  o.stop(start + duur);
}

export function speel(geluid: Geluid): void {
  if (!aan || !ctx) return;
  try {
    const t = ctx.currentTime;
    if (geluid === 'plop') toon(ctx, t, 600, 180, 0.12);
    else if (geluid === 'zoef') toon(ctx, t, 900, 120, 0.25, 'triangle', 0.12);
    else [523, 659, 784, 1047].forEach((f, i) => toon(ctx!, t + i * 0.09, f, f, 0.16, 'square', 0.08));
  } catch { /* geluid is nooit belangrijk genoeg om iets te breken */ }
}
