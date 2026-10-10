export class AchtergrondFout extends Error {
  constructor(public code: 'download' | 'vol' | 'mislukt') { super(code); }
}

export const ACHTERGRONDTEKST: Record<AchtergrondFout['code'], string> = {
  download: 'Dit lukt nu niet. Probeer opnieuw met internet.',
  vol: 'Je toestel is vol. Wis een paar oude collages.',
  mislukt: 'Dit lukt niet met deze foto.',
};

export type Verwijderaar = (blob: Blob, voortgang: (deel: number) => void) => Promise<Blob>;

const echte: Verwijderaar = async (blob, voortgang) => {
  const { removeBackground } = await import('@imgly/background-removal');
  return removeBackground(blob, {
    publicPath: new URL('/modellen/achtergrond/', location.href).href,
    // In versie 1.4.5 heet het isnet_quint8-model 'small'.
    model: 'small',
    output: { format: 'image/png' },
    progress: (sleutel: string, nu: number, totaal: number) => { if (sleutel.startsWith('fetch:') && totaal > 0) voortgang(nu / totaal); },
  });
};

function kies(): Verwijderaar {
  if (import.meta.env.MODE === 'e2e') {
    const nep = (window as unknown as { __achtergrondWeg?: Verwijderaar }).__achtergrondWeg;
    if (nep) return nep;
  }
  return echte;
}

function vertaal(e: unknown): AchtergrondFout {
  if (e instanceof AchtergrondFout) return e;
  const naam = (e as { name?: string })?.name ?? '';
  const tekst = String((e as { message?: string })?.message ?? '');
  if (naam === 'QuotaExceededError') return new AchtergrondFout('vol');
  if (e instanceof TypeError || /fetch|network|Failed to/i.test(tekst)) return new AchtergrondFout('download');
  return new AchtergrondFout('mislukt');
}

export async function verwijderAchtergrond(blob: Blob, voortgang: (deel: number) => void, verwijder: Verwijderaar = kies()): Promise<Blob> {
  let uit: Blob;
  try { uit = await verwijder(blob, voortgang); } catch (e) { throw vertaal(e); }
  if (!(uit instanceof Blob) || uit.type !== 'image/png') throw new AchtergrondFout('mislukt');
  return uit;
}
