import { describe, it, expect } from 'vitest';
import { DeelFout } from './fouten';
import { bewaakKlasOntvanger, klasPeerId, maakKlasRelay, nieuwKlasId, schoneNaam, startKlasOntvanger, stuurNaarLeerkracht } from './klas';
import type { ConnLike, PeerFabriek, PeerLike } from './peer';

type Luisteraars = Record<string, ((...a: any[]) => void)[]>;
function nepConn(): ConnLike & { verstuurd: unknown[]; gesloten: boolean; geef(d: unknown): void } {
  const l: Luisteraars = {};
  return {
    verstuurd: [], gesloten: false,
    on(e: string, cb: any) { (l[e] ??= []).push(cb); },
    send(d: unknown) { this.verstuurd.push(d); },
    close() { this.gesloten = true; },
    geef(d: unknown) { for (const cb of l.data ?? []) cb(d); },
  } as any;
}
function nepPeer(): PeerLike & { verbind(c: ConnLike): void; open(): void; fout(type: string): void } {
  const l: Luisteraars = {};
  return {
    on(e: string, cb: any) { (l[e] ??= []).push(cb); },
    connect() { throw new Error('niet nodig'); },
    destroy() {},
    verbind(c: ConnLike) { for (const cb of l.connection ?? []) cb(c); },
    open() { for (const cb of l.open ?? []) cb('id'); },
    fout(type: string) { for (const cb of l.error ?? []) cb({ type }); },
  } as any;
}
const zip = () => new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2]).buffer;

