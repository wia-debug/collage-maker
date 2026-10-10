<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import Icon from './Icon.svelte';
  import type { InzendingRij } from '../storage/db';
  import { renderInzending } from '../export/klas';

  let { rijen, onSluit }: { rijen: InzendingRij[]; onSluit: () => void } = $props();
  let i = $state(0);
  let speelt = $state(true);
  let seconden = $state(10);
  let naamAan = $state(true);
  let beelden = $state.raw<Record<string, string>>({});
  let houder: HTMLDivElement;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let vegen: { x: number } | null = null;
  let weg = false;

  const huidig = $derived(rijen[i]);

  async function zorgVoor(index: number) {
    const r = rijen[index];
    if (!r || beelden[r.id]) return;
    try {
      const { png } = await renderInzending(r, 1);
      if (!weg) beelden = { ...beelden, [r.id]: png };
    } catch { /* toont dan de naam zonder beeld */ }
  }
  function ga(stap: number) { i = (i + stap + rijen.length) % rijen.length; }

  $effect(() => {
    void zorgVoor(i);
    void zorgVoor((i + 1) % rijen.length);
  });
  $effect(() => {
    clearTimeout(timer);
    if (speelt && rijen.length > 1) timer = setTimeout(() => ga(1), seconden * 1000);
    void i;
  });

  function toets(e: KeyboardEvent) {
    if (e.key === 'ArrowRight') ga(1);
    else if (e.key === 'ArrowLeft') ga(-1);
    else if (e.key === ' ') speelt = !speelt;
    else if (e.key === 'Escape') onSluit();
    else return;
    e.preventDefault();
  }
  function neer(e: PointerEvent) { vegen = { x: e.clientX }; }
  function op(e: PointerEvent) {
    if (!vegen) return;
    const dx = e.clientX - vegen.x;
    vegen = null;
    if (Math.abs(dx) > 60) ga(dx < 0 ? 1 : -1);
  }

  onMount(() => { void houder.requestFullscreen?.().catch(() => {}); });
  onDestroy(() => {
    weg = true;
    clearTimeout(timer);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  });
</script>

<svelte:window onkeydown={toets} />

<div id="dia" class="dia" tabindex="-1" bind:this={houder} role="dialog" aria-modal="true" aria-label="Diavoorstelling" onpointerdown={neer} onpointerup={op}>
  {#if huidig}
    {#if beelden[huidig.id]}<img id="dia-beeld" src={beelden[huidig.id]} alt="Collage van {huidig.naam}" />{/if}
    {#if naamAan}<p id="dia-naam" class="naam">{huidig.naam}</p>{/if}
  {/if}
  <button id="dia-vorige" class="pijl links" aria-label="Vorige" onclick={() => ga(-1)}><Icon name="caret-left" size={40} /></button>
  <button id="dia-volgende" class="pijl rechts" aria-label="Volgende" onclick={() => ga(1)}><Icon name="caret-right" size={40} /></button>
  <div class="balk">
    <button id="dia-speel" aria-pressed={speelt} onclick={() => (speelt = !speelt)}><Icon name={speelt ? 'pause' : 'play'} /> {speelt ? 'Pauze' : 'Speel'}</button>
    {#each [5, 10, 20] as s}
      <button id="dia-tijd-{s}" aria-pressed={seconden === s} class:actief={seconden === s} onclick={() => (seconden = s)}>{s} s</button>
    {/each}
    <button id="dia-naam-aan" aria-pressed={naamAan} class:actief={naamAan} onclick={() => (naamAan = !naamAan)}><Icon name="student" /> Naam</button>
    <button id="dia-sluit" aria-label="Sluiten" onclick={onSluit}><Icon name="x" /></button>
  </div>
</div>

<style>
  .dia { position: fixed; inset: 0; z-index: 93; background: #1d1b22; display: grid; place-items: center; touch-action: pan-y; }
  img { max-width: 92vw; max-height: 78dvh; border-radius: 12px; }
  .naam { position: absolute; bottom: 96px; left: 0; right: 0; text-align: center; color: #fff; font-size: 2rem; font-weight: 800; margin: 0; }
  .pijl { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(255, 255, 255, 0.15); color: #fff; min-width: 72px; min-height: 72px; border-radius: 50%; }
  .links { left: 16px; } .rechts { right: 16px; }
  .balk { position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; background: rgba(255, 255, 255, 0.12); padding: 8px; border-radius: 22px; flex-wrap: wrap; justify-content: center; }
  .balk button { background: transparent; color: #fff; padding: 0 14px; }
  .balk button.actief { background: rgba(255, 255, 255, 0.25); }
</style>
