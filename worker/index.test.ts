import { describe, it, expect } from 'vitest';
import { verwerk, type Env, type R2BucketLike } from './src/index';

function nepBak(): R2BucketLike & { data: Map<string, { body: ArrayBuffer; meta: Record<string, string> }> } {
  const data = new Map<string, { body: ArrayBuffer; meta: Record<string, string> }>();
  return {
    data,
    async put(k, body, o) { data.set(k, { body: body as ArrayBuffer, meta: o?.customMetadata ?? {} }); return null; },
    async get(k) { const d = data.get(k); return d ? { customMetadata: d.meta, arrayBuffer: async () => d.body } : null; },
    async delete(k) { data.delete(k); },
    async list({ prefix }) {
      return { objects: [...data].filter(([k]) => k.startsWith(prefix)).map(([key, d]) => ({ key, customMetadata: d.meta })) };
    },
  };
}

const ORIGIN = 'https://app.test';
const env = (extra: Partial<Env> = {}): Env => ({ BAK: nepBak(), TOEGESTANE_ORIGIN: ORIGIN, ...extra });
const req = (method: string, pad: string, body?: BodyInit, headers: Record<string, string> = {}) =>
  new Request(`https://relay.test${pad}`, { method, body, headers: { Origin: ORIGIN, ...headers } });

async function open(e: Env, nu?: number): Promise<string> {
  const r = await verwerk(req('POST', '/relay/abcd'), e, nu);
  expect(r.status).toBe(201);
  const { token } = (await r.json()) as { token: string };
  return token;
}

