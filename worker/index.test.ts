import { describe, it, expect } from 'vitest';
import { verwerk, type Env, type R2BucketLike } from './src/index';

function nepBak(): R2BucketLike & { data: Map<string, { body: ArrayBuffer; meta: Record<string, string> }> } {
  const data = new Map<string, { body: ArrayBuffer; meta: Record<string, string> }>();
  return {
    data,
    async put(k, body, o) { data.set(k, { body: body as ArrayBuffer, meta: o?.customMetadata ?? {} }); return null; },
    async get(k) { const d = data.get(k); return d ? { customMetadata: d.meta, arrayBuffer: async () => d.body } : null; },
    async delete(k) { data.delete(k); },
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
