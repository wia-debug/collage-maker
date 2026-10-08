import { maakFoto, maakSticker, maakTekst, nieuweCollage } from '../document/create';
import { FORMATEN } from '../document/formats';
import type { Achtergrond, Collage, Element, Formaat, FotoElement, TekstElement } from '../document/types';
import { wordartPreset } from './wordart-presets';

export interface TemplateDef { id: string; naam: string; formaat: Formaat; maak(): Collage }

const vak = (x: number, y: number, b: number, h: number, extra: Partial<FotoElement> = {}): FotoElement =>
  ({ ...maakFoto({ x: x + b / 2, y: y + h / 2, breedte: b, hoogte: h, assetId: null }), ...extra });

const titel = (tekst: string, x: number, y: number, breedte: number, grootte: number, preset: string, lettertype = 'luckiest'): TekstElement =>
  ({ ...maakTekst({ x, y, tekst, breedte, grootte, lettertype }), wordart: wordartPreset(preset) });

const tekst = (t: string, x: number, y: number, breedte: number, grootte: number, lettertype: string, extra: Partial<TekstElement> = {}): TekstElement =>
  ({ ...maakTekst({ x, y, tekst: t, breedte, grootte, lettertype }), ...extra });

const sticker = (s: string, x: number, y: number, grootte: number, kleur: string, rotatie = 0) =>
  ({ ...maakSticker({ x, y, sticker: s, kleur, grootte }), rotatie });

function raster(formaat: Formaat, kol: number, rij: number, marge = 40): FotoElement[] {
  const { breedte: W, hoogte: H } = FORMATEN[formaat];
  const b = (W - marge * (kol + 1)) / kol, h = (H - marge * (rij + 1)) / rij;
  const uit: FotoElement[] = [];
  for (let r = 0; r < rij; r++) for (let c = 0; c < kol; c++) uit.push(vak(marge + c * (b + marge), marge + r * (h + marge), b, h));
  return uit;
}

function collage(formaat: Formaat, naam: string, achtergrond: Achtergrond, elementen: Element[]): Collage {
  return { ...nieuweCollage(formaat, naam), achtergrond, elementen };
}

const wit: Achtergrond = { soort: 'kleur', kleur: '#FFFFFF' };
const polaroid = { kader: { stijl: 'polaroid' as const, kleur: '#FFFFFF' } };

