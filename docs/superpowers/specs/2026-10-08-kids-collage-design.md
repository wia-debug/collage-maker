# Collage-app voor kinderen — ontwerp

Datum: 2026-10-08
Status: ter review

## 1. Doel en context

Webapp waarmee kinderen van 6 tot 12 jaar collages maken. Vooral gebruikt op school, soms thuis.

Succescriteria:

- Werkt vlot met touch op iPad en met muis, trackpad of touch op Chromebook en PC.
- Een kind van 6 kan zonder hulp een collage maken, nadat het één keer de rondleiding zag.
- Werkt volledig offline na de eerste keer laden (behalve delen).
- Geen accounts, geen login, geen persoonsgegevens op een server.
- Nergens emoji in de interface. Alle symbolen zijn SVG-iconen.
- Interface in het Nederlands.

### Toestellen

| Toestel | Gebruikers | Bewaren | Bijzonderheid |
|---|---|---|---|
| Gedeelde iPad | jongste en oudere kinderen | IndexedDB, per profiel | profielen met symbool-pincode |
| Chromebook (school) | oudere kinderen | `.collage`-bestand | browserdata wordt gewist bij elke login |
| PC | thuis of school | IndexedDB | installeerbaar als app (PWA), profielen optioneel |

Het toesteltype wordt niet geraden uit de browser. De leerkracht kiest het bij de eerste opstart en kan het later wijzigen.

## 2. Techniek

- **UI:** Svelte 5 + TypeScript, gebouwd met Vite.
- **Canvas:** Konva.js (lagen, `Transformer`, touch-gebaren, filters, PNG-export).
- **Opslag:** IndexedDB via Dexie.
- **Offline:** PWA met service worker (`vite-plugin-pwa`, Workbox). Alle lettertypes, iconen, stickers en templates zitten in de precache.
- **Export:** PNG via Konva, PDF via jsPDF, ZIP via JSZip.
- **Delen:** PeerJS met de publieke PeerServer. Reserve: eigen Cloudflare Worker met R2.
- **Rondleiding:** Driver.js.
- **Achtergrond verwijderen:** `@imgly/background-removal`, on-device. Het model (circa 40 MB) wordt pas gedownload bij het eerste gebruik en daarna gecachet.
- **Iconen:** Phosphor Icons, gewicht "bold" (MIT).
- **Lettertypes:** lokaal meegeleverd, alle OFL.
- **Hosting:** Cloudflare Pages voor de app, Cloudflare Worker + R2 voor de relay.

## 3. Architectuur

Een collage is één JSON-document. Editor, opslag, export en delen werken alleen met dat document. Afbeeldingen staan als blobs ernaast en worden verwezen via een `assetId`.

```
src/
  editor/      Konva-stage, lagen, selectie, Transformer, undo-geschiedenis, uitlijnhulp
  elements/    foto, tekst, wordart, sticker, vorm, tekening (maken, tekenen, serialiseren)
  document/    datamodel, versie en migraties, validatie
  storage/     Dexie-database, profielen, opruimregels, .collage-bestand
  export/      PNG, PDF, ZIP
  share/       PeerJS, symbolencode, relay-client, toestemming
  teacher/     mastercode, instellingen, klas ontvangen, galerij, diavoorstelling
  ui/          Svelte-componenten: werkbalk, panelen, dialogen, symbolenkiezer
  tour/        Driver.js-rondleidingen
  assets/      iconen, stickerpakketten, templates, uitdagingen, lettertypes
worker/        Cloudflare Worker (relay)
```

Elke module in `elements/` volgt hetzelfde contract: `create(props)`, `toNode(element, assets)` en `fromNode(node)`. Zo kan een nieuw elementtype worden toegevoegd zonder de editor te wijzigen.

## 4. Datamodel

```ts
interface Collage {
  id: string;
  versie: number;              // schemaversie, voor migraties
  naam: string;
  profielId: string | null;    // null op Chromebook en op PC zonder profielen
  formaat: 'vierkant' | 'a4-liggend' | 'a4-staand' | 'poster';
  achtergrond: Achtergrond;    // kleur | verloop | patroon | foto
  elementen: Element[];        // volgorde = laagvolgorde
  aangemaakt: number;          // epoch ms
  gewijzigd: number;           // epoch ms
}

type Element = FotoElement | TekstElement | StickerElement | VormElement | TekeningElement;
// Gemeenschappelijk: id, type, x, y, breedte, hoogte, rotatie, schaalX, schaalY, gespiegeld, vergrendeld
```

