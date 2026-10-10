# Delen via de server klaarzetten (Cloudflare)

Rechtstreeks delen werkt zonder eigen server (via de publieke PeerJS-server). De eigen relay is alleen nodig voor netwerken die WebRTC blokkeren.

De publieke PeerJS-server ziet de IP-adressen van de toestellen en de deelcodes. De collage zelf gaat versleuteld rechtstreeks van toestel naar toestel en komt niet langs die server.

1. Log in: `npx wrangler login`
2. Maak de opslag: `npx wrangler r2 bucket create collagemaker-relay`
3. Laat alles na 1 dag wissen: `npx wrangler r2 bucket lifecycle add collagemaker-relay verval-na-1-dag --expire-days 1`
   (of in het Cloudflare-dashboard: R2 → collagemaker-relay → Settings → Object lifecycle rules)
4. Zet in `worker/wrangler.toml` bij `TOEGESTANE_ORIGIN` het adres van de app, precies zoals in de adresbalk en zonder `/` op het einde (bijvoorbeeld `https://collagemaker.pages.dev`).
5. Zet de Worker online: `npm run relay:deploy`. Noteer het adres (bijvoorbeeld `https://collagemaker-relay.<jouw-naam>.workers.dev`).
6. Maak in de projectmap een bestand `.env.production` met `VITE_RELAY_URL=<dat adres>` en bouw de app opnieuw (`npm run build`).
   Bouwt Cloudflare Pages de app voor je? Zet `VITE_RELAY_URL` dan bij de instellingen van het Pages-project (Settings → Environment variables) in plaats van in `.env.production`, en bouw opnieuw.
7. Kies in het leerkrachtmenu de regel voor delen via de server (standaard: "Mij vragen").
   Op Chromebooks wordt de leerkrachtcode bij elke aanmelding teruggezet op `000000`. Kies daar dus "Nooit" of "Kind vragen".

De Worker logt geen inhoud. Een pakket kan één keer opgehaald worden, vervalt na 10 minuten en wordt na 24 uur in elk geval gewist.

De Worker beperkt het aantal verzoeken per IP-adres (600 per minuut, in `worker/wrangler.toml`). Een hele school deelt vaak één publiek IP-adres; komen er toch te veel verzoeken, verhoog dan die limiet.

## Hoe werkt het?

Het ontvangende toestel opent op de server een brievenbus voor zijn code en krijgt daarbij een geheime sleutel. Een zender kan alleen iets in een open, lege brievenbus leggen. Alleen het toestel met de sleutel kan de collage ophalen; daarna is alles weg.

## Klas ontvangen

De klasmap voor de leerkracht gebruikt dezelfde Worker en bucket; er is geen extra instelling nodig. De klasmap leeft 2 uur, verlengd zolang de leerkracht ontvangt (hooguit 8 uur na het openen), en bevat maximaal 60 collages. Alleen het leerkrachttoestel met de geheime sleutel kan ze ophalen; na het ophalen worden ze van de server gewist. De R2-regel wist alles na 1 dag. Om de nieuwe routes te krijgen moet je de Worker opnieuw deployen met `npm run relay:deploy` (stap voor jou als gebruiker).

## Wat kan er misgaan?

De codes zijn kort. Wie binnen de 10 minuten een code raadt, kan een ongewenste collage sturen. Het kind ziet die eerst en kan hem weggooien. Een collage ophalen kan alleen het toestel dat de brievenbus voor die code heeft geopend. Uitzondering: als de ontvanger geen brievenbus kon openen (server druk, of instelling "Nooit"), zou iemand die de code afluistert er zelf een kunnen openen. Zeg codes daarom niet luidop door de klas.

Hetzelfde geldt voor de klasmap. Als het leerkrachttoestel geen klasmap open heeft (instelling "Nooit", of geen verbinding met de server), kan iemand die de code op het bord ziet er zelf een openen. Kinderen op een geblokkeerd netwerk sturen hun collage dan misschien naar die map in plaats van naar de leerkracht. Laat het klasscherm daarom open staan zolang de kinderen sturen, en laat de instelling aan. Tik op Stop als je klaar bent: dan wordt de klasmap gesloten.
