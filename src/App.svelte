<script lang="ts">
  import { onMount } from 'svelte';
  import StartScherm from './ui/StartScherm.svelte';
  import EditorScherm from './ui/EditorScherm.svelte';
  import Toast from './ui/Toast.svelte';
  import Confetti from './ui/Confetti.svelte';
  import { ontgrendelGeluid, zetGeluid } from './feedback/geluid';
  import { zetAnimatie } from './feedback/animatie';
  import OpruimDialoog from './ui/OpruimDialoog.svelte';
  import { teVragen } from './storage/opruimen';
  import LeerkrachtMenu from './ui/LeerkrachtMenu.svelte';
  import OntvangDialoog from './ui/OntvangDialoog.svelte';
  import type { Collage } from './document/types';
  import { db } from './storage/db';
  import { opstart } from './storage/opstart';
  import ProfielKiezer from './ui/ProfielKiezer.svelte';
  import NieuwProfiel from './ui/NieuwProfiel.svelte';
  import { profielenActief, type Instellingen } from './storage/instellingen';
  import { lijstProfielen, type Profiel } from './storage/profielen';
  import { zetTourProfiel } from './tour/tour';
  import { AssetStore } from './assets/store';
  import { laadCollage, lijstCollages, vulAssets, wisCollages, type CollageSamenvatting } from './storage/collages';
  import { toon } from './ui/toast';
  import { vanBestand } from './storage/bestand';
  import { CollageFout, FOUTTEKST_BESTAND } from './document/validatie';
  import { kopieVan } from './document/create';

  let editorAssets = $state.raw<AssetStore | undefined>(undefined);
  let collages = $state.raw<CollageSamenvatting[]>([]);

  async function herlaadLijst() {
    collages = await lijstCollages(db, profiel?.id ?? null);
    void vraagOpruimen();
  }

  let teOpruimen = $state.raw<CollageSamenvatting[]>([]);
  const gevraagd = new Set<string>();

  async function vraagOpruimen() {
    if (!inst || inst.toestel === 'chromebook') return;
    if (profielenActief(inst) && !profiel) return;
    const pid = profiel?.id ?? null;
    const sleutel = pid ?? '';
    if (gevraagd.has(sleutel)) return;
    gevraagd.add(sleutel);
    const lijst = await teVragen(db, pid);
    if ((profiel?.id ?? null) !== pid) return;
    teOpruimen = lijst;
  }

  async function opruimenJa() {
    const ids = teOpruimen.map((c) => c.id);
    teOpruimen = [];
    await wisCollages(db, ids);
    await herlaadLijst();
  }

  async function open(id: string) {
    try {
      const r = await laadCollage(db, id);
      if (!r) { toon('Deze collage bestaat niet meer.', 'warning'); await herlaadLijst(); return; }
      const a = new AssetStore();
      await vulAssets(a, r.blobs);
      editorAssets = a;
      opdracht = null;
      pakket = null;
      collage = r.collage;
    } catch {
      toon('Deze collage kan ik niet openen.', 'warning');
    }
  }

  async function openBestand(f: Blob) {
    try {
      const { collage: c, blobs } = await vanBestand(f);
      const a = new AssetStore();
      await vulAssets(a, blobs);
      editorAssets = a;
      opdracht = null;
      pakket = null;
      collage = kopieVan(c, profiel?.id ?? null);
    } catch (e) {
      toon(e instanceof CollageFout ? FOUTTEKST_BESTAND[e.code] : 'Dit bestand kan ik niet openen.', 'warning');
    }
  }

  async function wis(id: string) { await wisCollages(db, [id]); await herlaadLijst(); }

  let inst = $state.raw<Instellingen | null>(null);
  let collage = $state.raw<Collage | null>(null);
  let opdracht = $state<string | null>(null);
  let pakket = $state<string | null>(null);

  let profiel = $state.raw<Profiel | null>(null);
  let profielen = $state.raw<Profiel[]>([]);
  let nieuwProfiel = $state(false);
  let toonLeerkracht = $state(false);
  let toonOntvang = $state(false);

  async function sluitLeerkracht() {
    toonLeerkracht = false;
    await laadProfielen();
    if (profiel && !profielen.some((p) => p.id === profiel!.id)) { profiel = null; collages = []; zetTourProfiel(null); }
  }

  function nieuweInstellingen(i: Instellingen) {
    inst = i;
    zetGeluid(i.geluid); zetAnimatie(i.animatie);
    if (!profielenActief(i) && profiel) { profiel = null; zetTourProfiel(null); }
    void laadProfielen();
    void herlaadLijst();
  }

  async function laadProfielen() { profielen = await lijstProfielen(db); }
  function kiesProfiel(p: Profiel) { profiel = p; nieuwProfiel = false; zetTourProfiel(p.id); void herlaadLijst(); }
  function wissel() { profiel = null; collages = []; zetTourProfiel(null); void laadProfielen(); }

  let bootFout = $state(false);
  onMount(async () => {
    try {
      const i = await opstart(db);
      await laadProfielen();
      await herlaadLijst();
      inst = i;
      zetGeluid(i.geluid); zetAnimatie(i.animatie);
      void vraagOpruimen();
    } catch {
      bootFout = true;
    }
  });

  function start(c: Collage, o?: string, p?: string) { editorAssets = undefined; collage = { ...c, profielId: profiel?.id ?? null }; opdracht = o ?? null; pakket = p ?? null; }
  function terug() { collage = null; opdracht = null; pakket = null; editorAssets = undefined; void herlaadLijst(); }
