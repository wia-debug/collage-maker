<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import Icon from './Icon.svelte';
  import { SYMBOOL_NAMEN } from '../storage/profielen';
  import type { Instellingen } from '../storage/instellingen';
  import { codeNaarSleutel, nieuweCode, peerId } from '../share/code';
  import { deelTimeout, startOntvanger } from '../share/peer';
  import { relay as maakRelay } from '../share/relay';
  import { voorbeeldUitPakket } from '../share/pakket';

  let { inst, onOpen, onSluit }: { inst: Instellingen; onOpen: (pakket: Blob) => void; onSluit: () => void } = $props();

  const VERLOOP_MS = 10 * 60_000;
  const POLL_MS = 3000;
  const MAX_POGINGEN = 5;

  let code = $state<string[]>([]);
  let geenNetwerk = $state(false);
  let geenDirect = $state(false);
  let misgegaan = $state(false);
  let verlopen = $state(false);
  let ontvangen = $state.raw<Blob | null>(null);
  let voorbeeld = $state<string | null>(null);
  let bekijk = $state(false);

  const relay = maakRelay();
  const viaServer = () => relay.ingesteld && inst.cloudDelen !== 'nooit';
  let ontvanger: { stop(): void } | null = null;
  let pollTimer: ReturnType<typeof setInterval> | undefined;
  let verlooptimer: ReturnType<typeof setTimeout> | undefined;
  let weg = false;
  let ronde = 0;

  function stopAlles() {
    ontvanger?.stop();
    ontvanger = null;
    clearInterval(pollTimer);
    pollTimer = undefined;
    clearTimeout(verlooptimer);
    verlooptimer = undefined;
  }

  async function krijg(blob: Blob) {
    if (weg || ontvangen) return;
    stopAlles();
    ontvangen = blob;
    voorbeeld = await voorbeeldUitPakket(blob);
  }

  function startPolling(c: string[], mijnRonde: number) {
    if (!viaServer()) return;
    const sleutel = codeNaarSleutel(c);
    let bezig = false;
    pollTimer = setInterval(async () => {
      if (bezig) return;
      bezig = true;
      try {
        const blob = await relay.download(sleutel);
        if (blob && mijnRonde === ronde) await krijg(blob);
      } finally {
        bezig = false;
      }
    }, POLL_MS);
  }

  function startVerloop() {
    verlooptimer = setTimeout(() => { stopAlles(); verlopen = true; }, VERLOOP_MS);
  }

  async function start() {
    stopAlles();
    const mijnRonde = ++ronde;
    verlopen = false;
    geenNetwerk = false;
    geenDirect = false;
    misgegaan = false;
    code = [];
    for (let poging = 0; poging < MAX_POGINGEN; poging++) {
      const c = nieuweCode();
      const o = startOntvanger(peerId(c), { onPakket: (b) => void krijg(b) });
      let timer: ReturnType<typeof setTimeout> | undefined;
      let fout: string | null = null;
      try {
        await Promise.race([
          o.klaar,
          new Promise<never>((_, reject) => { timer = setTimeout(() => reject({ code: 'geen-verbinding' }), deelTimeout()); }),
        ]);
      } catch (e) {
        fout = (e as { code?: string })?.code ?? 'geen-verbinding';
      } finally {
        clearTimeout(timer);
      }
      if (weg || mijnRonde !== ronde) { o.stop(); return; }
      if (fout === 'code-bezet') { o.stop(); continue; }
      if (fout) {
        o.stop();
        if (viaServer()) {
          // Rechtstreeks lukt niet, maar via de server kan het nog wel: de code blijft zichtbaar.
          code = c;
          geenDirect = true;
          startPolling(c, mijnRonde);
          startVerloop();
        } else {
          geenNetwerk = true;
        }
        return;
      }
      ontvanger = o;
      code = c;
      startPolling(c, mijnRonde);
      startVerloop();
      return;
    }
    misgegaan = true;
  }

  onMount(() => { void start(); });
  onDestroy(() => { weg = true; stopAlles(); });
