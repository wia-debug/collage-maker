<script lang="ts">
  import Icon from './Icon.svelte';
  import KleurPalet from './KleurPalet.svelte';
  import Schuif from './Schuif.svelte';
  import { FORMATEN } from '../document/formats';
  import { maakVorm } from '../document/create';
  import type { Element, VormElement } from '../document/types';
  import type { Editor } from '../editor/store';

  let { editor, el }: { editor: Editor; el: Element | null } = $props();
  const vorm = $derived(el?.type === 'vorm' ? el : null);

  const VORMEN: { vorm: VormElement['vorm']; icoon: string; label: string }[] = [
    { vorm: 'rechthoek', icoon: 'square', label: 'Vierkant' },
    { vorm: 'rond', icoon: 'circle', label: 'Rond' },
    { vorm: 'ster', icoon: 'star', label: 'Ster' },
    { vorm: 'hart', icoon: 'heart', label: 'Hart' },
    { vorm: 'driehoek', icoon: 'triangle', label: 'Driehoek' },
    { vorm: 'pijl', icoon: 'arrow-right', label: 'Pijl' },
    { vorm: 'wolk', icoon: 'cloud', label: 'Wolk' },
    { vorm: 'blob', icoon: 'drop', label: 'Vlek' },
    { vorm: 'lijn', icoon: 'line-segment', label: 'Lijn' },
  ];

  function voegToe(v: VormElement['vorm']) {
    const f = FORMATEN[editor.get().collage.formaat];
    const lijn = v === 'lijn';
    editor.add(maakVorm({ x: f.breedte / 2, y: f.hoogte / 2, vorm: v, breedte: lijn ? 400 : 300, hoogte: lijn ? 40 : 300 }));
  }
</script>

<h2>Vormen</h2>
<div class="raster">
  {#each VORMEN as v}
    <button id="vorm-{v.vorm}" onclick={() => voegToe(v.vorm)}><Icon name={v.icoon} size={36} /><span>{v.label}</span></button>
  {/each}
</div>

{#if vorm}
  {#if vorm.vorm !== 'lijn'}
    <h3>Kleur</h3>
    <KleurPalet waarde={vorm.vulling} metGeen onKies={(k) => editor.update(vorm.id, { vulling: k })} />
  {/if}
  <h3>Rand</h3>
  <KleurPalet waarde={vorm.rand} metGeen={vorm.vorm !== 'lijn'} onKies={(k) => editor.update(vorm.id, { rand: k })} />
  <Schuif label="Dikte" min={2} max={40} waarde={vorm.randDikte} onWijzig={(v) => editor.update(vorm.id, { randDikte: v })} />
  <Schuif label="Zichtbaar" min={10} max={100} waarde={Math.round(vorm.doorzichtigheid * 100)} onWijzig={(v) => editor.update(vorm.id, { doorzichtigheid: v / 100 })} />
{/if}

<style>
  .raster { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 20px; }
  .raster button { flex-direction: column; min-height: 84px; background: var(--creme); font-size: 0.85rem; }
</style>