</script>

{#if bootFout}
  <main class="boot-fout">
    <h1>Er ging iets mis</h1>
    <p>Ik kan niets bewaren op dit toestel. Controleer of de browser websitegegevens toestaat (geen privévenster).</p>
    <button id="opnieuw-proberen" class="hoofd" onclick={() => location.reload()}>Opnieuw proberen</button>
  </main>
{:else if !inst}
  <main class="laden" aria-busy="true"></main>
{:else if profielenActief(inst) && !profiel}
  {#if nieuwProfiel}
    <NieuwProfiel onKlaar={kiesProfiel} onAnnuleer={() => (nieuwProfiel = false)} />
  {:else}
    <ProfielKiezer {profielen} onGekozen={kiesProfiel} onNieuw={() => (nieuwProfiel = true)} onLeerkracht={() => (toonLeerkracht = true)} />
  {/if}
{:else if collage}
  <EditorScherm {collage} {opdracht} startPakket={pakket} toestel={inst.toestel ?? 'ipad'} {inst} vooraf={editorAssets} profielId={profiel?.id ?? null} onTerug={terug} />
{:else}
  <StartScherm onStart={start} {profiel} onWissel={profielenActief(inst) ? wissel : undefined} {collages} onOpen={open} onWis={wis} onOpenBestand={inst.toestel === 'ipad' ? undefined : openBestand} onLeerkracht={() => (toonLeerkracht = true)} onOntvang={() => (toonOntvang = true)} />
{/if}
{#if toonOntvang && inst && !collage}
  <OntvangDialoog {inst} onOpen={(p) => { toonOntvang = false; void openBestand(p); }} onSluit={() => (toonOntvang = false)} />
{/if}
{#if toonLeerkracht && inst}
  <LeerkrachtMenu {inst} onInstellingen={nieuweInstellingen} onSluit={sluitLeerkracht} />
{/if}
{#if teOpruimen.length && !collage}
  <OpruimDialoog collages={teOpruimen} onJa={() => void opruimenJa()} onLater={() => (teOpruimen = [])} />
{/if}
<Toast />
<Confetti />
<svelte:window onpointerdown={ontgrendelGeluid} />

<style>
  .laden { min-height: 100dvh; }
  .boot-fout { min-height: 100dvh; box-sizing: border-box; padding: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; text-align: center; }
  .boot-fout p { max-width: 560px; font-size: 1.15rem; line-height: 1.5; margin: 0; }
  .boot-fout .hoofd { padding: 0 24px; }
</style>
