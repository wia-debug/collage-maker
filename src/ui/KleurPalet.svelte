<script lang="ts">
  import Icon from './Icon.svelte';
  import { KLEUREN } from './kleuren';
  let { waarde, onKies, metGeen = false, compact = false }: { waarde: string | null; onKies: (k: string | null) => void; metGeen?: boolean; compact?: boolean } = $props();
</script>

<div class="palet" class:compact>
  {#if metGeen}
    <button class="kleur geen" class:actief={waarde === null} aria-label="Geen kleur" onclick={() => onKies(null)}><Icon name="prohibit" /></button>
  {/if}
  {#each KLEUREN as k}
    <button class="kleur" class:actief={waarde === k} style:background={k} aria-label={k} onclick={() => onKies(k)}></button>
  {/each}
</div>

<style>
  .palet { display: grid; grid-template-columns: repeat(auto-fill, minmax(56px, 1fr)); gap: 8px; margin-bottom: 16px; }
  .palet.compact { width: 100%; max-width: 420px; grid-template-columns: repeat(auto-fill, 44px); justify-content: center; gap: 8px; margin-bottom: 0; }
  .palet.compact .kleur { width: 44px; height: 44px; min-width: 44px; min-height: 44px; }
  .kleur { border: 3px solid var(--rand); border-radius: 50%; aspect-ratio: 1; padding: 0; }
  .kleur.actief { border-color: var(--inkt); box-shadow: 0 0 0 3px var(--zon); }
  .geen { background: var(--paneel); }
</style>
