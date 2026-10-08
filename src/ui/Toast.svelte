<script lang="ts">
  import Icon from './Icon.svelte';
  import { meldingen } from './toast';
</script>

<div class="toasts" role="status" aria-live="polite">
  {#each $meldingen as m (m.id)}
    <div class="toast"><Icon name={m.icoon} size={28} /><span>{m.tekst}</span></div>
  {/each}
</div>

<style>
  .toasts { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); display: grid; gap: 8px; z-index: 100; pointer-events: none; }
  .toast { display: flex; align-items: center; gap: 12px; background: var(--inkt); color: #fff; padding: 14px 20px; border-radius: 18px; box-shadow: var(--schaduw); font-weight: 700; max-width: min(90vw, 520px); }
</style>
