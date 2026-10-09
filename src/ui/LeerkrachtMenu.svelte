<script lang="ts">
  import { onDestroy } from 'svelte';
  import Icon from './Icon.svelte';
  import CijferCode from './CijferCode.svelte';
  import SymboolCode from './SymboolCode.svelte';
  import Dialoog from './Dialoog.svelte';
  import { db } from '../storage/db';
  import { controleerCode } from '../storage/hash';
  import { profielenActief, schrijfInstellingen, type Instellingen, type Toestel } from '../storage/instellingen';
  import { lijstProfielen, PIN_LENGTE, PIN_SYMBOLEN, wisProfiel, zetPin, type Profiel } from '../storage/profielen';
  import { wisAlles } from '../storage/opstart';
  import { startTour, tourGezien } from '../tour/tour';
  import { toon } from './toast';

  let { inst, onInstellingen, onSluit }: { inst: Instellingen; onInstellingen: (i: Instellingen) => void; onSluit: () => void } = $props();
  let open = $state(false);
  let fout = $state('');
  let profielen = $state.raw<Profiel[]>([]);
  let pinVoor = $state.raw<Profiel | null>(null);
  let pinStap = $state<'pin' | 'herhaal'>('pin');
  let pinFout = $state('');
  let eerstePin: string[] = [];
  let wisVoor = $state.raw<Profiel | null>(null);
  let allesWissen = $state(false);

  const TOESTELLEN: { id: Toestel; naam: string; icoon: string }[] = [
    { id: 'ipad', naam: 'Gedeelde iPad', icoon: 'device-tablet' },
    { id: 'chromebook', naam: 'Chromebook', icoon: 'laptop' },
    { id: 'pc', naam: 'Computer', icoon: 'desktop' },
  ];

  let tourTimer: ReturnType<typeof setTimeout> | undefined;
  onDestroy(() => clearTimeout(tourTimer));

  async function codeKlaar(c: string) {
    if (inst.master && (await controleerCode(c, inst.master))) {
      open = true;
      fout = '';
      profielen = await lijstProfielen(db);
      if (!tourGezien('leerkracht')) tourTimer = setTimeout(() => startTour('leerkracht'), 300);
    } else fout = 'Dat is niet de juiste code.';
  }

  async function zet(patch: Partial<Instellingen>) { onInstellingen(await schrijfInstellingen(db, patch)); }

  function pinKlaar(p: string[]) { eerstePin = p; pinFout = ''; pinStap = 'herhaal'; }
  async function pinHerhaal(p: string[]) {
    if (!pinVoor) return;
    if (p.join('|') !== eerstePin.join('|')) { pinFout = 'De codes zijn niet gelijk. Probeer opnieuw.'; pinStap = 'pin'; return; }
    await zetPin(db, pinVoor.id, p);
    pinVoor = null;
    toon('Nieuwe code bewaard.', 'check-circle');
  }

  async function wisBevestigd() {
    const p = wisVoor;
    wisVoor = null;
    if (!p) return;
    await wisProfiel(db, p.id);
    profielen = await lijstProfielen(db);
  }

  async function allesBevestigd() {
    allesWissen = false;
    await wisAlles(db);
    location.reload();
  }
</script>

