# Testen op een echte iPad, Chromebook of PC

1. Start op de pc: `npm run dev:lan`. De terminal toont een adres zoals `https://192.168.1.20:5173`. Gebruik dit alleen op een netwerk dat je vertrouwt.
2. Open dat adres op het toestel. De browser waarschuwt voor het certificaat: kies "Toch doorgaan" (op iPad: "Toon details" → "Bezoek deze website").
3. Eerste start: er is geen instelscherm. De app start als gedeelde iPad (met profielen) en de leerkrachtcode is `000000`. Wijzig die meteen in het leerkrachtmenu ("Code wijzigen"); tot dan toont het menu een waarschuwing. Het toesteltype wijzig je ook daar.

`dev:lan` is geschikt voor opslag, profielen en bestanden. Voor de controles over offline gebruik, "Zet op beginscherm" en "App installeren" werkt het niet: de dev-server heeft geen service worker en een zelfgetekend certificaat blokkeert service workers. Test die onderdelen met een build die over vertrouwd https wordt geserveerd:
- een Cloudflare Pages preview, of
- `npm run build` en daarna `npx vite preview --host`, achter een certificaat dat het toestel vertrouwt (bijvoorbeeld gemaakt met mkcert, waarvan de root-CA op het toestel is geïnstalleerd en vertrouwd).

## Controlelijst fase 2

iPad (Safari):
- Profiel aanmaken, collage maken, app helemaal sluiten (veeg weg), opnieuw openen: collage staat bij "Mijn collages".
- Twee profielen: ze zien elkaars collages niet. Verkeerde code: melding, geen toegang.
- Leerkrachtmenu: code van een ander profiel resetten; profiel wissen.
- Voeg de app toe aan het beginscherm, zet vliegtuigmodus aan, open de app: profielen en collages zijn er (vertrouwd https nodig, zie boven).
- Laat de app een uur op de achtergrond, kom terug, wijzig iets en tik Terug: alles is bewaard.
- "Bewaar" → "Om verder te werken": bewaar in Bestanden. (Openen van een bestand gebeurt op iPad niet in fase 2.)

Chromebook (Chrome):
- Collage maken, "Bewaar" → "Om verder te werken": er wordt een `.collage`-bestand gedownload.
- Terug zonder bewaren: de Stoppen-vraag verschijnt. Herladen: de browser vraagt bevestiging.
- Uitloggen en opnieuw inloggen, "Open bestand": de collage komt terug.
- Wacht 10 minuten met een niet-bewaarde wijziging: de herinnering verschijnt.

PC:
- Collage maken, browser sluiten, opnieuw openen: collage staat bij "Mijn collages".
- Leerkrachtmenu: profielen aanzetten, profiel aanmaken.
- Installeer de app ("App installeren" in de adresbalk) en controleer dat hij offline opent (vertrouwd https nodig, zie boven).

## Delen

Test delen met twee toestellen die op hetzelfde netwerk zitten (bijvoorbeeld iPad en PC, of iPad en Chromebook):
- Open de app op beide toestellen. Tik op het ene toestel op "Ontvang". Er verschijnt een code.
- Maak op het andere toestel een collage, tik op "Deel" en voer de code in. Op hetzelfde netwerk gaat de collage rechtstreeks, zonder extra vraag.
- Het ontvangen toestel toont de collage. Op de iPad kun je hem daarna openen met "Openen".

Test ook een netwerk dat WebRTC blokkeert, bijvoorbeeld een gast-wifi met een strikte firewall. Rechtstreeks delen lukt daar niet, dus de collage gaat via de eigen server (de relay). Dat werkt alleen als de relay is ingesteld, zie [Delen via de server klaarzetten](delen-instellen.md). Wat je dan ziet, hangt af van de regel in het leerkrachtmenu:
- "Mij vragen" (standaard): de leerkracht typt de leerkrachtcode in; er is geen knop "Ja".
- "Kind vragen": het kind tikt op "Ja".

