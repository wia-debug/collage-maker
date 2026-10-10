import { describe, it, expect } from 'vitest';
import { maakRelay } from './relay';

type Antwoord = Response | Error | (() => Response | Error);

function nepFetch(antwoorden: Record<string, Antwoord | Antwoord[]>) {
  const verzoeken: { url: string; method: string; sleutel: string | null }[] = [];
  const f = (async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    verzoeken.push({ url, method, sleutel: new Headers(init?.headers).get('X-Sleutel') });
    let a: Antwoord | Antwoord[] | undefined = antwoorden[`${method} ${url}`];
    if (Array.isArray(a)) a = a.shift();
    if (typeof a === 'function') a = a();
    if (a instanceof Error) throw a;
    return a ?? new Response('', { status: 500 });
  }) as unknown as typeof fetch;
  return { f, verzoeken };
}

const ZIP = () => new Response(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]));
const PUT = 'PUT https://relay.test/relay/abcd';
const GET = 'GET https://relay.test/relay/abcd';
const POST = 'POST https://relay.test/relay/abcd';

describe('relay-client', () => {
  const pauzes: number[] = [];
  const r = maakRelay('https://relay.test/', async (ms) => { pauzes.push(ms); });

  it('open: POST geeft het token, 409 is bezet, anders null', async () => {
    const n = nepFetch({ [POST]: new Response(JSON.stringify({ token: 'a'.repeat(32) }), { status: 201 }) });
    expect(await r.open('abcd', n.f)).toBe('a'.repeat(32));
    expect(n.verzoeken[0].method).toBe('POST');
    expect(await r.open('abcd', nepFetch({ [POST]: new Response('', { status: 409 }) }).f)).toBe('bezet');
    expect(await r.open('abcd', nepFetch({ [POST]: new Response('', { status: 429 }) }).f)).toBeNull();
    expect(await r.open('abcd', nepFetch({ [POST]: new Response('<html>', { status: 200 }) }).f)).toBeNull();
    expect(await r.open('abcd', nepFetch({ [POST]: new TypeError('weg') }).f)).toBeNull();
    expect(await maakRelay(null).open('abcd')).toBeNull();
  });
  it('upload gebruikt PUT op /relay/<sleutel>', async () => {
    const n = nepFetch({ [PUT]: new Response('', { status: 201 }) });
    await r.upload('abcd', new Blob(['x']), n.f);
    expect(n.verzoeken.map(({ url, method }) => ({ url, method }))).toEqual([{ url: 'https://relay.test/relay/abcd', method: 'PUT' }]);
  });
  it('404 wordt niet-gevonden, 409 relay, 413 te-groot, 500 of netwerkfout relay', async () => {
    await expect(r.upload('abcd', new Blob(['x']), nepFetch({ [PUT]: new Response('', { status: 404 }) }).f)).rejects.toMatchObject({ code: 'niet-gevonden' });
    await expect(r.upload('abcd', new Blob(['x']), nepFetch({ [PUT]: new Response('', { status: 409 }) }).f)).rejects.toMatchObject({ code: 'relay' });
    await expect(r.upload('abcd', new Blob(['x']), nepFetch({ [PUT]: new Response('', { status: 413 }) }).f)).rejects.toMatchObject({ code: 'te-groot' });
    await expect(r.upload('abcd', new Blob(['x']), nepFetch({}).f)).rejects.toMatchObject({ code: 'relay' });
    await expect(r.upload('abcd', new Blob(['x']), nepFetch({ [PUT]: new TypeError('weg') }).f)).rejects.toMatchObject({ code: 'relay' });
  });
  it('429: tot twee keer opnieuw, na 1 s en 3 s', async () => {
    pauzes.length = 0;
    const n = nepFetch({ [PUT]: [new Response('', { status: 429 }), new Response('', { status: 429 }), new Response('', { status: 201 })] });
    await r.upload('abcd', new Blob(['x']), n.f);
    expect(n.verzoeken).toHaveLength(3);
    expect(pauzes).toEqual([1000, 3000]);
    const n3 = nepFetch({ [PUT]: [new Response('', { status: 429 }), new Response('', { status: 429 }), new Response('', { status: 429 })] });
    await expect(r.upload('abcd', new Blob(['x']), n3.f)).rejects.toMatchObject({ code: 'relay' });
    expect(n3.verzoeken).toHaveLength(3);
  });
  it('download: stuurt het token mee; zip-inhoud, 404 en netwerkfout', async () => {
    const n = nepFetch({ [GET]: ZIP() });
    const ok = await r.download('abcd', 'tok', n.f);
    expect(ok).toBeInstanceOf(Blob);
    expect(ok!.size).toBe(7);
    expect(n.verzoeken[0].sleutel).toBe('tok');
    expect(await r.download('abcd', 'tok', nepFetch({ [GET]: new Response('', { status: 404 }) }).f)).toBeNull();
    expect(await r.download('abcd', 'tok', nepFetch({ [GET]: new TypeError('weg') }).f)).toBeNull();
  });
  it('download: een 200 zonder zip (bijvoorbeeld een HTML-pagina) telt niet', async () => {
    expect(await r.download('abcd', 'tok', nepFetch({ [GET]: new Response('<!doctype html><html></html>', { status: 200 }) }).f)).toBeNull();
    expect(await r.download('abcd', 'tok', nepFetch({ [GET]: new Response('PK', { status: 200 }) }).f)).toBeNull();
  });
  it('zonder adres: geen-verbinding bij upload, null bij download', async () => {
    const leeg = maakRelay(null);
    expect(leeg.ingesteld).toBe(false);
    expect(maakRelay('https://relay.test').ingesteld).toBe(true);
    await expect(leeg.upload('abcd', new Blob(['x']))).rejects.toMatchObject({ code: 'geen-verbinding' });
    expect(await leeg.download('abcd', 'tok')).toBeNull();
  });
});
