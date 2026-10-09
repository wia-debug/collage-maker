<script lang="ts">
  import Icon from './Icon.svelte';
  import Dialoog from './Dialoog.svelte';
  import type { CollageSamenvatting } from '../storage/collages';

  let { collages, onOpen, onWis }: { collages: CollageSamenvatting[]; onOpen: (id: string) => void; onWis: (id: string) => void } = $props();
  let teWissen = $state.raw<CollageSamenvatting | null>(null);
</script>

<section id="mijn-collages" aria-labelledby="mijn-collages-titel">
  <h2 id="mijn-collages-titel">Mijn collages</h2>
  <div class="lijst">
    {#each collages as c (c.id)}
      <div class="item">
        <button class="kaart" aria-label={c.naam} onclick={() => onOpen(c.id)}>
          {#if c.voorbeeld}<img src={c.voorbeeld} alt="" />{:else}<span class="leeg"><Icon name="image" size={48} /></span>{/if}
          <span class="naam">{c.naam}</span>
        </button>
        <button id="collage-wis-{c.id}" class="wis" aria-label="{c.naam} wissen" onclick={() => (teWissen = c)}><Icon name="trash" /></button>
      </div>
    {/each}
  </div>
</section>

{#if teWissen}
  <Dialoog
    titel="Deze collage wissen?"
    tekst="Als je {teWissen.naam} wist, is hij voor altijd weg."
    knoppen={[
      { label: 'Niet wissen', hoofd: true, actie: () => (teWissen = null) },
      { label: 'Wissen', gevaar: true, actie: () => { const id = teWissen!.id; teWissen = null; onWis(id); } },
    ]}
  />
{/if}

<style>
  section { width: min(960px, 100%); }
  .lijst { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
  .item { position: relative; }
  .kaart { width: 100%; flex-direction: column; gap: 6px; padding: 10px; border-radius: 20px; box-shadow: var(--schaduw); }
  img, .leeg { width: 100%; height: 130px; object-fit: contain; border-radius: 12px; background: var(--werkvlak); display: grid; place-items: center; }
  .naam { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .wis { position: absolute; top: 6px; right: 6px; background: var(--paneel); color: #c0392b; box-shadow: var(--schaduw); }
</style>
