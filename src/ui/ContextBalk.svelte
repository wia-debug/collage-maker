<script lang="ts">
  import Icon from './Icon.svelte';
  import type { Element } from '../document/types';
  import type { Editor } from '../editor/store';
  let { editor, el, onTekst, onBijsnijden }: { editor: Editor; el: Element; onTekst?: () => void; onBijsnijden?: () => void } = $props();
</script>

<div class="context-balk" role="toolbar" aria-label="Bewerk element">
  {#if el.vergrendeld}
    <button id="ctx-slot" onclick={() => editor.update(el.id, { vergrendeld: false })}><Icon name="lock" /><span>Los</span></button>
  {:else}
    {#if el.type === 'tekst' && onTekst}
      <button id="ctx-tekst" onclick={onTekst}><Icon name="pencil" /><span>Tekst</span></button>
    {/if}
    {#if el.type === 'foto' && el.assetId && onBijsnijden}
      <button id="ctx-bijsnijden" onclick={onBijsnijden}><Icon name="crop" /><span>Knip</span></button>
    {/if}
    <button id="ctx-voor" onclick={() => editor.move(el.id, 'voor')}><Icon name="arrow-line-up" /><span>Voor</span></button>
    <button id="ctx-achter" onclick={() => editor.move(el.id, 'achter')}><Icon name="arrow-line-down" /><span>Achter</span></button>
    <button id="ctx-kopie" onclick={() => editor.duplicate(el.id)}><Icon name="copy" /><span>Kopie</span></button>
    <button id="ctx-draai" onclick={() => editor.update(el.id, { rotatie: (el.rotatie + 15) % 360 })}><Icon name="arrow-clockwise" /><span>Draai</span></button>
    <button id="ctx-spiegel" onclick={() => editor.update(el.id, { gespiegeld: !el.gespiegeld })}><Icon name="flip-horizontal" /><span>Spiegel</span></button>
    <button id="ctx-slot" onclick={() => editor.update(el.id, { vergrendeld: true })}><Icon name="lock-open" /><span>Vast</span></button>
    <button id="ctx-wissen" class="gevaar" onclick={() => editor.remove(el.id)}><Icon name="trash" /><span>Weg</span></button>
  {/if}
</div>

<style>
  .context-balk { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); display: flex; gap: 4px; padding: 6px; background: var(--paneel); border-radius: 22px; box-shadow: var(--schaduw); max-width: calc(100% - 20px); overflow-x: auto; z-index: 5; }
  button { flex-direction: column; gap: 0; font-size: 0.72rem; min-width: 60px; background: transparent; }
</style>
