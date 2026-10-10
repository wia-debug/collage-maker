import type { CloudDelen } from '../storage/instellingen';
import { codeNaarSleutel } from './code';
import { DeelFout } from './fouten';
import { MAX_PAKKET } from './pakket';
import { deelTimeout, isNetwerkFout, OVERDRACHT_MS, standaardFabriek, type PeerFabriek } from './peer';
import { relayAdres } from './relay';
import type { Toestemming } from './delen';

export const klasPeerId = (code: string[]): string => `kidsklas-${codeNaarSleutel(code)}`;

export function nieuwKlasId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(8)), (x) => x.toString(16).padStart(2, '0')).join('');
}

export function schoneNaam(naam: string): string | null {
  const n = naam.trim();
  return n.length >= 1 && n.length <= 40 ? n : null;
}

const ZIP_BEGIN = [0x50, 0x4b, 0x03, 0x04];
const OPNIEUW_NA_MS = [1000, 3000];
const wacht = (ms: number) => new Promise<void>((klaar) => setTimeout(klaar, ms));
const isZip = async (b: Blob) => {
  const begin = new Uint8Array(await b.slice(0, 4).arrayBuffer());
  return begin.length === 4 && ZIP_BEGIN.every((x, i) => begin[i] === x);
};

export function maakKlasRelay(adres: string | null, slaap: (ms: number) => Promise<void> = wacht) {
  const basis = adres ? adres.replace(/\/+$/, '') : null;
  return {
    ingesteld: basis !== null,
    async open(sleutel: string, f: typeof fetch = fetch): Promise<string | 'bezet' | null> {
      if (!basis) return null;
      try {
        const r = await f(`${basis}/class/${sleutel}`, { method: 'POST' });
        if (r.status === 409) return 'bezet';
        if (r.status !== 201) return null;
        const { token } = (await r.json()) as { token?: unknown };
        return typeof token === 'string' && token ? token : null;
      } catch { return null; }
    },
    async upload(sleutel: string, id: string, naam: string, pakket: Blob, f: typeof fetch = fetch): Promise<void> {
      if (!basis) throw new DeelFout('geen-verbinding');
      for (let poging = 0; ; poging++) {
        let r: Response;
        try {
          r = await f(`${basis}/class/${sleutel}/${id}`, { method: 'PUT', body: pakket, headers: { 'X-Naam': encodeURIComponent(naam) } });
        } catch { throw new DeelFout('relay'); }
        if (r.status === 429 && poging < OPNIEUW_NA_MS.length) { await slaap(OPNIEUW_NA_MS[poging]); continue; }
        if (r.status === 404) throw new DeelFout('geen-leerkracht');
        if (r.status === 409) throw new DeelFout('klas-vol');
        if (r.status === 413) throw new DeelFout('te-groot');
        if (!r.ok) throw new DeelFout('relay');
        return;
      }
    },
    /** `'weg'`: de map bestaat niet (meer) op de server; null: een andere fout. */
    async lijst(sleutel: string, token: string, f: typeof fetch = fetch): Promise<{ id: string; naam: string }[] | 'weg' | null> {
      if (!basis) return null;
      try {
        const r = await f(`${basis}/class/${sleutel}`, { method: 'GET', headers: { 'X-Sleutel': token } });
        if (r.status === 404) return 'weg';
        if (!r.ok) return null;
        const d = (await r.json()) as unknown;
        return Array.isArray(d) ? d.filter((x): x is { id: string; naam: string } => typeof x?.id === 'string' && typeof x?.naam === 'string') : null;
      } catch { return null; }
    },
    async haal(sleutel: string, id: string, token: string, f: typeof fetch = fetch): Promise<{ naam: string; pakket: Blob } | null> {
      if (!basis) return null;
      try {
        const r = await f(`${basis}/class/${sleutel}/${id}`, { method: 'GET', headers: { 'X-Sleutel': token } });
        if (!r.ok) return null;
        const pakket = await r.blob();
        if (!(await isZip(pakket))) return null;
        let naam = '';
        try { naam = decodeURIComponent(r.headers.get('X-Naam') ?? ''); } catch { /* blijft leeg */ }
        return { naam: schoneNaam(naam) ?? 'Zonder naam', pakket };
      } catch { return null; }
    },
    /** Sluit de klasmap (wist alles wat er nog in zit). Fouten worden genegeerd. */
    async sluit(sleutel: string, token: string, f: typeof fetch = fetch): Promise<void> {
      if (!basis) return;
      try { await f(`${basis}/class/${sleutel}`, { method: 'DELETE', headers: { 'X-Sleutel': token }, keepalive: true }); } catch { /* best effort */ }
    },
  };
}

