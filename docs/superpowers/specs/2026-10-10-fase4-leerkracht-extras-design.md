# Fase 4 — leerkrachtmodus en extra's — ontwerp

Vult de hoofdspec aan (`2026-10-08-kids-collage-design.md`, §6, §8, §9 en §12). Waar deze spec iets anders zegt, geldt deze spec.

## 1. Doel

Fase 4 maakt de app af voor de klas:

- Kinderen krijgen meer creatieve mogelijkheden: camera, achtergrond weg, Mijn stickers, geluid en animatie, en een vaste verhouding voor foto's.
- De leerkracht kan collages van de hele klas ontvangen, bekijken, downloaden en tonen als diavoorstelling.

Alle bestaande regels blijven gelden: geen emoji, alleen symbolen, Nederlandse tekst, knoppen van minstens 56 px, offline behalve bij delen, geen accounts.

Succes:

- Een kind zet een foto op vaste verhouding en kan hem niet meer uitrekken.
- Een kind maakt een foto met de camera, haalt de achtergrond weg en bewaart het resultaat als eigen sticker.
- Een leerkracht ontvangt in één les de collages van de hele klas, ook op een geblokkeerd netwerk. De leerkracht toont ze als diavoorstelling en downloadt ze als ZIP of PDF.

Fase 4 wordt als één geheel gepland en gebouwd.

## 2. Verhouding vastzetten

- Nieuw veld op een foto-element: `verhoudingVast: boolean`. Een nieuwe foto krijgt `true`.
- Bij `true` toont de transformer alleen hoekankers, met `keepRatio` aan.
- Bij `false` werkt alles zoals nu: hoeken en zijkanten, vrije verhouding, met een nieuwe uitsnede (`herUitsnede`).
- De contextbalk van een foto krijgt een knop:
  - **Verhouding vast** (icoon `lock-simple`), als de verhouding nu los is.
  - **Verhouding los** (icoon `lock-simple-open`), als de verhouding nu vast is.
- Een foto zonder afbeelding (lege plaatshouder in een template) blijft zoals nu: hoeken met vaste verhouding.
- Validatie en migratie:
  - Een foto zonder het veld wordt bij inlezen `verhoudingVast: true`. Dat geldt voor `.collage`-bestanden en voor IndexedDB.
  - De afmetingen blijven zoals ze waren.
  - Een foto waarvan het veld geen boolean is, telt als ongeldig, net als bij de andere velden.
- De wijziging gaat via `editor.update`, dus ongedaan maken werkt.

## 3. Camera

- Het fotomenu krijgt de knop **Camera** (icoon `camera`).
- **CameraDialoog:**
  - Toont het live beeld van `getUserMedia({ video: { facingMode } })`.
  - Knoppen: **Wissel camera** (voor of achter, alleen zichtbaar als er meer dan één camera is), **Neem foto**, **Sluiten**.
  - Na het nemen van een foto: een stilstaand voorbeeld met **Gebruik** en **Opnieuw**.
  - Het beeld wordt op een canvas gezet en volgt de gewone import: verkleind tot maximaal 2048 px.
  - Het videobeeld van de voorcamera wordt gespiegeld getoond. De genomen foto wordt niet gespiegeld.
- Bij sluiten worden alle tracks gestopt.
- **Fouten:**
  - `getUserMedia` ontbreekt of de toegang wordt geweigerd: de melding "De camera mag niet aan. Vraag je juf of meester, of kies een foto." met een knop **Kies foto**.
  - Die knop opent `<input type="file" accept="image/*" capture="environment">`.

## 4. Achtergrond weg

- Bibliotheek: `@imgly/background-removal` (AGPL-3.0; de broncode van de app wordt publiek gedeeld).
- Het werk gebeurt volledig op het toestel. Foto's verlaten het toestel niet.
- **Modelbestanden:**
  - Ze worden bij de build gekopieerd naar `/modellen/achtergrond/` op de eigen site. Er is geen externe CDN.
  - Ze zitten niet in de PWA-precache.
  - Ze krijgen een eigen runtime-cache (CacheFirst, naam `modellen`), zodat ze na de eerste keer offline werken.
