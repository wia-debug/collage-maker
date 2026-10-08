import { describe, it, expect } from 'vitest';
import { toetsNaarActie } from './toetsen';

const t = (key: string, extra: Partial<{ ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }> = {}) =>
  toetsNaarActie({ key, ctrlKey: false, metaKey: false, shiftKey: false, ...extra });

describe('toetsNaarActie', () => {
  it('herkent ongedaan maken en opnieuw', () => {
    expect(t('z', { ctrlKey: true })).toEqual({ soort: 'ongedaan' });
    expect(t('Z', { metaKey: true, shiftKey: true })).toEqual({ soort: 'opnieuw' });
    expect(t('y', { ctrlKey: true })).toEqual({ soort: 'opnieuw' });
  });

  it('herkent wissen, kopie en deselecteren', () => {
    expect(t('Delete')).toEqual({ soort: 'wissen' });
    expect(t('Backspace')).toEqual({ soort: 'wissen' });
    expect(t('d', { ctrlKey: true })).toEqual({ soort: 'kopie' });
    expect(t('Escape')).toEqual({ soort: 'deselecteer' });
  });

  it('pijltjes schuiven 5, met shift 20', () => {
    expect(t('ArrowLeft')).toEqual({ soort: 'schuif', dx: -5, dy: 0 });
    expect(t('ArrowDown', { shiftKey: true })).toEqual({ soort: 'schuif', dx: 0, dy: 20 });
  });

  it('gewone letters doen niets', () => {
    expect(t('a')).toBeNull();
    expect(t('z')).toBeNull();
  });
});
