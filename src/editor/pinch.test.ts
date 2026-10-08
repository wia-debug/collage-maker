import { describe, it, expect } from 'vitest';
import { pinchDelta } from './pinch';

describe('pinchDelta', () => {
  it('verdubbelde afstand geeft schaal 2', () => {
    const d = pinchDelta({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: -50, y: 0 }, { x: 150, y: 0 });
    expect(d.schaal).toBeCloseTo(2);
    expect(d.rotatie).toBeCloseTo(0);
    expect(d.dx).toBeCloseTo(0);
  });

  it('kwartslag draaien geeft 90 graden', () => {
    const d = pinchDelta({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: -50 }, { x: 50, y: 50 });
    expect(d.rotatie).toBeCloseTo(90);
    expect(d.schaal).toBeCloseTo(1);
  });

  it('verschuiven van beide vingers geeft dx en dy', () => {
    const d = pinchDelta({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 30 }, { x: 30, y: 30 });
    expect(d.dx).toBeCloseTo(20);
    expect(d.dy).toBeCloseTo(30);
  });

  it('vingers op elkaar geven schaal 1 in plaats van oneindig', () => {
    expect(pinchDelta({ x: 5, y: 5 }, { x: 5, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 0 }).schaal).toBe(1);
  });
});
