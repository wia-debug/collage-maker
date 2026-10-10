<script lang="ts">
  import Icon from './Icon.svelte';
  import KleurPalet from './KleurPalet.svelte';
  import Schuif from './Schuif.svelte';
  import { LETTERTYPES } from '../assets/fonts';
  import { FORMATEN } from '../document/formats';
  import type { Element, TekstElement } from '../document/types';
  import type { Editor } from '../editor/store';
  import { tekstStijlPatch } from '../editor/tekst-acties';
  import { WORDART_PRESETS, wordartPreset } from '../assets/wordart-presets';
  import { wordartVoorbeeld } from '../elements/wordart';
  import type { WordArt, WordArtVorm } from '../document/types';

  let { editor, el, onNieuw, onWijzig }: { editor: Editor; el: Element | null; onNieuw: () => void; onWijzig: (id: string) => void } = $props();
  const tekst = $derived(el?.type === 'tekst' ? el : null);

  function zet(patch: Partial<TekstElement>) {
    if (!tekst) return;
    editor.update(tekst.id, tekstStijlPatch(tekst, patch, FORMATEN[editor.get().collage.formaat].breedte));
  }

  function live(patch: Partial<TekstElement>) {
    if (!tekst) return;
    editor.voorbeeld(tekst.id, tekstStijlPatch(tekst, patch, FORMATEN[editor.get().collage.formaat].breedte));
  }

  const VORMEN: { vorm: WordArtVorm; naam: string }[] = [
    { vorm: 'recht', naam: 'Recht' }, { vorm: 'boog-omhoog', naam: 'Boog' }, { vorm: 'boog-omlaag', naam: 'Lach' },
    { vorm: 'cirkel', naam: 'Rond' }, { vorm: 'golf', naam: 'Golf' },
  ];
  function zetWordArt(patch: Partial<WordArt>) {
    if (tekst?.wordart) zet({ wordart: { ...tekst.wordart, ...patch } });
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
  <Schuif label="Grootte" min={16} max={300} waarde={tekst.grootte} onLive={(v) => live({ grootte: v })} onWijzig={(v) => zet({ grootte: v })} />
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
  <Schuif label="Regelafstand" min={0.8} max={2} stap={0.1} waarde={tekst.regelafstand} onLive={(v) => live({ regelafstand: v })} onWijzig={(v) => zet({ regelafstand: v })} />
  <button id="tekst-schaduw" class="breed" aria-pressed={tekst.schaduw} class:actief={tekst.schaduw} onclick={() => zet({ schaduw: !tekst.schaduw })}>Schaduw</button>
  <h3>Ballon</h3>
  <KleurPalet waarde={tekst.ballon} metGeen onKies={(k) => zet({ ballon: k })} />
  <h3>WordArt</h3>
  <div class="wordart">
    <button id="wordart-geen" class:actief={!tekst.wordart} onclick={() => zet({ wordart: null })}>Geen</button>
    {#each WORDART_PRESETS as p}
      <button id="wordart-{p.id}" aria-label={p.naam} onclick={() => zet({ wordart: wordartPreset(p.id) })}>
        <img src={wordartVoorbeeld(p.id)} alt="" />
      </button>
    {/each}
  </div>
  {#if tekst.wordart}
    <h3>Vorm</h3>
    <div class="rij">
      {#each VORMEN as v}
        <button id="wordart-vorm-{v.vorm}" class:actief={tekst.wordart.vorm === v.vorm} onclick={() => zetWordArt({ vorm: v.vorm })}>{v.naam}</button>
      {/each}
    </div>
    <h3>Letterkleur</h3>
    <KleurPalet waarde={tekst.wordart.vulling.kleuren[0] ?? null} onKies={(k) => k && zetWordArt({ vulling: { soort: tekst.wordart!.vulling.soort === 'regenboog' ? 'kleur' : tekst.wordart!.vulling.soort, kleuren: [k, ...tekst.wordart!.vulling.kleuren.slice(1)] } })} />
    {#if tekst.wordart.vulling.soort === 'verloop'}
      <h3>Tweede kleur</h3>
      <KleurPalet waarde={tekst.wordart.vulling.kleuren[1] ?? null} onKies={(k) => k && zetWordArt({ vulling: { soort: 'verloop', kleuren: [tekst.wordart!.vulling.kleuren[0], k] } })} />
    {/if}
  {/if}
{/if}

<style>
  .breed { width: 100%; margin-bottom: 10px; }
  .fonts { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 16px; }
  .fonts button, .rij button, #tekst-schaduw { background: var(--creme); font-size: 1.1rem; }
  .rij { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
  .actief { background: var(--zon) !important; }
  .wordart { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
  .wordart button { background: var(--creme); padding: 4px; min-height: 64px; }
  .wordart img { width: 100%; height: auto; }
</style>
