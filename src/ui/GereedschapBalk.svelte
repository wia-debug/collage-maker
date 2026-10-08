<script lang="ts">
  import Icon from './Icon.svelte';
  import type { Paneel } from './types';
  let { actief, onKies }: { actief: Paneel | null; onKies: (p: Paneel) => void } = $props();
  const TOOLS: { id: Paneel; label: string; icoon: string }[] = [
    { id: 'foto', label: 'Foto', icoon: 'image' },
    { id: 'tekst', label: 'Tekst', icoon: 'text-t' },
    { id: 'stickers', label: 'Stickers', icoon: 'sticker' },
    { id: 'vormen', label: 'Vormen', icoon: 'shapes' },
    { id: 'tekenen', label: 'Tekenen', icoon: 'pencil-simple' },
    { id: 'achtergrond', label: 'Achtergrond', icoon: 'paint-bucket' },
  ];
</script>

<nav class="tools" aria-label="Gereedschap">
  {#each TOOLS as t}
    <button id="tool-{t.id}" class:actief={actief === t.id} aria-pressed={actief === t.id} onclick={() => onKies(t.id)}>
      <Icon name={t.icoon} size={30} /><span>{t.label}</span>
    </button>
  {/each}
</nav>

<style>
  .tools { display: flex; flex-direction: column; gap: 6px; padding: 10px 8px; background: var(--paneel); overflow-y: auto; }
  button { flex-direction: column; gap: 2px; width: 84px; min-height: 72px; font-size: 0.8rem; background: transparent; }
  button.actief { background: var(--zon); }
  @media (orientation: portrait) {
    .tools { flex-direction: row; justify-content: space-around; padding: 6px 4px max(6px, env(safe-area-inset-bottom)); overflow-x: auto; }
    button { width: auto; min-width: 64px; }
  }
</style>
