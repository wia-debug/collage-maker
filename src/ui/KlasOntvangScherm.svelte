<script lang="ts">
  import { onDestroy, onMount, untrack } from 'svelte';
  import Icon from './Icon.svelte';
  import { SYMBOOL_NAMEN } from '../storage/profielen';
  import type { Instellingen } from '../storage/instellingen';
  import { codeNaarSleutel, nieuweCode } from '../share/code';
  import { bewaakKlasOntvanger, klasRelay } from '../share/klas';
  import { DeelFout } from '../share/fouten';
  import { bewaarInzending } from '../storage/inzendingen';
  import { db } from '../storage/db';
  import { speel } from '../feedback/geluid';
  import { toon } from './toast';

  let { inst, onGalerij, onSluit }: { inst: Instellingen; onGalerij: () => void; onSluit: () => void } = $props();

  const MAX_POGINGEN = 5;
  let code = $state<string[]>([]);
  let namen = $state<string[]>([]);
  // Twee aparte vlaggen: de rechtstreekse peer en de klasmap op de server.
  let peerWeg = $state(false);
  let pollWeg = $state(false);
  const netwerk = $derived(peerWeg || pollWeg);
  let mislukt = $state(false);
  let stoppen = $state(false);
  const relay = klasRelay();
  const viaServer = relay.ingesteld && untrack(() => inst.cloudDelen) !== 'nooit';
  let ontvanger: { stop(): void } | null = null;
  let pollTimer: ReturnType<typeof setTimeout> | undefined;
  let lopend: Promise<void> | null = null;
  let laatsteNieuw = Date.now();
  let weg = false;
  let gestopt = false;
  let sleutel = '';
  let token: string | null = null;
  let gesloten = false;
  const gehaald = new Set<string>();
  let wake: { released?: boolean; release(): Promise<void> } | null = null;

  /** true als de collage bewaard is (dan krijgt het kind een bevestiging). */
  async function nieuw(naam: string, pakket: Blob): Promise<boolean> {
    try {
      await bewaarInzending(db, naam, pakket);
    } catch {
      toon('Een collage kon niet bewaard worden. Is het toestel vol?', 'warning');
      return false;
    }
    if (weg) return true;
    namen = [naam, ...namen];
    laatsteNieuw = Date.now();
    speel('plop');
    return true;
  }

  async function haalAlles(lijst: { id: string }[]) {
    for (const item of lijst) {
      if (gehaald.has(item.id)) continue;
      const r = await relay.haal(sleutel, item.id, token!);
      if (r) { gehaald.add(item.id); await nieuw(r.naam, r.pakket); }
    }
  }

  // Eén ronde: zonder token de map (opnieuw) proberen te openen, met token de lijst ophalen.
  async function tik() {
    if (!token) {
      const r = await relay.open(sleutel);
      if (gestopt) {
        if (r && r !== 'bezet') { token = r; if (weg && !gesloten) { gesloten = true; void relay.sluit(sleutel, r); } }
        return;
      }
      if (r && r !== 'bezet') { token = r; pollWeg = false; } else pollWeg = true;
      return;
    }
    const lijst = await relay.lijst(sleutel, token);
    if (gestopt) return;
    if (lijst === 'weg') { token = null; pollWeg = true; return; }
    if (!lijst) { pollWeg = true; return; }
    pollWeg = false;
    await haalAlles(lijst);
  }

  function plan() {
    if (gestopt) return;
    const wachtMs = Date.now() - laatsteNieuw > 10 * 60_000 ? 10_000 : 5000;
    pollTimer = setTimeout(() => {
      lopend = tik().catch(() => {}).finally(() => { lopend = null; plan(); });
    }, wachtMs);
  }

  async function begin() {
    for (let poging = 0; poging < MAX_POGINGEN && !weg; poging++) {
      const c = nieuweCode();
      const o = bewaakKlasOntvanger(c, { onInzending: nieuw, onVerbinding: (ok) => (peerWeg = !ok) });
      ontvanger = o;
      let peerOk = true;
      try { await o.klaar; } catch (e) {
        if (e instanceof DeelFout && e.code === 'code-bezet') { o.stop(); continue; }
        peerOk = false; // niet stoppen: na bewaak() blijft de ontvanger het opnieuw proberen
      }
      let t: string | null = null;
      if (viaServer) {
        const r = await relay.open(codeNaarSleutel(c));
        if (r === 'bezet') { o.stop(); continue; }
        t = r;
      }
      if (weg) { o.stop(); if (t) void relay.sluit(codeNaarSleutel(c), t); return; }
      // Lukt de peer of de map nog niet: toch de code tonen; de peer en de map worden opnieuw geprobeerd.
      code = c;
      sleutel = codeNaarSleutel(c);
      token = t;
      peerWeg = !peerOk;
      pollWeg = viaServer && !t;
      o.bewaak();
      if (viaServer) plan();
      return;
    }
    if (!weg) mislukt = true;
  }

  /** Stop netjes: alles wat nog op de server staat ophalen en bewaren, dan de map sluiten. */
  export async function stop(): Promise<void> {
    if (stoppen) return;
    stoppen = true;
    gestopt = true;
    ontvanger?.stop();
    clearTimeout(pollTimer);
    try {
      await lopend;
      if (token) {
        const lijst = await relay.lijst(sleutel, token);
        if (Array.isArray(lijst)) await haalAlles(lijst);
        gesloten = true;
        await relay.sluit(sleutel, token);
      }
    } catch { /* toch stoppen */ }
  }

  async function stopKnop() {
    if (stoppen) return;
    await stop();
    onSluit();
  }

  async function vraagWake() {
    try {
      const w = await (navigator as unknown as { wakeLock?: { request(t: 'screen'): Promise<{ released?: boolean; release(): Promise<void> }> } }).wakeLock?.request('screen');
      if (!w) return;
      if (weg) { void w.release().catch(() => {}); return; }
      wake = w;
    } catch { /* geen wake lock */ }
  }
  function zichtbaar() {
    if (document.visibilityState === 'visible' && (!wake || wake.released)) void vraagWake();
  }

  onMount(() => {
    void vraagWake();
    document.addEventListener('visibilitychange', zichtbaar);
    void begin();
  });
  onDestroy(() => {
    weg = true;
    gestopt = true;
    ontvanger?.stop();
    clearTimeout(pollTimer);
    document.removeEventListener('visibilitychange', zichtbaar);
    // Zonder Stop (bv. de app gaat dicht): de map toch proberen te sluiten.
    if (token && !gesloten) { gesloten = true; void relay.sluit(sleutel, token); }
    void wake?.release().catch(() => {});
  });
