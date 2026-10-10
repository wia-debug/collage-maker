<script lang="ts">
  import Icon from './Icon.svelte';
  let { naam, kanOngedaan, kanOpnieuw, onTerug, onOngedaan, onOpnieuw, onHelp, onBewaar, onNaam, onDeel, meer = false, onMeer }: {
    naam: string; kanOngedaan: boolean; kanOpnieuw: boolean;
    onTerug: () => void; onOngedaan: () => void; onOpnieuw: () => void; onHelp?: () => void; onBewaar?: () => void; onNaam?: () => void; onDeel?: () => void;
    meer?: boolean; onMeer?: () => void;
  } = $props();
</script>

<header class="boven-balk">
  <button id="knop-terug" aria-label="Terug" onclick={onTerug}><Icon name="arrow-left" /></button>
  <h1>{#if onNaam}<button id="knop-naam" class="naam" onclick={onNaam}>{naam} <Icon name="pencil" size={20} /></button>{:else}{naam}{/if}</h1>
  <button id="knop-ongedaan" aria-label="Ongedaan maken" disabled={!kanOngedaan} onclick={onOngedaan}><Icon name="arrow-counter-clockwise" /></button>
  <button id="knop-opnieuw" aria-label="Opnieuw" disabled={!kanOpnieuw} onclick={onOpnieuw}><Icon name="arrow-clockwise" /></button>
  {#if onMeer}<button id="knop-meer" aria-pressed={meer} class:actief={meer} onclick={onMeer}><Icon name="selection-plus" /><span>Meer</span></button>{/if}
  {#if onHelp}<button id="knop-help" aria-label="Help" onclick={onHelp}><Icon name="question" /></button>{/if}
  {#if onDeel}<button id="knop-deel" onclick={onDeel}><Icon name="share-network" /><span>Deel</span></button>{/if}
  {#if onBewaar}<button id="knop-bewaar" class="hoofd" onclick={onBewaar}><Icon name="download-simple" /><span>Bewaar</span></button>{/if}
</header>

<style>
  .boven-balk { display: flex; align-items: center; gap: 8px; padding: max(8px, env(safe-area-inset-top)) 12px 8px; background: var(--paneel); box-shadow: 0 2px 10px rgba(45, 42, 50, 0.06); }
  h1 { flex: 1; font-size: 1.3rem; margin: 0 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  button { background: var(--creme); }
  .naam { background: transparent; font: inherit; font-weight: 800; max-width: 100%; justify-content: flex-start; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 8px; }
  button.hoofd { background: var(--koraal); }
  button.actief { background: var(--zon); }
</style>
