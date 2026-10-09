<script lang="ts">
  import Icon from './Icon.svelte';
  import KleurPalet from './KleurPalet.svelte';
  import SymboolCode from './SymboolCode.svelte';
  import { db } from '../storage/db';
  import { maakProfiel, PIN_LENGTE, PIN_SYMBOLEN, PROFIEL_SYMBOLEN, SYMBOOL_NAMEN, type Profiel } from '../storage/profielen';

  let { onKlaar, onAnnuleer }: { onKlaar: (p: Profiel) => void; onAnnuleer: () => void } = $props();
  let stap = $state<'wie' | 'pin' | 'herhaal'>('wie');
  let naam = $state('');
  let symbool = $state(PROFIEL_SYMBOLEN[0]);
  let kleur = $state<string>('#FF6B6B');
  let fout = $state('');
  let eerstePin: string[] = [];

  function pinKlaar(p: string[]) { eerstePin = p; fout = ''; stap = 'herhaal'; }
  async function herhaalKlaar(p: string[]) {
    if (p.join('|') !== eerstePin.join('|')) { fout = 'De codes zijn niet gelijk. Probeer opnieuw.'; stap = 'pin'; return; }
    onKlaar(await maakProfiel(db, { naam: naam.trim().slice(0, 30), symbool, kleur, pin: p }));
  }
</script>

<main class="nieuw">
  <button id="profiel-annuleer" class="terug" onclick={onAnnuleer}><Icon name="arrow-left" /> Terug</button>
  {#if stap === 'wie'}
    <h1>Nieuw profiel</h1>
    <label for="profiel-naam">Hoe heet je?</label>
    <input id="profiel-naam" bind:value={naam} maxlength="30" autocomplete="off" />
    <h2>Kies je teken</h2>
    <div class="avatars">
      {#each PROFIEL_SYMBOLEN as s}
        <button id="avatar-{s}" aria-label={SYMBOOL_NAMEN[s] ?? s} class:actief={symbool === s} onclick={() => (symbool = s)}><Icon name={s} size={40} /></button>
      {/each}
    </div>
    <h2>Kies je kleur</h2>
    <KleurPalet waarde={kleur} onKies={(k) => k && (kleur = k)} />
    <button id="profiel-verder" class="hoofd" disabled={!naam.trim()} onclick={() => (stap = 'pin')}>Verder <Icon name="arrow-right" /></button>
  {:else if stap === 'pin'}
    <SymboolCode titel="Kies je geheime code" symbolen={PIN_SYMBOLEN} lengte={PIN_LENGTE} {fout} onKlaar={pinKlaar} />
  {:else}
    <SymboolCode titel="Tik je code nog een keer" symbolen={PIN_SYMBOLEN} lengte={PIN_LENGTE} onKlaar={herhaalKlaar} />
  {/if}
</main>

<style>
  .nieuw { min-height: 100dvh; box-sizing: border-box; padding: max(16px, env(safe-area-inset-top)) 24px 24px; display: flex; flex-direction: column; align-items: center; gap: 14px; max-width: 640px; margin: 0 auto; }
  .terug { align-self: flex-start; padding: 0 18px; }
  label { font-weight: 800; font-size: 1.3rem; }
  input { width: 100%; max-width: 420px; font-size: 1.5rem; padding: 12px 16px; border: 3px solid var(--rand); border-radius: 16px; text-align: center; user-select: text; -webkit-user-select: text; }
  .avatars { display: grid; grid-template-columns: repeat(6, 64px); gap: 8px; }
  .avatars button { background: var(--paneel); }
  .avatars button.actief { background: var(--zon); }
  .hoofd { padding: 0 24px; }
</style>
