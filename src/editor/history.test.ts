import { describe, it, expect } from 'vitest';
import { History } from './history';

describe('History', () => {
  it('undo en redo wandelen door de toestanden', () => {
    const h = new History(1);
    h.push(2); h.push(3);
    expect(h.undo()).toBe(2);
    expect(h.undo()).toBe(1);
    expect(h.canUndo).toBe(false);
    expect(h.redo()).toBe(2);
    expect(h.canRedo).toBe(true);
  });

  it('een nieuwe push wist de redo-toekomst', () => {
    const h = new History('a');
    h.push('b'); h.undo(); h.push('c');
    expect(h.canRedo).toBe(false);
    expect(h.present).toBe('c');
  });

  it('bewaart maximaal limit stappen', () => {
    const h = new History(0, 50);
    for (let i = 1; i <= 60; i++) h.push(i);
    let n = 0;
    while (h.canUndo) { h.undo(); n++; }
    expect(n).toBe(50);
    expect(h.present).toBe(10);
  });

  it('negeert push van dezelfde referentie', () => {
    const o = { a: 1 };
    const h = new History(o);
    h.push(o);
    expect(h.canUndo).toBe(false);
  });

  it('undo zonder geschiedenis laat present ongemoeid', () => {
    const h = new History(5);
    expect(h.undo()).toBe(5);
  });
});
