export interface R2BucketLike {
  put(key: string, body: ArrayBuffer, o?: { customMetadata?: Record<string, string> }): Promise<unknown>;
  get(key: string): Promise<{ customMetadata?: Record<string, string>; arrayBuffer(): Promise<ArrayBuffer> } | null>;
  delete(key: string): Promise<void>;
}
export interface Env {
  BAK: R2BucketLike;
  TOEGESTANE_ORIGIN: string;
  LIMIET?: { limit(o: { key: string }): Promise<{ success: boolean }> };
}

const MAX = 25 * 1024 * 1024;
const GELDIG_MS = 10 * 60_000;
const SLEUTEL = /^[a-l]{4}$/;

interface Brievenbus { token: string; geopend: number; gevuld: boolean }

function nieuwToken(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

// Een brievenbus leeft 10 minuten na het openen; daarna telt alles voor die code als afwezig.
async function leesBrievenbus(env: Env, basis: string, nu: number): Promise<Brievenbus | null> {
  const obj = await env.BAK.get(`${basis}/brievenbus`);
  if (!obj) return null;
  const m = obj.customMetadata ?? {};
  const geopend = Number(m.geopend);
  if (!m.token || !Number.isFinite(geopend) || nu - geopend > GELDIG_MS) {
    await ruimOp(env, basis);
    return null;
  }
  return { token: m.token, geopend, gevuld: m.gevuld === '1' };
}

async function schrijfBrievenbus(env: Env, basis: string, b: Brievenbus): Promise<void> {
  await env.BAK.put(`${basis}/brievenbus`, new ArrayBuffer(0), { customMetadata: { token: b.token, geopend: String(b.geopend), gevuld: b.gevuld ? '1' : '0' } });
}

async function ruimOp(env: Env, basis: string): Promise<void> {
  await env.BAK.delete(`${basis}/pakket`);
  await env.BAK.delete(`${basis}/brievenbus`);
}

export async function verwerk(req: Request, env: Env, nu = Date.now()): Promise<Response> {
  const cors: Record<string, string> = {
    'Access-Control-Allow-Origin': env.TOEGESTANE_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Sleutel',
    Vary: 'Origin',
  };
  const antwoord = (status: number, body: BodyInit | null = null, extra: Record<string, string> = {}) => new Response(body, { status, headers: { ...cors, ...extra } });
  if (req.method === 'OPTIONS') return antwoord(204);
  const m = new URL(req.url).pathname.match(/^\/relay\/([^/]+)$/);
  if (!m || !SLEUTEL.test(m[1])) return antwoord(404);
  if (env.LIMIET) {
    const ip = req.headers.get('CF-Connecting-IP') ?? 'onbekend';
    if (!(await env.LIMIET.limit({ key: ip })).success) return antwoord(429);
  }
  const basis = `relay/${m[1]}`;
  if (req.method === 'POST') {
    if (await leesBrievenbus(env, basis, nu)) return antwoord(409);
    await env.BAK.delete(`${basis}/pakket`);
    const token = nieuwToken();
    await schrijfBrievenbus(env, basis, { token, geopend: nu, gevuld: false });
    return antwoord(201, JSON.stringify({ token }), { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  }
  if (req.method === 'PUT') {
    const lengte = Number(req.headers.get('Content-Length') ?? '0');
    if (lengte > MAX) return antwoord(413);
    const bus = await leesBrievenbus(env, basis, nu);
    if (!bus) return antwoord(404);
    if (bus.gevuld) return antwoord(409);
    const body = await req.arrayBuffer();
    if (body.byteLength > MAX) return antwoord(413);
    await env.BAK.put(`${basis}/pakket`, body);
    await schrijfBrievenbus(env, basis, { ...bus, gevuld: true });
    return antwoord(201);
  }
  if (req.method === 'GET') {
    const bus = await leesBrievenbus(env, basis, nu);
    if (bus && req.headers.get('X-Sleutel') !== bus.token) return antwoord(403);
    if (!bus || !bus.gevuld) return antwoord(404);
    const obj = await env.BAK.get(`${basis}/pakket`);
    if (!obj) { await ruimOp(env, basis); return antwoord(404); }
    const data = await obj.arrayBuffer();
    await ruimOp(env, basis);
    return antwoord(200, data, { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'no-store' });
  }
  return antwoord(405);
}

export default { fetch: (req: Request, env: Env): Promise<Response> => verwerk(req, env) };
