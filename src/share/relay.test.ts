import { describe, it, expect } from 'vitest';
import { maakRelay } from './relay';

function nepFetch(antwoorden: Record<string, Response | Error>) {
  const verzoeken: { url: string; method: string }[] = [];
  const f = (async (url: string, init?: RequestInit) => {
    verzoeken.push({ url, method: init?.method ?? 'GET' });
    const a = antwoorden[`${init?.method ?? 'GET'} ${url}`];
    if (a instanceof Error) throw a;
    return a ?? new Response('', { status: 500 });
  }) as unknown as typeof fetch;
  return { f, verzoeken };
}

describe('relay-client', () => {
  const r = maakRelay('https://relay.test/');
  it('upload gebruikt PUT op /relay/<sleutel>', async () => {
    const n = nepFetch({ 'PUT https://relay.test/relay/abcd': new Response('', { status: 201 }) });
    await r.upload('abcd', new Blob(['x']), n.f);
    expect(n.verzoeken).toEqual([{ url: 'https://relay.test/relay/abcd', method: 'PUT' }]);
  });
  it('413 wordt te-groot, 500 of netwerkfout wordt relay', async () => {
    await expect(r.upload('abcd', new Blob(['x']), nepFetch({ 'PUT https://relay.test/relay/abcd': new Response('', { status: 413 }) }).f)).rejects.toMatchObject({ code: 'te-groot' });
    await expect(r.upload('abcd', new Blob(['x']), nepFetch({}).f)).rejects.toMatchObject({ code: 'relay' });
    await expect(r.upload('abcd', new Blob(['x']), nepFetch({ 'PUT https://relay.test/relay/abcd': new TypeError('weg') }).f)).rejects.toMatchObject({ code: 'relay' });
  });
  it('download: inhoud, 404 en netwerkfout', async () => {
    const ok = await r.download('abcd', nepFetch({ 'GET https://relay.test/relay/abcd': new Response('inhoud') }).f);
    expect(await ok!.text()).toBe('inhoud');
    expect(await r.download('abcd', nepFetch({ 'GET https://relay.test/relay/abcd': new Response('', { status: 404 }) }).f)).toBeNull();
    expect(await r.download('abcd', nepFetch({ 'GET https://relay.test/relay/abcd': new TypeError('weg') }).f)).toBeNull();
  });
  it('zonder adres: geen-verbinding bij upload, null bij download', async () => {
    const leeg = maakRelay(null);
    expect(leeg.ingesteld).toBe(false);
    expect(maakRelay('https://relay.test').ingesteld).toBe(true);
    await expect(leeg.upload('abcd', new Blob(['x']))).rejects.toMatchObject({ code: 'geen-verbinding' });
    expect(await leeg.download('abcd')).toBeNull();
  });
});