</script>

<div id="klas-scherm" class="scherm" role="dialog" aria-modal="true" aria-labelledby="klas-titel">
  <h1 id="klas-titel">Klas ontvangen</h1>
  {#if mislukt}
    <p class="fout" role="alert"><Icon name="warning" /> Ontvangen lukt niet op dit netwerk.</p>
  {:else if !code.length || stoppen}
    <p id="klas-wacht" role="status">Even geduld...</p>
  {:else}
    <div id="klas-code" class="code" aria-label="Klascode">
      {#each code as s}<span class="vak" data-symbool={s} aria-label={SYMBOOL_NAMEN[s] ?? s}><Icon name={s} size={96} /></span>{/each}
    </div>
    <p class="uitleg">Kinderen tikken <strong>Deel</strong>, dan <strong>Naar de leerkracht</strong>, en kiezen deze symbolen.</p>
    <p id="klas-teller" class="teller" role="status">{namen.length === 1 ? '1 collage ontvangen' : `${namen.length} collages ontvangen`}</p>
    <ul id="klas-namen">{#each namen as n, i (i)}<li><Icon name="student" /> {n}</li>{/each}</ul>
  {/if}
  {#if netwerk}<p id="klas-netwerk" class="zacht"><Icon name="wifi-slash" /> Even geen verbinding. Ik blijf proberen.</p>{/if}
  {#if inst.toestel === 'chromebook'}<p id="klas-chromebook" class="zacht"><Icon name="warning" /> Inzendingen verdwijnen bij uitloggen. Download ze als ZIP of PDF.</p>{/if}
  <div class="knoppen">
    <button id="klas-galerij" class="hoofd" disabled={stoppen} onclick={onGalerij}><Icon name="images" /> Naar de galerij</button>
    <button id="klas-stop" disabled={stoppen} onclick={stopKnop}><Icon name="x" /> Stop</button>
  </div>
</div>

<style>
  .scherm { position: fixed; inset: 0; z-index: 85; background: var(--creme); display: flex; flex-direction: column; align-items: center; gap: 18px; padding: 24px; overflow-y: auto; box-sizing: border-box; }
  h1 { margin: 0; }
  .code { display: flex; gap: 18px; }
  .vak { width: 140px; height: 140px; border-radius: 32px; background: var(--paneel); box-shadow: var(--schaduw); display: grid; place-items: center; }
  .uitleg { font-size: 1.3rem; text-align: center; margin: 0; }
  .teller { font-size: 1.6rem; font-weight: 800; margin: 0; }
  ul { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; max-width: 900px; }
  li { background: var(--paneel); border-radius: 16px; padding: 8px 14px; display: flex; align-items: center; gap: 6px; font-weight: 700; }
  .zacht { color: #6b6470; display: flex; align-items: center; gap: 8px; margin: 0; }
  .fout { color: #c0392b; font-weight: 700; display: flex; gap: 8px; align-items: center; }
  .knoppen { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
  .knoppen button { padding: 0 22px; background: var(--paneel); }
  .hoofd { background: var(--koraal) !important; color: #fff; }
  @media (max-width: 700px) { .vak { width: 72px; height: 72px; border-radius: 20px; } }
</style>
