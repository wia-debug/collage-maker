# Backlog — phase 3 (sharing)

Deferred minors from reviews. None block use.

## Relay / Worker
- Receiver without an open mailbox (open returned null, or setting "Nooit"): an eavesdropper who hears the code could open the mailbox and receive a blocked sender's collage. Option: retry `open` on null.
- R2 has no compare-and-set: two simultaneous PUTs (or POSTs) for one code can both succeed. Negligible chance (unique PeerJS codes, 20,736 codes).
- No fetch timeout on `relay.open` / `download`: a hanging relay leaves "Even geduld..." until the browser's own timeout.
- Rate-limit headroom: every receiver polls while a mailbox exists, also when direct works (~20 req/min). 30 receivers behind one school IP reach 600/min. Option: start polling later, or raise the limit.
- One IP can keep many codes open (denial of service only).
- A mailbox left behind (after direct success or closing the dialog) can't be closed; it expires after 10 minutes.
- R2 exceptions escape `verwerk` (500 without CORS headers); missing tests for a lying Content-Length and CORS on errors.

## Client
- `nieuweCode` has a small modulo bias.
- PeerJS: unknown pre-open error types leave `klaar` pending; receiver connections not closed after ack; `peerOpties` / `deelTimeout` untested.
- `deel()` throws a plain Error for a malformed code (UI shows a generic message); test gaps for te-groot and the no-question path.
- No `onFout` after the receiver is open; closing the share dialog during "bezig" doesn't cancel a direct transfer.

## Tests
- Sharing e2e runs on Chromium only (WebKit WebRTC between contexts is unreliable on Windows).
- `delen-instelling` e2e runs only on the chromebook project.
- Missing e2e: the "Nee" consent path, "Nooit" doesn't poll, and expiry.
