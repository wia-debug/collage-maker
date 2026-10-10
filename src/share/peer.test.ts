import { describe, it, expect } from 'vitest';
import { startOntvanger, verstuurDirect, type ConnLike, type PeerFabriek, type PeerLike } from './peer';
import { DeelFout } from './fouten';

type H = Record<string, ((...a: any[]) => void)[]>;
function emitter() {
  const h: H = {};
  return { on(e: string, cb: (...a: any[]) => void) { (h[e] ??= []).push(cb); }, emit(e: string, ...a: any[]) { for (const cb of h[e] ?? []) cb(...a); } };
}

// Een kleine nep-"PeerServer": peers met een id kunnen elkaar bereiken.
function nepNet(opties: { serverWeg?: boolean; rtcGeblokkeerd?: boolean; dataVertraging?: number } = {}) {
  const peers = new Map<string, ReturnType<typeof maak>>();
  let teller = 0;
  function maak(id?: string) {
    const e = emitter();
    const echtId = id ?? `anon-${++teller}`;
    const peer = {
      ...e,
      id: echtId,
      connect(doel: string): ConnLike {
        const a = emitter(), b = emitter();
        const kantA: ConnLike = { on: a.on as any, send: (d) => setTimeout(() => b.emit('data', d), opties.dataVertraging), close() { setTimeout(() => b.emit('close')); } };
        const kantB: ConnLike = { on: b.on as any, send: (d) => setTimeout(() => a.emit('data', d)), close() { setTimeout(() => a.emit('close')); } };
        setTimeout(() => {
          const ander = peers.get(doel);
          if (!ander) { peer.emit('error', { type: 'peer-unavailable' }); return; }
          if (opties.rtcGeblokkeerd) return; // verbinding komt nooit open
          ander.emit('connection', kantB);
          b.emit('open'); a.emit('open');
        });
        return kantA;
      },
      destroy() { if (peers.get(echtId) === peer) peers.delete(echtId); },
    };
    setTimeout(() => {
      if (opties.serverWeg) { peer.emit('error', { type: 'network' }); return; }
      if (id && peers.has(id)) { peer.emit('error', { type: 'unavailable-id' }); return; }
      peers.set(echtId, peer);
      peer.emit('open', echtId);
    });
    return peer;
  }
  const fabriek: PeerFabriek = (id) => maak(id) as unknown as PeerLike;
  return { fabriek, peers };
}

const pakket = () => new Blob([new Uint8Array([1, 2, 3, 4])]);

describe('rechtstreeks delen', () => {
  it('stuurt een pakket en krijgt een bevestiging', async () => {
    const net = nepNet();
    const ontvangen: Blob[] = [];
    const o = startOntvanger('kidscollage-abcd', { onPakket: (p) => ontvangen.push(p), fabriek: net.fabriek });
    await o.klaar;
    await verstuurDirect('kidscollage-abcd', pakket(), { fabriek: net.fabriek, timeoutMs: 1000 });
    expect(ontvangen).toHaveLength(1);
    expect(new Uint8Array(await ontvangen[0].arrayBuffer())).toEqual(new Uint8Array([1, 2, 3, 4]));
    o.stop();
    expect(net.peers.size).toBe(0);
  });

  it('onbekende code: niet-gevonden', async () => {
    const net = nepNet();
    await expect(verstuurDirect('kidscollage-zzzz', pakket(), { fabriek: net.fabriek, timeoutMs: 1000 })).rejects.toMatchObject({ code: 'niet-gevonden' });
  });

  it('server onbereikbaar: geen-verbinding', async () => {
    const net = nepNet({ serverWeg: true });
    await expect(verstuurDirect('kidscollage-abcd', pakket(), { fabriek: net.fabriek, timeoutMs: 1000 })).rejects.toMatchObject({ code: 'geen-verbinding' });
  });

  it('WebRTC geblokkeerd: geen-verbinding na time-out', async () => {
    const net = nepNet({ rtcGeblokkeerd: true });
    const o = startOntvanger('kidscollage-abcd', { onPakket: () => {}, fabriek: net.fabriek });
    await o.klaar;
    const t0 = Date.now();
    await expect(verstuurDirect('kidscollage-abcd', pakket(), { fabriek: net.fabriek, timeoutMs: 200 })).rejects.toMatchObject({ code: 'geen-verbinding' });
    expect(Date.now() - t0).toBeGreaterThanOrEqual(190);
    o.stop();
  });

  it('bezette code: code-bezet', async () => {
    const net = nepNet();
    const a = startOntvanger('kidscollage-abcd', { onPakket: () => {}, fabriek: net.fabriek });
    await a.klaar;
    const b = startOntvanger('kidscollage-abcd', { onPakket: () => {}, fabriek: net.fabriek });
    await expect(b.klaar).rejects.toBeInstanceOf(DeelFout);
    await expect(b.klaar).rejects.toMatchObject({ code: 'code-bezet' });
    a.stop();
  });

  it('trage overdracht na het openen lukt ondanks korte verbindtijd', async () => {
    const net = nepNet({ dataVertraging: 1000 });
    const ontvangen: Blob[] = [];
    const o = startOntvanger('kidscollage-abcd', { onPakket: (p) => ontvangen.push(p), fabriek: net.fabriek });
    await o.klaar;
    await verstuurDirect('kidscollage-abcd', pakket(), { fabriek: net.fabriek, timeoutMs: 200 });
    expect(ontvangen).toHaveLength(1);
    o.stop();
  });

  it('ontvanger sluit vóór de bevestiging: geen-verbinding, snel', async () => {
    const net = nepNet();
    const o = net.fabriek('kidscollage-abcd');
    await new Promise<void>((r) => o.on('open', () => r()));
    o.on('connection', (c: ConnLike) => c.on('data', () => c.close()));
    const t0 = Date.now();
    await expect(verstuurDirect('kidscollage-abcd', pakket(), { fabriek: net.fabriek, timeoutMs: 1000 })).rejects.toMatchObject({ code: 'geen-verbinding' });
    expect(Date.now() - t0).toBeLessThan(1000);
    o.destroy();
  });

  it('onjuiste berichten worden genegeerd: geen pakket, geen bevestiging', async () => {
    const net = nepNet();
    const ontvangen: Blob[] = [];
    const o = startOntvanger('kidscollage-abcd', { onPakket: (p) => ontvangen.push(p), fabriek: net.fabriek });
    await o.klaar;
    const peer = net.fabriek();
    await new Promise<void>((r) => peer.on('open', () => r()));
    const conn = peer.connect('kidscollage-abcd');
    const antwoorden: unknown[] = [];
    conn.on('data', (d) => antwoorden.push(d));
    await new Promise<void>((r) => conn.on('open', () => r()));
    conn.send({ soort: 'collage', bestand: 'tekst' });
    conn.send({ soort: 'collage', bestand: null });
    conn.send({ soort: 'anders', bestand: new ArrayBuffer(4) });
    conn.send(null);
    await new Promise((r) => setTimeout(r, 50));
    expect(ontvangen).toHaveLength(0);
    expect(antwoorden).toHaveLength(0);
    o.stop();
    peer.destroy();
  });

  it('peer wordt opgeruimd na code-bezet', async () => {
    const net = nepNet();
    const a = startOntvanger('kidscollage-abcd', { onPakket: () => {}, fabriek: net.fabriek });
    await a.klaar;
    const b = startOntvanger('kidscollage-abcd', { onPakket: () => {}, fabriek: net.fabriek });
    await expect(b.klaar).rejects.toMatchObject({ code: 'code-bezet' });
    expect(net.peers.size).toBe(1);
    a.stop();
  });
});
