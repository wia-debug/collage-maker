<script lang="ts">
  import Icon from './Icon.svelte';
  import KleurPalet from './KleurPalet.svelte';
  import { KADERS, MASKERS } from '../elements/kaders';
  import type { Element } from '../document/types';
  import type { Editor } from '../editor/store';

  let { editor, el, onKiesFoto }: { editor: Editor; el: Element | null; onKiesFoto: (vakId?: string) => void } = $props();
  const foto = $derived(el?.type === 'foto' ? el : null);
</script>

<h2>Foto</h2>
<button id="foto-kiezen" class="hoofd breed" onclick={() => onKiesFoto(foto && !foto.assetId ? foto.id : undefined)}>
  <Icon name="image" /> {foto && !foto.assetId ? 'Kies foto voor dit vak' : 'Kies een foto'}
</button>
<p class="tip">Je kan ook een foto op de collage slepen of plakken.</p>
{#if foto && foto.assetId}
  <h3>Vorm</h3>
  <div class="raster">
    {#each MASKERS as m}
      <button id="masker-{m.masker}" class:actief={foto.masker === m.masker} onclick={() => editor.update(foto.id, { masker: m.masker })}>
        <Icon name={m.icoon} size={30} /><span>{m.naam}</span>
      </button>
    {/each}
  </div>
  <h3>Kader</h3>
  <div class="raster">
    {#each KADERS as k}
      <button id="kader-{k.stijl}" class:actief={foto.kader.stijl === k.stijl} onclick={() => editor.update(foto.id, { kader: { ...foto.kader, stijl: k.stijl } })}>{k.naam}</button>
    {/each}
  </div>
  {#if foto.kader.stijl !== 'geen'}
    <h3>Kleur kader</h3>
    <KleurPalet waarde={foto.kader.kleur} onKies={(k) => k && editor.update(foto.id, { kader: { ...foto.kader, kleur: k } })} />
  {/if}
  <!-- filter-opties -->
{/if}

<style>
  .breed { width: 100%; margin-bottom: 8px; }
  .tip { color: #6b6470; margin: 0 0 16px; }
  .raster { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
  .raster button { flex-direction: column; min-height: 64px; background: var(--creme); font-size: 0.85rem; padding: 4px; }
  .raster button.actief { background: var(--zon); }
</style>
