import type { CloudDelen } from '../storage/instellingen';
import { codeNaarSleutel, peerId } from './code';
import { DeelFout } from './fouten';
import { verstuurDirect } from './peer';
import { relay as standaardRelay, type maakRelay } from './relay';

export type Toestemming = (soort: 'kind' | 'leerkracht') => Promise<boolean>;

export async function deel(o: {
  code: string[]; pakket: Blob; instelling: CloudDelen; vraag: Toestemming;
  direct?: (doelId: string, pakket: Blob) => Promise<void>; relay?: ReturnType<typeof maakRelay>;
}): Promise<'direct' | 'server'> {
  const direct = o.direct ?? ((id: string, p: Blob) => verstuurDirect(id, p));
  try {
    await direct(peerId(o.code), o.pakket);
    return 'direct';
  } catch (e) {
    if (!(e instanceof DeelFout) || e.code !== 'geen-verbinding') throw e;
  }
  const relay = o.relay ?? standaardRelay();
  if (o.instelling === 'nooit' || !relay.ingesteld) throw new DeelFout('geen-verbinding');
  if (!(await o.vraag(o.instelling))) throw new DeelFout('geweigerd');
  await relay.upload(codeNaarSleutel(o.code), o.pakket);
  return 'server';
}