Controleer dan dat de app een code toont en dat het ontvangen toestel de collage krijgt.

## Camera en achtergrond weg

De automatische tests kunnen dit niet op een iPad (WebKit op Windows) controleren. Test het dus met de hand:
- Eigen stickers en de galerij bewaren een Blob in IndexedDB. Controleer op de iPad dat "Mijn stickers" en de galerij na het sluiten en heropenen van de app nog gevuld zijn.
- Camera, iPad: tik op "Camera" in het fotopaneel. Safari vraagt toestemming; kies "Sta toe" en maak een foto, die komt op de collage. Weiger de toestemming ook eens: de app toont een duidelijke melding en blijft werken.
- Achtergrond weg, eerste keer: zet internet aan, kies een foto en tik op "Achtergrond weg". Het model (ongeveer 40 MB) wordt eenmalig van de eigen site gehaald; dat duurt even. Daarna blijft het bewaard op het toestel.
- Achtergrond weg, daarna: zet vliegtuigmodus aan en doe het nog eens. Het moet ook zonder internet werken.
- Tik op "Maak sticker": de uitgeknipte foto staat daarna bij "Mijn stickers" (en blijft er na herstarten).
- Stickerpaneel, "Mijn stickers": wis een eigen sticker en controleer dat hij weg is.

## Klas ontvangen

Ook dit kan niet automatisch op een iPad worden getest (WebRTC tussen twee toestellen). Test met drie toestellen, bijvoorbeeld een PC als leerkracht en twee iPads als kinderen:
- Leerkrachtmenu → "Klas ontvangen". Er verschijnt een code. Toon die op het digibord (grote cijfers/symbolen).
- Kind: "Delen" → "Naar de leerkracht" → klascode → naam → "Stuur". Controleer dat de collage met de naam bij de leerkracht aankomt, van beide kinderen.
- Test één toestel op een geblokkeerd netwerk (bijvoorbeeld gast-wifi met een strikte firewall). Dan gaat de collage via de server. Dat werkt alleen als de Worker met de klasmap opnieuw is gedeployed (`npm run relay:deploy`, zie [Delen via de server klaarzetten](delen-instellen.md)). Het kind volgt dezelfde regel als bij gewoon delen (nooit / kind vraagt / leerkracht).
- Galerij: bekijk de collages groot, open er een als kopie, download de ZIP en de PDF (namen staan erbij) en start de diavoorstelling.
- Diavoorstelling: druk op Esc in echt volledig scherm; de show moet stoppen en het scherm weer normaal worden.
- Chromebook: ontvangen collages worden niet 60 dagen bewaard, want de sitedata wordt bij elke aanmelding gewist. Download de ZIP of PDF dus voor je uitlogt. De app toont hierover een waarschuwing.

## Geluid en beweging

- Geluid: op een iPad klinkt een geluid pas na de eerste aanraking. Tik een keer en controleer dat er geluid is.
- Zet geluid en animaties uit in het leerkrachtmenu en controleer dat het stil en rustig blijft.
- iPad met "Beweging beperken" aan (Instellingen → Toegankelijkheid → Beweging): de app toont geen animaties.

## Chromebooks in de klas

Op Chromebooks wordt alle sitedata bij elke aanmelding gewist, dus de instellingen zouden elke sessie terugvallen op de standaard (gedeelde iPad, code `000000`). Gebruik daarom de link `https://<adres>/?toestel=chromebook` als bladwijzer of als startpagina, via het beheer van de school (Google Admin: startpagina of vastgezette bladwijzer). Die link stelt het toesteltype in en gaat meteen naar het beginscherm. Omdat de sitedata telkens gewist wordt, is de leerkrachtcode op een Chromebook altijd `000000`; een gewijzigde code blijft daar niet bewaard.

## Code vergeten

Wis de sitegegevens van de app in de browser (Safari: Instellingen → Safari → Geavanceerd → Websitedata; Chrome: slotje in de adresbalk → Sitegegevens). Alle collages op dat toestel zijn dan weg.
