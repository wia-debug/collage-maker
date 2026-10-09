<script lang="ts">
  import Icon from './Icon.svelte';
  import { UITDAGINGEN, type Uitdaging } from '../assets/uitdagingen';
  let { onKies }: { onKies: (u: Uitdaging) => void } = $props();
  const KLEUREN = ['var(--koraal)', 'var(--zon)', 'var(--mint)', 'var(--hemel)', 'var(--lavendel)'];
</script>

<div class="uitdagingen">
  {#each UITDAGINGEN as u, i}
    <button id="uitdaging-{u.id}" class="kaart" style:--accent={KLEUREN[i % KLEUREN.length]} onclick={() => onKies(u)}>
      <Icon name="trophy" size={40} />
      <strong>{u.titel}</strong>
      <span>{u.opdracht}</span>
    </button>
  {/each}
</div>

<style>
  .uitdagingen { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; width: min(1100px, 100%); }
  .kaart { flex-direction: column; align-items: flex-start; text-align: left; gap: 6px; padding: 18px; border-radius: 24px; box-shadow: var(--schaduw); background: var(--paneel); border-top: 8px solid var(--accent); }
  strong { font-size: 1.2rem; }
  span { font-weight: 400; line-height: 1.4; }
</style>
