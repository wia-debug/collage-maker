import { DeelFout } from './fouten';

export function relayAdres(): string | null {
  const a = import.meta.env.VITE_RELAY_URL;
  return a ? a.replace(/\/+$/, '') : null;
}

export function maakRelay(adres: string | null) {
  const basis = adres ? adres.replace(/\/+$/, '') : null;
  return {
    ingesteld: basis !== null,
    async upload(sleutel: string, pakket: Blob, f: typeof fetch = fetch): Promise<void> {
      if (!basis) throw new DeelFout('geen-verbinding');
      let r: Response;
      try { r = await f(`${basis}/relay/${sleutel}`, { method: 'PUT', body: pakket }); } catch { throw new DeelFout('relay'); }
      if (r.status === 413) throw new DeelFout('te-groot');
      if (!r.ok) throw new DeelFout('relay');
    },
    async download(sleutel: string, f: typeof fetch = fetch): Promise<Blob | null> {
      if (!basis) return null;
      try {
        const r = await f(`${basis}/relay/${sleutel}`, { method: 'GET' });
        return r.ok ? await r.blob() : null;
      } catch {
        return null;
      }
    },
  };
}

export const relay = () => maakRelay(relayAdres());
