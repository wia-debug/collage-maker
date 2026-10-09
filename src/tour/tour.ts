import { driver, type DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import type { Paneel } from '../ui/types';

export type TourId = 'editor' | Paneel;

const stap = (element: string, title: string, description: string): DriveStep => ({ element, popover: { title, description } });

export const TOURS: Record<TourId, DriveStep[]> = {
  editor: [
    stap('#tool-foto', "Foto's", 'Tik hier om een foto toe te voegen. Je kan ook een foto op je collage slepen.'),
    stap('#tool-stickers', 'Stickers', 'Kies leuke stickers. Maak ze groter of kleiner met twee vingers of met de hoekjes.'),
    stap('#canvas-vlak', 'Je collage', 'Tik op iets om het te kiezen. Sleep om het te verplaatsen.'),
    stap('#knop-ongedaan', 'Oeps?', 'Foutje gemaakt? Tik hier en het is weer weg.'),
    stap('#knop-bewaar', 'Bewaren', 'Klaar? Bewaar je collage als foto of als PDF.'),
  ],
  foto: [
    stap('#foto-kiezen', 'Foto kiezen', 'Kies een foto van dit toestel.'),
    stap('#foto-bijsnijden', 'Bijsnijden', 'Knip een stukje uit je foto.'),
    stap('#masker-hart', 'Vormen', 'Maak je foto rond, of een hart, of een ster.'),
    stap('#kader-polaroid', 'Kaders', 'Zet een kader rond je foto.'),
    stap('#filter-sepia', 'Filters', 'Geef je foto een andere kleur.'),
  ],
  tekst: [
    stap('#tekst-nieuw', 'Nieuwe tekst', 'Tik hier en typ je tekst.'),
    stap('#font-bangers', 'Letters', 'Kies een lettertype dat bij je collage past.'),
    stap('#wordart-regenboog', 'WordArt', 'Maak je tekst extra mooi: in een boog, als regenboog of met neon.'),
  ],
  stickers: [
    stap('#pakket-dieren', 'Stickerpakketten', 'Kies een pakket: dieren, ruimte, sport en nog veel meer.'),
    stap('.sticker-knop', 'Sticker plakken', 'Tik op een sticker om hem op je collage te zetten.'),
  ],
  vormen: [
    stap('#vorm-hart', 'Vormen', 'Tik op een vorm om hem toe te voegen.'),
  ],
  tekenen: [
    stap('#pen-pen', 'Pennen', 'Kies een pen, stift of krijt.'),
    stap('#pen-gum', 'Gum', 'Met de gum veeg je een tekening weer weg.'),
    stap('#canvas-vlak', 'Tekenen', 'Teken met je vinger of met de muis op je collage.'),
  ],
  achtergrond: [
    stap('#achtergrond-tabs', 'Achtergrond', 'Kies een kleur, een verloop, een patroon of een foto voor de achtergrond.'),
  ],
};

const SLEUTEL = 'collage-tours-gezien';

function gelezen(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(SLEUTEL) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function tourGezien(id: TourId): boolean {
  return gelezen().includes(id);
}

export function markeerGezien(id: TourId): void {
  try {
    localStorage.setItem(SLEUTEL, JSON.stringify([...new Set([...gelezen(), id])]));
  } catch { /* opslag geblokkeerd: tour komt dan opnieuw */ }
}

export function startTour(id: TourId): void {
  const steps = TOURS[id].filter((s) => typeof s.element !== 'string' || document.querySelector(s.element));
  if (!steps.length) return;
  const d = driver({
    showProgress: steps.length > 1,
    progressText: '{{current}} van {{total}}',
    nextBtnText: 'Verder',
    prevBtnText: 'Terug',
    doneBtnText: 'Klaar',
    popoverClass: 'kind-popover',
    allowClose: true,
    steps,
    onDestroyStarted: () => { markeerGezien(id); d.destroy(); },
  });
  d.drive();
}
