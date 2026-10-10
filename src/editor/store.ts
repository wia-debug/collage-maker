import { writable, type Readable } from 'svelte/store';
import type { Achtergrond, Collage, Element } from '../document/types';
import { nieuwId } from '../document/create';
import { History } from './history';

export interface EditorState { collage: Collage; selectedId: string | null; canUndo: boolean; canRedo: boolean }

export type Richting = 'voor' | 'achter' | 'voorste' | 'achterste';

export function createEditor(initial: Collage) {
  const history = new History<Collage>(initial);
  let selectedId: string | null = null;
  // Collage zoals die was voor het eerste voorbeeld (live schuifwaarde); null als er geen voorbeeld loopt.
  let voorbeeldBasis: Collage | null = null;

  const snapshot = (): EditorState => ({ collage: history.present, selectedId, canUndo: history.canUndo, canRedo: history.canRedo });
  const store = writable<EditorState>(snapshot());

  function emit(): void {
    if (selectedId && !history.present.elementen.some((e) => e.id === selectedId)) selectedId = null;
    store.set(snapshot());
  }

  function herstelBasis(): void {
    if (!voorbeeldBasis) return;
    history.present = voorbeeldBasis;
    voorbeeldBasis = null;
  }

  function commit(patch: Partial<Collage>): void {
    herstelBasis();
    history.push({ ...history.present, ...patch, gewijzigd: Date.now() });
    emit();
  }

  const els = () => history.present.elementen;

  function add(el: Element): void {
    selectedId = el.id;
    commit({ elementen: [...els(), el] });
  }

  return {
    state: { subscribe: store.subscribe } as Readable<EditorState>,
    get: snapshot,
    load(c: Collage): void { voorbeeldBasis = null; history.reset(c); selectedId = null; emit(); },
    add,
    // Toont een tussenwaarde zonder geschiedenis: de volgende update (of annuleerVoorbeeld) vertrekt vanaf de basis.
    voorbeeld(id: string, patch: Partial<Element>): void {
      if (!voorbeeldBasis) voorbeeldBasis = history.present;
      history.present = { ...history.present, elementen: els().map((e) => (e.id === id ? ({ ...e, ...patch } as Element) : e)) };
      emit();
    },
    annuleerVoorbeeld(): void {
      if (!voorbeeldBasis) return;
      herstelBasis();
      emit();
    },
    update(id: string, patch: Partial<Element>): void {
      commit({ elementen: els().map((e) => (e.id === id ? ({ ...e, ...patch } as Element) : e)) });
    },
    remove(id: string): void { commit({ elementen: els().filter((e) => e.id !== id) }); },
    removeMany(ids: string[]): void {
      if (!ids.length) return;
      const weg = new Set(ids);
      commit({ elementen: els().filter((e) => !weg.has(e.id)) });
    },
    duplicate(id: string): void {
      const e = els().find((x) => x.id === id);
      if (!e) return;
      add({ ...structuredClone(e), id: nieuwId(), x: e.x + 30, y: e.y + 30 });
    },
    move(id: string, richting: Richting): void {
      const lijst = [...els()];
      const i = lijst.findIndex((e) => e.id === id);
      if (i < 0) return;
      const [el] = lijst.splice(i, 1);
      const doel = richting === 'voor' ? Math.min(i + 1, lijst.length) : richting === 'achter' ? Math.max(i - 1, 0) : richting === 'voorste' ? lijst.length : 0;
      lijst.splice(doel, 0, el);
      if (lijst.every((e, k) => e === els()[k])) return;
      commit({ elementen: lijst });
    },
    setAchtergrond(a: Achtergrond): void { commit({ achtergrond: a }); },
    rename(naam: string): void { commit({ naam }); },
    select(id: string | null): void { selectedId = id; emit(); },
    undo(): void { herstelBasis(); history.undo(); emit(); },
    redo(): void { herstelBasis(); history.redo(); emit(); },
  };
}

export type Editor = ReturnType<typeof createEditor>;