<div class="scherm">
  <div class="menu" role="dialog" aria-modal="true" aria-labelledby="leerkracht-titel">
    <button id="leerkracht-sluit" class="sluit" aria-label="Sluiten" onclick={onSluit}><Icon name="x" /></button>
    <h1 id="leerkracht-titel">Voor de leerkracht</h1>
    {#if !open}
      <CijferCode titel="Typ je code" {fout} onKlaar={codeKlaar} />
    {:else if pinVoor}
      <p>Nieuwe geheime code voor <strong>{pinVoor.naam}</strong></p>
      {#if pinStap === 'pin'}
        <SymboolCode titel="Kies de nieuwe code" symbolen={PIN_SYMBOLEN} lengte={PIN_LENGTE} fout={pinFout} onKlaar={pinKlaar} />
      {:else}
        <SymboolCode titel="Nog een keer" symbolen={PIN_SYMBOLEN} lengte={PIN_LENGTE} onKlaar={pinHerhaal} />
      {/if}
      <button onclick={() => (pinVoor = null)}>Annuleer</button>
    {:else}
      <section>
        <h2>Toestel</h2>
        <div class="rij">
          {#each TOESTELLEN as t}
            <button id="toestel-{t.id}" class:actief={inst.toestel === t.id} aria-pressed={inst.toestel === t.id} onclick={() => zet({ toestel: t.id })}>
              <Icon name={t.icoon} /> {t.naam}
            </button>
          {/each}
        </div>
        {#if inst.toestel === 'pc'}
          <button id="profielen-aan" class:actief={inst.profielenAan} aria-pressed={inst.profielenAan} onclick={() => zet({ profielenAan: !inst.profielenAan })}>
            <Icon name="users" /> Profielen {inst.profielenAan ? 'aan' : 'uit'}
          </button>
        {/if}
      </section>
      {#if profielenActief(inst)}
        <section>
          <h2>Profielen</h2>
          {#if !profielen.length}<p>Er zijn nog geen profielen.</p>{/if}
          <ul>
            {#each profielen as p (p.id)}
              <li>
                <span class="naam"><Icon name={p.symbool} /> {p.naam}</span>
                <button id="pin-reset-{p.id}" onclick={() => { pinVoor = p; pinStap = 'pin'; pinFout = ''; }}>Nieuwe code</button>
                <button id="profiel-wis-{p.id}" class="gevaar" aria-label="{p.naam} wissen" onclick={() => (wisVoor = p)}><Icon name="trash" /></button>
              </li>
            {/each}
          </ul>
        </section>
      {/if}
      <section>
        <h2>Alles wissen</h2>
        <button id="alles-wissen" class="gevaar" onclick={() => (allesWissen = true)}><Icon name="trash" /> Alles wissen</button>
      </section>
    {/if}
  </div>
</div>

{#if wisVoor}
  <Dialoog
    titel="Profiel van {wisVoor.naam} wissen?"
    tekst="Alle collages van {wisVoor.naam} worden ook gewist."
    knoppen={[
      { label: 'Niet wissen', hoofd: true, actie: () => (wisVoor = null) },
      { label: 'Wissen', gevaar: true, actie: () => void wisBevestigd() },
    ]}
  />
{/if}

{#if allesWissen}
  <Dialoog
    titel="Alles wissen?"
    tekst="Alle profielen, collages en instellingen worden gewist. Dit kan je niet ongedaan maken."
    knoppen={[
      { label: 'Niet wissen', hoofd: true, actie: () => (allesWissen = false) },
      { label: 'Alles wissen', gevaar: true, actie: () => void allesBevestigd() },
    ]}
  />
{/if}

<style>
  .scherm { position: fixed; inset: 0; z-index: 80; background: rgba(45, 42, 50, 0.45); display: grid; place-items: center; padding: 16px; }
  .menu { position: relative; background: var(--creme); border-radius: 28px; padding: 24px; width: min(640px, 100%); max-height: 92dvh; overflow-y: auto; box-sizing: border-box; display: grid; gap: 16px; }
  .sluit { position: absolute; top: 12px; right: 12px; background: transparent; }
  section { background: var(--paneel); border-radius: 20px; padding: 16px; display: grid; gap: 10px; }
  .rij { display: flex; gap: 8px; flex-wrap: wrap; }
  .rij button, section > button { padding: 0 16px; background: var(--creme); }
  .actief { background: var(--zon) !important; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  li { display: flex; align-items: center; gap: 8px; }
  .naam { flex: 1; display: flex; align-items: center; gap: 8px; font-weight: 700; }
  li button { padding: 0 14px; background: var(--creme); }
  .gevaar { color: #c0392b; }
</style>