Dexie-tabellen: `collages`, `assets` (blobs), `profielen`, `mijnStickers`, `instellingen`, `klasInzendingen`.

Het `.collage`-bestand is een ZIP met `collage.json`, een map `assets/` en `voorbeeld.png`.

## 5. Schermen en bediening

### Startscherm

- **Gedeelde iPad:** profieltegels (naam, symbool, kleur). Tik op een tegel, daarna de pincode van 3 symbolen. Een slotje rechtsboven opent het leerkrachtmenu.
- **Chromebook:** geen profielen. Knoppen Nieuw, Template, Uitdaging, Open bestand.
- **PC:** zoals iPad als profielen aan staan, anders zoals Chromebook plus een lijst "Mijn collages".
- Templates en uitdagingen verschijnen als grote kaarten met een voorbeeld.

### Editor

- Bovenbalk: terug, naam, ongedaan maken, opnieuw, Deel, Bewaar.
- Linkerbalk (liggend) of onderbalk (staand) met de tools: Foto, Tekst, Stickers, Vormen, Tekenen, Achtergrond.
- Rechts een paneel met de opties van de gekozen tool of selectie. Staand is dat een onderblad.
- Snelmenu bij een geselecteerd element: naar voor, naar achter, kopie, draaien, spiegelen, vergrendelen, wissen.

### Bediening

- Knoppen zijn minimaal 56 px.
- Eén vinger sleept. Twee vingers knijpen (schalen) en draaien. De hoeken van de `Transformer` werken ook met de muis.
- Geen dubbeltik en geen lang drukken nodig. Elke actie is ook via een knop bereikbaar.
- Rechtermuisknop opent het snelmenu.
- Toetsenbord: Ctrl+Z, Ctrl+Y, Delete, pijltjes (verplaatsen), Ctrl+D (kopie).
- **Slepen en neerzetten:** een afbeelding uit een andere browsertab, de verkenner of het bureaublad op het canvas laten vallen voegt een foto toe. Op iPad werkt dit via Split View en Slide Over. Bij een afbeelding van een website die kopiëren blokkeert (CORS) verschijnt: "Deze foto kan ik niet ophalen. Bewaar hem eerst en voeg hem dan toe."
- Plakken uit het klembord (Ctrl+V) voegt een afbeelding toe.

### Stijl

- Crèmewitte achtergrond, vijf accentkleuren: koraal, zonnegeel, mint, hemelsblauw, lavendel.
- Ronde hoeken, zachte schaduwen, dikke lijn-iconen.
- UI-lettertype: Nunito.
- Korte veer-animaties bij toevoegen en een plop-geluid. Geluid kan uit. `prefers-reduced-motion` schakelt animaties uit.

### Rondleiding (Driver.js)

- Eerste keer in de editor: tour van 5 stappen.
- Knop "?": tour per tool opnieuw starten.
- Eerste keer in het leerkrachtmenu: aparte leerkracht-tour.
- Of een tour al getoond is, wordt per profiel bewaard (op Chromebook in `localStorage`, dus elke sessie opnieuw; daarom is de tour daar wegklikbaar met één knop).

## 6. Elementen en functies

### Foto

- Bronnen: bestand, fotogalerij, camera (`getUserMedia`, met reserve `<input type="file" accept="image/*" capture>`), slepen, plakken.
- Bij import verkleind tot maximaal 2048 px aan de lange zijde.
- **Bijsnijden:** aparte modus met verhoudingen vrij, 1:1, 4:3 en 16:9. Niet-destructief: het origineel blijft bewaard.
- **Vormmasker:** rechthoek, rond, hart, ster, wolk, blob.
- **Kaders:** 12 stijlen (effen rand, polaroid, plakband, gescheurd papier, stippen, film, goud, krijt, en andere). Kleur instelbaar.
- **Filters:** normaal, zwart-wit, sepia, warm, koel, vrolijk, vervaagd, pixel, strip, negatief. Met voorbeeldtegels. Schuifjes voor helderheid en contrast.
- **Achtergrond weg:** maakt een uitknipsel. Knop "Maak sticker" bewaart het uitknipsel in Mijn stickers.

