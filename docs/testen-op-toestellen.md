# Testen op een echte iPad, Chromebook of PC

1. Start op de pc: `npm run dev:lan`. De terminal toont een adres zoals `https://192.168.1.20:5173`. Gebruik dit alleen op een netwerk dat je vertrouwt.
2. Open dat adres op het toestel. De browser waarschuwt voor het certificaat: kies "Toch doorgaan" (op iPad: "Toon details" → "Bezoek deze website").
3. Eerste start: kies een code van 6 cijfers en het toesteltype.

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

## Chromebooks in de klas

Op Chromebooks wordt alle sitedata bij elke aanmelding gewist, dus de eerste-startvragen zouden elke sessie terugkomen. Gebruik daarom de link `https://<adres>/?toestel=chromebook` als bladwijzer of als startpagina, via het beheer van de school (Google Admin: startpagina of vastgezette bladwijzer). Die link stelt het toesteltype in en gaat meteen naar het beginscherm. Een mastercode is dan niet nodig; het leerkrachtmenu vraagt de eerste keer in een sessie om een code te kiezen.

## Code vergeten

Wis de sitegegevens van de app in de browser (Safari: Instellingen → Safari → Geavanceerd → Websitedata; Chrome: slotje in de adresbalk → Sitegegevens). Alle collages op dat toestel zijn dan weg.
