<script lang="ts">
  import Icon from './Icon.svelte';
  import TemplateKiezer from './TemplateKiezer.svelte';
  import UitdagingKiezer from './UitdagingKiezer.svelte';
  import { template } from '../assets/templates';
  import { FORMATEN } from '../document/formats';
  import { nieuweCollage } from '../document/create';
  import type { Collage, Formaat } from '../document/types';

  import type { Profiel } from '../storage/profielen';
  import MijnCollages from './MijnCollages.svelte';
  import Voet from './Voet.svelte';
  import type { CollageSamenvatting } from '../storage/collages';
  let { onStart, profiel = null, onWissel, collages = [], onOpen, onWis, onOpenBestand, onLeerkracht, onOntvang }: {
    onStart: (c: Collage, opdracht?: string, pakket?: string) => void; profiel?: Profiel | null; onWissel?: () => void;
    collages?: CollageSamenvatting[]; onOpen?: (id: string) => void; onWis?: (id: string) => void; onOpenBestand?: (f: File) => void; onLeerkracht?: () => void; onOntvang?: () => void;
  } = $props();
  let stap = $state<'menu' | 'formaat' | 'templates' | 'uitdagingen'>('menu');
  let bestandInput: HTMLInputElement;
  const formaten = Object.entries(FORMATEN) as [Formaat, (typeof FORMATEN)[Formaat]][];
</script>

<main class="start">
  {#if onLeerkracht}<button id="knop-leerkracht" class="slot" aria-label="Leerkracht" onclick={onLeerkracht}><Icon name="lock" /></button>{/if}
  <h1>Collagemaker</h1>
  {#if profiel}
    <div class="profiel">
      <span class="avatar" style:--kleur={profiel.kleur}><Icon name={profiel.symbool} size={28} /></span>
      <strong>{profiel.naam}</strong>
      {#if onWissel}<button id="knop-wissel" onclick={onWissel}><Icon name="users" /> Wissel</button>{/if}
    </div>
  {/if}
  {#if stap === 'menu'}
    <div class="kaarten">
      <button id="start-nieuw" class="kaart" style:--kleur="var(--koraal)" onclick={() => (stap = 'formaat')}>
        <Icon name="plus" size={64} /><span>Nieuw</span>
      </button>
      <button id="start-template" class="kaart" style:--kleur="var(--hemel)" onclick={() => (stap = 'templates')}>
        <Icon name="puzzle-piece" size={64} /><span>Template</span>
      </button>
      <button id="start-uitdaging" class="kaart" style:--kleur="var(--lavendel)" onclick={() => (stap = 'uitdagingen')}>
        <Icon name="trophy" size={64} /><span>Uitdaging</span>
      </button>
      {#if onOntvang}
        <button id="start-ontvang" class="kaart" style:--kleur="var(--zon)" onclick={onOntvang}>
          <Icon name="download-simple" size={64} /><span>Ontvang</span>
        </button>
      {/if}
      {#if onOpenBestand}
        <button id="start-open" class="kaart" style:--kleur="var(--mint)" onclick={() => { bestandInput.value = ''; bestandInput.click(); }}>
          <Icon name="folder-open" size={64} /><span>Open bestand</span>
        </button>
      {/if}
    </div>
    {#if collages.length && onOpen && onWis}<MijnCollages {collages} {onOpen} {onWis} />{/if}
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
  {:else if stap === 'uitdagingen'}
    <button class="terug" onclick={() => (stap = 'menu')}><Icon name="arrow-left" /> Terug</button>
    <h2>Kies een uitdaging</h2>
    <UitdagingKiezer onKies={(u) => onStart(template(u.templateId).maak(), u.opdracht, u.pakket)} />
  {/if}
  <Voet />
</main>
<input id="bestand-input" class="visueel-verborgen" type="file" accept=".collage,application/zip" bind:this={bestandInput}
  onchange={() => { const f = bestandInput.files?.[0]; if (f && onOpenBestand) onOpenBestand(f); }} />

<style>
  .profiel { display: flex; align-items: center; gap: 10px; font-size: 1.2rem; }
  .profiel .avatar { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; background: var(--kleur); color: #fff; }
  .profiel button { padding: 0 16px; }
  .start { position: relative; min-height: 100dvh; padding: max(24px, env(safe-area-inset-top)) 24px 24px; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; gap: 16px; }
  h1 { font-size: clamp(2rem, 6vw, 3.5rem); color: var(--koraal); margin-top: 16px; }
  .kaarten { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; width: min(960px, 100%); }
  .kaart { flex-direction: column; min-height: 200px; padding: 20px; border-radius: 28px; font-size: 1.4rem; background: var(--paneel); box-shadow: var(--schaduw); color: var(--kleur, var(--inkt)); }
  .formaat { color: var(--inkt); }
  .blad { display: block; height: 110px; max-width: 150px; background: var(--creme); border: 4px solid var(--hemel); border-radius: 10px; }
  .terug { align-self: flex-start; padding: 0 18px; }
  .slot { position: absolute; top: max(12px, env(safe-area-inset-top)); right: 12px; background: transparent; }
</style>
