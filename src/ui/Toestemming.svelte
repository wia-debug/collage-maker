<script lang="ts">
  import CijferCode from './CijferCode.svelte';
  import { controleerCode, type GehashteCode } from '../storage/hash';
  let { soort, master, onJa, onNee }: { soort: 'kind' | 'leerkracht'; master: GehashteCode | null; onJa: () => void; onNee: () => void } = $props();
  let fout = $state('');

  async function controleer(code: string) {
    if (master && (await controleerCode(code, master))) { onJa(); return; }
    fout = 'Dat is niet de juiste code.';
  }
</script>

<div class="toestemming">
  <h2>Via onze server?</h2>
  <p>Je netwerk blokkeert direct delen. Mag je collage via onze server gaan? Hij wordt na 24 uur gewist.</p>
  {#if soort === 'kind'}
    <div class="knoppen">
      <button id="toestemming-ja" class="hoofd" onclick={onJa}>Ja</button>
      <button id="toestemming-nee" onclick={onNee}>Nee</button>
    </div>
  {:else}
    <p class="leerkracht">Vraag het aan je leerkracht.</p>
    <CijferCode titel="Code van de leerkracht" {fout} onKlaar={(c) => void controleer(c)} />
    <button id="toestemming-nee" onclick={onNee}>Nee</button>
  {/if}
</div>

<style>
  .toestemming { display: grid; gap: 14px; justify-items: center; text-align: center; }
  p { font-size: 1.1rem; line-height: 1.5; margin: 0; }
  .leerkracht { font-weight: 800; }
  .knoppen { display: flex; gap: 12px; }
  button { padding: 0 28px; background: var(--creme); }
  button.hoofd { background: var(--koraal); color: #fff; }
</style>
