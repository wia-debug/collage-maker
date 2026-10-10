import { describe, it, expect, vi, afterEach } from 'vitest';
import { writable } from 'svelte/store';
import { isVolFout, startAutosave } from './autosave';
import { startHerinnering } from './herinnering';
import { nieuweCollage } from '../document/create';
import type { EditorState } from '../editor/store';
import type { Collage } from '../document/types';

afterEach(() => { vi.useRealTimers(); });

const toestand = (c: Collage): EditorState => ({ collage: c, selectedIds: [], selectedId: null, canUndo: false, canRedo: false });

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

  it('ongedaan maken naar de opgeslagen toestand bewaart niets nieuws', async () => {
    const c0 = nieuweCollage('vierkant');
    const state = writable(toestand(c0));
    const bewaard: string[] = [];
    const a = startAutosave({ state, bewaar: async (c) => { bewaard.push(c.naam); }, wacht: 10_000 });
    state.set(toestand({ ...c0, naam: 'c1' }));
    state.set(toestand(c0));
    await a.flush();
    expect(bewaard).toEqual([]);
    await a.stop();
  });

  it('ongedaan maken tijdens het bewaren eindigt op de laatste toestand', async () => {
    const c0 = nieuweCollage('vierkant');
    const state = writable(toestand(c0));
    const bewaard: string[] = [];
    const a = startAutosave({ state, wacht: 0, bewaar: async (c) => { await new Promise((r) => setTimeout(r, 30)); bewaard.push(c.naam); } });
    state.set(toestand({ ...c0, naam: 'c1' }));
    await new Promise((r) => setTimeout(r, 10));
    state.set(toestand(c0));
    await a.stop();
    expect(bewaard.at(-1)).toBe(c0.naam);
    expect(bewaard).toContain('c1');
  });

  it('een mislukte poging wordt bij de volgende flush opnieuw gedaan', async () => {
    const c0 = nieuweCollage('vierkant');
    const state = writable(toestand(c0));
    const pogingen: Collage[] = [];
    const a = startAutosave({
      state, wacht: 10_000, onFout: () => {},
      bewaar: async (c) => { pogingen.push(c); if (pogingen.length === 1) throw new Error('mislukt'); },
    });
    state.set(toestand({ ...c0, naam: 'x' }));
    await a.flush();
    expect(a.heeftBewaard()).toBe(false);
    await a.flush();
    expect(pogingen).toHaveLength(2);
    expect(pogingen[1]).toBe(pogingen[0]);
    expect(a.heeftBewaard()).toBe(true);
    await a.stop();
  });

  it('een blijvende fout geeft geen eindeloze nieuwe pogingen', async () => {
    const c0 = nieuweCollage('vierkant');
    const state = writable(toestand(c0));
    let keer = 0, fouten = 0;
    const a = startAutosave({ state, wacht: 10, onFout: () => { fouten++; }, bewaar: async () => { keer++; throw new Error('altijd mis'); } });
    state.set(toestand({ ...c0, naam: 'x' }));
    await new Promise((r) => setTimeout(r, 200));
    expect(keer).toBe(1);
    expect(fouten).toBe(1);
    await a.stop();
  });

  it('ongedaan maken tijdens het bewaren wordt vanzelf bewaard, zonder flush of stop', async () => {
    const c0 = nieuweCollage('vierkant');
    const state = writable(toestand(c0));
    const bewaard: string[] = [];
    const a = startAutosave({ state, wacht: 10, bewaar: async (c) => { await new Promise((r) => setTimeout(r, 40)); bewaard.push(c.naam); } });
    state.set(toestand({ ...c0, naam: 'c1' }));
    await new Promise((r) => setTimeout(r, 30));
    state.set(toestand(c0));
    await new Promise((r) => setTimeout(r, 250));
    expect(bewaard).toEqual(['c1', c0.naam]);
    await a.stop();
  });

  it('laatsteMislukt: true na een mislukte poging, false na een geslaagde', async () => {
    const c0 = nieuweCollage('vierkant');
    const state = writable(toestand(c0));
    let faal = true;
    const a = startAutosave({ state, bewaar: async () => { if (faal) throw new Error('vol'); }, wacht: 10 });
    expect(a.laatsteMislukt()).toBe(false);
    state.set(toestand({ ...c0, naam: '1' }));
    await a.flush();
    expect(a.laatsteMislukt()).toBe(true);
    faal = false;
    await a.flush();
    expect(a.laatsteMislukt()).toBe(false);
    await a.stop();
  });

  it('laatsteMislukt wordt false als ongedaan maken terugkeert naar de bewaarde toestand', async () => {
    const c0 = nieuweCollage('vierkant');
    const state = writable(toestand(c0));
    const a = startAutosave({ state, bewaar: async () => { throw new Error('vol'); }, wacht: 10 });
    state.set(toestand({ ...c0, naam: '1' }));
    await a.flush();
    expect(a.laatsteMislukt()).toBe(true);
    state.set(toestand(c0));
    await a.flush();
    expect(a.laatsteMislukt()).toBe(false);
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
