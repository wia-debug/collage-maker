<script lang="ts">
  import Icon from './Icon.svelte';
  import KleurPalet from './KleurPalet.svelte';
  import Schuif from './Schuif.svelte';
  import { FILTERS, filterVoorbeeld } from '../elements/filters';
  import type { AssetStore } from '../assets/store';
  import { KADERS, KADER_ALLEEN_RECHTHOEK, MASKERS, MOTIEVEN, PLAKBAND_STIJLEN } from '../elements/kaders';
  import type { Element, Masker } from '../document/types';
  import type { Editor } from '../editor/store';

  let { editor, assets, el, onKiesFoto, onCamera, onBijsnijden, onAchtergrondWeg, onMaakSticker }: { editor: Editor; assets: AssetStore; el: Element | null; onKiesFoto: (vakId?: string) => void; onCamera: (vakId?: string) => void; onBijsnijden: (id: string) => void; onAchtergrondWeg: (id: string) => void; onMaakSticker: (id: string) => void } = $props();
  const foto = $derived(el?.type === 'foto' ? el : null);
  const assetId = $derived(foto?.assetId ?? null);
  const voorbeelden = $derived.by(() => {
    if (!assetId) return {} as Record<string, string>;
    const img = assets.image(assetId);
    if (!img) return {};
    return Object.fromEntries(FILTERS.map((f) => [f.naam, filterVoorbeeld(img, img.naturalWidth, img.naturalHeight, f.naam)]));
  });

  function kiesMasker(masker: Masker) {
    if (!foto) return;
    const past = masker === 'rechthoek' || !KADER_ALLEEN_RECHTHOEK.includes(foto.kader.stijl);
    editor.update(foto.id, past ? { masker } : { masker, kader: { ...foto.kader, stijl: 'effen' } });
  }
</script>

<h2>Foto</h2>
<button id="foto-kiezen" class="hoofd breed" onclick={() => onKiesFoto(foto && !foto.assetId ? foto.id : undefined)}>
  <Icon name="image" /> {foto && !foto.assetId ? 'Kies foto voor dit vak' : 'Kies een foto'}
</button>
<button id="foto-camera" class="breed" onclick={() => onCamera(foto && !foto.assetId ? foto.id : undefined)}><Icon name="camera" /> Camera</button>
<p class="tip">Je kan ook een foto op de collage slepen of plakken.</p>
{#if foto && foto.assetId}
  <button id="foto-bijsnijden" class="breed" onclick={() => onBijsnijden(foto.id)}><Icon name="crop" /> Bijsnijden</button>
  <button id="foto-achtergrond-weg" class="breed" onclick={() => onAchtergrondWeg(foto.id)}><Icon name="magic-wand" /> Achtergrond weg</button>
  {#if foto.uitknipsel}<button id="foto-maak-sticker" class="breed" onclick={() => onMaakSticker(foto.id)}><Icon name="sticker" /> Maak sticker</button>{/if}
  <h3>Vorm</h3>
  <div class="raster">
    {#each MASKERS as m}
      <button id="masker-{m.masker}" class:actief={foto.masker === m.masker} onclick={() => kiesMasker(m.masker)}>
        <Icon name={m.icoon} size={30} /><span>{m.naam}</span>
      </button>
    {/each}
  </div>
  <h3>Kader</h3>
  <div class="raster">
    {#each KADERS as k}
      <button id="kader-{k.stijl}" class:actief={foto.kader.stijl === k.stijl} disabled={foto.masker !== 'rechthoek' && KADER_ALLEEN_RECHTHOEK.includes(k.stijl)} onclick={() => editor.update(foto.id, { kader: { ...foto.kader, stijl: k.stijl } })}>{k.naam}</button>
    {/each}
  </div>
  {#if foto.kader.stijl !== 'geen'}
    <h3>Kleur kader</h3>
    <KleurPalet waarde={foto.kader.kleur} onKies={(k) => k && editor.update(foto.id, { kader: { ...foto.kader, kleur: k } })} />
  {/if}
  {#if PLAKBAND_STIJLEN.includes(foto.kader.stijl)}
    <h3>Motief</h3>
    <div class="raster">
      {#each MOTIEVEN as m}
        <button id="motief-{m.motief}" class:actief={(foto.kader.motief ?? 'effen') === m.motief} onclick={() => editor.update(foto.id, { kader: { ...foto.kader, motief: m.motief } })}>{m.naam}</button>
      {/each}
    </div>
  {/if}
  <h3>Filter</h3>
  <div class="filters">
    {#each FILTERS as f}
      <button id="filter-{f.naam}" class:actief={foto.filter === f.naam} onclick={() => editor.update(foto.id, { filter: f.naam })}>
        {#if voorbeelden[f.naam]}<img src={voorbeelden[f.naam]} alt="" />{/if}
        <span>{f.label}</span>
      </button>
    {/each}
  </div>
  <Schuif label="Helder" min={-100} max={100} waarde={foto.helderheid} onLive={(v) => editor.voorbeeld(foto.id, { helderheid: v })} onAnnuleer={() => editor.annuleerVoorbeeld()} onWijzig={(v) => editor.update(foto.id, { helderheid: v })} />
  <Schuif label="Contrast" min={-100} max={100} waarde={foto.contrast} onLive={(v) => editor.voorbeeld(foto.id, { contrast: v })} onAnnuleer={() => editor.annuleerVoorbeeld()} onWijzig={(v) => editor.update(foto.id, { contrast: v })} />
{/if}

<style>
  .breed { width: 100%; margin-bottom: 8px; }
  .tip { color: #6b6470; margin: 0 0 16px; }
  .raster { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
  .raster button { flex-direction: column; min-height: 64px; background: var(--creme); font-size: 0.85rem; padding: 4px; }
  .raster button.actief { background: var(--zon); }
  .raster button:disabled { opacity: 0.35; cursor: not-allowed; }
  .filters { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
  .filters button { flex-direction: column; padding: 6px; background: var(--creme); font-size: 0.8rem; }
  .filters button.actief { background: var(--zon); }
  .filters img { width: 64px; height: 64px; border-radius: 10px; }
</style>
