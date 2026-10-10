<script lang="ts">
  import { onMount } from 'svelte';
  import { TEMPLATES, type TemplateDef } from '../assets/templates';
  import { AssetStore } from '../assets/store';
  import { maakVoorbeeld } from '../export/voorbeeld';

  let { onKies }: { onKies: (t: TemplateDef) => void } = $props();
  let voorbeelden = $state<Record<string, string>>({});

  onMount(async () => {
    const assets = new AssetStore();
    for (const t of TEMPLATES) voorbeelden[t.id] = await maakVoorbeeld(t.maak(), assets, 280, true);
  });
</script>

<div class="templates">
  {#each TEMPLATES as t}
    <button id="template-{t.id}" class="kaart" onclick={() => onKies(t)}>
      {#if voorbeelden[t.id]}<img src={voorbeelden[t.id]} alt="" />{:else}<span class="laden"></span>{/if}
      <span>{t.naam}</span>
    </button>
  {/each}
</div>

<style>
  .templates { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; width: min(1100px, 100%); }
  .kaart { flex-direction: column; padding: 14px; border-radius: 24px; box-shadow: var(--schaduw); background: var(--paneel); }
  img { width: 100%; height: 170px; object-fit: contain; }
  .laden { display: block; width: 100%; height: 170px; background: var(--creme); border-radius: 12px; }
</style>
