import { describe, it, expect, vi } from 'vitest';
import { deel } from './delen';
import { DeelFout } from './fouten';
import { maakRelay } from './relay';

const code = ['star', 'heart', 'cloud', 'drop'];
const pakket = new Blob(['x']);
const geen = () => Promise.reject(new DeelFout('geen-verbinding'));

function relayMet(gelukt = true) {
  const r = maakRelay('https://relay.test');
  r.upload = vi.fn(async () => { if (!gelukt) throw new DeelFout('relay'); });
  return r;
}

describe('deel', () => {
  it('direct gelukt: geen vraag, geen server', async () => {
    const vraag = vi.fn();
    const relay = relayMet();
    expect(await deel({ code, pakket, instelling: 'leerkracht', vraag, direct: async () => {}, relay })).toBe('direct');
    expect(vraag).not.toHaveBeenCalled();
    expect(relay.upload).not.toHaveBeenCalled();
  });

  it('niet-gevonden gaat nooit via de server', async () => {
    const vraag = vi.fn();
    await expect(deel({ code, pakket, instelling: 'kind', vraag, direct: () => Promise.reject(new DeelFout('niet-gevonden')), relay: relayMet() })).rejects.toMatchObject({ code: 'niet-gevonden' });
    expect(vraag).not.toHaveBeenCalled();
  });

  it('nooit of geen adres: geen-verbinding', async () => {
    await expect(deel({ code, pakket, instelling: 'nooit', vraag: vi.fn(), direct: geen, relay: relayMet() })).rejects.toMatchObject({ code: 'geen-verbinding' });
    await expect(deel({ code, pakket, instelling: 'kind', vraag: vi.fn(async () => true), direct: geen, relay: maakRelay(null) })).rejects.toMatchObject({ code: 'geen-verbinding' });
  });

  it('kind zegt nee: geweigerd, niets geüpload', async () => {
    const relay = relayMet();
    await expect(deel({ code, pakket, instelling: 'kind', vraag: async () => false, direct: geen, relay })).rejects.toMatchObject({ code: 'geweigerd' });
    expect(relay.upload).not.toHaveBeenCalled();
  });

  it('toestemming: uploaden met de 4-lettersleutel, soort doorgegeven', async () => {
    const relay = relayMet();
    const vraag = vi.fn(async () => true);
    expect(await deel({ code, pakket, instelling: 'leerkracht', vraag, direct: geen, relay })).toBe('server');
    expect(vraag).toHaveBeenCalledWith('leerkracht');
    expect(relay.upload).toHaveBeenCalledWith('abcd', pakket);
  });

  it('serverfout wordt doorgegeven', async () => {
    await expect(deel({ code, pakket, instelling: 'kind', vraag: async () => true, direct: geen, relay: relayMet(false) })).rejects.toMatchObject({ code: 'relay' });
  });

  it('geen brievenbus op de server: niet-gevonden', async () => {
    const relay = maakRelay('https://relay.test');
    relay.upload = vi.fn(async () => { throw new DeelFout('niet-gevonden'); });
    await expect(deel({ code, pakket, instelling: 'kind', vraag: async () => true, direct: geen, relay })).rejects.toMatchObject({ code: 'niet-gevonden' });
  });
});