- **Knop Achtergrond weg** (icoon `magic-wand`) in de contextbalk van een foto met afbeelding:
  - Toont een voortgangsdialoog. Bij de eerste download staat er "Even het hulpmiddel ophalen…" met een balk in procent, daarna "Bezig…".
  - Het resultaat is een nieuwe PNG-asset met transparantie. Die wordt de nieuwe `assetId` van de foto, met `uitsnede: null` en `masker: 'rechthoek'`.
  - De oude asset blijft bestaan voor ongedaan maken. De gewone opruimregel voor assets geldt.
- Na succes toont de contextbalk van die foto de knop **Maak sticker** (zie §5), zolang de foto een uitknipsel is.
  - Nieuw veld `uitknipsel: boolean` op een foto, standaard `false`.
  - Een foto zonder het veld wordt bij inlezen `false`.
- **Fouten:**
  - Download mislukt of geen internet bij de eerste keer: "Dit lukt nu niet. Probeer opnieuw met internet."
  - Opslag vol: dezelfde melding als bij volle opslag.
  - Een ander probleem: "Dit lukt niet met deze foto."
- **Testbaarheid:**
  - De verwijderfunctie is injecteerbaar.
  - In `MODE === 'e2e'` gebruikt de app `window.__achtergrondWeg`, als die bestaat.
  - Die nep-functie maakt bijvoorbeeld de linkerhelft van de afbeelding transparant.

## 5. Mijn stickers

- Nieuwe Dexie-tabel `eigenStickers`:
  - Velden: `id`, `profielId` (of `null` zonder profielen), `aangemaakt`, `gebruikt`, `blob` (PNG).
  - Index op `profielId`.
- **Maak sticker:** bewaart het uitknipsel, eventueel bijgesneden tot de niet-transparante rand. Daarna verschijnt kort "Bewaard in Mijn stickers".
- **Stickerpaneel:**
  - Een eerste tab **Mijn stickers** (icoon `user-circle`).
  - Leeg: de tekst "Haal de achtergrond van een foto weg en tik op Maak sticker."
  - Tik op een sticker: die wordt toegevoegd als foto-element, met `uitknipsel: true`, `verhoudingVast: true`, zonder kader en met de blob als nieuwe asset.
  - Lang drukken of het `x`-knopje in de bewerkmodus wist de sticker. Eerst komt er een bevestiging.
- Maximaal 100 eigen stickers per profiel. Bij het maximum: "Je hebt al veel stickers. Wis er eerst een paar."
- **Opruimen:**
  - Dezelfde 60-dagenregel op basis van `gebruikt`.
  - Wordt een profiel gewist, dan worden ook zijn stickers gewist.
  - "Alles wissen" in het leerkrachtmenu wist ze ook.

## 6. Geluid en animatie

- Instellingen: `geluid: boolean` en `animatie: boolean`, beide standaard `true`.
- Het leerkrachtmenu krijgt twee schakelaars.
- **Geluiden:**
  - Gemaakt met de Web Audio API (oscillator plus envelope), zonder bestanden.
  - Plop bij toevoegen, zoef bij wissen, feestje (kort riedeltje) bij exporteren en plop bij een ontvangen inzending.
  - De AudioContext start pas bij de eerste aanraking, door de autoplay-regels van iOS.
- **Animatie:**
  - Bij toevoegen springt een element kort op (Konva-tween, schaal 0,8 → 1,05 → 1, 250 ms).
  - Bij exporteren valt er 1,5 s confetti met symboolvormen (ster, hart, cirkel).
  - De confetti is een overlay-canvas, niet in de export.
- Met `prefers-reduced-motion: reduce` is er nooit animatie, ongeacht de instelling.
- Een module `src/feedback/` met `speel(geluid)` en `vier()`, die de instellingen respecteert.

## 7. Klas ontvangen (leerkracht)

### Leerkrachttoestel

- Het leerkrachtmenu (na het invoeren van de code) krijgt de knop **Klas ontvangen**.
- **KlasOntvangScherm** vult het hele scherm:
  - De klascode staat groot: 4 symbolen uit 12, dezelfde set als bij delen.
  - Daaronder staat "Kinderen tikken Delen → Naar de leerkracht en kiezen deze symbolen."
  - Verder een teller "N collages ontvangen" en een lijst met namen die live aanvult.
  - Knoppen: **Naar de galerij** en **Stop**.
- **Verbinding:**
  - De PeerJS-id is `kidsklas-` + de code als letters a–l.
  - Is de id bezet, dan kiest de app een nieuwe code, net als bij delen (maximaal 5 pogingen).
  - De peer blijft open en aanvaardt meerdere verbindingen, ook tegelijk.
  - Per verbinding: een bericht `{ naam, pakket: ArrayBuffer }` met validatie. De app stuurt een bevestiging en sluit daarna die verbinding.
