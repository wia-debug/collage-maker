<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import Icon from './Icon.svelte';
  import Dialoog from './Dialoog.svelte';
  import VoortgangDialoog from './VoortgangDialoog.svelte';
  import Diavoorstelling from './Diavoorstelling.svelte';
  import { db, type InzendingRij } from '../storage/db';
  import { lijstInzendingen, wisAlleInzendingen, wisInzending } from '../storage/inzendingen';
  import { klasBestandsnaam, maakKlasPdf, maakKlasZip, renderInzending } from '../export/klas';
  import { bewaarBestand } from '../export/bewaar';
  import type { Instellingen } from '../storage/instellingen';
  import { toon } from './toast';
  import { startTour, tourGezien } from '../tour/tour';

  let { inst, onOpenKopie, onSluit }: { inst: Instellingen; onOpenKopie: (pakket: Blob) => void; onSluit: () => void } = $props();
  let rijen = $state.raw<InzendingRij[]>([]);
  let urls = $state.raw<Record<string, string>>({});
  let teWissen = $state.raw<InzendingRij | null>(null);
  let allesWissen = $state(false);
  let groot = $state<string | null>(null);
  let bezig = $state<{ titel: string; deel: number | null } | null>(null);
  let dia = $state(false);
  let tourTimer: ReturnType<typeof setTimeout> | undefined;

  async function laad() {
    for (const u of Object.values(urls)) URL.revokeObjectURL(u);
    rijen = await lijstInzendingen(db);
    urls = Object.fromEntries(rijen.filter((r) => r.voorbeeld).map((r) => [r.id, URL.createObjectURL(r.voorbeeld!)]));
  }

  const tijd = (t: number) => {
    const d = new Date(t);
    return d.toDateString() === new Date().toDateString() ? d.toLocaleTimeString('nl', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('nl');
  };

  async function bekijk(r: InzendingRij) {
    try { groot = (await renderInzending(r, 1)).png; } catch { toon('Deze collage kan ik niet openen.', 'warning'); }
  }

  async function download(soort: 'zip' | 'pdf') {
    if (!rijen.length || bezig) return;
    bezig = { titel: soort === 'zip' ? 'ZIP maken...' : 'PDF maken...', deel: 0 };
    try {
      const v = (k: number, n: number) => { bezig = { titel: bezig!.titel, deel: k / n }; };
      const blob = soort === 'zip' ? await maakKlasZip(rijen, v) : await maakKlasPdf(rijen, v);
      bezig = null;
      await bewaarBestand(blob, klasBestandsnaam(soort));
    } catch {
      toon('Downloaden lukte niet. Probeer het nog eens.', 'warning');
    } finally {
      bezig = null;
    }
  }

  async function wisEen() { const r = teWissen; teWissen = null; if (r) { await wisInzending(db, r.id); await laad(); } }
  async function wisAlles() { allesWissen = false; await wisAlleInzendingen(db); await laad(); }

  onMount(async () => { await laad(); if (!tourGezien('galerij') && rijen.length) tourTimer = setTimeout(() => startTour('galerij'), 300); });
  onDestroy(() => { clearTimeout(tourTimer); for (const u of Object.values(urls)) URL.revokeObjectURL(u); });
</script>

<div id="galerij" class="scherm" role="dialog" aria-modal="true" aria-labelledby="galerij-titel">
  <header>
    <h1 id="galerij-titel">Galerij</h1>
    <button id="galerij-sluit" aria-label="Sluiten" onclick={onSluit}><Icon name="x" /></button>
  </header>
  {#if inst.toestel === 'chromebook'}<p id="galerij-chromebook" class="zacht"><Icon name="warning" /> Inzendingen verdwijnen bij uitloggen. Download ze als ZIP of PDF.</p>{/if}
  <div class="acties">
    <button id="galerij-dia" disabled={!rijen.length} onclick={() => (dia = true)}><Icon name="play" /> Diavoorstelling</button>
    <button id="galerij-zip" disabled={!rijen.length} onclick={() => void download('zip')}><Icon name="file-zip" /> Download ZIP</button>
    <button id="galerij-pdf" disabled={!rijen.length} onclick={() => void download('pdf')}><Icon name="file-pdf" /> Download PDF</button>
    <button id="galerij-alles-wissen" class="gevaar" disabled={!rijen.length} onclick={() => (allesWissen = true)}><Icon name="trash" /> Alles wissen</button>
  </div>
  {#if !rijen.length}
    <p id="galerij-leeg" class="leeg">Nog geen collages ontvangen.</p>
  {:else}
    <ul class="raster">
      {#each rijen as r (r.id)}
        <li class="inzending">
          {#if urls[r.id]}<img src={urls[r.id]} alt="Collage van {r.naam}" />{:else}<span class="geen"><Icon name="image" size={48} /></span>{/if}
          <strong>{r.naam}</strong>
          <span class="tijd">{tijd(r.ontvangen)}</span>
          <div class="knoppen">
            <button class="inzending-bekijk" aria-label="Bekijk" onclick={() => void bekijk(r)}><Icon name="corners-out" /></button>
            <button class="inzending-open" aria-label="Open als kopie" onclick={() => onOpenKopie(r.bestand)}><Icon name="pencil-simple" /></button>
            <button class="inzending-wis gevaar" aria-label="Wis" onclick={() => (teWissen = r)}><Icon name="trash" /></button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>

{#if groot}
  <div id="galerij-groot" class="groot" role="dialog" aria-modal="true" aria-label="Collage groot">
    <img src={groot} alt="Collage groot" />
    <button id="galerij-groot-sluit" aria-label="Sluiten" onclick={() => (groot = null)}><Icon name="x" /></button>
  </div>
{/if}
{#if dia}<Diavoorstelling {rijen} onSluit={() => (dia = false)} />{/if}
{#if bezig}<VoortgangDialoog titel={bezig.titel} deel={bezig.deel} />{/if}
{#if teWissen}
  <Dialoog titel="Deze collage wissen?" tekst="De collage van {teWissen.naam} wordt gewist." knoppen={[
    { label: 'Niet wissen', hoofd: true, actie: () => (teWissen = null) },
    { label: 'Wissen', gevaar: true, actie: () => void wisEen() },
  ]} />
{/if}
{#if allesWissen}
  <Dialoog titel="Alles wissen?" tekst="Alle ontvangen collages worden gewist." knoppen={[
    { label: 'Niet wissen', hoofd: true, actie: () => (allesWissen = false) },
    { label: 'Alles wissen', gevaar: true, actie: () => void wisAlles() },
  ]} />
{/if}

<style>
  .scherm { position: fixed; inset: 0; z-index: 86; background: var(--creme); overflow-y: auto; padding: 20px; box-sizing: border-box; display: grid; gap: 16px; align-content: start; }
  header { display: flex; justify-content: space-between; align-items: center; }
  h1 { margin: 0; }
  header button { background: transparent; }
  .acties { display: flex; gap: 10px; flex-wrap: wrap; }
  .acties button { padding: 0 18px; background: var(--paneel); }
  .acties button:disabled { opacity: 0.4; }
  .gevaar { color: #c0392b; }
  .zacht { color: #6b6470; display: flex; align-items: center; gap: 8px; margin: 0; }
  .leeg { font-size: 1.3rem; text-align: center; color: #6b6470; }
  .raster { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
  .inzending { background: var(--paneel); border-radius: 22px; padding: 12px; display: grid; gap: 6px; box-shadow: var(--schaduw); }
  .inzending img, .geen { width: 100%; aspect-ratio: 1; object-fit: contain; border-radius: 14px; background: var(--creme); display: grid; place-items: center; }
  .tijd { color: #6b6470; font-size: 0.9rem; }
  .knoppen { display: flex; gap: 6px; }
  .knoppen button { flex: 1; background: var(--creme); }
  .groot { position: fixed; inset: 0; z-index: 91; background: rgba(20, 18, 24, 0.9); display: grid; place-items: center; padding: 16px; }
  .groot img { max-width: 100%; max-height: 90dvh; border-radius: 12px; }
  .groot button { position: absolute; top: 16px; right: 16px; background: var(--paneel); }
</style>
