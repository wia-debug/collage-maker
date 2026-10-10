import Peer from 'peerjs';
import { DeelFout } from './fouten';

export interface ConnLike {
  on(e: 'open' | 'close', cb: () => void): void;
  on(e: 'data', cb: (d: unknown) => void): void;
  on(e: 'error', cb: (err: unknown) => void): void;
  send(d: unknown): void;
  close(): void;
}
export interface PeerLike {
  on(e: 'open', cb: (id: string) => void): void;
  on(e: 'connection', cb: (c: ConnLike) => void): void;
  on(e: 'error', cb: (err: { type?: string }) => void): void;
  connect(id: string, opts?: Record<string, unknown>): ConnLike;
  destroy(): void;
}
export type PeerFabriek = (id?: string) => PeerLike;

type E2eVenster = { __peerOpties?: Record<string, unknown>; __deelTimeoutMs?: number };

export function peerOpties(): Record<string, unknown> {
  if (import.meta.env.MODE === 'e2e') {
    const o = (window as unknown as E2eVenster).__peerOpties;
    if (o) return o;
  }
  const env = import.meta.env;
  const o: Record<string, unknown> = { debug: 0 };
  if (env.VITE_PEER_HOST) o.host = env.VITE_PEER_HOST;
  if (env.VITE_PEER_PORT) o.port = Number(env.VITE_PEER_PORT);
  if (env.VITE_PEER_PATH) o.path = env.VITE_PEER_PATH;
  if (env.VITE_PEER_SECURE) o.secure = env.VITE_PEER_SECURE === 'true';
  return o;
}

export function deelTimeout(): number {
  if (import.meta.env.MODE === 'e2e') {
    const t = (window as unknown as E2eVenster).__deelTimeoutMs;
    if (typeof t === 'number') return t;
  }
  return 10_000;
}

export const standaardFabriek: PeerFabriek = (id) =>
  (id ? new Peer(id, peerOpties()) : new Peer(peerOpties())) as unknown as PeerLike;

const isNetwerkFout = (t?: string) => t === 'network' || t === 'server-error' || t === 'socket-error' || t === 'socket-closed' || t === 'disconnected' || t === 'webrtc' || t === 'browser-incompatible';

export const OVERDRACHT_MS = 60_000;

export function verstuurDirect(doelId: string, pakket: Blob, o: { timeoutMs?: number; fabriek?: PeerFabriek } = {}): Promise<void> {
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
          // Verbonden: de verbindtijd is voorbij, nu geldt de (ruimere) overdrachtstijd.
          clearTimeout(timer);
          timer = setTimeout(() => einde(new DeelFout('geen-verbinding')), OVERDRACHT_MS);
          try { conn.send({ soort: 'collage', bestand }); } catch { einde(new DeelFout('geen-verbinding')); }
        });
        conn.on('data', (d) => { if ((d as { soort?: string })?.soort === 'ontvangen') einde(); });
        conn.on('close', () => einde(new DeelFout('geen-verbinding')));
        conn.on('error', () => einde(new DeelFout('geen-verbinding')));
      } catch {
        einde(new DeelFout('geen-verbinding'));
      }
    });
  });
}

export function startOntvanger(id: string, o: { onPakket(p: Blob): void; onFout?(f: DeelFout): void; fabriek?: PeerFabriek }): { klaar: Promise<void>; stop(): void } {
  const peer = (o.fabriek ?? standaardFabriek)(id);
  let geopend = false;
  const klaar = new Promise<void>((resolve, reject) => {
    peer.on('open', () => { geopend = true; resolve(); });
    peer.on('error', (err) => {
      const f = err?.type === 'unavailable-id' ? new DeelFout('code-bezet') : isNetwerkFout(err?.type) ? new DeelFout('geen-verbinding') : null;
      if (!f) return;
      if (!geopend) { reject(f); try { peer.destroy(); } catch { /* al weg */ } }
      else o.onFout?.(f);
    });
  });
  peer.on('connection', (conn) => {
    conn.on('data', (d) => {
      const bericht = d as { soort?: string; bestand?: ArrayBuffer | Uint8Array };
      const b = bericht?.bestand;
      if (bericht?.soort !== 'collage' || !(b instanceof ArrayBuffer || ArrayBuffer.isView(b))) return;
      try { conn.send({ soort: 'ontvangen' }); } catch { /* verbinding weg */ }
      try { o.onPakket(new Blob([b as BlobPart])); } catch { /* een falende handler mag de verbinding niet breken */ }
    });
  });
  return { klaar, stop: () => { try { peer.destroy(); } catch { /* al weg */ } } };
}
