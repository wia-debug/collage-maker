export class DeelFout extends Error {
  constructor(public code: 'niet-gevonden' | 'geen-verbinding' | 'te-groot' | 'relay' | 'code-bezet' | 'geweigerd') { super(code); }
}

export const DEELTEKST: Record<DeelFout['code'], string> = {
  'niet-gevonden': 'Ik vind niemand met deze code. Klopt de code?',
  'geen-verbinding': 'Delen lukt niet op dit netwerk. Bewaar je collage als bestand.',
  'te-groot': 'Deze collage is te groot om te delen.',
  relay: 'Delen via de server lukte niet. Probeer het later nog eens.',
  'code-bezet': 'Deze code is al in gebruik. Ik kies een nieuwe.',
  geweigerd: 'De collage is niet gedeeld.',
};
