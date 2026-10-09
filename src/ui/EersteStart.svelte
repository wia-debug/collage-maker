<script lang="ts">
  import Icon from './Icon.svelte';
  import CijferCode from './CijferCode.svelte';
  import { db } from '../storage/db';
  import { maakHash } from '../storage/hash';
  import { schrijfInstellingen, type Instellingen, type Toestel } from '../storage/instellingen';

  let { onKlaar }: { onKlaar: (i: Instellingen) => void } = $props();
  let stap = $state<'welkom' | 'code' | 'herhaal' | 'toestel' | 'profielen'>('welkom');
  let fout = $state('');
  let eerste = '';
  let toestel: Toestel = 'pc';
  let bezig = $state(false);

  const TOESTELLEN: { id: Toestel; naam: string; uitleg: string; icoon: string }[] = [
    { id: 'ipad', naam: 'Gedeelde iPad', uitleg: 'Elk kind heeft een eigen profiel met een geheime code. Collages blijven op de iPad.', icoon: 'device-tablet' },
    { id: 'chromebook', naam: 'Chromebook', uitleg: 'Alles wordt gewist bij het uitloggen. Kinderen bewaren hun collage als bestand.', icoon: 'laptop' },
    { id: 'pc', naam: 'Computer', uitleg: 'Collages blijven op deze computer. Profielen kan je aanzetten.', icoon: 'desktop' },
  ];

  function codeKlaar(c: string) { eerste = c; fout = ''; stap = 'herhaal'; }
  function herhaalKlaar(c: string) {
    if (c !== eerste) { fout = 'De codes zijn niet gelijk. Probeer opnieuw.'; stap = 'code'; return; }
    fout = '';
    stap = 'toestel';
  }
  function kiesToestel(t: Toestel) {
    toestel = t;
    if (t === 'pc') stap = 'profielen';
    else void klaar(false);
  }
  async function klaar(profielenAan: boolean) {
    bezig = true;
    fout = '';
    try {
      const i = await schrijfInstellingen(db, { toestel, profielenAan, master: await maakHash(eerste) });
      onKlaar(i);
    } catch {
      fout = 'Bewaren lukte niet. Probeer het nog eens.';
    } finally {
      bezig = false;
    }
  }
</script>

<main class="eerste">
  {#if stap === 'welkom'}
    <h1>Welkom bij Collagemaker</h1>
    <p>Dit stel je één keer in, als leerkracht of ouder. Je kiest een geheime code van 6 cijfers. Daarmee open je later de instellingen.</p>
    <p class="let-op">Bewaar de code goed. Vergeten? Wis de sitegegevens van deze app in de browser.</p>
    <button id="eerste-verder" class="hoofd" onclick={() => (stap = 'code')}>Verder <Icon name="arrow-right" /></button>
  {:else if stap === 'code'}
    <CijferCode titel="Kies een code van 6 cijfers" {fout} onKlaar={codeKlaar} />
  {:else if stap === 'herhaal'}
    <CijferCode titel="Typ de code nog een keer" onKlaar={herhaalKlaar} />
  {:else if stap === 'toestel'}
    <h2>Op welk toestel draait de app?</h2>
    <div class="kaarten">
      {#each TOESTELLEN as t}
        <button id="toestel-kies-{t.id}" class="kaart" disabled={bezig} onclick={() => kiesToestel(t.id)}>
          <Icon name={t.icoon} size={56} /><strong>{t.naam}</strong><span>{t.uitleg}</span>
        </button>
      {/each}
    </div>
    {#if fout}<p class="fout" role="alert">{fout}</p>{/if}
  {:else}
    <h2>Profielen gebruiken?</h2>
    <p>Met profielen heeft elk kind een eigen plek met een geheime code. Handig als meerdere kinderen deze computer gebruiken.</p>
    <div class="knoppen">
      <button id="profielen-ja" class="hoofd" disabled={bezig} onclick={() => klaar(true)}>Ja, met profielen</button>
      <button id="profielen-nee" disabled={bezig} onclick={() => klaar(false)}>Nee</button>
    </div>
    {#if fout}<p class="fout" role="alert">{fout}</p>{/if}
  {/if}
</main>

<style>
  .eerste { min-height: 100dvh; box-sizing: border-box; padding: max(24px, env(safe-area-inset-top)) 24px 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; text-align: center; }
  h1 { color: var(--koraal); font-size: clamp(2rem, 6vw, 3rem); }
  p { max-width: 560px; font-size: 1.15rem; line-height: 1.5; margin: 0; }
  .let-op { font-weight: 700; }
  .fout { color: #c0392b; font-weight: 700; }
  .hoofd { padding: 0 24px; }
  .kaarten { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; width: min(900px, 100%); }
  .kaart { flex-direction: column; gap: 8px; padding: 20px; border-radius: 24px; box-shadow: var(--schaduw); text-align: center; }
  .kaart span { font-weight: 400; line-height: 1.4; }
  .knoppen { display: flex; gap: 12px; }
  .knoppen button { padding: 0 24px; }
</style>
