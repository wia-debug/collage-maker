<script lang="ts">
  import Icon from './Icon.svelte';
  import KleurPalet from './KleurPalet.svelte';
  import type { CanvasController } from '../editor/canvas';
  import type { TekenGereedschap } from '../document/types';

  let { controller }: { controller: CanvasController | null } = $props();
  let gereedschap = $state<TekenGereedschap | 'gum'>('pen');
  let kleur = $state('#2D2A32');
  let dikte = $state(14);

  const PENNEN: { id: TekenGereedschap | 'gum'; naam: string; icoon: string }[] = [
    { id: 'pen', naam: 'Pen', icoon: 'pen' }, { id: 'stift', naam: 'Stift', icoon: 'highlighter-circle' },
    { id: 'krijt', naam: 'Krijt', icoon: 'paint-brush' }, { id: 'gum', naam: 'Gum', icoon: 'eraser' },
  ];
  const DIKTES = [{ id: 'klein', px: 6 }, { id: 'middel', px: 14 }, { id: 'groot', px: 28 }];

  function pasToe() {
    if (gereedschap === 'gum') controller?.setGereedschap('gum');
    else controller?.setGereedschap('teken', { gereedschap, kleur, dikte });
  }

  $effect(() => { void [gereedschap, kleur, dikte, controller]; pasToe(); });
</script>

<h2>Tekenen</h2>
<div class="rij">
  {#each PENNEN as p}
    <button id="pen-{p.id}" class:actief={gereedschap === p.id} onclick={() => (gereedschap = p.id)}><Icon name={p.icoon} size={30} /><span>{p.naam}</span></button>
  {/each}
</div>
{#if gereedschap !== 'gum'}
  <h3>Dikte</h3>
  <div class="rij">
    {#each DIKTES as d}
      <button id="dikte-{d.id}" aria-label={d.id} class:actief={dikte === d.px} onclick={() => (dikte = d.px)}>
        <span class="stip" style:width="{d.px}px" style:height="{d.px}px" style:background={kleur}></span>
      </button>
    {/each}
  </div>
  <h3>Kleur</h3>
  <KleurPalet waarde={kleur} onKies={(k) => k && (kleur = k)} />
{:else}
  <p>Tik of veeg over een tekening om ze weg te gummen.</p>
{/if}

<style>
  .rij { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
  .rij button { flex-direction: column; background: var(--creme); font-size: 0.85rem; min-height: 72px; }
  .rij button.actief { background: var(--zon); }
  .stip { display: block; border-radius: 50%; }
</style>