### Tekst

- 10 lettertypes: Nunito, Baloo 2, Fredoka, Pacifico, Bangers, Permanent Marker, Caveat, Luckiest Guy, Chewy, Sniglet.
- Opties: grootte, kleur, vet, schuin, uitlijning, regelafstand, omlijning, schaduw, achtergrondvlak (tekstballon).
- Tekst bewerken gebeurt in een groot invoerveld bovenaan het scherm, niet direct op het canvas.
- **WordArt:** 12 voorinstellingen, daarna aanpasbaar. Boog omhoog, boog omlaag, cirkel, golf, kleurverloop, regenboog per letter, 3D-schaduw, neon-gloed, dubbele omlijning. Gebouwd met Konva `TextPath` en per-letter-nodes.

### Stickers

- Pakketten: dieren, ruimte, sport, seizoenen, feest, natuur, eten, voertuigen, vormen-en-pijlen, tekstballonnen. Bij de start circa 20 SVG-stickers per pakket.
- Groter, kleiner, draaien, spiegelen. Eenkleurige stickers kunnen van kleur wisselen.
- Mijn stickers: eigen uitknipsels.

### Vormen

Rechthoek, cirkel, ster, hart, driehoek, pijl, lijn. Vulling, rand en doorzichtigheid instelbaar.

### Tekenen

Pen, stift, krijt en gum. Drie diktes, kleurenpalet. Elke streek is een apart element.

### Achtergrond

Effen kleur, verloop, patroon (stippen, strepen, ruitjes, sterren, papier, karton) of eigen foto.

### Algemeen

- Ongedaan maken en opnieuw: 50 stappen.
- Lagen: naar voor en naar achter. Vergrendelen.
- Uitlijnhulp: magneetlijnen naar het midden en de randen van het canvas en van andere elementen.
- Automatisch bewaren na elke wijziging. Op Chromebook in IndexedDB, alleen geldig tot uitloggen, met een herinnering "Bewaar als bestand" bij verlaten en elke 10 minuten.

### Templates en uitdagingen

- 12 templates: fotoraster 2, 3, 4 en 6, vakantie, verjaardag, over mij, mijn huisdier, seizoen, stripverhaal, poster, kaart.
- 20 uitdagingen: opdrachtkaarten met een passende template en stickerpakket.

### Export

- PNG op 2× resolutie.
- PDF op A4 in de juiste oriëntatie, met de collage als afbeelding.
- Leerkracht: ZIP of één PDF met alle ontvangen collages.

### Geluid en animatie

Plop bij toevoegen, zoef bij wissen, klein feestje bij exporteren. Alles uit te zetten in de leerkrachtinstellingen.

## 7. Profielen, leerkracht en opruimen

### Leerkracht-mastercode

- 6 cijfers, ingesteld bij de eerste opstart. Bewaard als PBKDF2-hash met salt in IndexedDB.
- Vergeten: sitegegevens van de app wissen in de browser. Dit staat in de handleiding.
- Geeft toegang tot: alles wissen, profielen beheren, kind-pincode resetten, toesteltype, profielen aan/uit (PC), Cloudflare-delen, geluid en animatie, klas ontvangen.

### Kindprofielen (iPad, optioneel op PC)

- Naam, symbool en kleur. Pincode van 3 symbolen uit 9 (729 combinaties), bewaard als hash.
- De pincode beschermt tegen per ongeluk openen door een ander kind. Het is geen echte beveiliging.

### Opruimen

Bij elke opstart gecontroleerd, op basis van `gewijzigd`:

- Ouder dan 30 dagen: het kind ziet de vraag "Deze oude collages wissen?" met voorbeelden. Ja of Later.
- Ouder dan 60 dagen: automatisch gewist, zonder vraag.
- Profielen zonder collages en zonder gebruik in 60 dagen worden ook gewist.
- Ontvangen klasinzendingen volgen dezelfde 60-dagenregel.
- Op Chromebook niet van toepassing (browser wist zelf).

## 8. Delen

### Rechtstreeks (PeerJS)

