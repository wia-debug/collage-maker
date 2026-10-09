# Backlog na fase 1

Kleinere punten uit de reviews van fase 1. Niet blokkerend; oppakken in fase 2 of bij een polijstronde.

## Uit de eindreview (nog open)

- Exportfoto: de cache-lus in `CanvasController.exportPng` staat vóór de `try`. Als `cache()` faalt, blijft de selectielaag verborgen.
- Geen melding als een foto verkleind wordt; geen "Even geduld" bij het importeren van grote foto's.
- De interface bevriest even bij exporteren voordat "Even geduld..." verschijnt (`await tick()` + `requestAnimationFrame` toevoegen).
- Zet `build.target` expliciet op `['safari16', 'ios16', 'chrome110']`.
- Knijpen werkt op het geselecteerde element, niet op het element onder de vingers.
- Ongedaan-stappen zonder wijziging (zelfde kleur opnieuw kiezen, ongewijzigde tekst): sla `commit` over in de store.
- Transformer-hoekjes (28 px) zijn klein voor 6-jarigen.
- Op iOS werkt `beforeunload` niet: herladen of sluiten verliest de collage nog steeds. Wordt opgelost met de opslag in fase 2.

## Uitgestelde punten per taak

- Task 1: minor (deferred): *.svelte shim erases prop typing (src/vite-env.d.ts)
- Task 1: minor (deferred): @types/node global in src via tsconfig include
- Task 2: minor (deferred): dieren/piggy-bank (money icon) and dieren/egg-crack (near-dup of egg) substitutions weak for animal pack
- Task 2: minor (deferred): postinstall copy script fails under npm install --omit=dev
- Task 4: minor (deferred): update/remove with unknown id push empty undo step (store.ts)
- Task 4: minor (deferred): patch can change id/type; History.present publicly mutable; test gaps (redo via store, gewijzigd >=)
- Task 5: minor (deferred): no in-flight dedup per sticker key; invisible vorm when vulling+rand null; placeholder indistinguishable from pending
- Task 5: minor (deferred): `<svg` substring check weak + untested; loadImage failure not evicted; preload swallows errors silently
- Task 6: minor (deferred): canvas tests use synthetic events only; no tests for click/tap select, empty-click deselect, onVakTik, contextmenu; resize test fixed 50ms wait
- Task 7: minor (deferred): touchcancel commits like touchend; pinch pivots around group origin (center via offset, OK); guides recreated per dragmove; snap test title misleading; RED for pure fns not observed
- Task 7: minor (deferred): knijp can stay set with 3+ touches lifting off-stage → later dragend skipped
- Task 8: minor (deferred, likely must-fix before merge): global shortcuts active while modal dialogs open; dialogs lack initial focus/Escape
- Task 8: minor (deferred, likely must-fix): context-balk overflow-x not swipeable inside touch-action:none canvas cell (iPad portrait)
- Task 8: minor (deferred): async onMount leaks controller if user leaves during preload; shortcut guard omits select
- Task 9: minor (deferred): StickerPaneel ensureSticker without error handling (unhandled rejection); tablist without tabpanel; commit trailer Sonnet vs Opus inconsistent
- Task 10: minor (deferred): empty MIME type HEIC rejected; html src regex double-quote only; fetch no timeout; page-link drag says geblokkeerd; drop onto empty slot doesn't fill slot; tiny images not enlarged
- Task 10: minor (deferred): window drop handler cancels native text drag into text input and toasts "geen foto" on text-only drag
- Task 11: minor (deferred): listening-false test only covers sterren; no test empty slot+mask renders no frame; RED not recorded
- Task 11: minor (deferred, UX): on non-rect masks polaroid/film/sterren/etc render as same plain outline; masked frames don't extend clientRect
- Task 12: minor (deferred): previews ignore uitsnede and non-reactive assets.image; pixeleer/blur not premultiplied; filter test gaps (clamp, combo)
- Task 13: minor (deferred, group with Task 8 modal items): paste/drop active behind crop dialog; no Escape/focus trap; stage not resized on rotation; min size in screen px; anchors 30px; thin crop tests
- Task 14: minor (deferred): closed TekstInvoer still in tab order (use inert); bar stays open when tapping elsewhere; unchanged text confirm adds no-op undo step; manual width lost on restyle; fonts.check test weak
- Task 15: minor (deferred, UX): Kleur/Rand/Ballon/etc. controls active but ignored while WordArt on; preview cached even if font not loaded; frame pad may clip neon/3D selection box; outlines absolute px
- Task 16: minor (deferred): eraser sweep = one undo step per erased stroke; panels receive non-matching el type (tekening) when other panel open — verify tolerance in final review; e2e flaky page-load timeouts on ipad at default workers
- Task 17: minor (deferred): determinism test vacuous (cache hit); thumbnails re-encoded toDataURL on change; no actief state on gradient/pattern tiles; re-click pushes no-op undo; tablist roles incomplete; no photo-background test
- Task 18: minor (deferred): bounds test checks centres only; voorbeeld.ts no try/finally around stage; TemplateKiezer no cancel/error handling; seizoen labels and strip stickers cover slot centres
- Task 19: minor (deferred): no emoji/non-empty test for challenge text; banner ~68px tall in portrait; "Toon je favoriete sport" → "Laat je favoriete sport zien"
- Task 20: minor (deferred): bewaar() no try/catch or re-entrancy guard (double tap → extra download); dialogs no Escape/focus trap; PDF orientation untested; share path untested
- Task 21: minor (deferred): no UI signal that an update waits; comment says "ipad-project"
- Task 22: minor (deferred): only Escape exit path tested; help during active tour creates 2nd driver; 300ms auto-start timeout not cleared
