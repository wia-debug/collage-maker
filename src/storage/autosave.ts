import type { Readable } from 'svelte/store';
import type { Collage } from '../document/types';
import type { EditorState } from '../editor/store';

export interface Autosave { flush(): Promise<void>; stop(): Promise<void>; heeftBewaard(): boolean }

export function isVolFout(e: unknown): boolean {
  const naam = (x: unknown) => (typeof x === 'object' && x !== null ? (x as { name?: string }).name : undefined);
  return naam(e) === 'QuotaExceededError' || naam((e as { inner?: unknown } | null)?.inner) === 'QuotaExceededError';
}

export function startAutosave(o: { state: Readable<EditorState>; bewaar: (c: Collage) => Promise<void>; wacht?: number; onFout?: (e: unknown) => void }): Autosave {
  const wacht = o.wacht ?? 800;
  let eerste: Collage | null = null;
  let laatstBewaard: Collage | null = null;
  let wachtend: Collage | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let keten: Promise<void> = Promise.resolve();
  let bewaardOoit = false;
  let gestopt = false;

  function plan(): void {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; void flush(); }, wacht);
  }

  function flush(): Promise<void> {
    if (timer) { clearTimeout(timer); timer = null; }
    const c = wachtend;
    wachtend = null;
    if (c && c !== laatstBewaard) {
      keten = keten.then(async () => {
        try {
          await o.bewaar(c);
          laatstBewaard = c;
          bewaardOoit = true;
        } catch (e) {
          o.onFout?.(e);
        }
      });
    }
    return keten;
  }

  const stopLuisteren = o.state.subscribe((s) => {
    if (gestopt) return;
    if (eerste === null) { eerste = s.collage; laatstBewaard = s.collage; return; }
    if (s.collage === laatstBewaard || s.collage === wachtend) return;
    wachtend = s.collage;
    plan();
  });

  return {
    flush,
    async stop() { gestopt = true; stopLuisteren(); await flush(); },
    heeftBewaard: () => bewaardOoit,
  };
}
