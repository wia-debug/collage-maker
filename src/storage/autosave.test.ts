import { describe, it, expect, vi, afterEach } from 'vitest';
import { writable } from 'svelte/store';
import { isVolFout, startAutosave } from './autosave';
import { startHerinnering } from './herinnering';
import { nieuweCollage } from '../document/create';
import type { EditorState } from '../editor/store';
import type { Collage } from '../document/types';

afterEach(() => { vi.useRealTimers(); });

const toestand = (c: Collage): EditorState => ({ collage: c, selectedId: null, canUndo: false, canRedo: false });

describe('autosave', () => {
  it('bewaart niet bij openen, wel na een wijziging (debounced, laatste wint)', async () => {
    vi.useFakeTimers();
    const c0 = nieuweCollage('vierkant');
    const state = writable(toestand(c0));
    const bewaard: Collage[] = [];
    const a = startAutosave({ state, bewaar: async (c) => { bewaard.push(c); }, wacht: 500 });
    await vi.advanceTimersByTimeAsync(1000);
    expect(bewaard).toEqual([]);
    const c1 = { ...c0, naam: '1' }, c2 = { ...c0, naam: '2' };
    state.set(toestand(c1));
    await vi.advanceTimersByTimeAsync(200);
    state.set(toestand(c2));
    await vi.advanceTimersByTimeAsync(499);
    expect(bewaard).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(bewaard.map((c) => c.naam)).toEqual(['2']);
    expect(a.heeftBewaard()).toBe(true);
    await a.stop();
  });

  it('flush bewaart meteen wat nog wacht; stop flusht en luistert niet meer', async () => {
    const c0 = nieuweCollage('vierkant');
    const state = writable(toestand(c0));
    const bewaard: string[] = [];
    const a = startAutosave({ state, bewaar: async (c) => { bewaard.push(c.naam); }, wacht: 10_000 });
    state.set(toestand({ ...c0, naam: 'x' }));
    await a.flush();
    expect(bewaard).toEqual(['x']);
    await a.flush();
    expect(bewaard).toEqual(['x']);
    state.set(toestand({ ...c0, naam: 'y' }));
    await a.stop();
    expect(bewaard).toEqual(['x', 'y']);
    state.set(toestand({ ...c0, naam: 'z' }));
    await a.flush();
    expect(bewaard).toEqual(['x', 'y']);
  });

  it('bewaart nooit twee keer tegelijk', async () => {
    const c0 = nieuweCollage('vierkant');
    const state = writable(toestand(c0));
    let actief = 0, maxActief = 0;
    const a = startAutosave({ state, wacht: 0, bewaar: async () => { actief++; maxActief = Math.max(maxActief, actief); await new Promise((r) => setTimeout(r, 20)); actief--; } });
    state.set(toestand({ ...c0, naam: '1' }));
    await new Promise((r) => setTimeout(r, 5));
    state.set(toestand({ ...c0, naam: '2' }));
    await new Promise((r) => setTimeout(r, 5));
    state.set(toestand({ ...c0, naam: '3' }));
    await a.stop();
    expect(maxActief).toBe(1);
  });

  it('opslag vol: onFout wordt geroepen en volgende pogingen gaan door', async () => {
    const c0 = nieuweCollage('vierkant');
    const state = writable(toestand(c0));
    const fouten: unknown[] = [];
    let keer = 0;
    const a = startAutosave({
      state, wacht: 0, onFout: (e) => fouten.push(e),
      bewaar: async () => { keer++; if (keer === 1) throw new DOMException('vol', 'QuotaExceededError'); },
    });
    state.set(toestand({ ...c0, naam: '1' }));
    await a.flush();
    state.set(toestand({ ...c0, naam: '2' }));
    await a.flush();
    expect(keer).toBe(2);
    expect(fouten).toHaveLength(1);
    expect(isVolFout(fouten[0])).toBe(true);
    await a.stop();
  });

  it('isVolFout herkent ook een ingepakte Dexie-fout', () => {
    expect(isVolFout({ name: 'AbortError', inner: { name: 'QuotaExceededError' } })).toBe(true);
    expect(isVolFout(new Error('anders'))).toBe(false);
  });
});

describe('herinnering', () => {
  it('toont alleen als het moet, elk interval', async () => {
    vi.useFakeTimers();
    let moet = false;
    const toon = vi.fn();
    const stop = startHerinnering({ interval: 1000, moet: () => moet, toon });
    await vi.advanceTimersByTimeAsync(1000);
    expect(toon).not.toHaveBeenCalled();
    moet = true;
    await vi.advanceTimersByTimeAsync(2000);
    expect(toon).toHaveBeenCalledTimes(2);
    stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(toon).toHaveBeenCalledTimes(2);
  });
});
