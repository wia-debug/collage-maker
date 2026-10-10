<script lang="ts">
  import { onDestroy, onMount, untrack } from 'svelte';
  import Icon from './Icon.svelte';
  import { SYMBOOL_NAMEN } from '../storage/profielen';
  import type { Instellingen } from '../storage/instellingen';
  import { codeNaarSleutel, nieuweCode } from '../share/code';
  import { klasRelay, startKlasOntvanger } from '../share/klas';
  import { DeelFout } from '../share/fouten';
  import { bewaarInzending } from '../storage/inzendingen';
  import { db } from '../storage/db';
  import { speel } from '../feedback/geluid';

  let { inst, onGalerij, onSluit }: { inst: Instellingen; onGalerij: () => void; onSluit: () => void } = $props();

  const MAX_POGINGEN = 5;
  let code = $state<string[]>([]);
  let namen = $state<string[]>([]);
  let netwerk = $state(false);
  let mislukt = $state(false);
  const relay = klasRelay();
  const viaServer = relay.ingesteld && untrack(() => inst.cloudDelen) !== 'nooit';
  let ontvanger: { stop(): void } | null = null;
  let pollTimer: ReturnType<typeof setTimeout> | undefined;
  let herstartTimer: ReturnType<typeof setTimeout> | undefined;
  let laatsteNieuw = Date.now();
  let weg = false;
  const gehaald = new Set<string>();
  let wake: { release(): Promise<void> } | null = null;

  async function nieuw(naam: string, pakket: Blob) {
    try {
      await bewaarInzending(db, naam, pakket);
    } catch { return; /* ongeldig of niet te bewaren: overslaan */ }
    if (weg) return;
    namen = [naam, ...namen];
    laatsteNieuw = Date.now();
    speel('plop');
  }

  function startPeer(c: string[]) {
    const o = startKlasOntvanger(c, {
      onInzending: (naam, pakket) => void nieuw(naam, pakket),
      onFout: (f) => {
        netwerk = true;
        if (f.code === 'geen-verbinding' && !weg) {
          ontvanger?.stop();
          herstartTimer = setTimeout(() => { if (!weg) { const n = startPeer(c); n.klaar.then(() => (netwerk = false), () => {}); } }, 3000);
        }
      },
    });
    ontvanger = o;
    return o;
  }

  function startPolling(sleutel: string, token: string) {
    const volgende = () => {
      const wachtMs = Date.now() - laatsteNieuw > 10 * 60_000 ? 10_000 : 5000;
      pollTimer = setTimeout(async () => {
        const lijst = await relay.lijst(sleutel, token);
        if (weg) return;
        if (!lijst) netwerk = true;
        else {
          netwerk = false;
          for (const item of lijst) {
            if (gehaald.has(item.id)) continue;
            const r = await relay.haal(sleutel, item.id, token);
            if (weg) return;
            if (r) { gehaald.add(item.id); await nieuw(r.naam, r.pakket); }
          }
        }
        if (!weg) volgende();
      }, wachtMs);
    };
    volgende();
  }

  async function begin() {
    for (let poging = 0; poging < MAX_POGINGEN && !weg; poging++) {
      const c = nieuweCode();
      const o = startPeer(c);
      let peerOk = true;
      try { await o.klaar; } catch (e) {
        o.stop();
        if (e instanceof DeelFout && e.code === 'code-bezet') continue;
        peerOk = false;
      }
      let token: string | null = null;
      if (viaServer) {
        const r = await relay.open(codeNaarSleutel(c));
        if (r === 'bezet') { o.stop(); continue; }
        token = r;
      }
      if (weg) { o.stop(); return; }
      if (!peerOk && !token) { mislukt = true; return; }
      code = c;
      if (!peerOk) netwerk = true;
      if (token) startPolling(codeNaarSleutel(c), token);
      return;
    }
    if (!weg) mislukt = true;
  }

  onMount(async () => {
    try { wake = await (navigator as unknown as { wakeLock?: { request(t: 'screen'): Promise<{ release(): Promise<void> }> } }).wakeLock?.request('screen') ?? null; } catch { wake = null; }
    void begin();
  });
  onDestroy(() => {
    weg = true;
    ontvanger?.stop();
    clearTimeout(pollTimer);
    clearTimeout(herstartTimer);
    void wake?.release().catch(() => {});
  });
</script>

<div id="klas-scherm" class="scherm" role="dialog" aria-modal="true" aria-labelledby="klas-titel">
  <h1 id="klas-titel">Klas ontvangen</h1>
  {#if mislukt}
    <p class="fout" role="alert"><Icon name="warning" /> Ontvangen lukt niet op dit netwerk.</p>
  {:else if !code.length}
    <p role="status">Even geduld...</p>
  {:else}
    <div id="klas-code" class="code" aria-label="Klascode">
      {#each code as s}<span class="vak" data-symbool={s} aria-label={SYMBOOL_NAMEN[s] ?? s}><Icon name={s} size={96} /></span>{/each}
    </div>
    <p class="uitleg">Kinderen tikken <strong>Delen</strong>, dan <strong>Naar de leerkracht</strong>, en kiezen deze symbolen.</p>
    <p id="klas-teller" class="teller" role="status">{namen.length === 1 ? '1 collage ontvangen' : `${namen.length} collages ontvangen`}</p>
    <ul id="klas-namen">{#each namen as n, i (i)}<li><Icon name="student" /> {n}</li>{/each}</ul>
  {/if}
  {#if netwerk}<p id="klas-netwerk" class="zacht"><Icon name="wifi-slash" /> Even geen verbinding. Ik blijf proberen.</p>{/if}
  {#if inst.toestel === 'chromebook'}<p id="klas-chromebook" class="zacht"><Icon name="warning" /> Inzendingen verdwijnen bij uitloggen. Download ze als ZIP of PDF.</p>{/if}
  <div class="knoppen">
    <button id="klas-galerij" class="hoofd" onclick={onGalerij}><Icon name="images" /> Naar de galerij</button>
    <button id="klas-stop" onclick={onSluit}><Icon name="x" /> Stop</button>
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
