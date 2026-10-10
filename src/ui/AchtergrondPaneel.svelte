<script lang="ts">
  import Icon from './Icon.svelte';
  import KleurPalet from './KleurPalet.svelte';
  import { PATRONEN, maakPatroon } from '../elements/patronen';
  import type { Achtergrond } from '../document/types';
  import type { Editor } from '../editor/store';
  import type { AssetStore } from '../assets/store';
  import { verkleinAfbeelding, FOUTTEKST, ImportFout } from '../import/afbeelding';
  import { toon } from './toast';

  let { editor, assets, achtergrond }: { editor: Editor; assets: AssetStore; achtergrond: Achtergrond } = $props();
  let tab = $state<'kleur' | 'verloop' | 'patroon' | 'foto'>('kleur');
  let invoer = $state<HTMLInputElement>();

  const VERLOPEN: [string, string][] = [
    ['#A0E7FF', '#FFF3C4'], ['#FFD1DC', '#FFF8EE'], ['#FFC94D', '#FF6B6B'], ['#4ECDC4', '#5AA9F2'],
    ['#A78BFA', '#FF4FD8'], ['#8BD450', '#3BB273'], ['#2F6FDB', '#1E1B4B'], ['#FFE14D', '#FF9F1C'],
  ];
  const HOEKEN = [0, 45, 90, 135];

  const verloop = $derived(achtergrond.soort === 'verloop' ? achtergrond : null);
  const patroon = $derived(achtergrond.soort === 'patroon' ? achtergrond : null);

  function zet(a: Achtergrond) {
    editor.select(null);
    editor.setAchtergrond(a);
  }

  async function kiesFoto() {
    const f = invoer?.files?.[0];
    if (!f) return;
    try {
      const id = await assets.addBlob(await verkleinAfbeelding(f));
      zet({ soort: 'foto', assetId: id });
    } catch (e) {
      toon(e instanceof ImportFout ? FOUTTEKST[e.code] : 'Er ging iets mis.', 'warning');
    }
  }
</script>

<h2>Achtergrond</h2>
<div class="tabs" id="achtergrond-tabs" role="tablist">
  <button id="tab-kleur" role="tab" aria-selected={tab === 'kleur'} class:actief={tab === 'kleur'} onclick={() => (tab = 'kleur')}><Icon name="palette" /><span>Kleur</span></button>
  <button id="tab-verloop" role="tab" aria-selected={tab === 'verloop'} class:actief={tab === 'verloop'} onclick={() => (tab = 'verloop')}><Icon name="gradient" /><span>Verloop</span></button>
  <button id="tab-patroon" role="tab" aria-selected={tab === 'patroon'} class:actief={tab === 'patroon'} onclick={() => (tab = 'patroon')}><Icon name="dots-nine" /><span>Patroon</span></button>
  <button id="tab-foto" role="tab" aria-selected={tab === 'foto'} class:actief={tab === 'foto'} onclick={() => (tab = 'foto')}><Icon name="image" /><span>Foto</span></button>
</div>

{#if tab === 'kleur'}
  <KleurPalet waarde={achtergrond.soort === 'kleur' ? achtergrond.kleur : null} onKies={(k) => k && zet({ soort: 'kleur', kleur: k })} />
{:else if tab === 'verloop'}
  <div class="tegels">
    {#each VERLOPEN as [van, naar], i}
      <button id="verloop-{i}" aria-label="Verloop {i + 1}" style:background="linear-gradient(135deg, {van}, {naar})" onclick={() => zet({ soort: 'verloop', van, naar, hoek: verloop?.hoek ?? 90 })}></button>
    {/each}
  </div>
  {#if verloop}
    <h3>Richting</h3>
    <div class="rij">
      {#each HOEKEN as h}
        <button id="hoek-{h}" aria-label="Richting {h} graden" class:actief={verloop.hoek === h} onclick={() => zet({ ...verloop, hoek: h })}>
          <span class="pijl" style:transform="rotate({h}deg)"><Icon name="arrow-right" /></span>
        </button>
      {/each}
    </div>
  {/if}
{:else if tab === 'patroon'}
  <div class="tegels">
    {#each PATRONEN as p}
      <button id="patroon-{p.patroon}" aria-label={p.naam}
        style:background-image="url({maakPatroon(p.patroon, patroon?.kleur ?? '#FF6B6B', patroon?.achtergrondkleur ?? '#FFF8EE').toDataURL()})"
        onclick={() => zet({ soort: 'patroon', patroon: p.patroon, kleur: patroon?.kleur ?? '#FF6B6B', achtergrondkleur: patroon?.achtergrondkleur ?? '#FFF8EE' })}></button>
    {/each}
  </div>
  {#if patroon}
    <h3>Kleur patroon</h3>
    <KleurPalet waarde={patroon.kleur} onKies={(k) => k && zet({ ...patroon, kleur: k })} />
    <h3>Kleur ondergrond</h3>
    <KleurPalet waarde={patroon.achtergrondkleur} onKies={(k) => k && zet({ ...patroon, achtergrondkleur: k })} />
  {/if}
{:else}
  <button id="achtergrond-foto" class="hoofd breed" onclick={() => { invoer!.value = ""; invoer!.click(); }}><Icon name="image" /> Kies een foto</button>
  <input class="visueel-verborgen" type="file" accept="image/*" bind:this={invoer} onchange={kiesFoto} />
{/if}

<style>
  .tabs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 16px; }
  .tabs button { flex-direction: column; font-size: 0.8rem; background: var(--creme); min-height: 64px; }
  .tabs button.actief, .rij button.actief { background: var(--zon); }
  .tegels { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
  .tegels button { aspect-ratio: 1; border: 3px solid var(--rand); background-size: 40px; }
  .rij { display: flex; gap: 8px; margin-bottom: 16px; }
  .rij button { background: var(--creme); }
  .pijl { display: inline-flex; }
  .breed { width: 100%; }
</style>
