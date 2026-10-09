<script lang="ts">
  import Icon from './Icon.svelte';
  import type { CollageSamenvatting } from '../storage/collages';
  let { collages, onJa, onLater }: { collages: CollageSamenvatting[]; onJa: () => void; onLater: () => void } = $props();
</script>

<div class="scherm" role="presentation">
  <div class="dialoog" role="alertdialog" aria-modal="true" aria-labelledby="opruim-titel">
    <h2 id="opruim-titel">Deze oude collages wissen?</h2>
    <p>Je hebt er al meer dan een maand niet meer aan gewerkt.</p>
    <ul>
      {#each collages as c (c.id)}
        <li>
          {#if c.voorbeeld}<img src={c.voorbeeld} alt="" />{:else}<span class="leeg"><Icon name="image" /></span>{/if}
          <span>{c.naam}</span>
        </li>
      {/each}
    </ul>
    <div class="knoppen">
      <button class="hoofd" onclick={onLater}>Later</button>
      <button class="gevaar" onclick={onJa}>Ja, wissen</button>
    </div>
  </div>
</div>

<style>
  .scherm { position: fixed; inset: 0; background: rgba(45, 42, 50, 0.45); display: grid; place-items: center; z-index: 90; padding: 16px; }
  .dialoog { background: var(--paneel); border-radius: 28px; padding: 24px; width: min(520px, 100%); max-height: 90dvh; overflow-y: auto; box-shadow: var(--schaduw); }
  ul { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; }
  li { display: grid; gap: 4px; text-align: center; font-weight: 700; }
  img, .leeg { width: 100%; height: 90px; object-fit: contain; background: var(--werkvlak); border-radius: 12px; display: grid; place-items: center; }
  .knoppen { display: flex; gap: 12px; justify-content: flex-end; }
  .knoppen button { padding: 0 22px; }
  .hoofd { background: var(--koraal); color: #fff; }
  .gevaar { background: #fde2e1; color: #c0392b; }
</style>
