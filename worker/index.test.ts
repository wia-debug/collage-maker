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

describe('relay-worker', () => {
  it('PUT dan GET geeft de inhoud, tweede GET is weg', async () => {
    const e = env();
    expect((await verwerk(req('PUT', '/relay/abcd', 'hallo'), e)).status).toBe(201);
    const r = await verwerk(req('GET', '/relay/abcd'), e);
    expect(r.status).toBe(200);
    expect(await r.text()).toBe('hallo');
    expect(r.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
    expect((await verwerk(req('GET', '/relay/abcd'), e)).status).toBe(404);
  });
  it('na 10 minuten vervallen', async () => {
    const e = env();
    const t0 = 1_000_000;
    await verwerk(req('PUT', '/relay/abcd', 'x'), e, t0);
    expect((await verwerk(req('GET', '/relay/abcd'), e, t0 + 10 * 60_000 + 1)).status).toBe(404);
  });
  it('te groot, verkeerde sleutel, verkeerde methode', async () => {
    const e = env();
    expect((await verwerk(req('PUT', '/relay/abcd', 'x', { 'Content-Length': String(25 * 1024 * 1024 + 1) }), e)).status).toBe(413);
    expect((await verwerk(req('GET', '/relay/ab!cd'), e)).status).toBe(404);
    expect((await verwerk(req('GET', '/iets-anders'), e)).status).toBe(404);
    expect((await verwerk(req('DELETE', '/relay/abcd'), e)).status).toBe(405);
  });
  it('OPTIONS geeft CORS-headers', async () => {
    const r = await verwerk(req('OPTIONS', '/relay/abcd'), env());
    expect(r.status).toBe(204);
    expect(r.headers.get('Access-Control-Allow-Methods')).toContain('PUT');
  });
  it('rate limit geeft 429', async () => {
    const e = env({ LIMIET: { limit: async () => ({ success: false }) } });
    expect((await verwerk(req('GET', '/relay/abcd'), e)).status).toBe(429);
  });
});