describe('klas', () => {
  it('peer-id, id en naam', () => {
    expect(klasPeerId(['star', 'heart', 'cloud', 'drop'])).toBe('kidsklas-abcd');
    expect(nieuwKlasId()).toMatch(/^[0-9a-f]{16}$/);
    expect(schoneNaam('  Lies ')).toBe('Lies');
    expect(schoneNaam('   ')).toBeNull();
    expect(schoneNaam('x'.repeat(41))).toBeNull();
  });

  it('ontvanger aanvaardt twee verbindingen tegelijk en weigert ongeldige berichten', async () => {
    const peer = nepPeer();
    const fabriek: PeerFabriek = () => peer;
    const binnen: string[] = [];
    const o = startKlasOntvanger(['star', 'heart', 'cloud', 'drop'], { fabriek, onInzending: (naam) => binnen.push(naam) });
    peer.open();
    await o.klaar;
    const a = nepConn(), b = nepConn(), kapot = nepConn();
    peer.verbind(a); peer.verbind(b); peer.verbind(kapot);
    a.geef({ soort: 'klas', naam: 'Lies', bestand: zip() });
    b.geef({ soort: 'klas', naam: 'Lies', bestand: zip() });
    kapot.geef({ soort: 'klas', naam: '', bestand: zip() });
    expect(binnen).toEqual(['Lies', 'Lies']);
    expect(a.verstuurd).toEqual([{ soort: 'ontvangen' }]);
    expect(kapot.verstuurd).toEqual([]);
    expect(kapot.gesloten).toBe(true);
    o.stop();
  });

  it('ontvanger: een webrtc-fout van één verbinding na open meldt niets', async () => {
    const peer = nepPeer();
    const fouten: string[] = [];
    const o = startKlasOntvanger(['star', 'heart', 'cloud', 'drop'], { fabriek: () => peer, onInzending: () => {}, onFout: (f) => fouten.push(f.code) });
    peer.open();
    await o.klaar;
    peer.fout('webrtc');
    expect(fouten).toEqual([]);
    peer.fout('network');
    expect(fouten).toEqual(['geen-verbinding']);
    o.stop();
  });

  it('bewaakte ontvanger blijft opnieuw proberen (geen verbinding, code nog bezet) tot het lukt', async () => {
    const peers: ReturnType<typeof nepPeer>[] = [];
    const ids: (string | undefined)[] = [];
    const status: boolean[] = [];
    const tik = () => new Promise((r) => setTimeout(r, 5));
    const b = bewaakKlasOntvanger(['star', 'heart', 'cloud', 'drop'], {
      fabriek: (id) => { ids.push(id); const p = nepPeer(); peers.push(p); return p; },
      onInzending: () => {}, onVerbinding: (ok) => status.push(ok), wachttijd: () => 0,
    });
    peers[0].open();
    await b.klaar;
    b.bewaak();
    peers[0].fout('webrtc');
    await tik();
    expect(peers).toHaveLength(1);
    peers[0].fout('disconnected');
    await tik();
    expect(peers).toHaveLength(2);
    peers[1].fout('network');
    await tik();
    expect(peers).toHaveLength(3);
    peers[2].fout('unavailable-id');
    await tik();
    expect(peers).toHaveLength(4);
    peers[3].open();
    await tik();
    expect(status).toEqual([true, false, false, false, true]);
    expect(new Set(ids)).toEqual(new Set(['kidsklas-abcd']));
    b.stop();
    peers[3].fout('network');
    await tik();
    expect(peers).toHaveLength(4);
  });

  it('bewaakte ontvanger: mislukte eerste poging wordt pas na bewaak() opnieuw geprobeerd', async () => {
    const peers: ReturnType<typeof nepPeer>[] = [];
    const tik = () => new Promise((r) => setTimeout(r, 5));
    const b = bewaakKlasOntvanger(['star', 'heart', 'cloud', 'drop'], {
      fabriek: () => { const p = nepPeer(); peers.push(p); return p; }, onInzending: () => {}, wachttijd: () => 0,
    });
    peers[0].fout('network');
    await expect(b.klaar).rejects.toMatchObject({ code: 'geen-verbinding' });
    await tik();
    expect(peers).toHaveLength(1);
    b.bewaak();
    await tik();
    expect(peers).toHaveLength(2);
    b.stop();
  });

  it('bezette code geeft code-bezet', async () => {
    const peer = nepPeer();
    const o = startKlasOntvanger(['star', 'star', 'star', 'star'], { fabriek: () => peer, onInzending: () => {} });
    peer.fout('unavailable-id');
    await expect(o.klaar).rejects.toMatchObject({ code: 'code-bezet' });
  });

  it('versturen: direct lukt', async () => {
    const r = await stuurNaarLeerkracht({ code: ['star', 'heart', 'cloud', 'drop'], naam: 'Lies', pakket: new Blob(['x']), instelling: 'leerkracht', vraag: async () => true, direct: async (id, naam) => { expect(id).toBe('kidsklas-abcd'); expect(naam).toBe('Lies'); } });
    expect(r).toBe('direct');
  });

  it('versturen: niet gevonden = geen-leerkracht, zonder toestemmingsvraag of server', async () => {
    let gevraagd = false;
    const relay = maakKlasRelay('https://r.test');
    await expect(stuurNaarLeerkracht({ code: ['star', 'star', 'star', 'star'], naam: 'Lies', pakket: new Blob(['x']), instelling: 'kind', vraag: async () => (gevraagd = true), relay, direct: async () => { throw new DeelFout('niet-gevonden'); } })).rejects.toMatchObject({ code: 'geen-leerkracht' });
    expect(gevraagd).toBe(false);
  });

  it('versturen: geblokkeerd → toestemming → server; 404 = geen-leerkracht; 409 = klas-vol', async () => {
    const statussen = [201, 404, 409];
    const relay = maakKlasRelay('https://r.test', async () => {});
    const f = (async () => new Response(null, { status: statussen.shift()! })) as typeof fetch;
    const rel = { ...relay, upload: (s: string, i: string, n: string, p: Blob) => relay.upload(s, i, n, p, f) };
    const basis = { code: ['star', 'star', 'star', 'star'], naam: 'Lies', pakket: new Blob(['x']), instelling: 'kind' as const, vraag: async () => true, relay: rel, direct: async () => { throw new DeelFout('geen-verbinding'); } };
    expect(await stuurNaarLeerkracht(basis)).toBe('server');
    await expect(stuurNaarLeerkracht(basis)).rejects.toMatchObject({ code: 'geen-leerkracht' });
    await expect(stuurNaarLeerkracht(basis)).rejects.toMatchObject({ code: 'klas-vol' });
  });

  it('relay: upload stuurt X-Naam gecodeerd; lijst en haal sturen het token; haal controleert zip', async () => {
    const gezien: { url: string; init?: RequestInit }[] = [];
    const antwoorden = [
      new Response(null, { status: 201 }),
      new Response(JSON.stringify([{ id: 'a'.repeat(16), naam: 'Lies' }]), { status: 200 }),
      new Response(zip(), { status: 200, headers: { 'X-Naam': encodeURIComponent('Lies') } }),
      new Response('<html>', { status: 200 }),
    ];
    const f = (async (url: string, init?: RequestInit) => { gezien.push({ url, init }); return antwoorden.shift()!; }) as unknown as typeof fetch;
    const r = maakKlasRelay('https://r.test/');
    await r.upload('abcd', 'a'.repeat(16), 'Lies Één', new Blob(['x']), f);
    expect(gezien[0].url).toBe(`https://r.test/class/abcd/${'a'.repeat(16)}`);
    expect((gezien[0].init!.headers as Record<string, string>)['X-Naam']).toBe(encodeURIComponent('Lies Één'));
    expect(await r.lijst('abcd', 'tok', f)).toEqual([{ id: 'a'.repeat(16), naam: 'Lies' }]);
    expect((gezien[1].init!.headers as Record<string, string>)['X-Sleutel']).toBe('tok');
    expect((await r.haal('abcd', 'a'.repeat(16), 'tok', f))?.naam).toBe('Lies');
    expect(await r.haal('abcd', 'a'.repeat(16), 'tok', f)).toBeNull();
  });
});
