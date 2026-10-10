import { SCHEMA_VERSIE, type Basis, type Collage, type Formaat, type FotoElement, type StickerElement, type TekenGereedschap, type TekeningElement, type TekstElement, type VormElement } from './types';

export function uuidUitBytes(b: Uint8Array): string {
  const c = Uint8Array.from(b);
  c[6] = (c[6] & 0x0f) | 0x40;
  c[8] = (c[8] & 0x3f) | 0x80;
  const h = [...c].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// crypto.randomUUID bestaat alleen in een "secure context" (https of localhost); getRandomValues overal.
export const nieuwId = (): string => uuidUitBytes(crypto.getRandomValues(new Uint8Array(16)));

export function nieuweCollage(formaat: Formaat, naam = 'Mijn collage'): Collage {
  const nu = Date.now();
  return { id: nieuwId(), versie: SCHEMA_VERSIE, naam, profielId: null, formaat, achtergrond: { soort: 'kleur', kleur: '#FFFFFF' }, elementen: [], aangemaakt: nu, gewijzigd: nu };
}

function basis(x: number, y: number, breedte: number, hoogte: number): Basis {
  return { id: nieuwId(), x, y, breedte, hoogte, rotatie: 0, schaalX: 1, schaalY: 1, gespiegeld: false, vergrendeld: false };
}

export function maakFoto(p: { x: number; y: number; breedte: number; hoogte: number; assetId: string | null }): FotoElement {
  return { ...basis(p.x, p.y, p.breedte, p.hoogte), type: 'foto', assetId: p.assetId, uitsnede: null, masker: 'rechthoek', kader: { stijl: 'geen', kleur: '#FFFFFF' }, filter: 'normaal', helderheid: 0, contrast: 0, verhoudingVast: true, uitknipsel: false };
}

export function maakTekst(p: { x: number; y: number; tekst: string; breedte?: number; grootte?: number; lettertype?: string; kleur?: string; uitlijning?: TekstElement['uitlijning']; ballon?: string | null }): TekstElement {
  const grootte = p.grootte ?? 72;
  return {
    ...basis(p.x, p.y, p.breedte ?? 400, grootte * 1.2),
    type: 'tekst', tekst: p.tekst, lettertype: p.lettertype ?? 'nunito', grootte, kleur: p.kleur ?? '#2D2A32',
    vet: false, schuin: false, uitlijning: p.uitlijning ?? 'center', regelafstand: 1.1,
    omlijning: null, schaduw: false, ballon: p.ballon ?? null, wordart: null,
  };
}

export function maakSticker(p: { x: number; y: number; sticker: string; kleur: string; grootte: number }): StickerElement {
  return { ...basis(p.x, p.y, p.grootte, p.grootte), type: 'sticker', sticker: p.sticker, kleur: p.kleur };
}

export function maakVorm(p: { x: number; y: number; vorm: VormElement['vorm']; breedte: number; hoogte: number; vulling?: string | null }): VormElement {
  const kleur = p.vulling === undefined ? '#FF6B6B' : p.vulling;
  const lijn = p.vorm === 'lijn';
  return { ...basis(p.x, p.y, p.breedte, p.hoogte), type: 'vorm', vorm: p.vorm, vulling: lijn ? null : kleur, rand: lijn ? (kleur ?? '#2D2A32') : null, randDikte: lijn ? 12 : 8, doorzichtigheid: 1 };
}

export function normaliseerStreek(punten: number[], dikte: number): { x: number; y: number; breedte: number; hoogte: number; punten: number[] } {
  const p = punten.length === 2 ? [punten[0], punten[1], punten[0] + 0.5, punten[1] + 0.5] : punten;
  const xs = p.filter((_, i) => i % 2 === 0), ys = p.filter((_, i) => i % 2 === 1);
  const half = dikte / 2;
  const minX = Math.min(...xs) - half, minY = Math.min(...ys) - half;
  const breedte = Math.max(...xs) + half - minX, hoogte = Math.max(...ys) + half - minY;
  return { x: minX + breedte / 2, y: minY + hoogte / 2, breedte, hoogte, punten: p.map((v, i) => v - (i % 2 === 0 ? minX : minY)) };
}

export function maakTekening(punten: number[], gereedschap: TekenGereedschap, kleur: string, dikte: number): TekeningElement {
  const n = normaliseerStreek(punten, dikte);
  return { ...basis(n.x, n.y, n.breedte, n.hoogte), type: 'tekening', gereedschap, punten: n.punten, kleur, dikte };
}

export function kopieVan(c: Collage, profielId: string | null): Collage {
  const nu = Date.now();
  return { ...structuredClone(c), id: nieuwId(), profielId, aangemaakt: nu, gewijzigd: nu };
}
