import type { Formaat } from './types';

export const FORMATEN: Record<Formaat, { naam: string; breedte: number; hoogte: number }> = {
  vierkant: { naam: 'Vierkant', breedte: 1200, hoogte: 1200 },
  'a4-liggend': { naam: 'Liggend', breedte: 1754, hoogte: 1240 },
  'a4-staand': { naam: 'Staand', breedte: 1240, hoogte: 1754 },
  poster: { naam: 'Poster', breedte: 1200, hoogte: 1800 },
};
