# Testen op een echte iPad, Chromebook of PC

1. Start op de pc: `npm run dev:lan`. De terminal toont een adres zoals `https://192.168.1.20:5173`.
2. Open dat adres op het toestel. De browser waarschuwt voor het certificaat: kies "Toch doorgaan" (op iPad: "Toon details" → "Bezoek deze website").
3. Eerste start: kies een code van 6 cijfers en het toesteltype.

## Controlelijst fase 2

iPad (Safari):
- Profiel aanmaken, collage maken, app helemaal sluiten (veeg weg), opnieuw openen: collage staat bij "Mijn collages".
- Twee profielen: ze zien elkaars collages niet. Verkeerde code: melding, geen toegang.
- Leerkrachtmenu: code van een ander profiel resetten; profiel wissen.
- Voeg de app toe aan het beginscherm, zet vliegtuigmodus aan, open de app: profielen en collages zijn er.
- "Bewaar" → "Om verder te werken": bewaar in Bestanden. (Openen van een bestand gebeurt op iPad niet in fase 2.)

Chromebook (Chrome):
- Collage maken, "Bewaar" → "Om verder te werken": er wordt een `.collage`-bestand gedownload.
- Terug zonder bewaren: de Stoppen-vraag verschijnt. Herladen: de browser vraagt bevestiging.
- Uitloggen en opnieuw inloggen, "Open bestand": de collage komt terug.
- Wacht 10 minuten met een niet-bewaarde wijziging: de herinnering verschijnt.

PC:
- Collage maken, browser sluiten, opnieuw openen: collage staat bij "Mijn collages".
- Leerkrachtmenu: profielen aanzetten, profiel aanmaken.
- Installeer de app ("App installeren" in de adresbalk) en controleer dat hij offline opent.

## Code vergeten

Wis de sitegegevens van de app in de browser (Safari: Instellingen → Safari → Geavanceerd → Websitedata; Chrome: slotje in de adresbalk → Sitegegevens). Alle collages op dat toestel zijn dan weg.
