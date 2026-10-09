<script lang="ts">
  import Icon from './Icon.svelte';
  import type { CanvasController } from '../editor/canvas';
  import type { Collage } from '../document/types';
  import { maakPdf } from '../export/pdf';
  import { bestandsnaam, bewaarBestand, dataUrlNaarBlob } from '../export/bewaar';
  import { toon } from './toast';
  import type { AssetStore } from '../assets/store';
  import { naarBestand } from '../storage/bestand';

  let { controller, collage, assets, onSluit, onBestandBewaard, metBestand = true }: { controller: CanvasController; collage: Collage; assets: AssetStore; onSluit: () => void; onBestandBewaard?: () => void; metBestand?: boolean } = $props();
  let klaar = $state.raw<{ blob: Blob; naam: string; voorbeeld: string; soort: 'png' | 'pdf' | 'collage' } | null>(null);
  let bezig = $state(false);
  let bewaarBezig = $state(false);

  async function maak(soort: 'png' | 'pdf' | 'collage') {
    bezig = true;
    try {
      const png = controller.exportPng(soort === 'collage' ? 0.5 : 2);
      const blob = soort === 'png' ? await dataUrlNaarBlob(png)
        : soort === 'pdf' ? await maakPdf(png, collage.formaat)
        : await naarBestand(collage, assets, await dataUrlNaarBlob(png));
      klaar = { blob, naam: bestandsnaam(collage.naam, soort), voorbeeld: png, soort };
    } catch {
      toon('Bewaren lukte niet. Probeer het nog eens.', 'warning');
    } finally {
      bezig = false;
    }
  }

  // Tweede tik: delen moet direct vanuit een tik gebeuren (iPad).
  async function bewaar() {
    if (!klaar || bewaarBezig) return;
    bewaarBezig = true;
    try {
      const r = await bewaarBestand(klaar.blob, klaar.naam);
      if (r !== 'geannuleerd') {
        if (klaar.soort === 'collage') onBestandBewaard?.();
        toon('Bewaard!', 'check-circle');
        onSluit();
      }
    } catch {
      toon('Bewaren lukte niet. Probeer het nog eens.', 'warning');
    } finally {
      bewaarBezig = false;
    }
  }
</script>

<div class="scherm" role="presentation">
  <div class="dialoog" role="dialog" aria-modal="true" aria-labelledby="export-titel">
    <h2 id="export-titel">Bewaar je collage</h2>
    {#if !klaar}
      <div class="keuze" class:twee={!metBestand}>
        <button id="export-png" disabled={bezig} onclick={() => maak('png')}><Icon name="file-png" size={56} /><span>Als foto</span></button>
        <button id="export-pdf" disabled={bezig} onclick={() => maak('pdf')}><Icon name="file-pdf" size={56} /><span>Als PDF</span></button>
        {#if metBestand}
          <button id="export-collage" disabled={bezig} onclick={() => maak('collage')}><Icon name="floppy-disk" size={56} /><span>Om verder te werken</span></button>
        {/if}
      </div>
      {#if bezig}<p>Even geduld...</p>{/if}
    {:else}
      <img src={klaar.voorbeeld} alt="Voorbeeld van je collage" />
      <button id="export-bewaar" class="hoofd breed" disabled={bewaarBezig} onclick={bewaar}><Icon name="download-simple" /> Bewaar op dit toestel</button>
    {/if}
    <button id="export-sluit" class="breed" onclick={onSluit}>Sluiten</button>
  </div>
</div>

<style>
  .scherm { position: fixed; inset: 0; background: rgba(45, 42, 50, 0.45); display: grid; place-items: center; z-index: 90; padding: 16px; }
  .dialoog { background: var(--paneel); border-radius: 28px; padding: 24px; width: min(520px, 100%); box-shadow: var(--schaduw); display: grid; gap: 14px; }
  .keuze { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  .keuze.twee { grid-template-columns: repeat(2, 1fr); }
  .keuze button { flex-direction: column; min-height: 140px; background: var(--creme); font-size: 1.2rem; }
  img { width: 100%; max-height: 50dvh; object-fit: contain; background: var(--werkvlak); border-radius: 16px; }
  .breed { width: 100%; }
</style>