- **Server:**
  - Staat `cloudDelen` niet op `nooit` en is er een relay-adres? Dan opent de app ook een klasmap op de Worker (§9) en kijkt ze geregeld naar nieuwe inzendingen.
  - Dat gebeurt om de 5 s, en om de 10 s als er 10 minuten niets binnenkwam.
  - Elke inzending wordt opgehaald, bewaard en daarna door de server gewist.
  - Voor de leerkracht is geen aparte toestemming nodig: de leerkracht zelf zet de instelling.
- Netwerk weg: een zachte melding "Even geen verbinding. Ik blijf proberen." De peer verbindt opnieuw, en het opvragen bij de server gaat door.
- Een scherm-wakelock (`navigator.wakeLock`, als dat bestaat) zolang het scherm open staat.

### Kindtoestel

- Het deelvenster begint met de keuze **Naar een vriend** (de flow van fase 3) of **Naar de leerkracht**.
- **Naar de leerkracht:**
  1. Het kind kiest de klascode (4 symbolen).
  2. Het kind bevestigt of typt zijn naam. Die is vooringevuld met de profielnaam, maximaal 40 tekens en niet leeg.
  3. Het kind tikt op Stuur.
- **Verzenden:**
  - Eerst rechtstreeks naar `kidsklas-<code>`, met dezelfde time-outs als in fase 3: 10 s verbinden, 60 s overdracht.
  - Lukt dat niet, dan volgt dezelfde toestemmingsregel als bij delen (`nooit`, `kind`, `leerkracht`). Daarna gaat de collage via `PUT /class/:code/:id`.
- **Meldingen:**
  - Succes: "Verstuurd naar de leerkracht!"
  - Geen leerkracht met die code (rechtstreeks niet gevonden en server `404`): "Ik vind de leerkracht niet. Klopt de code?"
  - Map vol (`409`): "De leerkracht kan nu niets meer ontvangen."

## 8. Inzendingen, galerij en diavoorstelling

- Nieuwe Dexie-tabel `inzendingen`:
  - Velden: `id`, `naam`, `ontvangen` (tijdstip), `bestand` (`.collage`-blob), `voorbeeld` (PNG-blob uit het pakket).
  - Index op `ontvangen`.
- Bij het ontvangen wordt het pakket gevalideerd met `vanBestand`. Een ongeldig pakket wordt geweigerd en niet bewaard.
- Opruimen: automatisch gewist na 60 dagen. Op Chromebook geldt de regel niet; daar staat een waarschuwing in de galerij en op het ontvangscherm: "Inzendingen verdwijnen bij uitloggen. Download ze als ZIP of PDF."
- **Galerij** (alleen bereikbaar via het leerkrachtmenu):
  - Een raster met voorbeeld, naam en tijdstip, nieuwste eerst.
  - Per inzending: **Bekijk** (groot), **Open als kopie** (wordt een collage van de leerkracht of van het gekozen profiel) en **Wis**.
  - Bovenaan: **Diavoorstelling**, **Download ZIP**, **Download PDF** en **Alles wissen** (met bevestiging).
- **ZIP:**
  - Eén PNG per inzending, op 2× resolutie, gerenderd uit het `.collage`-bestand.
  - Naam: `<naam>.png`. Komt een naam meer dan eens voor, dan `<naam> 2.png`, enzovoort.
  - Tekens die niet in een bestandsnaam mogen, worden vervangen door `-`.
  - Het archief heet `klas-<jjjj-mm-dd>.zip`.
- **PDF:**
  - Eén A4-pagina per inzending, in de juiste oriëntatie, met de naam van het kind eronder.
  - Het bestand heet `klas-<jjjj-mm-dd>.pdf`.
  - Bij veel inzendingen: een voortgangsdialoog.
- **Diavoorstelling:**
  - Vult het hele scherm (Fullscreen API als die bestaat, anders een overlay).
  - Bladeren met de pijltjestoetsen, door te vegen of met de knoppen links en rechts.
  - Automatisch afspelen om de 5, 10 of 20 seconden (standaard 10), met de knop **Pauze/Speel**.
  - De naam van het kind tonen kan aan of uit (standaard aan).
  - Sluiten met Esc of de sluitknop.
- Rondleiding voor de leerkracht in de galerij: 4 stappen.

