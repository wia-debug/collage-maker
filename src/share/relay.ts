import { DeelFout } from './fouten';

export function relayAdres(): string | null {
  const a = import.meta.env.VITE_RELAY_URL;
  return a ? a.replace(/\/+$/, '') : null;
}

const ZIP_BEGIN = [0x50, 0x4b, 0x03, 0x04];
const OPNIEUW_NA_MS = [1000, 3000];
const wacht = (ms: number) => new Promise<void>((klaar) => setTimeout(klaar, ms));

export function maakRelay(adres: string | null, slaap: (ms: number) => Promise<void> = wacht) {
  const basis = adres ? adres.replace(/\/+$/, '') : null;
  return {
    ingesteld: basis !== null,
    // Opent een brievenbus voor deze code: het token, 'bezet' als de code al een brievenbus heeft, anders null.
    async open(sleutel: string, f: typeof fetch = fetch): Promise<string | 'bezet' | null> {
      if (!basis) return null;
      try {
        const r = await f(`${basis}/relay/${sleutel}`, { method: 'POST' });
        if (r.status === 409) return 'bezet';
        if (r.status !== 201) return null;
        const { token } = (await r.json()) as { token?: unknown };
        return typeof token === 'string' && token ? token : null;
      } catch {
        return null;
      }
    },
    async upload(sleutel: string, pakket: Blob, f: typeof fetch = fetch): Promise<void> {
      if (!basis) throw new DeelFout('geen-verbinding');
      for (let poging = 0; ; poging++) {
        let r: Response;
        try { r = await f(`${basis}/relay/${sleutel}`, { method: 'PUT', body: pakket }); } catch { throw new DeelFout('relay'); }
        if (r.status === 429 && poging < OPNIEUW_NA_MS.length) { await slaap(OPNIEUW_NA_MS[poging]); continue; }
        if (r.status === 404) throw new DeelFout('niet-gevonden');
        if (r.status === 413) throw new DeelFout('te-groot');
        if (!r.ok) throw new DeelFout('relay');
        return;
      }
    },
    async download(sleutel: string, token: string, f: typeof fetch = fetch): Promise<Blob | null> {
      if (!basis) return null;
      try {
        const r = await f(`${basis}/relay/${sleutel}`, { method: 'GET', headers: { 'X-Sleutel': token } });
        if (!r.ok) return null;
        const blob = await r.blob();
        // Alleen een echt .collage-bestand (zip) telt; bv. een HTML-pagina van een verkeerd adres niet.
        const begin = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
        return begin.length === 4 && ZIP_BEGIN.every((b, i) => begin[i] === b) ? blob : null;
      } catch {
        return null;
      }
    },
  };
}

export const relay = () => maakRelay(relayAdres());