export const TEMPLATES: TemplateDef[] = [
  { id: 'raster-2', naam: '2 foto\'s', formaat: 'a4-liggend', maak: () => collage('a4-liggend', '2 foto\'s', wit, raster('a4-liggend', 2, 1)) },
  { id: 'raster-3', naam: '3 foto\'s', formaat: 'a4-liggend', maak: () => collage('a4-liggend', '3 foto\'s', wit, [vak(40, 40, 1040, 1160), vak(1120, 40, 594, 560), vak(1120, 640, 594, 560)]) },
  { id: 'raster-4', naam: '4 foto\'s', formaat: 'vierkant', maak: () => collage('vierkant', '4 foto\'s', wit, raster('vierkant', 2, 2)) },
  { id: 'raster-6', naam: '6 foto\'s', formaat: 'a4-staand', maak: () => collage('a4-staand', '6 foto\'s', wit, raster('a4-staand', 2, 3)) },
  {
    id: 'vakantie', naam: 'Vakantie', formaat: 'a4-liggend',
    maak: () => collage('a4-liggend', 'Mijn vakantie', { soort: 'verloop', van: '#A0E7FF', naar: '#FFF3C4', hoek: 90 }, [
      vak(150, 380, 440, 440, { ...polaroid, rotatie: -6 }), vak(657, 360, 440, 440, { ...polaroid, rotatie: 3 }), vak(1164, 380, 440, 440, { ...polaroid, rotatie: -3 }),
      titel('Mijn vakantie', 877, 170, 1200, 130, 'boog-zon'),
      sticker('seizoenen/sun', 1580, 150, 200, '#FFC94D'), sticker('voertuigen/sailboat', 180, 1080, 180, '#5AA9F2'), sticker('natuur/tree-palm', 1600, 1050, 200, '#3BB273'),
    ]),
  },
  {
    id: 'verjaardag', naam: 'Verjaardag', formaat: 'vierkant',
    maak: () => collage('vierkant', 'Verjaardag', { soort: 'patroon', patroon: 'stippen', kleur: '#FFC94D', achtergrondkleur: '#FFF8EE' }, [
      vak(350, 330, 500, 500, { masker: 'rond', kader: { stijl: 'effen', kleur: '#FF6B6B' } }),
      titel('Hoera!', 600, 170, 1000, 160, '3d'),
      tekst('Ik word ... jaar', 600, 950, 900, 80, 'chewy', { ballon: '#FFFFFF' }),
      sticker('feest/cake', 180, 1020, 220, '#FF6B6B'), sticker('feest/gift', 1020, 1020, 220, '#A78BFA'), sticker('feest/confetti', 1030, 380, 200, '#FF9F1C', 15),
    ]),
  },
  {
    id: 'over-mij', naam: 'Over mij', formaat: 'a4-staand',
    maak: () => collage('a4-staand', 'Dit ben ik', { soort: 'kleur', kleur: '#FFF8EE' }, [
      vak(320, 330, 600, 600, { masker: 'hart' }),
      titel('Dit ben ik', 620, 180, 1100, 150, 'regenboog'),
      tekst('Ik hou van ...', 620, 1100, 1000, 70, 'baloo', { ballon: '#FFE14D' }),
      tekst('Later word ik ...', 620, 1300, 1000, 70, 'baloo', { ballon: '#4ECDC4' }),
      tekst('Mijn lievelingskleur is ...', 620, 1500, 1000, 70, 'baloo', { ballon: '#A78BFA' }),
      sticker('vormen/star', 1080, 300, 160, '#FFC94D', 12),
    ]),
  },
  {
    id: 'huisdier', naam: 'Huisdier', formaat: 'vierkant',
    maak: () => collage('vierkant', 'Mijn huisdier', { soort: 'kleur', kleur: '#E8F7F5' }, [
      vak(300, 260, 600, 600, { masker: 'blob', kader: { stijl: 'golf', kleur: '#4ECDC4' } }),
      titel('Mijn huisdier', 600, 150, 1100, 120, 'zon'),
      tekst('Naam: ...', 600, 1000, 800, 80, 'fredoka'),
      sticker('dieren/paw-print', 150, 1050, 150, '#A0522D', -20), sticker('dieren/paw-print', 1050, 1050, 150, '#A0522D', 20), sticker('dieren/bone', 1060, 250, 150, '#9CA3AF', 30),
    ]),
  },
  {
    id: 'seizoen', naam: 'Seizoenen', formaat: 'a4-liggend',
    maak: () => {
      const v = raster('a4-liggend', 2, 2, 60);
      const kleuren = ['#8BD450', '#FFC94D', '#FF9F1C', '#5AA9F2'];
      const labels = ['Lente', 'Zomer', 'Herfst', 'Winter'].map((t, i) => tekst(t, v[i].x, v[i].y + v[i].hoogte / 2 - 50, 300, 60, 'sniglet', { ballon: kleuren[i] }));
      return collage('a4-liggend', 'Vier seizoenen', wit, [...v, ...labels]);
    },
  },
  {
    id: 'strip', naam: 'Strip', formaat: 'a4-liggend',
    maak: () => {
      const rand = { kader: { stijl: 'effen' as const, kleur: '#2D2A32' } };
      return collage('a4-liggend', 'Mijn strip', wit, [
        vak(40, 160, 540, 1040, rand), vak(607, 160, 540, 1040, rand), vak(1174, 160, 540, 1040, rand),
        titel('Mijn strip', 877, 80, 800, 90, 'strip'),
        sticker('tekstballonnen/chat-circle', 380, 330, 200, '#2D2A32'), sticker('tekstballonnen/chat-circle', 940, 330, 200, '#2D2A32'), sticker('tekstballonnen/chat-circle', 1500, 330, 200, '#2D2A32'),
      ]);
    },
  },
  {
    id: 'poster', naam: 'Poster', formaat: 'poster',
    maak: () => collage('poster', 'Mijn poster', { soort: 'kleur', kleur: '#1E1B4B' }, [
      vak(100, 100, 1000, 1000, { kader: { stijl: 'effen', kleur: '#FFFFFF' } }),
      titel('MIJN POSTER', 600, 1250, 1100, 150, 'neon-roze', 'bangers'),
      tekst('Schrijf hier iets over je poster', 600, 1450, 1000, 60, 'nunito', { kleur: '#FFFFFF' }),
      sticker('ruimte/star-four', 1080, 1650, 120, '#FFE14D'), sticker('ruimte/star-four', 120, 1650, 90, '#FFE14D'),
    ]),
  },
  {
    id: 'kaart', naam: 'Kaart', formaat: 'a4-liggend',
    maak: () => collage('a4-liggend', 'Voor jou', { soort: 'verloop', van: '#FFD1DC', naar: '#FFF8EE', hoek: 135 }, [
      vak(120, 170, 700, 900, { masker: 'wolk', kader: { stijl: 'effen', kleur: '#FFFFFF' } }),
      titel('Voor jou', 1300, 350, 800, 160, 'dubbel', 'pacifico'),
      tekst('Schrijf hier je boodschap', 1300, 700, 700, 64, 'caveat'),
      sticker('vormen/heart', 1500, 1000, 180, '#FF6B6B', -10), sticker('vormen/heart', 1150, 1050, 120, '#FF4FD8', 12),
    ]),
  },
];

export function template(id: string): TemplateDef {
  const t = TEMPLATES.find((x) => x.id === id);
  if (!t) throw new Error(`Onbekende template: ${id}`);
  return t;
}
