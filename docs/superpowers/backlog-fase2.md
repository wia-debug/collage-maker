# Backlog na fase 2

Kleinere punten uit de reviews van fase 2. Niet blokkerend.

## Uit de eindreview

- Leerkrachtmenu: geen try/catch en geen "bezig"-toestand rond code controleren, pincode zetten, profiel wissen en alles wissen.
- Toesteltype wisselen verbergt collages van de andere groep (met/zonder profiel); toon een waarschuwing in het menu.
- Opruimvraag: na een verworpen (verouderd) resultaat wordt dat profiel deze sessie niet meer gevraagd.
- e2e "twee meldingen tegelijk" kan flaky zijn (meldingen verdwijnen na 4,5 s).
- Chromebook met falende IndexedDB: na "Bewaar als bestand" verschijnt toch "Je collage is niet bewaard".
- iPad: tekst "of als bestand" in die dialoog terwijl die optie op iPad verborgen is.
- Chromebook zonder mastercode: wie het leerkrachtmenu als eerste opent, kiest de code (bewuste keuze, R14).
- Op iPad kan een `.collage`-bestand nog niet geopend worden (komt met delen in fase 3).

## Uitgestelde punten per taak

- Task 1-2: minor (deferred): schrijfInstellingen read-modify-write outside transaction; 100k iterations below OWASP; extra unknown props kept; Dexie delete-blocked warning once
- Task 1-2: minor (deferred): optional fields (wordart, ballon, omlijning, vulling, rand…) unvalidated; enums not checked
- Task 3-4: minor (deferred): vulAssets Promise.all partial fill; no zip size bound; empty MIME on blobs from zip
- Task 5-6: minor (deferred): wisProfiel reads ids outside transaction; maakProfiel doesn't validate pin length; editor.load() would be treated as change (caller must restart autosave)
- Task 7: minor (deferred, consider must-fix): opstart rejection → permanent blank screen; EersteStart klaar() no try/catch
- Task 7: minor (deferred): CijferCode swallows Ctrl/Meta digits + repeat; e2e doesn't verify stored toestel/hash; seed duplicated in tour.spec
- Task 8: minor (deferred): NieuwProfiel/ProfielKiezer no try/catch around maakProfiel/controleerPin; avatar grid fixed width + no aria-pressed; SymboolCode imports storage module for names
- Task 9: minor (deferred, consider must-fix): boot list/profile load failure → blank screen (with Task 7 item); Terug double tap runs afsluiten twice
- Task 9: minor (deferred): no test for hidden/pagehide flush or storage-full message; opslag isolation test can pass early; wis() no try/catch; pencil icon clipped on long names
- Task 10: minor (deferred): no reminder/newer-version e2e; .collage preview blurry (0.5 scale); 3-column export buttons cramped on narrow screens
- Task 11: minor (deferred): no test for "Niet wissen" cancel, tour on first open, tour keys gone after alles wissen; menu no Escape/focus trap
- Task 12: minor (deferred): teVragen await without try/catch; profile switch during await race; dialog may stack over chooser/menu; no Chromebook/profile-scope e2e
- Task 13: minor (deferred): doc should say dev:lan only on trusted network; self-signed cert likely blocks service worker registration (offline/PWA test needs real https host)

## Uit de review van de aanpassingen na fase 2

- Automatisch bewaren schrijft ook tussenstanden van een schuifje weg (onschuldig, wel extra schrijfwerk).
- Voorbeeld van helderheid/contrast herberekent het filter bij elke beweging; overweeg `requestAnimationFrame`-throttling op iPad.
- Foto zonder geladen afbeelding: vrije hoeken geven ongelijke schaal (uitrekken).
- Tijdens het slepen van een foto-hoek rekt de foto zichtbaar uit; pas bij loslaten wordt hij juist bijgesneden.
- Een gewijzigde leerkrachtcode op Chromebook blijft niet bewaard (alles wordt gewist bij uitloggen).
