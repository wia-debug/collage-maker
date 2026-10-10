import { writable, type Readable } from 'svelte/store';
import type { Achtergrond, Collage, Element } from '../document/types';
import { nieuwGroepId, nieuwId } from '../document/create';
import { History } from './history';

// selectedId is afgeleid: het id als er precies één element gekozen is, anders null.
export interface EditorState { collage: Collage; selectedIds: string[]; selectedId: string | null; canUndo: boolean; canRedo: boolean }

export type Richting = 'voor' | 'achter' | 'voorste' | 'achterste';

export function createEditor(initial: Collage) {
  const history = new History<Collage>(initial);
  let selectedIds: string[] = [];
  // Collage zoals die was voor het eerste voorbeeld (live schuifwaarde); null als er geen voorbeeld loopt.
  let voorbeeldBasis: Collage | null = null;

  const snapshot = (): EditorState => ({
    collage: history.present, selectedIds, selectedId: selectedIds.length === 1 ? selectedIds[0] : null,
    canUndo: history.canUndo, canRedo: history.canRedo,
  });
  const store = writable<EditorState>(snapshot());

  const els = () => history.present.elementen;

  function emit(): void {
    const bestaat = new Set(els().map((e) => e.id));
    if (selectedIds.some((id) => !bestaat.has(id))) selectedIds = selectedIds.filter((id) => bestaat.has(id));
    // Na ongedaan maken kan een losse keuze weer bij een groep horen: altijd de hele groep kiezen.
    const volledig = metGroep(selectedIds);
    if (volledig.length !== selectedIds.length) selectedIds = volledig;
    store.set(snapshot());
  }

  // Alle ids plus de andere leden van hun groepen, in lijstvolgorde.
  function metGroep(ids: string[]): string[] {
    const set = new Set(ids);
    const groepen = new Set(els().filter((e) => set.has(e.id) && e.groep).map((e) => e.groep!));
    return els().filter((e) => set.has(e.id) || (e.groep !== undefined && groepen.has(e.groep))).map((e) => e.id);
  }

  function verandert(e: Element, patch: Partial<Element>): boolean {
    const r = e as unknown as Record<string, unknown>;
    return Object.entries(patch).some(([k, w]) => r[k] !== w);
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

  const toegevoegd = new Set<(el: Element) => void>();
  const gewist = new Set<() => void>();

  function add(el: Element): void {
    selectedIds = [el.id];
    commit({ elementen: [...els(), el] });
    for (const cb of toegevoegd) cb(el);
  }

  return {
    state: { subscribe: store.subscribe } as Readable<EditorState>,
    get: snapshot,
    load(c: Collage): void { voorbeeldBasis = null; history.reset(c); selectedIds = []; emit(); },
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
    remove(id: string): void {
      const voor = els().length;
      commit({ elementen: els().filter((e) => e.id !== id) });
      if (els().length < voor) for (const cb of gewist) cb();
    },
    removeMany(ids: string[]): void {
      if (!ids.length) return;
      const weg = new Set(ids);
      const voor = els().length;
      commit({ elementen: els().filter((e) => !weg.has(e.id)) });
      if (els().length < voor) for (const cb of gewist) cb();
    },
    opToevoegen(cb: (el: Element) => void): () => void { toegevoegd.add(cb); return () => toegevoegd.delete(cb); },
    opWissen(cb: () => void): () => void { gewist.add(cb); return () => gewist.delete(cb); },
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
    select(id: string | null): void { selectedIds = id ? metGroep([id]) : []; emit(); },
    selectMany(ids: string[]): void { selectedIds = metGroep(ids); emit(); },
    toggleSelect(id: string): void {
      const deel = metGroep([id]);
      const alGekozen = deel.every((x) => selectedIds.includes(x));
      selectedIds = alGekozen ? selectedIds.filter((x) => !deel.includes(x)) : metGroep([...selectedIds, ...deel]);
      emit();
    },
    updateMany(patches: Record<string, Partial<Element>>): void {
      if (!els().some((e) => patches[e.id] && verandert(e, patches[e.id]))) return;
      commit({ elementen: els().map((e) => (patches[e.id] ? ({ ...e, ...patches[e.id] } as Element) : e)) });
    },
    duplicateMany(ids: string[]): void {
      const set = new Set(ids);
      const bron = els().filter((e) => set.has(e.id) && !e.vergrendeld);
      if (!bron.length) return;
      const nieuweGroep = new Map<string, string>();
      const kopie = bron.map((e) => {
        const k = { ...structuredClone(e), id: nieuwId(), x: e.x + 30, y: e.y + 30 } as Element;
        if (e.groep) {
          if (!nieuweGroep.has(e.groep)) nieuweGroep.set(e.groep, nieuwGroepId());
          k.groep = nieuweGroep.get(e.groep);
        }
        return k;
      });
      selectedIds = kopie.map((e) => e.id);
      commit({ elementen: [...els(), ...kopie] });
      for (const el of kopie) for (const cb of toegevoegd) cb(el);
    },
    moveMany(ids: string[], richting: Richting): void {
      const set = new Set(ids);
      let lijst = [...els()];
      if (richting === 'voorste') lijst = [...lijst.filter((e) => !set.has(e.id)), ...lijst.filter((e) => set.has(e.id))];
      else if (richting === 'achterste') lijst = [...lijst.filter((e) => set.has(e.id)), ...lijst.filter((e) => !set.has(e.id))];
      else if (richting === 'voor') {
        for (let i = lijst.length - 2; i >= 0; i--) if (set.has(lijst[i].id) && !set.has(lijst[i + 1].id)) [lijst[i], lijst[i + 1]] = [lijst[i + 1], lijst[i]];
      } else {
        for (let i = 1; i < lijst.length; i++) if (set.has(lijst[i].id) && !set.has(lijst[i - 1].id)) [lijst[i], lijst[i - 1]] = [lijst[i - 1], lijst[i]];
      }
      if (lijst.every((e, k) => e === els()[k])) return;
      commit({ elementen: lijst });
    },
    groepeer(ids: string[]): void {
      const set = new Set(ids);
      if (set.size < 2) return;
      const g = nieuwGroepId();
      selectedIds = els().filter((e) => set.has(e.id)).map((e) => e.id);
      commit({ elementen: els().map((e) => (set.has(e.id) ? ({ ...e, groep: g } as Element) : e)) });
    },
    groepLos(groep: string): void {
      if (!els().some((e) => e.groep === groep)) return;
      commit({ elementen: els().map((e) => { if (e.groep !== groep) return e; const { groep: _, ...rest } = e; return rest as Element; }) });
    },
    undo(): void { herstelBasis(); history.undo(); emit(); },
    redo(): void { herstelBasis(); history.redo(); emit(); },
  };
}

export type Editor = ReturnType<typeof createEditor>;