describe('relay-worker', () => {
  it('open geeft een token van 32 hex-tekens, tweede open is 409', async () => {
    const e = env();
    const token = await open(e);
    expect(token).toMatch(/^[0-9a-f]{32}$/);
    expect((await verwerk(req('POST', '/relay/abcd'), e)).status).toBe(409);
    expect((await verwerk(req('POST', '/relay/abce'), e)).status).toBe(201);
  });
  it('PUT zonder brievenbus is 404, na open 201, tweede PUT 409', async () => {
    const e = env();
    expect((await verwerk(req('PUT', '/relay/abcd', 'hallo'), e)).status).toBe(404);
    await open(e);
    expect((await verwerk(req('PUT', '/relay/abcd', 'hallo'), e)).status).toBe(201);
    expect((await verwerk(req('PUT', '/relay/abcd', 'anders'), e)).status).toBe(409);
  });
  it('GET vraagt het juiste token; daarna is alles weg', async () => {
    const e = env();
    const token = await open(e);
    expect((await verwerk(req('GET', '/relay/abcd', undefined, { 'X-Sleutel': token }), e)).status).toBe(404);
    await verwerk(req('PUT', '/relay/abcd', 'hallo'), e);
    expect((await verwerk(req('GET', '/relay/abcd'), e)).status).toBe(403);
    expect((await verwerk(req('GET', '/relay/abcd', undefined, { 'X-Sleutel': 'f'.repeat(32) }), e)).status).toBe(403);
    const r = await verwerk(req('GET', '/relay/abcd', undefined, { 'X-Sleutel': token }), e);
    expect(r.status).toBe(200);
    expect(await r.text()).toBe('hallo');
    expect(r.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
    expect((await verwerk(req('GET', '/relay/abcd', undefined, { 'X-Sleutel': token }), e)).status).toBe(404);
    expect((e.BAK as ReturnType<typeof nepBak>).data.size).toBe(0);
    await open(e);
  });
  it('na 10 minuten vervalt de brievenbus: opnieuw openen kan, PUT wordt geweigerd', async () => {
    const e = env();
    const t0 = 1_000_000;
    const token = await open(e, t0);
    const later = t0 + 10 * 60_000 + 1;
    expect((await verwerk(req('PUT', '/relay/abcd', 'x'), e, later)).status).toBe(404);
    expect((await verwerk(req('GET', '/relay/abcd', undefined, { 'X-Sleutel': token }), e, later)).status).toBe(404);
    await open(e, later);
  });
  it('een gevuld pakket vervalt ook na 10 minuten', async () => {
    const e = env();
    const t0 = 1_000_000;
    const token = await open(e, t0);
    await verwerk(req('PUT', '/relay/abcd', 'x'), e, t0 + 1000);
    expect((await verwerk(req('GET', '/relay/abcd', undefined, { 'X-Sleutel': token }), e, t0 + 10 * 60_000 + 1)).status).toBe(404);
    expect((e.BAK as ReturnType<typeof nepBak>).data.size).toBe(0);
  });
  it('te groot, verkeerde sleutel, verkeerde methode', async () => {
    const e = env();
    await open(e);
    expect((await verwerk(req('PUT', '/relay/abcd', 'x', { 'Content-Length': String(25 * 1024 * 1024 + 1) }), e)).status).toBe(413);
    expect((await verwerk(req('PUT', '/relay/abcd', new Uint8Array(25 * 1024 * 1024 + 1)), e)).status).toBe(413);
    expect((await verwerk(req('GET', '/relay/ab!cd'), e)).status).toBe(404);
    expect((await verwerk(req('GET', '/iets-anders'), e)).status).toBe(404);
    expect((await verwerk(req('DELETE', '/relay/abcd'), e)).status).toBe(405);
  });
  it('OPTIONS geeft CORS-headers', async () => {
    const r = await verwerk(req('OPTIONS', '/relay/abcd'), env());
    expect(r.status).toBe(204);
    for (const m of ['GET', 'PUT', 'POST', 'OPTIONS']) expect(r.headers.get('Access-Control-Allow-Methods')).toContain(m);
    expect(r.headers.get('Access-Control-Allow-Headers')).toContain('X-Sleutel');
  });
  it('rate limit geeft 429', async () => {
    const e = env({ LIMIET: { limit: async () => ({ success: false }) } });
    expect((await verwerk(req('GET', '/relay/abcd'), e)).status).toBe(429);
  });
});

async function openKlas(e: Env, nu?: number): Promise<string> {
  const r = await verwerk(req('POST', '/class/abcd'), e, nu);
  expect(r.status).toBe(201);
  return ((await r.json()) as { token: string }).token;
}
const stuur = (e: Env, id: string, naam = 'Lies', nu?: number, body: BodyInit = 'pakket') =>
  verwerk(req('PUT', `/class/abcd/${id}`, body, { 'X-Naam': encodeURIComponent(naam) }), e, nu);
const ID = (n: number) => n.toString(16).padStart(16, '0');

describe('klasmap', () => {
  it('open geeft een token; tweede open is 409', async () => {
    const e = env();
    expect(await openKlas(e)).toMatch(/^[0-9a-f]{32}$/);
    expect((await verwerk(req('POST', '/class/abcd'), e)).status).toBe(409);
  });
  it('upload zonder map is 404; met map 201; zelfde id 409', async () => {
    const e = env();
    expect((await stuur(e, ID(1))).status).toBe(404);
    await openKlas(e);
    expect((await stuur(e, ID(1))).status).toBe(201);
    expect((await stuur(e, ID(1))).status).toBe(409);
  });
  it('naam moet 1 tot 40 tekens zijn; id moet 16 hex zijn', async () => {
    const e = env();
    await openKlas(e);
    expect((await stuur(e, ID(1), '')).status).toBe(400);
    expect((await stuur(e, ID(2), 'x'.repeat(41))).status).toBe(400);
    expect((await verwerk(req('PUT', '/class/abcd/niet-hex', 'p', { 'X-Naam': 'A' }), e)).status).toBe(404);
  });
  it('lijst en ophalen vragen het token; ophalen wist', async () => {
    const e = env();
    const token = await openKlas(e);
    await stuur(e, ID(1), 'Lies Één');
    expect((await verwerk(req('GET', '/class/abcd'), e)).status).toBe(403);
    const lijst = await verwerk(req('GET', '/class/abcd', undefined, { 'X-Sleutel': token }), e);
    expect(await lijst.json()).toEqual([{ id: ID(1), naam: 'Lies Één' }]);
    expect((await verwerk(req('GET', `/class/abcd/${ID(1)}`, undefined, { 'X-Sleutel': 'fout'.padEnd(32, '0') }), e)).status).toBe(403);
    const r = await verwerk(req('GET', `/class/abcd/${ID(1)}`, undefined, { 'X-Sleutel': token }), e);
    expect(r.status).toBe(200);
    expect(decodeURIComponent(r.headers.get('X-Naam')!)).toBe('Lies Één');
    expect(await r.text()).toBe('pakket');
    expect((await verwerk(req('GET', `/class/abcd/${ID(1)}`, undefined, { 'X-Sleutel': token }), e)).status).toBe(404);
  });
  it('maximaal 60 inzendingen', async () => {
    const e = env();
    await openKlas(e);
    for (let i = 0; i < 60; i++) expect((await stuur(e, ID(i))).status).toBe(201);
    expect((await stuur(e, ID(60))).status).toBe(409);
  });
  it('vervalt na 2 uur; lijst verlengt tot hooguit 8 uur', async () => {
    const e = env();
    const U = 3_600_000;
    const token = await openKlas(e, 0);
    expect((await stuur(e, ID(1), 'A', 2 * U + 1)).status).toBe(404);
    const e2 = env();
    const t2 = await openKlas(e2, 0);
    for (let u = 1.5; u < 8; u += 1.5) {
      expect((await verwerk(req('GET', '/class/abcd', undefined, { 'X-Sleutel': t2 }), e2, u * U)).status).toBe(200);
    }
    expect((await stuur(e2, ID(1), 'A', 8 * U + 1)).status).toBe(404);
    expect((await verwerk(req('POST', '/class/abcd'), e2, 8 * U + 1)).status).toBe(201);
    void token;
  });
  it('te groot is 413; CORS staat X-Naam toe en toont het', async () => {
    const e = env();
    await openKlas(e);
    expect((await verwerk(req('PUT', `/class/abcd/${ID(1)}`, 'x', { 'X-Naam': 'A', 'Content-Length': String(26 * 1024 * 1024) }), e)).status).toBe(413);
    const o = await verwerk(req('OPTIONS', '/class/abcd'), e);
    expect(o.headers.get('Access-Control-Allow-Headers')).toContain('X-Naam');
    expect(o.headers.get('Access-Control-Expose-Headers')).toBe('X-Naam');
  });
  it('relay-routes werken nog', async () => {
    const e = env();
    expect((await verwerk(req('POST', '/relay/abcd'), e)).status).toBe(201);
  });
});
