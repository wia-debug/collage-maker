import type { WordArt } from '../document/types';

const wa = (w: Partial<WordArt> & Pick<WordArt, 'vorm' | 'vulling'>): WordArt => ({ omlijning: null, tweedeOmlijning: null, effect: 'geen', ...w });

export const WORDART_PRESETS: { id: string; naam: string; wordart: WordArt }[] = [
  { id: 'boog-zon', naam: 'Zonneboog', wordart: wa({ vorm: 'boog-omhoog', vulling: { soort: 'verloop', kleuren: ['#FFC94D', '#FF6B6B'] }, omlijning: { kleur: '#2D2A32', dikte: 4 } }) },
  { id: 'boog-zee', naam: 'Zeeboog', wordart: wa({ vorm: 'boog-omlaag', vulling: { soort: 'verloop', kleuren: ['#4ECDC4', '#5AA9F2'] }, omlijning: { kleur: '#FFFFFF', dikte: 4 } }) },
  { id: 'cirkel', naam: 'Rondje', wordart: wa({ vorm: 'cirkel', vulling: { soort: 'kleur', kleuren: ['#A78BFA'] }, omlijning: { kleur: '#FFFFFF', dikte: 3 } }) },
  { id: 'golf', naam: 'Golf', wordart: wa({ vorm: 'golf', vulling: { soort: 'regenboog', kleuren: [] }, omlijning: { kleur: '#2D2A32', dikte: 3 } }) },
  { id: 'regenboog', naam: 'Regenboog', wordart: wa({ vorm: 'recht', vulling: { soort: 'regenboog', kleuren: [] }, omlijning: { kleur: '#2D2A32', dikte: 3 } }) },
  { id: 'zon', naam: 'Zon', wordart: wa({ vorm: 'recht', vulling: { soort: 'verloop', kleuren: ['#FFE066', '#FF8C42'] }, omlijning: { kleur: '#7A3E00', dikte: 4 } }) },
  { id: 'zee', naam: 'Zee', wordart: wa({ vorm: 'recht', vulling: { soort: 'verloop', kleuren: ['#A0E7FF', '#2F6FDB'] }, omlijning: { kleur: '#FFFFFF', dikte: 4 } }) },
  { id: '3d', naam: '3D', wordart: wa({ vorm: 'recht', vulling: { soort: 'kleur', kleuren: ['#FF6B6B'] }, effect: '3d' }) },
  { id: 'neon-roze', naam: 'Neon roze', wordart: wa({ vorm: 'recht', vulling: { soort: 'kleur', kleuren: ['#FF4FD8'] }, effect: 'neon' }) },
  { id: 'neon-blauw', naam: 'Neon blauw', wordart: wa({ vorm: 'recht', vulling: { soort: 'kleur', kleuren: ['#38E1FF'] }, effect: 'neon' }) },
  { id: 'dubbel', naam: 'Dubbel', wordart: wa({ vorm: 'recht', vulling: { soort: 'kleur', kleuren: ['#FFC94D'] }, omlijning: { kleur: '#2D2A32', dikte: 4 }, tweedeOmlijning: { kleur: '#FFFFFF', dikte: 6 } }) },
  { id: 'strip', naam: 'Strip', wordart: wa({ vorm: 'recht', vulling: { soort: 'kleur', kleuren: ['#FFE14D'] }, omlijning: { kleur: '#2D2A32', dikte: 6 }, effect: 'schaduw' }) },
];

export function wordartPreset(id: string): WordArt {
  const p = WORDART_PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`Onbekende WordArt: ${id}`);
  return structuredClone(p.wordart);
}
