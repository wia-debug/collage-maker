<script lang="ts">
  import { onDestroy, onMount, untrack } from 'svelte';
  import Icon from './Icon.svelte';
  import KleurPalet from './KleurPalet.svelte';
  import Schuif from './Schuif.svelte';
  import Dialoog from './Dialoog.svelte';
  import { STICKER_PACKS, stickerUrl } from '../assets/stickers';
  import type { AssetStore } from '../assets/store';
  import { FORMATEN } from '../document/formats';
  import { maakFoto, maakSticker } from '../document/create';
  import type { Element } from '../document/types';
  import type { Editor } from '../editor/store';
  import { db } from '../storage/db';
  import type { EigenStickerRij } from '../storage/db';
  import { gebruikEigenSticker, lijstEigenStickers, wisEigenSticker } from '../storage/eigen-stickers';
  import { pasIn } from '../import/afbeelding';

  let { editor, assets, el, startPakket = null, profielId = null }: { editor: Editor; assets: AssetStore; el: Element | null; startPakket?: string | null; profielId?: string | null } = $props();
  let pakket = $state(untrack(() => startPakket) ?? STICKER_PACKS[0].id);
  let kleur = $state('#FF6B6B');
  const sticker = $derived(el?.type === 'sticker' ? el : null);
  const huidig = $derived(pakket === 'mijn' ? null : STICKER_PACKS.find((p) => p.id === pakket) ?? null);

  let eigen = $state.raw<{ rij: EigenStickerRij; url: string }[]>([]);
  let bewerk = $state(false);
  let teWissen = $state<string | null>(null);
  let drukTimer: ReturnType<typeof setTimeout> | undefined;

  async function voegToe(naam: string) {
    const s = `${pakket}/${naam}`;
    await assets.ensureSticker(s, kleur);
    const f = FORMATEN[editor.get().collage.formaat];
    editor.add(maakSticker({ x: f.breedte / 2, y: f.hoogte / 2, sticker: s, kleur, grootte: 260 }));
  }

  async function kiesKleur(k: string | null) {
    if (!k) return;
    kleur = k;
    if (sticker) {
      await assets.ensureSticker(sticker.sticker, k);
      editor.update(sticker.id, { kleur: k });
    }
  }

  async function laadEigen() {
    for (const e of eigen) URL.revokeObjectURL(e.url);
    eigen = (await lijstEigenStickers(db, profielId)).map((rij) => ({ rij, url: URL.createObjectURL(rij.blob) }));
  }
  function kiesMijn() { pakket = 'mijn'; bewerk = false; void laadEigen(); }

  async function voegEigenToe(rij: EigenStickerRij) {
    if (bewerk) return;
    const id = await assets.addBlob(rij.blob);
    const img = assets.image(id)!;
    const maat = pasIn(img.naturalWidth, img.naturalHeight, 300);
    const f = FORMATEN[editor.get().collage.formaat];
    editor.add({ ...maakFoto({ x: f.breedte / 2, y: f.hoogte / 2, ...maat, assetId: id }), uitknipsel: true, verhoudingVast: true });
    void gebruikEigenSticker(db, rij.id);
  }
  async function wisBevestigd() {
    const id = teWissen;
    teWissen = null;
    if (!id) return;
    await wisEigenSticker(db, id);
    await laadEigen();
  }
  function drukStart() { drukTimer = setTimeout(() => (bewerk = true), 600); }
  function drukStop() { clearTimeout(drukTimer); }
  onMount(() => { if (pakket === 'mijn') void laadEigen(); });
  onDestroy(() => { drukStop(); for (const e of eigen) URL.revokeObjectURL(e.url); });
</script>

<h2>Stickers</h2>
<div class="pakketten" role="tablist">
  <button id="pakket-mijn" role="tab" aria-selected={pakket === 'mijn'} class:actief={pakket === 'mijn'} aria-label="Mijn stickers" onclick={kiesMijn}>
    <Icon name="user-circle" size={30} />
  </button>
  {#each STICKER_PACKS as p}
    <button id="pakket-{p.id}" role="tab" aria-selected={pakket === p.id} class:actief={pakket === p.id} aria-label={p.naam} onclick={() => (pakket = p.id)}>
      <Icon name={p.icoon} size={30} />
    </button>
  {/each}
</div>
{#if pakket === 'mijn'}
  <h3>Mijn stickers</h3>
  {#if !eigen.length}
    <p id="mijn-leeg" class="tip">Haal de achtergrond van een foto weg en tik op Maak sticker.</p>
  {:else}
    <button id="mijn-bewerk" class:actief={bewerk} aria-pressed={bewerk} onclick={() => (bewerk = !bewerk)}><Icon name="trash" /> Wissen</button>
    <div class="stickers">
      {#each eigen as e (e.rij.id)}
        <div class="eigen-vak">
          <button class="sticker-knop eigen-sticker" aria-label="Mijn sticker" onclick={() => void voegEigenToe(e.rij)} onpointerdown={drukStart} onpointerup={drukStop} onpointerleave={drukStop}>
            <img src={e.url} alt="" draggable="false" />
          </button>
          {#if bewerk}<button class="eigen-wis" aria-label="Sticker wissen" onclick={() => (teWissen = e.rij.id)}><Icon name="x" size={20} /></button>{/if}
        </div>
      {/each}
    </div>
  {/if}
{:else if huidig}
  <h3>{huidig.naam}</h3>
  <div class="stickers">
    {#each huidig.stickers as naam}
      <button class="sticker-knop" aria-label={naam} onclick={() => voegToe(naam)}>
        <img src={stickerUrl(`${pakket}/${naam}`)} alt="" draggable="false" />
      </button>
    {/each}
  </div>
{/if}
<h3>Kleur</h3>
<KleurPalet waarde={sticker?.kleur ?? kleur} onKies={kiesKleur} />
{#if sticker}
  <Schuif label="Zichtbaar" min={10} max={100} waarde={Math.round((sticker.doorzichtigheid ?? 1) * 100)} onLive={(v) => editor.voorbeeld(sticker.id, { doorzichtigheid: v / 100 })} onAnnuleer={() => editor.annuleerVoorbeeld()} onWijzig={(v) => editor.update(sticker.id, { doorzichtigheid: v / 100 })} />
{/if}
{#if teWissen}
  <Dialoog titel="Deze sticker wissen?" tekst="Je kan hem daarna niet meer gebruiken." knoppen={[
    { label: 'Niet wissen', hoofd: true, actie: () => (teWissen = null) },
    { label: 'Wissen', gevaar: true, actie: () => void wisBevestigd() },
  ]} />
{/if}

<style>
  .pakketten { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 8px; }
  .pakketten button { background: var(--creme); flex: none; }
  .pakketten button.actief { background: var(--zon); }
  .stickers { display: grid; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); gap: 8px; margin-bottom: 16px; }
  .sticker-knop { aspect-ratio: 1; background: var(--creme); padding: 10px; }
  .sticker-knop img { width: 100%; height: 100%; pointer-events: none; }
  .eigen-vak { position: relative; }
  .eigen-wis { position: absolute; top: -6px; right: -6px; min-width: 56px; min-height: 56px; border-radius: 50%; background: #fde2e1; }
  .tip { color: #6b6470; }
</style>
