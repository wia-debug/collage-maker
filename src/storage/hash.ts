import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';

export interface GehashteCode { salt: string; hash: string; iteraties: number }

const naarB64 = (b: Uint8Array): string => btoa(String.fromCharCode(...b));
const uitB64 = (s: string): Uint8Array => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function afleiden(geheim: string, salt: Uint8Array, iteraties: number): Promise<string> {
  return naarB64(await pbkdf2Async(sha256, new TextEncoder().encode(geheim), salt, { c: iteraties, dkLen: 32 }));
}

export async function maakHash(geheim: string, iteraties = 100_000): Promise<GehashteCode> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: naarB64(salt), hash: await afleiden(geheim, salt, iteraties), iteraties };
}

export async function controleerCode(geheim: string, h: GehashteCode): Promise<boolean> {
  return (await afleiden(geheim, uitB64(h.salt), h.iteraties)) === h.hash;
}
