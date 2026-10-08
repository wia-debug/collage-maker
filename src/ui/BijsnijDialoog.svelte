<script lang="ts">
  import { onDestroy, onMount, untrack } from 'svelte';
  import Konva from 'konva';
  import Icon from './Icon.svelte';
  import type { Uitsnede } from '../document/types';
  import { VERHOUDINGEN, klemUitsnede, pasVerhoudingToe, verhoudingGetal, type Verhouding } from '../editor/uitsnede';

  let { bron, start, onKlaar, onAnnuleer }: { bron: HTMLImageElement; start: Uitsnede | null; onKlaar: (u: Uitsnede) => void; onAnnuleer: () => void } = $props();

  let vlak: HTMLDivElement;
  let stage: Konva.Stage;
  let rect: Konva.Rect;
  let gat: Konva.Rect;
  let tr: Konva.Transformer;
  let s = 1;
  let verhouding = $state<Verhouding>('vrij');
  const maat = untrack(() => ({ breedte: bron.naturalWidth, hoogte: bron.naturalHeight }));

  function zet(u: Uitsnede) {
    rect.setAttrs({ x: u.x * s, y: u.y * s, width: u.breedte * s, height: u.hoogte * s, scaleX: 1, scaleY: 1 });
    synchroniseer();
  }

  function synchroniseer() {
    gat.setAttrs({ x: rect.x(), y: rect.y(), width: rect.width() * rect.scaleX(), height: rect.height() * rect.scaleY() });
    stage.batchDraw();
  }

  function huidig(): Uitsnede {
    return klemUitsnede({ x: rect.x() / s, y: rect.y() / s, breedte: (rect.width() * rect.scaleX()) / s, hoogte: (rect.height() * rect.scaleY()) / s }, maat);
  }

  function kiesVerhouding(v: Verhouding) {
    verhouding = v;
    const r = verhoudingGetal(v);
    tr.keepRatio(r !== null);
    if (r !== null) zet(pasVerhoudingToe(r, maat));
  }

  onMount(() => {
    const w = vlak.clientWidth, h = vlak.clientHeight;
    s = Math.min(w / maat.breedte, h / maat.hoogte) * 0.92;
    stage = new Konva.Stage({ container: vlak, width: w, height: h });
    const laag = new Konva.Layer({ x: (w - maat.breedte * s) / 2, y: (h - maat.hoogte * s) / 2 });
    const donker = new Konva.Layer({ x: laag.x(), y: laag.y(), listening: false });
    laag.add(new Konva.Image({ image: bron, width: maat.breedte * s, height: maat.hoogte * s }));
    donker.add(new Konva.Rect({ width: maat.breedte * s, height: maat.hoogte * s, fill: 'rgba(0,0,0,0.55)' }));
    gat = new Konva.Rect({ fill: '#000', globalCompositeOperation: 'destination-out' });
    donker.add(gat);
    const ui = new Konva.Layer({ x: laag.x(), y: laag.y() });
    rect = new Konva.Rect({
      stroke: '#FFFFFF', strokeWidth: 3, dash: [10, 6], draggable: true,
      dragBoundFunc(pos) {
        const b = rect.width() * rect.scaleX(), hh = rect.height() * rect.scaleY();
        return {
          x: Math.min(laag.x() + maat.breedte * s - b, Math.max(laag.x(), pos.x)),
          y: Math.min(laag.y() + maat.hoogte * s - hh, Math.max(laag.y(), pos.y)),
        };
      },
    });
    tr = new Konva.Transformer({
      nodes: [rect], rotateEnabled: false, keepRatio: false, flipEnabled: false,
      enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      anchorSize: 30, anchorCornerRadius: 15, anchorFill: '#FFFFFF', anchorStroke: '#FF6B6B', borderEnabled: false,
      boundBoxFunc(oud, nieuw) {
        const binnen = nieuw.x >= laag.x() - 1 && nieuw.y >= laag.y() - 1 && nieuw.x + nieuw.width <= laag.x() + maat.breedte * s + 1 && nieuw.y + nieuw.height <= laag.y() + maat.hoogte * s + 1;
        return binnen && nieuw.width > 20 && nieuw.height > 20 ? nieuw : oud;
      },
    });
    ui.add(rect, tr);
    stage.add(laag, donker, ui);
    rect.on('dragmove transform', synchroniseer);
    zet(start ?? { x: 0, y: 0, ...maat });
  });

  onDestroy(() => stage?.destroy());
</script>

<div class="scherm" role="dialog" aria-modal="true" aria-label="Foto bijsnijden">
  <div class="balk">
    {#each VERHOUDINGEN as v}
      <button id="verhouding-{v.replace(':', '-')}" class:actief={verhouding === v} onclick={() => kiesVerhouding(v)}>{v === 'vrij' ? 'Vrij' : v}</button>
    {/each}
  </div>
  <div class="vlak" bind:this={vlak}></div>
  <div class="balk">
    <button id="bijsnij-annuleer" onclick={onAnnuleer}><Icon name="x" /> Stop</button>
    <button id="bijsnij-klaar" class="hoofd" onclick={() => onKlaar(huidig())}><Icon name="check" /> Klaar</button>
  </div>
</div>

<style>
  .scherm { position: fixed; inset: 0; z-index: 80; background: #1e1b24; display: grid; grid-template-rows: auto 1fr auto; padding: max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom)); gap: 12px; }
  .balk { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .balk button { padding: 0 20px; }
  .balk button.actief { background: var(--zon); }
  .vlak { min-height: 0; touch-action: none; }
</style>