</script>

<div class="scherm" role="presentation">
  <div class="dialoog" role="dialog" aria-modal="true" aria-labelledby="ontvang-titel">
    <h2 id="ontvang-titel">Ontvang een collage</h2>
    {#if ontvangen}
      {#if voorbeeld}<img class="klein" src={voorbeeld} alt="Voorbeeld" />{/if}
      <p>Er is een collage voor je!</p>
      <button id="ontvang-open" class="hoofd breed" onclick={() => ontvangen && onOpen(ontvangen)}><Icon name="folder-open" /> Openen</button>
      <button id="ontvang-bekijk" class="breed" onclick={() => (bekijk = true)}>Alleen bekijken</button>
      <button id="ontvang-weg" class="breed" onclick={onSluit}><Icon name="trash" /> Weggooien</button>
    {:else}
      {#if geenNetwerk}
        <p class="fout" role="status">Ontvangen lukt niet op dit netwerk.</p>
        <button id="ontvang-nieuw" class="hoofd breed" onclick={() => void start()}>Nieuwe code</button>
      {:else if misgegaan}
        <p class="fout" role="status">Er ging iets mis. Probeer het nog eens.</p>
        <button id="ontvang-nieuw" class="hoofd breed" onclick={() => void start()}>Nieuwe code</button>
      {:else if verlopen}
        <p>De code is verlopen.</p>
        <button id="ontvang-nieuw" class="hoofd breed" onclick={() => void start()}>Nieuwe code</button>
      {:else if code.length}
        <div id="ontvang-code" class="code">
          {#each code as s}
            <span class="symbool" data-symbool={s} role="img" aria-label={SYMBOOL_NAMEN[s] ?? s}><Icon name={s} size={64} /></span>
          {/each}
        </div>
        <p>Zeg deze code tegen je vriend.</p>
        {#if geenDirect}<p class="zacht" role="status">Rechtstreeks ontvangen lukt hier niet. Je vriend kan de collage via de server sturen.</p>{/if}
      {:else}
        <p role="status">Even geduld...</p>
      {/if}
      <button id="ontvang-sluit" class="breed" onclick={onSluit}>Sluiten</button>
    {/if}
  </div>
</div>

{#if bekijk && ontvangen}
  <div class="scherm bekijk" role="presentation">
    <div class="dialoog groot" role="dialog" aria-modal="true" aria-label="Ontvangen collage bekijken">
      {#if voorbeeld}<img src={voorbeeld} alt="Ontvangen collage" />{:else}<p>Er is geen voorbeeld om te laten zien.</p>{/if}
      <button id="bekijk-sluit" class="breed" onclick={() => (bekijk = false)}>Sluiten</button>
    </div>
  </div>
{/if}

<style>
  .scherm { position: fixed; inset: 0; background: rgba(45, 42, 50, 0.45); display: grid; place-items: center; z-index: 90; padding: 16px; overflow-y: auto; }
  .bekijk { z-index: 95; }
  .dialoog { background: var(--paneel); border-radius: 28px; padding: 24px; width: min(520px, 100%); box-shadow: var(--schaduw); display: grid; gap: 14px; max-height: 100%; overflow-y: auto; }
  .dialoog.groot { width: min(900px, 100%); }
  h2 { margin: 0; text-align: center; }
  p { font-size: 1.2rem; text-align: center; margin: 0; }
  .zacht { font-size: 1rem; opacity: 0.8; }
  .fout { color: #c0392b; font-weight: 700; }
  .code { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; }
  .symbool { width: 92px; height: 92px; border-radius: 22px; background: var(--creme); display: grid; place-items: center; box-shadow: var(--schaduw); }
  img { width: 100%; object-fit: contain; background: var(--werkvlak); border-radius: 16px; }
  img.klein { max-height: 30dvh; }
  .groot img { max-height: 70dvh; }
  .breed { width: 100%; }
  button.hoofd { background: var(--koraal); color: #fff; }
</style>
