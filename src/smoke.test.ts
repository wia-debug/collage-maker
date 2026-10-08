import { describe, it, expect } from 'vitest';
import Konva from 'konva';

describe('testomgeving', () => {
  it('draait in een echte browser met canvas', () => {
    const c = document.createElement('canvas');
    expect(c.getContext('2d')).not.toBeNull();
    expect(typeof Konva.Stage).toBe('function');
  });
});
