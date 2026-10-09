export interface Uitdaging { id: string; titel: string; opdracht: string; templateId: string; pakket: string }

export const UITDAGINGEN: Uitdaging[] = [
  { id: 'vakantie', titel: 'Mijn vakantie', opdracht: 'Maak een collage over je leukste vakantie.', templateId: 'vakantie', pakket: 'natuur' },
  { id: 'feest', titel: 'Feest!', opdracht: 'Maak een uitnodiging voor je verjaardagsfeest.', templateId: 'verjaardag', pakket: 'feest' },
  { id: 'dit-ben-ik', titel: 'Dit ben ik', opdracht: 'Vertel met foto\'s en woorden wie je bent.', templateId: 'over-mij', pakket: 'vormen' },
  { id: 'huisdier', titel: 'Mijn huisdier', opdracht: 'Laat je huisdier zien, of het huisdier dat je graag zou hebben.', templateId: 'huisdier', pakket: 'dieren' },
  { id: 'nieuw-dier', titel: 'Nieuw dier', opdracht: 'Verzin een nieuw dier. Hoe heet het en wat eet het?', templateId: 'huisdier', pakket: 'dieren' },
  { id: 'ruimtereis', titel: 'Ruimtereis', opdracht: 'Je reist naar een andere planeet. Wat zie je daar?', templateId: 'poster', pakket: 'ruimte' },
  { id: 'seizoenen', titel: 'Vier seizoenen', opdracht: 'Wat doe je graag in de lente, zomer, herfst en winter?', templateId: 'seizoen', pakket: 'seizoenen' },
  { id: 'strip', titel: 'Stripverhaal', opdracht: 'Vertel een kort verhaal in drie plaatjes.', templateId: 'strip', pakket: 'tekstballonnen' },
  { id: 'droomhuis', titel: 'Mijn droomhuis', opdracht: 'Ontwerp je droomhuis met alle kamers die je wil.', templateId: 'raster-4', pakket: 'vormen' },
  { id: 'lievelingseten', titel: 'Lievelingseten', opdracht: 'Wat eet je het liefst? Maak er een menu van.', templateId: 'raster-3', pakket: 'eten' },
  { id: 'sportdag', titel: 'Sportdag', opdracht: 'Toon je favoriete sport.', templateId: 'poster', pakket: 'sport' },
  { id: 'bedankt', titel: 'Bedankkaart', opdracht: 'Maak een kaart om iemand te bedanken.', templateId: 'kaart', pakket: 'vormen' },
  { id: 'mijn-klas', titel: 'Mijn klas', opdracht: 'Laat zien wat je klas zo leuk maakt.', templateId: 'raster-6', pakket: 'feest' },
  { id: 'op-reis', titel: 'Op reis', opdracht: 'Met welk voertuig wil je de wereld rond?', templateId: 'raster-2', pakket: 'voertuigen' },
  { id: 'bos', titel: 'In het bos', opdracht: 'Maak een collage over de natuur in het bos.', templateId: 'raster-4', pakket: 'natuur' },
  { id: 'superheld', titel: 'Superheld', opdracht: 'Verzin een superheld. Wat is de superkracht?', templateId: 'poster', pakket: 'vormen' },
  { id: 'weerbericht', titel: 'Weerbericht', opdracht: 'Maak het weerbericht voor morgen.', templateId: 'seizoen', pakket: 'seizoenen' },
  { id: 'hobby', titel: 'Mijn hobby', opdracht: 'Wat doe je graag in je vrije tijd?', templateId: 'raster-3', pakket: 'sport' },
  { id: 'onder-water', titel: 'Onder water', opdracht: 'Wat leeft er allemaal in de zee?', templateId: 'raster-4', pakket: 'dieren' },
  { id: 'toekomst', titel: 'De toekomst', opdracht: 'Hoe ziet de wereld eruit over 100 jaar?', templateId: 'poster', pakket: 'ruimte' },
];
