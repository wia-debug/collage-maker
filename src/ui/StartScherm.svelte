<script lang="ts">
  import Icon from './Icon.svelte';
  import TemplateKiezer from './TemplateKiezer.svelte';
  import { FORMATEN } from '../document/formats';
  import { nieuweCollage } from '../document/create';
  import type { Collage, Formaat } from '../document/types';

  let { onStart }: { onStart: (c: Collage, opdracht?: string, pakket?: string) => void } = $props();
  let stap = $state<'menu' | 'formaat' | 'templates'>('menu');
  const formaten = Object.entries(FORMATEN) as [Formaat, (typeof FORMATEN)[Formaat]][];
</script>

<main class="start">
  <h1>Collagemaker</h1>
  {#if stap === 'menu'}
    <div class="kaarten">
      <button id="start-nieuw" class="kaart" style:--kleur="var(--koraal)" onclick={() => (stap = 'formaat')}>
        <Icon name="plus" size={64} /><span>Nieuw</span>
      </button>
      <button id="start-template" class="kaart" style:--kleur="var(--hemel)" onclick={() => (stap = 'templates')}>
        <Icon name="puzzle-piece" size={64} /><span>Template</span>
      </button>
      <!-- startkaarten -->
    </div>
  {:else if stap === 'formaat'}
    <button class="terug" onclick={() => (stap = 'menu')}><Icon name="arrow-left" /> Terug</button>
    <h2>Kies een vorm</h2>
    <div class="kaarten">
      {#each formaten as [id, f]}
        <button id="formaat-{id}" class="kaart formaat" onclick={() => onStart(nieuweCollage(id))}>
          <span class="blad" style:aspect-ratio="{f.breedte} / {f.hoogte}"></span>
          <span>{f.naam}</span>
        </button>
      {/each}
    </div>
  {:else if stap === 'templates'}
    <button class="terug" onclick={() => (stap = 'menu')}><Icon name="arrow-left" /> Terug</button>
    <h2>Kies een template</h2>
    <TemplateKiezer onKies={(t) => onStart(t.maak())} />
  {/if}
</main>

<style>
  .start { min-height: 100dvh; padding: max(24px, env(safe-area-inset-top)) 24px 24px; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; gap: 16px; }
  h1 { font-size: clamp(2rem, 6vw, 3.5rem); color: var(--koraal); margin-top: 16px; }
  .kaarten { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; width: min(960px, 100%); }
  .kaart { flex-direction: column; min-height: 200px; padding: 20px; border-radius: 28px; font-size: 1.4rem; background: var(--paneel); box-shadow: var(--schaduw); color: var(--kleur, var(--inkt)); }
  .formaat { color: var(--inkt); }
  .blad { display: block; height: 110px; max-width: 150px; background: var(--creme); border: 4px solid var(--hemel); border-radius: 10px; }
  .terug { align-self: flex-start; padding: 0 18px; }
</style>