## 9. Worker: klasmap

Klascodes volgen `^[a-l]{4}$`. Een id volgt `^[0-9a-f]{16}$`. R2-sleutels: `class/<code>/map` en `class/<code>/<id>`.

| Verzoek | Gedrag |
|---|---|
| `POST /class/:code` | Is er geen levende map? Dan maakt de Worker er een: `{ token, geopend, verloopt: geopend + 2 u, aantal: 0 }`, met `201 { token }`. Is er wel een levende map: `409`. |
| `PUT /class/:code/:id` | Header `X-Naam`: URI-gecodeerd, gedecodeerd 1–40 tekens, anders `400`. Geen levende map: `404`. Bestaande id: `409`. Al 60 inzendingen: `409`. Te groot (header of body, 25 MB): `413`. Anders bewaart de Worker het pakket met de naam als metadata, verhoogt hij `aantal` en antwoordt `201`. |
| `GET /class/:code` | Vereist `X-Sleutel`. Fout of ontbrekend: `403`. Geen levende map: `404`. Anders `200 [{ id, naam }]`, en de vervaltijd schuift op naar nu + 2 u, maar nooit later dan `geopend` + 8 u. |
| `GET /class/:code/:id` | Vereist `X-Sleutel`, anders `403`. Bestaat het pakket niet: `404`. Anders `200` met het pakket (header `X-Naam`), waarna het pakket gewist wordt. |

- Is een map verlopen, dan telt alles van die code als afwezig en wordt het gewist zodra iemand het aanraakt.
- De token is 32 hex-tekens, gemaakt met `crypto.getRandomValues`.
- CORS staat ook de header `X-Naam` toe (in verzoeken en zichtbaar in antwoorden). Rate limit en origin-regel blijven zoals in fase 3.
- Bij het installeren is geen extra instelling nodig. `docs/delen-instellen.md` krijgt een korte uitleg over de klasmap.

## 10. Rondleiding

- De editorrondleiding krijgt stappen voor Camera, Achtergrond weg, Mijn stickers en Verhouding vast/los.
- De deelrondleiding krijgt een stap voor de keuze "Naar de leerkracht".
- Voor de galerij komt er een aparte rondleiding (zie §8).

## 11. Testen

- **Vitest (browser):**
  - `verhoudingVast` in de transformer: ankers en `keepRatio`.
  - Migratie van oude collages: `verhoudingVast` en `uitknipsel` ontbreken.
  - `eigenStickers`: toevoegen, maximum, opruimen en wissen met een profiel.
  - `inzendingen`: bewaren, 60-dagenregel, validatie en weigering.
  - ZIP-namen: dubbele namen en vreemde tekens.
  - Het aantal PDF-pagina's.
  - `speel` en `vier` doen niets als ze uit staan of bij reduced motion.
  - De klasontvanger met een nep-PeerFabriek: meerdere verbindingen en een ongeldig pakket.
  - De client voor de klasmap (`open`, `upload`, `lijst`, `haal`) met nep-fetch.
- **Worker** (Node, nep-R2): alle regels uit de tabel in §9, inclusief verlopen, verlengen tot maximaal 8 u, het maximum van 60, `X-Naam` en CORS.
- **Playwright** (Chromium tenzij anders vermeld):
  - Verhouding vast/los: de ankers wisselen en uitrekken lukt alleen bij los. Ook in WebKit.
  - Camera met `--use-fake-device-for-media-stream` en `--use-fake-ui-for-media-stream`.
  - Camera geweigerd: de melding met **Kies foto**.
  - Achtergrond weg met de nep-functie, dan Maak sticker, dan de sticker zichtbaar in Mijn stickers en toevoegen.
  - Leerkracht ontvangt van 2 kindtoestellen via de lokale PeerServer, daarna galerij, diavoorstelling, ZIP- en PDF-download.
  - Een klasinzending via de nep-relay, met de klasmap-semantiek in `e2e/helpers.ts`.
  - Geen leerkracht gevonden.
  - Geluid- en animatieschakelaars in het leerkrachtmenu.
- **Handmatig** (aanvulling op `docs/testen-op-toestellen.md`): camera en Achtergrond weg op een echte iPad, en klas ontvangen met 3 toestellen.

## 12. Buiten scope

- Inzendingen terugsturen naar kinderen.
- Commentaar of punten geven op inzendingen.
- Mijn stickers delen tussen profielen of toestellen.
