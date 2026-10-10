# Backlog — phase 4 (teacher mode and extras)

Open points from the reviews. Items 1 and 2 matter most: they can lose or confuse a child's submission at the moment the teacher taps Stop.

## Class receive (most important first)
1. Stop can delete server submissions it did not fetch: if the final `lijst` fails (not 404) or one `haal` fails, or a child's upload lands between the final list and the DELETE, `sluit` still wipes them. Fix: only close the folder when the final pass fully succeeded; otherwise let it expire.
2. A direct send that is still being stored when the teacher taps Stop: the peer is destroyed, the child falls back to the server (consent question, upload) and may see "Ik vind de leerkracht niet" although the teacher stored it. Fix: wait for in-flight saves before destroying the peer.
3. Stop can hang on "Even geduld..." on a stalled network: no fetch timeout/AbortSignal in `open`/`lijst`/`haal`.
4. A corrupt pack now shows the toast "Een collage kon niet bewaard worden. Is het toestel vol?" and the child gets "niet-bewaard"; give corrupt packs their own message.
5. Closing the tab does not close the server folder (no `pagehide` with the keepalive `sluit`); it expires after at most 2 h.
6. After 8 h the screen opens a new folder with the same code; if another device took that code, the network notice stays up.
7. No automated test for Stop's final fetch pass; no tests for fullscreen Esc, camera generation counter, wake lock, slideshow cache.
8. Backoff counter can bump twice for one dead peer; `webrtc` before open leaves `klaar` pending.
9. Wake lock: not tested on devices.

## Worker
- Token compare is not constant-time (as in phase 3); control characters allowed in names (client renders as text).
- Regression tests worth adding: expire + reopen gives an empty list; item GET without token 403; 413 on real body size.

## Editor extras
- Sound/animation: no automated check that sounds and confetti fire; overlapping confetti loops; springOp has no guard for removal or drag during the tween.
- Camera: stream keeps running during the preview.
- Background removal: progress bar can jump back per downloaded file; any `TypeError` maps to the "internet" message; ~48 MB unused onnxruntime wasm files are copied.
- My stickers: race in reloading the list; no toast when adding/deleting fails; edit mode stays on after the last delete; no double-tap guard on "Maak sticker"; colour palette shown on the My stickers tab; identical aria-labels.

## Gallery and export
- PDF names use Helvetica: names outside Latin-1 (Turkish, Polish, Arabic script) print wrongly.
- Swipe over the slideshow buttons also changes the slide; the large view has no Esc; galerij tour shared key untested.
- DeelDialoog has no "back" from the class code/name step to the first choice.

## Tests and environment
- On the ipad project (Playwright WebKit on Windows) own stickers, gallery and two-device sharing are skipped; covered by `docs/testen-op-toestellen.md`.
- Commit-trailer and minor typing casts (`as unknown as`) in validatie.ts and bestand.test.ts.
