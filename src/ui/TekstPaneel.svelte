<script lang="ts">
  import Icon from './Icon.svelte';
  import KleurPalet from './KleurPalet.svelte';
  import Schuif from './Schuif.svelte';
  import { LETTERTYPES } from '../assets/fonts';
  import { FORMATEN } from '../document/formats';
  import type { Element, TekstElement } from '../document/types';
  import type { Editor } from '../editor/store';
  import { tekstStijlPatch } from '../editor/tekst-acties';

  let { editor, el, onNieuw, onWijzig }: { editor: Editor; el: Element | null; onNieuw: () => void; onWijzig: (id: string) => void } = $props();
  const tekst = $derived(el?.type === 'tekst' ? el : null);

  function zet(patch: Partial<TekstElement>) {
    if (!tekst) return;
    editor.update(tekst.id, tekstStijlPatch(tekst, patch, FORMATEN[editor.get().collage.formaat].breedte));
  }
</script>

<h2>Tekst</h2>
<button id="tekst-nieuw" class="hoofd breed" onclick={onNieuw}><Icon name="plus" /> Nieuwe tekst</button>

{#if tekst}
  <button id="tekst-wijzig" class="breed" onclick={() => onWijzig(tekst.id)}><Icon name="pencil" /> Tekst wijzigen</button>
  <h3>Letters</h3>
  <div class="fonts">
    {#each LETTERTYPES as l}
      <button id="font-{l.id}" class:actief={tekst.lettertype === l.id} style:font-family={l.familie} onclick={() => zet({ lettertype: l.id })}>{l.naam}</button>
    {/each}
  </div>
  <Schuif label="Grootte" min={16} max={300} waarde={tekst.grootte} onWijzig={(v) => zet({ grootte: v })} />
  <div class="rij">
    <button id="tekst-vet" aria-label="Vet" aria-pressed={tekst.vet} class:actief={tekst.vet} onclick={() => zet({ vet: !tekst.vet })}><Icon name="text-b" /></button>
    <button id="tekst-schuin" aria-label="Schuin" aria-pressed={tekst.schuin} class:actief={tekst.schuin} onclick={() => zet({ schuin: !tekst.schuin })}><Icon name="text-italic" /></button>
    <button id="tekst-links" aria-label="Links" class:actief={tekst.uitlijning === 'left'} onclick={() => zet({ uitlijning: 'left' })}><Icon name="text-align-left" /></button>
    <button id="tekst-midden" aria-label="Midden" class:actief={tekst.uitlijning === 'center'} onclick={() => zet({ uitlijning: 'center' })}><Icon name="text-align-center" /></button>
    <button id="tekst-rechts" aria-label="Rechts" class:actief={tekst.uitlijning === 'right'} onclick={() => zet({ uitlijning: 'right' })}><Icon name="text-align-right" /></button>
  </div>
  <h3>Kleur</h3>
  <KleurPalet waarde={tekst.kleur} onKies={(k) => k && zet({ kleur: k })} />
  <h3>Rand</h3>
  <KleurPalet waarde={tekst.omlijning?.kleur ?? null} metGeen onKies={(k) => zet({ omlijning: k ? { kleur: k, dikte: tekst.omlijning?.dikte ?? Math.max(2, Math.round(tekst.grootte / 15)) } : null })} />
  <Schuif label="Regelafstand" min={0.8} max={2} stap={0.1} waarde={tekst.regelafstand} onWijzig={(v) => zet({ regelafstand: v })} />
  <button id="tekst-schaduw" class="breed" aria-pressed={tekst.schaduw} class:actief={tekst.schaduw} onclick={() => zet({ schaduw: !tekst.schaduw })}>Schaduw</button>
  <h3>Ballon</h3>
  <KleurPalet waarde={tekst.ballon} metGeen onKies={(k) => zet({ ballon: k })} />
  <!-- wordart-opties -->
{/if}

<style>
  .breed { width: 100%; margin-bottom: 10px; }
  .fonts { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 16px; }
  .fonts button, .rij button, #tekst-schaduw { background: var(--creme); font-size: 1.1rem; }
  .rij { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
  .actief { background: var(--zon) !important; }
</style>
