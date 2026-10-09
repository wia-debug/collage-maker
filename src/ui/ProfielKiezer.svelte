<script lang="ts">
  import Icon from './Icon.svelte';
  import SymboolCode from './SymboolCode.svelte';
  import { db } from '../storage/db';
  import { controleerPin, PIN_LENGTE, PIN_SYMBOLEN, type Profiel } from '../storage/profielen';

  let { profielen, onGekozen, onNieuw, onLeerkracht }: { profielen: Profiel[]; onGekozen: (p: Profiel) => void; onNieuw: () => void; onLeerkracht?: () => void } = $props();
  let kies = $state.raw<Profiel | null>(null);
  let fout = $state('');

  async function pinKlaar(pin: string[]) {
    const p = kies;
    if (!p) return;
    try {
      if (await controleerPin(db, p.id, pin)) { kies = null; fout = ''; onGekozen(p); }
      else fout = 'Dat is niet je code. Probeer opnieuw.';
    } catch {
      fout = 'Er ging iets mis. Probeer het nog eens.';
    }
  }
</script>

<main class="kiezer">
  {#if onLeerkracht}
    <button id="knop-leerkracht" class="slot" aria-label="Leerkracht" onclick={onLeerkracht}><Icon name="lock" /></button>
  {/if}
  {#if !kies}
    <h1>Wie ben jij?</h1>
    <div class="tegels">
      {#each profielen as p (p.id)}
        <button class="tegel" style:--kleur={p.kleur} onclick={() => { kies = p; fout = ''; }}>
          <span class="avatar"><Icon name={p.symbool} size={56} /></span><span>{p.naam}</span>
        </button>
      {/each}
      <button id="profiel-nieuw" class="tegel nieuw" onclick={onNieuw}><Icon name="user-plus" size={56} /><span>Ik ben nieuw</span></button>
    </div>
  {:else}
    <button class="terug" onclick={() => (kies = null)}><Icon name="arrow-left" /> Terug</button>
    <p class="wie"><Icon name={kies.symbool} size={36} /> {kies.naam}</p>
    <SymboolCode titel="Wat is je geheime code?" symbolen={PIN_SYMBOLEN} lengte={PIN_LENGTE} {fout} onKlaar={pinKlaar} />
  {/if}
</main>

<style>
  .kiezer { position: relative; min-height: 100dvh; box-sizing: border-box; padding: max(24px, env(safe-area-inset-top)) 24px 24px; display: flex; flex-direction: column; align-items: center; gap: 18px; }
  .slot { position: absolute; top: max(12px, env(safe-area-inset-top)); right: 12px; background: transparent; }
  h1 { color: var(--koraal); }
  .tegels { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 16px; width: min(960px, 100%); }
  .tegel { flex-direction: column; gap: 8px; min-height: 160px; border-radius: 24px; box-shadow: var(--schaduw); font-size: 1.2rem; }
  .avatar { display: grid; place-items: center; width: 88px; height: 88px; border-radius: 50%; background: var(--kleur); color: #fff; }
  .nieuw { color: var(--hemel); }
  .terug { align-self: flex-start; padding: 0 18px; }
  .wie { display: flex; align-items: center; gap: 10px; font-size: 1.5rem; font-weight: 800; margin: 0; }
</style>
