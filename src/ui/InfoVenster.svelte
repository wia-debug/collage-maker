<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';
  let { id, titel, onSluit, children }: { id: string; titel: string; onSluit: () => void; children: Snippet } = $props();
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') onSluit(); }} />

<div class="scherm" role="presentation">
  <div {id} class="venster" role="dialog" aria-modal="true" aria-labelledby="{id}-titel">
    <header>
      <h2 id="{id}-titel">{titel}</h2>
      <button id="{id}-sluit" aria-label="Sluiten" onclick={onSluit}><Icon name="x" /></button>
    </header>
    <div class="inhoud">{@render children()}</div>
  </div>
</div>

<style>
  .scherm { position: fixed; inset: 0; background: rgba(45, 42, 50, 0.45); display: grid; place-items: center; z-index: 90; padding: 16px; }
  .venster { background: var(--paneel); border-radius: 28px; width: min(680px, 100%); max-height: 90dvh; display: flex; flex-direction: column; box-shadow: var(--schaduw); }
  header { display: flex; justify-content: space-between; align-items: center; padding: 16px 16px 0 24px; }
  h2 { margin: 0; color: var(--koraal); }
  header button { background: transparent; }
  .inhoud { overflow-y: auto; padding: 8px 24px 24px; line-height: 1.5; font-size: 1.05rem; }
  .inhoud :global(h3) { margin: 18px 0 4px; }
  .inhoud :global(p), .inhoud :global(ul) { margin: 0 0 8px; }
  .inhoud :global(ul) { padding-left: 20px; }
</style>