export const klasRelay = () => maakKlasRelay(relayAdres());

export function verstuurKlasDirect(doelId: string, naam: string, pakket: Blob, o: { timeoutMs?: number; fabriek?: PeerFabriek } = {}): Promise<void> {
  // Zelfde verloop als verstuurDirect in peer.ts, met een klasbericht.
  const fabriek = o.fabriek ?? standaardFabriek;
  return new Promise<void>((resolve, reject) => {
    let klaar = false;
    const peer = fabriek();
    const einde = (f?: DeelFout) => {
      if (klaar) return;
      klaar = true;
      clearTimeout(timer);
      try { peer.destroy(); } catch { /* al weg */ }
      if (f) reject(f); else resolve();
    };
    let timer = setTimeout(() => einde(new DeelFout('geen-verbinding')), o.timeoutMs ?? deelTimeout());
    peer.on('error', (err) => {
      if (err?.type === 'peer-unavailable') einde(new DeelFout('niet-gevonden'));
      else if (isNetwerkFout(err?.type)) einde(new DeelFout('geen-verbinding'));
    });
    peer.on('open', async () => {
      try {
        const bestand = await pakket.arrayBuffer();
        if (klaar) return;
        const conn = peer.connect(doelId, { reliable: true, serialization: 'binary' });
        conn.on('open', () => {
          if (klaar) return;
          clearTimeout(timer);
          timer = setTimeout(() => einde(new DeelFout('geen-verbinding')), OVERDRACHT_MS);
          try { conn.send({ soort: 'klas', naam, bestand }); } catch { einde(new DeelFout('geen-verbinding')); }
        });
        conn.on('data', (d) => {
          const soort = (d as { soort?: string })?.soort;
          if (soort === 'ontvangen') einde();
          else if (soort === 'fout') einde(new DeelFout('niet-bewaard'));
        });
        conn.on('close', () => einde(new DeelFout('geen-verbinding')));
        conn.on('error', () => einde(new DeelFout('geen-verbinding')));
      } catch { einde(new DeelFout('geen-verbinding')); }
    });
  });
}

export async function stuurNaarLeerkracht(o: {
  code: string[]; naam: string; pakket: Blob; instelling: CloudDelen; vraag: Toestemming;
  direct?: (doelId: string, naam: string, pakket: Blob) => Promise<void>; relay?: ReturnType<typeof maakKlasRelay>;
}): Promise<'direct' | 'server'> {
  const naam = schoneNaam(o.naam);
  if (!naam) throw new Error('Lege naam');
  const direct = o.direct ?? ((id: string, n: string, p: Blob) => verstuurKlasDirect(id, n, p));
  const relay = o.relay ?? klasRelay();
  const serverMag = o.instelling !== 'nooit' && relay.ingesteld;
  try {
    await direct(klasPeerId(o.code), naam, o.pakket);
    return 'direct';
  } catch (e) {
    if (!(e instanceof DeelFout)) throw e;
    // Zoals bij delen (fase 3): de PeerServer zegt dat niemand die code heeft → geen omweg via de server.
    if (e.code === 'niet-gevonden') throw new DeelFout('geen-leerkracht');
    if (e.code !== 'geen-verbinding') throw e;
  }
  if (!serverMag) throw new DeelFout('geen-verbinding');
  if (!(await o.vraag(o.instelling as 'kind' | 'leerkracht'))) throw new DeelFout('geweigerd');
  await relay.upload(codeNaarSleutel(o.code), nieuwKlasId(), naam, o.pakket);
  return 'server';
}

// Fouten van de verbinding met de PeerServer (niet van één datakanaal).
const isSignaalFout = (t?: string) => t === 'network' || t === 'server-error' || t === 'socket-error' || t === 'socket-closed' || t === 'disconnected';

export const standaardWachttijd = (poging: number): number => Math.min(3000 * 2 ** poging, 30_000);

