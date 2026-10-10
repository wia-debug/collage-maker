<script lang="ts">
  import { untrack } from 'svelte';
  import Icon from './Icon.svelte';
  import KleurPalet from './KleurPalet.svelte';
  import Schuif from './Schuif.svelte';
  import { STICKER_PACKS, stickerUrl } from '../assets/stickers';
  import type { AssetStore } from '../assets/store';
  import { FORMATEN } from '../document/formats';
  import { maakSticker } from '../document/create';
  import type { Element } from '../document/types';
  import type { Editor } from '../editor/store';

  let { editor, assets, el, startPakket = null }: { editor: Editor; assets: AssetStore; el: Element | null; startPakket?: string | null } = $props();
  let pakket = $state(untrack(() => startPakket) ?? STICKER_PACKS[0].id);
  let kleur = $state('#FF6B6B');
  const sticker = $derived(el?.type === 'sticker' ? el : null);
  const huidig = $derived(STICKER_PACKS.find((p) => p.id === pakket)!);

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
</script>

<h2>Stickers</h2>
<div class="pakketten" role="tablist">
  {#each STICKER_PACKS as p}
    <button id="pakket-{p.id}" role="tab" aria-selected={pakket === p.id} class:actief={pakket === p.id} aria-label={p.naam} onclick={() => (pakket = p.id)}>
      <Icon name={p.icoon} size={30} />
    </button>
  {/each}
</div>
<h3>{huidig.naam}</h3>
<div class="stickers">
  {#each huidig.stickers as naam}
    <button class="sticker-knop" aria-label={naam} onclick={() => voegToe(naam)}>
      <img src={stickerUrl(`${pakket}/${naam}`)} alt="" draggable="false" />
    </button>
  {/each}
</div>
<h3>Kleur</h3>
<KleurPalet waarde={sticker?.kleur ?? kleur} onKies={kiesKleur} />
{#if sticker}
  <Schuif label="Zichtbaar" min={10} max={100} waarde={Math.round((sticker.doorzichtigheid ?? 1) * 100)} onLive={(v) => editor.voorbeeld(sticker.id, { doorzichtigheid: v / 100 })} onWijzig={(v) => editor.update(sticker.id, { doorzichtigheid: v / 100 })} />
{/if}

<style>
  .pakketten { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 8px; }
  .pakketten button { background: var(--creme); flex: none; }
  .pakketten button.actief { background: var(--zon); }
  .stickers { display: grid; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); gap: 8px; margin-bottom: 16px; }
  .sticker-knop { aspect-ratio: 1; background: var(--creme); padding: 10px; }
  .sticker-knop img { width: 100%; height: 100%; pointer-events: none; }
</style>
