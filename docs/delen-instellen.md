# Delen via de server klaarzetten (Cloudflare)

Rechtstreeks delen werkt zonder eigen server (via de publieke PeerJS-server). De eigen relay is alleen nodig voor netwerken die WebRTC blokkeren.

1. Log in: `npx wrangler login`
2. Maak de opslag: `npx wrangler r2 bucket create collagemaker-relay`
3. Laat alles na 1 dag wissen: `npx wrangler r2 bucket lifecycle add collagemaker-relay verval-na-1-dag --expire-days 1`
   (of in het Cloudflare-dashboard: R2 → collagemaker-relay → Settings → Object lifecycle rules)
4. Zet in `worker/wrangler.toml` bij `TOEGESTANE_ORIGIN` het adres van de app (bijvoorbeeld `https://collagemaker.pages.dev`).
5. Zet de Worker online: `npm run relay:deploy`. Noteer het adres (bijvoorbeeld `https://collagemaker-relay.<jouw-naam>.workers.dev`).
6. Maak in de projectmap een bestand `.env.production` met `VITE_RELAY_URL=<dat adres>` en bouw de app opnieuw (`npm run build`).
7. Kies in het leerkrachtmenu de regel voor delen via de server (standaard: "Mij vragen").

De Worker logt geen inhoud. Een pakket kan één keer opgehaald worden, vervalt na 10 minuten en wordt na 24 uur in elk geval gewist.
