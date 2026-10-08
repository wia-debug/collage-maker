<script lang="ts">
  import { onDestroy, onMount, untrack } from 'svelte';
  import type { Collage, Element, FotoElement, Uitsnede } from '../document/types';
  import BijsnijDialoog from './BijsnijDialoog.svelte';
  import { maakVorm } from '../document/create';
  import { createEditor } from '../editor/store';
  import { CanvasController } from '../editor/canvas';
  import { toetsNaarActie } from '../editor/toetsen';
  import { AssetStore } from '../assets/store';
  import type { Paneel } from './types';
  import BovenBalk from './BovenBalk.svelte';
  import GereedschapBalk from './GereedschapBalk.svelte';
  import ContextBalk from './ContextBalk.svelte';
  import Dialoog from './Dialoog.svelte';
  import VormPaneel from './VormPaneel.svelte';
  import StickerPaneel from './StickerPaneel.svelte';
  import FotoPaneel from './FotoPaneel.svelte';
  import TekstPaneel from './TekstPaneel.svelte';
  import TekstInvoer from './TekstInvoer.svelte';
  import TekenPaneel from './TekenPaneel.svelte';
  import AchtergrondPaneel from './AchtergrondPaneel.svelte';
  import { tekstKlaar } from '../editor/tekst-acties';
  import { laadLettertypes } from '../assets/fonts';
  import { voegFotoToe } from '../editor/foto-acties';
  import { afbeeldingenUit, FOUTTEKST, ImportFout } from '../import/afbeelding';
  import { toon } from './toast';

  let { collage, opdracht = null, startPakket = null, onTerug }: { collage: Collage; opdracht?: string | null; startPakket?: string | null; onTerug: () => void } = $props();

  const editor = createEditor(untrack(() => collage));
  const assets = new AssetStore();
  const editorState = editor.state;
  let canvasEl: HTMLDivElement;
  let controller = $state.raw<CanvasController | null>(null);
  let paneel = $state<Paneel | null>(null);
  let vraagTerug = $state(false);

  const geselecteerd = $derived($editorState.collage.elementen.find((e) => e.id === $editorState.selectedId) ?? null);
  const PANEEL_VOOR: Record<Element['type'], Paneel | null> = { foto: 'foto', tekst: 'tekst', sticker: 'stickers', vorm: 'vormen', tekening: null };

  $effect(() => {
    const id = $editorState.selectedId;
    untrack(() => {
      const el = editor.get().collage.elementen.find((e) => e.id === id);
      const p = el ? PANEEL_VOOR[el.type] : null;
      if (p) paneel = p;
    });
  });

  $effect(() => {
    if (paneel !== 'tekenen') untrack(() => controller)?.setGereedschap('selecteer');
  });

  onMount(async () => {
    await Promise.all([assets.preload(editor.get().collage), laadLettertypes()]);
    controller = new CanvasController(canvasEl, editor, assets, { onVakTik: (id) => kiesFoto(id) });
    if (import.meta.env.MODE === 'e2e') (window as any).__collage = { editor, assets, controller, maakVorm };
  });
  onDestroy(() => controller?.destroy());

  let tekstInvoer: { openen(tekst: string, id: string | null): void };

  function wijzigTekst(id: string) {
    const el = editor.get().collage.elementen.find((e) => e.id === id);
    if (el?.type === 'tekst') tekstInvoer.openen(el.tekst, id);
  }

  let bijsnijden = $state<{ id: string; bron: HTMLImageElement; start: Uitsnede | null } | null>(null);

  function openBijsnijden(id: string) {
    const f = editor.get().collage.elementen.find((e) => e.id === id) as FotoElement | undefined;
    const bron = f?.assetId ? assets.image(f.assetId) : undefined;
    if (f && bron) bijsnijden = { id, bron, start: f.uitsnede };
  }

  function klaarBijsnijden(u: Uitsnede) {
    if (!bijsnijden) return;
    const f = editor.get().collage.elementen.find((e) => e.id === bijsnijden!.id) as FotoElement;
    editor.update(f.id, { uitsnede: u, hoogte: Math.round((f.breedte * u.hoogte) / u.breedte) });
    bijsnijden = null;
  }

  let fotoInput: HTMLInputElement;
  let fotoVak: string | undefined;

  function meldFout(e: unknown) {
    toon(e instanceof ImportFout ? FOUTTEKST[e.code] : 'Er ging iets mis. Probeer het nog eens.', 'warning');
  }

  function kiesFoto(vakId?: string) {
    fotoVak = vakId;
    fotoInput.value = '';
    fotoInput.click();
  }

  async function voegFotosToe(blobs: Blob[], positie?: { x: number; y: number }, vakId?: string) {
    for (const [i, b] of blobs.entries()) {
      try {
        await voegFotoToe(editor, assets, b, { positie: positie && { x: positie.x + i * 40, y: positie.y + i * 40 }, vakId: i === 0 ? vakId : undefined });
      } catch (e) { meldFout(e); }
    }
  }

  async function opDrop(e: DragEvent) {
    e.preventDefault();
    if (!e.dataTransfer) return;
    const opCanvas = (e.target as HTMLElement | null)?.closest?.('#canvas-vlak');
    const positie = opCanvas ? controller?.naarCanvas(e.clientX, e.clientY) : undefined;
    try { await voegFotosToe(await afbeeldingenUit(e.dataTransfer), positie); } catch (err) { meldFout(err); }
  }

  async function opPlak(e: ClipboardEvent) {
    if ((e.target as HTMLElement | null)?.closest?.('input, textarea, [contenteditable]')) return;
    const cd = e.clipboardData;
    if (!cd || !(cd.files.length || cd.types.includes('text/uri-list'))) return;
    e.preventDefault();
    try { await voegFotosToe(await afbeeldingenUit(cd)); } catch (err) { meldFout(err); }
  }

  function opToets(e: KeyboardEvent) {
    if (bijsnijden) return;
    if ((e.target as HTMLElement).closest('input, textarea, [contenteditable]')) return;
    const actie = toetsNaarActie(e);
    if (!actie) return;
    const el = geselecteerd;
    switch (actie.soort) {
      case 'ongedaan': editor.undo(); break;
      case 'opnieuw': editor.redo(); break;
      case 'deselecteer': editor.select(null); break;
      case 'wissen': if (!el) return; editor.remove(el.id); break;
      case 'kopie': if (!el) return; editor.duplicate(el.id); break;
      case 'schuif': if (!el || el.vergrendeld) return; editor.update(el.id, { x: el.x + actie.dx, y: el.y + actie.dy }); break;
    }
    e.preventDefault();
  }