1. Ontvanger tikt "Ontvang" en krijgt een code van 4 symbolen uit 12 (20.736 combinaties).
2. PeerJS-id is `kidscollage-` plus de code. Als de id al bezet is, wordt een nieuwe code gekozen.
3. Zender tikt "Deel" en kiest dezelfde 4 symbolen.
4. De `.collage`-ZIP gaat rechtstreeks via WebRTC.
5. Ontvanger kiest: openen als kopie, of alleen bekijken.

### Reserve via Cloudflare

Als er na 10 seconden geen verbinding is, kijkt de app naar de instelling "Cloudflare-delen":

- **Nooit:** melding "Delen lukt niet op dit netwerk. Bewaar je collage als bestand."
- **Vragen aan kind:** dialoog "Je netwerk blokkeert direct delen. Mag je collage via onze server gaan? Hij wordt na 24 uur gewist." Ja of Nee.
- **Vragen aan leerkracht** (standaard): zelfde dialoog, maar bevestigen vraagt de mastercode.

De toestemming geldt voor één keer delen. De volgende keer wordt opnieuw gevraagd.

### Worker

- `PUT /relay/:code`: upload, maximaal 25 MB, opslag in R2.
- `GET /relay/:code`: download. Daarna wordt het object gewist.
- `PUT /class/:code/:id` en `GET /class/:code`: verzamelmap voor leerkrachtmodus.
- Niet opgehaald na 10 minuten: code vervalt. R2-lifecycle-regel wist alles na 24 uur.
- Rate limit per IP. Geen logging van inhoud. CORS beperkt tot het app-domein.

## 9. Leerkrachtmodus

- **Ontvang van klas:** de leerkracht toont een klascode van 4 symbolen op het grote scherm. Kinderen tikken "Stuur naar de leerkracht", kiezen de code en hun naam (vooringevuld met de profielnaam).
- Het leerkrachttoestel houdt de PeerJS-verbinding open en ontvangt meerdere kinderen na elkaar. Bij geblokkeerd netwerk wordt de verzamelmap van de Worker gebruikt, met dezelfde toestemmingsregel.
- **Galerij:** alle inzendingen met naam van het kind. Downloaden als ZIP of als één PDF.
- **Diavoorstelling:** volledig scherm, pijltjes of vegen, automatisch afspelen met instelbare tijd.

## 10. Foutafhandeling

- Elke fout geeft een vriendelijke melding met een symbool, zonder technische taal.
- Te grote foto: automatisch verkleind, met melding.
- Opslag vol: melding en voorstel om oude collages te wissen. Bij de start wordt `navigator.storage.persist()` aangevraagd.
- Corrupt of onbekend bestand: melding, de app blijft werken.
- Bestand van een nieuwere schemaversie: melding "Dit bestand is gemaakt met een nieuwere versie."
- Camera geweigerd: melding met uitleg en de keuze om een bestand te kiezen.

## 11. Testen

- **Vitest:** datamodel en migraties, serialisatie naar en van `.collage`, symbolencodes, opruimregels, undo-geschiedenis, pincode-hashing.
- **Playwright:** WebKit met iPad-emulatie en touch, en Chromium. Flows: collage maken, foto bijsnijden, exporteren, bewaren en openen, delen tussen twee browsercontexten, leerkracht ontvangt.
- **Worker:** Vitest met `@cloudflare/vitest-pool-workers`.
- **Handmatig:** per fase op een echte iPad, een Chromebook en een PC.

## 12. Fases

1. **Kern-editor (offline):** canvas, alle elementen (zonder camera en achtergrond verwijderen), ongedaan maken, templates, uitdagingen, PNG- en PDF-export, PWA, slepen en plakken, rondleiding.
2. **Opslag en profielen:** toesteltype, mastercode, profielen met pincode, IndexedDB, opruimregels, `.collage`-bestand.
3. **Delen:** PeerJS, symbolencode, Worker-relay, toestemmingsinstelling.
4. **Leerkrachtmodus en extra's:** klas ontvangen, galerij, ZIP en PDF, diavoorstelling, camera, achtergrond verwijderen, Mijn stickers, geluid en animatie.

Elke fase levert een bruikbare app op.

## 13. Buiten scope

- Voorleesfunctie.
- Accounts of cloudopslag van collages.
- Samen tegelijk aan één collage werken.
