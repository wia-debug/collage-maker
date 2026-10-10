<script lang="ts">
  import Icon from './Icon.svelte';
  import type { Element } from '../document/types';
  import type { Editor } from '../editor/store';
  import { draaiKeuze, isEenGroep, spiegelKeuze } from '../editor/keuze';
  let { editor, keuze, alle }: { editor: Editor; keuze: Element[]; alle: Element[] } = $props();
  const ids = $derived(keuze.map((e) => e.id));
  const groep = $derived(isEenGroep(keuze, alle));
  const allesVast = $derived(keuze.every((e) => e.vergrendeld));
  const zetVast = (v: boolean) => editor.updateMany(Object.fromEntries(keuze.map((e) => [e.id, { vergrendeld: v }])));
</script>

<div class="context-balk" role="toolbar" aria-label="Bewerk keuze">
  {#if groep}
    <button id="ctx-groep-los" onclick={() => editor.groepLos(groep)}><Icon name="selection-slash" /><span>Groep los</span></button>
  {:else}
    <button id="ctx-groepeer" onclick={() => editor.groepeer(ids)}><Icon name="selection-all" /><span>Groepeer</span></button>
  {/if}
  {#if allesVast}
    <button id="ctx-slot" onclick={() => zetVast(false)}><Icon name="lock" /><span>Los</span></button>
  {:else}
    <button id="ctx-voor" onclick={() => editor.moveMany(ids, 'voor')}><Icon name="arrow-line-up" /><span>Voor</span></button>
    <button id="ctx-achter" onclick={() => editor.moveMany(ids, 'achter')}><Icon name="arrow-line-down" /><span>Achter</span></button>
    <button id="ctx-kopie" onclick={() => editor.duplicateMany(ids)}><Icon name="copy" /><span>Kopie</span></button>
    <button id="ctx-draai" onclick={() => editor.updateMany(draaiKeuze(keuze, 15))}><Icon name="arrow-clockwise" /><span>Draai</span></button>
    <button id="ctx-spiegel" onclick={() => editor.updateMany(spiegelKeuze(keuze))}><Icon name="flip-horizontal" /><span>Spiegel</span></button>
    <button id="ctx-slot" onclick={() => zetVast(true)}><Icon name="lock-open" /><span>Vast</span></button>
    <button id="ctx-wissen" class="gevaar" onclick={() => editor.removeMany(keuze.filter((e) => !e.vergrendeld).map((e) => e.id))}><Icon name="trash" /><span>Weg</span></button>
  {/if}
</div>

<style>
  .context-balk { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); display: flex; gap: 4px; padding: 6px; background: var(--paneel); border-radius: 22px; box-shadow: var(--schaduw); max-width: calc(100% - 20px); overflow-x: auto; z-index: 5; }
  button { flex-direction: column; gap: 0; font-size: 0.72rem; min-width: 60px; background: transparent; }
</style>