</script>

<svelte:window onkeydown={opToets} onpaste={opPlak} ondragover={(e) => e.preventDefault()} ondrop={opDrop} />

<div class="editor">
  <div class="vak-boven">
    <BovenBalk
      naam={$editorState.collage.naam}
      kanOngedaan={$editorState.canUndo}
      kanOpnieuw={$editorState.canRedo}
      onTerug={() => (vraagTerug = true)}
      onOngedaan={() => editor.undo()}
      onOpnieuw={() => editor.redo()}
    />
  </div>
  <!-- opdrachtbalk -->
  <div class="vak-tools"><GereedschapBalk actief={paneel} onKies={(p) => (paneel = paneel === p ? null : p)} /></div>
  <div class="vak-canvas" id="canvas-vlak" role="application" aria-label="Collage">
    <div class="canvas" bind:this={canvasEl}></div>
    {#if geselecteerd}<ContextBalk {editor} el={geselecteerd} onTekst={() => wijzigTekst(geselecteerd!.id)} onBijsnijden={() => openBijsnijden(geselecteerd!.id)} />{/if}
  </div>
  {#if paneel}
    <aside class="vak-paneel" id="paneel-{paneel}">
      {#if paneel === 'vormen'}<VormPaneel {editor} el={geselecteerd} />{/if}
      {#if paneel === 'stickers'}<StickerPaneel {editor} {assets} el={geselecteerd} {startPakket} />{/if}
      {#if paneel === 'foto'}<FotoPaneel {editor} {assets} el={geselecteerd} onKiesFoto={kiesFoto} onBijsnijden={openBijsnijden} />{/if}
      {#if paneel === 'tekst'}<TekstPaneel {editor} el={geselecteerd} onNieuw={() => tekstInvoer.openen('', null)} onWijzig={wijzigTekst} />{/if}
      {#if paneel === 'tekenen'}<TekenPaneel {controller} />{/if}
      {#if paneel === 'achtergrond'}<AchtergrondPaneel {editor} {assets} achtergrond={$editorState.collage.achtergrond} />{/if}
      <!-- panelen -->
    </aside>
  {/if}
  <input id="foto-input" class="visueel-verborgen" type="file" accept="image/*" multiple bind:this={fotoInput}
    onchange={() => voegFotosToe([...(fotoInput.files ?? [])], undefined, fotoVak)} />
</div>

{#if vraagTerug}
  <Dialoog
    titel="Stoppen met deze collage?"
    tekst="Je collage is nog niet bewaard. Bewaar hem eerst als je hem wil houden."
    knoppen={[
      { label: 'Verder werken', hoofd: true, actie: () => (vraagTerug = false) },
      { label: 'Stoppen', gevaar: true, actie: onTerug },
    ]}
  />
{/if}

{#if bijsnijden}
  <BijsnijDialoog bron={bijsnijden.bron} start={bijsnijden.start} onKlaar={klaarBijsnijden} onAnnuleer={() => (bijsnijden = null)} />
{/if}

<TekstInvoer bind:this={tekstInvoer} onKlaar={(t, id) => tekstKlaar(editor, id, t)} />

<style>
  .editor {
    display: grid; height: 100dvh;
    grid-template-columns: auto 1fr auto;
    grid-template-rows: auto auto 1fr;
    grid-template-areas: 'boven boven boven' 'opdracht opdracht opdracht' 'tools canvas paneel';
  }
  .vak-boven { grid-area: boven; z-index: 2; }
  .vak-tools { grid-area: tools; display: flex; }
  .vak-canvas { grid-area: canvas; position: relative; background: var(--werkvlak); overflow: hidden; touch-action: none; min-height: 0; min-width: 0; }
  .canvas { position: absolute; inset: 0; }
  .vak-paneel { grid-area: paneel; width: 340px; overflow-y: auto; background: var(--paneel); padding: 16px; box-sizing: border-box; box-shadow: -2px 0 12px rgba(45, 42, 50, 0.06); }
  @media (orientation: portrait) {
    .editor {
      grid-template-columns: 1fr;
      grid-template-rows: auto auto 1fr auto auto;
      grid-template-areas: 'boven' 'opdracht' 'canvas' 'paneel' 'tools';
    }
    .vak-paneel { width: auto; max-height: 42dvh; border-radius: 24px 24px 0 0; }
  }
</style>
