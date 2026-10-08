import '@fontsource/baloo-2/400.css';
import '@fontsource/baloo-2/700.css';
import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/700.css';
import '@fontsource/pacifico/400.css';
import '@fontsource/bangers/400.css';
import '@fontsource/permanent-marker/400.css';
import '@fontsource/caveat/400.css';
import '@fontsource/caveat/700.css';
import '@fontsource/luckiest-guy/400.css';
import '@fontsource/chewy/400.css';
import '@fontsource/sniglet/400.css';
import '@fontsource/sniglet/800.css';

export const LETTERTYPES: { id: string; naam: string; familie: string }[] = [
  { id: 'nunito', naam: 'Nunito', familie: 'Nunito' },
  { id: 'baloo', naam: 'Baloo', familie: '"Baloo 2"' },
  { id: 'fredoka', naam: 'Fredoka', familie: 'Fredoka' },
  { id: 'pacifico', naam: 'Pacifico', familie: 'Pacifico' },
  { id: 'bangers', naam: 'Bangers', familie: 'Bangers' },
  { id: 'marker', naam: 'Stift', familie: '"Permanent Marker"' },
  { id: 'caveat', naam: 'Handschrift', familie: 'Caveat' },
  { id: 'luckiest', naam: 'Luckiest', familie: '"Luckiest Guy"' },
  { id: 'chewy', naam: 'Chewy', familie: 'Chewy' },
  { id: 'sniglet', naam: 'Sniglet', familie: 'Sniglet' },
];

export function familie(id: string): string {
  return LETTERTYPES.find((l) => l.id === id)?.familie ?? 'Nunito';
}

export function fontStijl(el: { vet: boolean; schuin: boolean }): string {
  return [el.schuin && 'italic', el.vet && 'bold'].filter(Boolean).join(' ') || 'normal';
}

export async function laadLettertypes(): Promise<void> {
  await Promise.all(LETTERTYPES.flatMap((l) => ['400', '700'].map((w) => document.fonts.load(`${w} 40px ${l.familie}`).catch(() => []))));
}

let meetCtx: CanvasRenderingContext2D | null = null;

export function meet(tekst: string, fam: string, grootte: number, stijl = 'normal'): number {
  meetCtx ??= document.createElement('canvas').getContext('2d')!;
  meetCtx.font = `${stijl === 'normal' ? '' : stijl + ' '}${grootte}px ${fam}`;
  return meetCtx.measureText(tekst).width;
}
