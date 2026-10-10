<script lang="ts">
  import { onDestroy } from 'svelte';
  import Icon from './Icon.svelte';
  import SymboolCode from './SymboolCode.svelte';
  import Toestemming from './Toestemming.svelte';
  import type { CanvasController } from '../editor/canvas';
  import type { Collage } from '../document/types';
  import type { AssetStore } from '../assets/store';
  import type { Instellingen } from '../storage/instellingen';
  import { dataUrlNaarBlob } from '../export/bewaar';
  import { maakDeelpakket } from '../share/pakket';
  import { deel } from '../share/delen';
  import { DEEL_LENGTE, DEEL_SYMBOLEN } from '../share/code';
  import { DEELTEKST, DeelFout } from '../share/fouten';

  let { controller, collage, assets, inst, onSluit }: { controller: CanvasController; collage: Collage; assets: AssetStore; inst: Instellingen; onSluit: () => void } = $props();

  let stap = $state<'code' | 'bezig' | 'toestemming' | 'klaar' | 'fout'>('code');
  let soort = $state<'kind' | 'leerkracht'>('kind');
  let manier = $state<'direct' | 'server'>('direct');
  let melding = $state('');
  let antwoord: ((ja: boolean) => void) | null = null;

  // Het pakket maken we één keer, bij het openen.
  const pakketBelofte: Promise<Blob> = (async () => maakDeelpakket(collage, assets, await dataUrlNaarBlob(controller.exportPng(0.5))))();
  pakketBelofte.catch((e) => {
    melding = e instanceof DeelFout ? DEELTEKST[e.code] : 'Er ging iets mis. Probeer het nog eens.';
    stap = 'fout';
  });

  const vraag = (s: 'kind' | 'leerkracht') => new Promise<boolean>((resolve) => {
    soort = s;
    antwoord = resolve;
    stap = 'toestemming';
  });
  function beantwoord(ja: boolean) {
    const a = antwoord;
    antwoord = null;
    if (ja) stap = 'bezig';
    a?.(ja);
  }

  async function verstuur(code: string[]) {
    melding = '';
    stap = 'bezig';
    try {
      const pakket = await pakketBelofte;
      manier = await deel({ code, pakket, instelling: inst.cloudDelen, vraag });
      stap = 'klaar';
    } catch (e) {
      if (e instanceof DeelFout) {
        melding = DEELTEKST[e.code];
        stap = e.code === 'niet-gevonden' ? 'code' : 'fout';
      } else {
        melding = 'Er ging iets mis. Probeer het nog eens.';
        stap = 'fout';
      }
    }
  }

  onDestroy(() => antwoord?.(false));
</script>

<div class="scherm" role="presentation">
  <div class="dialoog" role="dialog" aria-modal="true" aria-labelledby="deel-titel">
    <h2 id="deel-titel" class="verborgen">Deel je collage</h2>
    {#if stap === 'code'}
      <SymboolCode titel="Welke code zegt je vriend?" symbolen={DEEL_SYMBOLEN} lengte={DEEL_LENGTE} fout={melding} onKlaar={(c) => void verstuur(c)} />
    {:else if stap === 'bezig'}
      <p id="deel-bezig" role="status">Even geduld...</p>
    {:else if stap === 'toestemming'}
      <Toestemming {soort} master={inst.master} onJa={() => beantwoord(true)} onNee={() => beantwoord(false)} />
    {:else if stap === 'klaar'}
      <div class="klaar">
        <Icon name="check-circle" size={64} />
        <p id="deel-klaar">{manier === 'direct' ? 'Verstuurd!' : 'Verstuurd via de server.'}</p>
      </div>
    {:else}
      <p class="fout" role="alert"><Icon name="warning" /> {melding}</p>
    {/if}
    <button id="deel-sluit" class="breed" onclick={onSluit}>Sluiten</button>
  </div>
</div>

<style>
  .scherm { position: fixed; inset: 0; background: rgba(45, 42, 50, 0.45); display: grid; place-items: center; z-index: 90; padding: 16px; overflow-y: auto; }
  .dialoog { background: var(--paneel); border-radius: 28px; padding: 24px; width: min(520px, 100%); box-shadow: var(--schaduw); display: grid; gap: 14px; max-height: 100%; overflow-y: auto; }
  .verborgen { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); margin: 0; }
  p { font-size: 1.2rem; text-align: center; margin: 0; }
  .klaar { display: grid; justify-items: center; gap: 8px; color: var(--mint); }
  .klaar p { color: var(--inkt); font-weight: 800; }
  .fout { color: #c0392b; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px; }
  .breed { width: 100%; }
</style>