/**
 * Klasontvanger die zichzelf herstart (zelfde code) als de verbinding wegvalt.
 * `klaar` is de eerste poging (voor code-bezet bij het kiezen van een code). Pas na `bewaak()` wordt
 * er opnieuw geprobeerd, met oplopende wachttijd, tot `stop()`; ook als de eerste poging mislukte.
 */
export function bewaakKlasOntvanger(code: string[], o: {
  onInzending(naam: string, pakket: Blob): Promise<boolean>; onVerbinding?(ok: boolean): void; fabriek?: PeerFabriek; wachttijd?: (poging: number) => number;
}): { klaar: Promise<void>; bewaak(): void; stop(): void } {
  const wachttijd = o.wachttijd ?? standaardWachttijd;
  let weg = false;
  let bewaakt = false;
  let dood = false;
  let poging = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let huidig: { klaar: Promise<void>; stop(): void } | null = null;

  const plan = () => {
    if (weg || !bewaakt) return;
    clearTimeout(timer);
    timer = setTimeout(start, wachttijd(poging++));
  };
  const valWeg = (h: { stop(): void }) => {
    h.stop();
    dood = true;
    o.onVerbinding?.(false);
    plan();
  };
  function start() {
    if (weg) return null;
    const h: { klaar: Promise<void>; stop(): void } = startKlasOntvanger(code, {
      onInzending: o.onInzending,
      fabriek: o.fabriek,
      onFout: () => { if (h === huidig && !weg) valWeg(h); },
    });
    huidig = h;
    h.klaar.then(
      () => { if (h !== huidig || weg) return; dood = false; poging = 0; o.onVerbinding?.(true); },
      () => { if (h !== huidig || weg) return; valWeg(h); },
    );
    return h;
  }
  const eerste = start()!;
  return {
    klaar: eerste.klaar,
    bewaak() { bewaakt = true; if (dood) plan(); },
    stop() { weg = true; clearTimeout(timer); huidig?.stop(); },
  };
}

/** `onInzending` geeft true als de collage bewaard is; pas dan krijgt het kind een bevestiging. */
export function startKlasOntvanger(code: string[], o: { onInzending(naam: string, pakket: Blob): Promise<boolean>; onFout?(f: DeelFout): void; fabriek?: PeerFabriek }): { klaar: Promise<void>; stop(): void } {
  const peer = (o.fabriek ?? standaardFabriek)(klasPeerId(code));
  let geopend = false;
  const klaar = new Promise<void>((resolve, reject) => {
    peer.on('open', () => { geopend = true; resolve(); });
    peer.on('error', (err) => {
      const f = err?.type === 'unavailable-id' ? new DeelFout('code-bezet') : isNetwerkFout(err?.type) ? new DeelFout('geen-verbinding') : null;
      if (!f) return;
      if (!geopend) { reject(f); try { peer.destroy(); } catch { /* al weg */ } }
      // Na open: een mislukte WebRTC-verbinding met één kind is geen reden om de leerkracht-peer te herstarten.
      else if (isSignaalFout(err?.type)) o.onFout?.(f);
    });
  });
  peer.on('connection', (conn) => {
    let behandeld = false;
    conn.on('data', async (d) => {
      if (behandeld) return; // één inzending per verbinding
      const b = d as { soort?: string; naam?: unknown; bestand?: ArrayBuffer | Uint8Array };
      const naam = typeof b?.naam === 'string' ? schoneNaam(b.naam) : null;
      const bestand = b?.bestand;
      const geldig = b?.soort === 'klas' && naam && (bestand instanceof ArrayBuffer || ArrayBuffer.isView(bestand)) && bestand.byteLength <= MAX_PAKKET;
      if (!geldig) { try { conn.close(); } catch { /* al weg */ } return; }
      behandeld = true;
      let bewaard = false;
      try { bewaard = await o.onInzending(naam, new Blob([bestand as BlobPart])); } catch { /* een falende handler breekt de ontvanger niet */ }
      try { conn.send({ soort: bewaard ? 'ontvangen' : 'fout' }); } catch { /* verbinding weg */ }
      setTimeout(() => { try { conn.close(); } catch { /* al weg */ } }, 1000);
    });
  });
  return { klaar, stop: () => { try { peer.destroy(); } catch { /* al weg */ } } };
}
