import { SCHEMA_VERSIE, type Basis, type Collage, type Formaat, type FotoElement, type StickerElement, type TekstElement, type VormElement } from './types';

export const nieuwId = (): string => crypto.randomUUID();

export function nieuweCollage(formaat: Formaat, naam = 'Mijn collage'): Collage {
  const nu = Date.now();
  return { id: nieuwId(), versie: SCHEMA_VERSIE, naam, profielId: null, formaat, achtergrond: { soort: 'kleur', kleur: '#FFFFFF' }, elementen: [], aangemaakt: nu, gewijzigd: nu };
}

function basis(x: number, y: number, breedte: number, hoogte: number): Basis {
  return { id: nieuwId(), x, y, breedte, hoogte, rotatie: 0, schaalX: 1, schaalY: 1, gespiegeld: false, vergrendeld: false };
}

export function maakFoto(p: { x: number; y: number; breedte: number; hoogte: number; assetId: string | null }): FotoElement {
  return { ...basis(p.x, p.y, p.breedte, p.hoogte), type: 'foto', assetId: p.assetId, uitsnede: null, masker: 'rechthoek', kader: { stijl: 'geen', kleur: '#FFFFFF' }, filter: 'normaal', helderheid: 0, contrast: 0 };
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
