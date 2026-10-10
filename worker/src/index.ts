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

export async function verwerk(req: Request, env: Env, nu = Date.now()): Promise<Response> {
  const cors: Record<string, string> = {
    'Access-Control-Allow-Origin': env.TOEGESTANE_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
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
  const sleutel = `relay/${m[1]}`;
  if (req.method === 'PUT') {
    const lengte = Number(req.headers.get('Content-Length') ?? '0');
    if (lengte > MAX) return antwoord(413);
    const body = await req.arrayBuffer();
    if (body.byteLength > MAX) return antwoord(413);
    await env.BAK.put(sleutel, body, { customMetadata: { tijd: String(nu) } });
    return antwoord(201);
  }
  if (req.method === 'GET') {
    const obj = await env.BAK.get(sleutel);
    if (!obj) return antwoord(404);
    const tijd = Number(obj.customMetadata?.tijd);
    if (!Number.isFinite(tijd) || nu - tijd > GELDIG_MS) { await env.BAK.delete(sleutel); return antwoord(404); }
    const data = await obj.arrayBuffer();
    await env.BAK.delete(sleutel);
    return antwoord(200, data, { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'no-store' });
  }
  return antwoord(405);
}

export default { fetch: (req: Request, env: Env): Promise<Response> => verwerk(req, env) };
