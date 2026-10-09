<script lang="ts">
  import { onMount } from 'svelte';
  import StartScherm from './ui/StartScherm.svelte';
  import EditorScherm from './ui/EditorScherm.svelte';
  import EersteStart from './ui/EersteStart.svelte';
  import Toast from './ui/Toast.svelte';
  import LeerkrachtMenu from './ui/LeerkrachtMenu.svelte';
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

  async function herlaadLijst() { collages = await lijstCollages(db, profiel?.id ?? null); }

  async function open(id: string) {
    try {
      const r = await laadCollage(db, id);
      if (!r) return;
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

  async function openBestand(f: File) {
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

  function nieuweInstellingen(i: Instellingen) {
    inst = i;
    if (!profielenActief(i) && profiel) { profiel = null; zetTourProfiel(null); }
    void laadProfielen();
    void herlaadLijst();
  }

  async function laadProfielen() { profielen = await lijstProfielen(db); }
  function kiesProfiel(p: Profiel) { profiel = p; nieuwProfiel = false; zetTourProfiel(p.id); void herlaadLijst(); }
  function wissel() { profiel = null; collages = []; zetTourProfiel(null); void laadProfielen(); }

  onMount(async () => {
    const i = await opstart(db);
    await laadProfielen();
    await herlaadLijst();
    inst = i;
  });

  function start(c: Collage, o?: string, p?: string) { editorAssets = undefined; collage = { ...c, profielId: profiel?.id ?? null }; opdracht = o ?? null; pakket = p ?? null; }
  function terug() { collage = null; opdracht = null; pakket = null; editorAssets = undefined; void herlaadLijst(); }
</script>

{#if !inst}
  <main class="laden" aria-busy="true"></main>
{:else if !inst.master || !inst.toestel}
  <EersteStart onKlaar={(i) => (inst = i)} />
{:else if profielenActief(inst) && !profiel}
  {#if nieuwProfiel}
    <NieuwProfiel onKlaar={kiesProfiel} onAnnuleer={() => (nieuwProfiel = false)} />
  {:else}
    <ProfielKiezer {profielen} onGekozen={kiesProfiel} onNieuw={() => (nieuwProfiel = true)} onLeerkracht={() => (toonLeerkracht = true)} />
  {/if}
{:else if collage}
  <EditorScherm {collage} {opdracht} startPakket={pakket} toestel={inst.toestel} vooraf={editorAssets} onTerug={terug} />
{:else}
  <StartScherm onStart={start} {profiel} onWissel={profielenActief(inst) ? wissel : undefined} {collages} onOpen={open} onWis={wis} onOpenBestand={inst.toestel === 'ipad' ? undefined : openBestand} onLeerkracht={() => (toonLeerkracht = true)} />
{/if}
{#if toonLeerkracht && inst}
  <LeerkrachtMenu {inst} onInstellingen={nieuweInstellingen} onSluit={() => { toonLeerkracht = false; void laadProfielen(); }} />
{/if}
<Toast />

<style>
  .laden { min-height: 100dvh; }
</style>
