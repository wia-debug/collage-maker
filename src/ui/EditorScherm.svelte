<script lang="ts">
  import { onDestroy, onMount, untrack } from 'svelte';
  import type { Collage, Element } from '../document/types';
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

  let { collage, opdracht = null, startPakket = null, onTerug }: { collage: Collage; opdracht?: string | null; startPakket?: string | null; onTerug: () => void } = $props();

  const editor = createEditor(untrack(() => collage));
  const assets = new AssetStore();
  const editorState = editor.state;
  let canvasEl: HTMLDivElement;
  let controller = $state.raw<CanvasController | null>(null);
  let paneel = $state<Paneel | null>(null);
  let vraagTerug = $state(false);

  const geselecteerd = $derived($editorState.collage.elementen.find((e) => e.id === $editorState.selectedId) ?? null);
  const PANEEL_VOOR: Record<Element['type'], Paneel> = { foto: 'foto', tekst: 'tekst', sticker: 'stickers', vorm: 'vormen', tekening: 'tekenen' };

  $effect(() => {
    const id = $editorState.selectedId;
    untrack(() => {
      const el = editor.get().collage.elementen.find((e) => e.id === id);
      if (el) paneel = PANEEL_VOOR[el.type];
    });
  });

  onMount(async () => {
    await assets.preload(editor.get().collage);
    controller = new CanvasController(canvasEl, editor, assets, {});
    if (import.meta.env.MODE === 'e2e') (window as any).__collage = { editor, assets, controller, maakVorm };
  });
  onDestroy(() => controller?.destroy());

  function opToets(e: KeyboardEvent) {
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

<svelte:window onkeydown={opToets} />

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
  <div class="vak-canvas" id="canvas-vlak">
    <div class="canvas" bind:this={canvasEl}></div>
    {#if geselecteerd}<ContextBalk {editor} el={geselecteerd} />{/if}
  </div>
  {#if paneel}
    <aside class="vak-paneel" id="paneel-{paneel}">
      <!-- panelen -->
    </aside>
  {/if}
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
