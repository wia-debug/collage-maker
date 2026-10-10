export interface R2BucketLike {
  put(key: string, body: ArrayBuffer, o?: { customMetadata?: Record<string, string> }): Promise<unknown>;
  get(key: string): Promise<{ customMetadata?: Record<string, string>; arrayBuffer(): Promise<ArrayBuffer> } | null>;
  delete(key: string): Promise<void>;
  list(o: { prefix: string; include?: ('customMetadata')[] }): Promise<{ objects: { key: string; customMetadata?: Record<string, string> }[] }>;
}
export interface Env {
  BAK: R2BucketLike;
  TOEGESTANE_ORIGIN: string;
  LIMIET?: { limit(o: { key: string }): Promise<{ success: boolean }> };
}

const MAX = 25 * 1024 * 1024;
const GELDIG_MS = 10 * 60_000;
const SLEUTEL = /^[a-l]{4}$/;
const UUR = 3_600_000;
const KLAS_GELDIG = 2 * UUR;
const KLAS_MAX_DUUR = 8 * UUR;
const KLAS_MAX = 60;
const KLAS_ID = /^[0-9a-f]{16}$/;

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

interface KlasMap { token: string; geopend: number; verloopt: number; aantal: number }

async function leesMap(env: Env, basis: string, nu: number): Promise<KlasMap | null> {
  const obj = await env.BAK.get(`${basis}/map`);
  if (!obj) return null;
  const m = obj.customMetadata ?? {};
  const kaart = { token: m.token ?? '', geopend: Number(m.geopend), verloopt: Number(m.verloopt), aantal: Number(m.aantal) };
  if (!kaart.token || !Number.isFinite(kaart.verloopt) || nu > kaart.verloopt) { await ruimKlasOp(env, basis); return null; }
  return kaart;
}
async function schrijfMap(env: Env, basis: string, k: KlasMap): Promise<void> {
  await env.BAK.put(`${basis}/map`, new ArrayBuffer(0), { customMetadata: { token: k.token, geopend: String(k.geopend), verloopt: String(k.verloopt), aantal: String(k.aantal) } });
}
async function ruimKlasOp(env: Env, basis: string): Promise<void> {
  const { objects } = await env.BAK.list({ prefix: `${basis}/` });
  for (const o of objects) await env.BAK.delete(o.key);
}
function leesNaam(kop: string | null): string | null {
  if (kop === null) return null;
  try {
    const n = decodeURIComponent(kop).trim();
    return n.length >= 1 && n.length <= 40 ? n : null;
  } catch { return null; }
}

export async function verwerk(req: Request, env: Env, nu = Date.now()): Promise<Response> {
  const cors: Record<string, string> = {
    'Access-Control-Allow-Origin': env.TOEGESTANE_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Sleutel, X-Naam',
    'Access-Control-Expose-Headers': 'X-Naam',
    Vary: 'Origin',
  };
  const antwoord = (status: number, body: BodyInit | null = null, extra: Record<string, string> = {}) => new Response(body, { status, headers: { ...cors, ...extra } });
  if (req.method === 'OPTIONS') return antwoord(204);
  const pad = new URL(req.url).pathname;
  const m = pad.match(/^\/relay\/([^/]+)$/);
  const k = m ? null : pad.match(/^\/class\/([^/]+)(?:\/([^/]+))?$/);
  if (m) { if (!SLEUTEL.test(m[1])) return antwoord(404); }
  else if (!k || !SLEUTEL.test(k[1]) || (k[2] !== undefined && !KLAS_ID.test(k[2]))) return antwoord(404);
  if (env.LIMIET) {
    const ip = req.headers.get('CF-Connecting-IP') ?? 'onbekend';
    if (!(await env.LIMIET.limit({ key: ip })).success) return antwoord(429);
  }
  if (k) return verwerkKlas(req, env, nu, k[1], k[2], antwoord);
  if (!m) return antwoord(404);
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

async function verwerkKlas(
  req: Request, env: Env, nu: number, code: string, id: string | undefined,
  antwoord: (status: number, body?: BodyInit | null, extra?: Record<string, string>) => Response,
): Promise<Response> {
  const basis = `class/${code}`;
  if (req.method === 'POST' && !id) {
    if (await leesMap(env, basis, nu)) return antwoord(409);
    await ruimKlasOp(env, basis);
    const token = nieuwToken();
    await schrijfMap(env, basis, { token, geopend: nu, verloopt: nu + KLAS_GELDIG, aantal: 0 });
    return antwoord(201, JSON.stringify({ token }), { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  }
  if (req.method === 'PUT' && id) {
    const naam = leesNaam(req.headers.get('X-Naam'));
    if (!naam) return antwoord(400);
    if (Number(req.headers.get('Content-Length') ?? '0') > MAX) return antwoord(413);
    const kaart = await leesMap(env, basis, nu);
    if (!kaart) return antwoord(404);
    if (kaart.aantal >= KLAS_MAX || (await env.BAK.get(`${basis}/${id}`))) return antwoord(409);
    const body = await req.arrayBuffer();
    if (body.byteLength > MAX) return antwoord(413);
    await env.BAK.put(`${basis}/${id}`, body, { customMetadata: { naam: encodeURIComponent(naam) } });
    await schrijfMap(env, basis, { ...kaart, aantal: kaart.aantal + 1 });
    return antwoord(201);
  }
  if (req.method === 'GET') {
    const kaart = await leesMap(env, basis, nu);
    if (kaart && req.headers.get('X-Sleutel') !== kaart.token) return antwoord(403);
    if (!kaart) return antwoord(404);
    if (!id) {
      await schrijfMap(env, basis, { ...kaart, verloopt: Math.min(nu + KLAS_GELDIG, kaart.geopend + KLAS_MAX_DUUR) });
      const { objects } = await env.BAK.list({ prefix: `${basis}/`, include: ['customMetadata'] });
      const lijst = objects.filter((o) => o.key !== `${basis}/map`).map((o) => ({ id: o.key.slice(basis.length + 1), naam: decodeURIComponent(o.customMetadata?.naam ?? '') }));
      return antwoord(200, JSON.stringify(lijst), { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    }
    const obj = await env.BAK.get(`${basis}/${id}`);
    if (!obj) return antwoord(404);
    const data = await obj.arrayBuffer();
    await env.BAK.delete(`${basis}/${id}`);
    return antwoord(200, data, { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Naam': obj.customMetadata?.naam ?? '' });
  }
  return antwoord(405);
}

export default { fetch: (req: Request, env: Env): Promise<Response> => verwerk(req, env) };
