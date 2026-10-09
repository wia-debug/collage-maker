<script lang="ts">
  import { onMount } from 'svelte';
  import StartScherm from './ui/StartScherm.svelte';
  import EditorScherm from './ui/EditorScherm.svelte';
  import EersteStart from './ui/EersteStart.svelte';
  import Toast from './ui/Toast.svelte';
  import type { Collage } from './document/types';
  import { db } from './storage/db';
  import { opstart } from './storage/opstart';
  import ProfielKiezer from './ui/ProfielKiezer.svelte';
  import NieuwProfiel from './ui/NieuwProfiel.svelte';
  import { profielenActief, type Instellingen } from './storage/instellingen';
  import { lijstProfielen, type Profiel } from './storage/profielen';
  import { zetTourProfiel } from './tour/tour';

  let inst = $state.raw<Instellingen | null>(null);
  let collage = $state.raw<Collage | null>(null);
  let opdracht = $state<string | null>(null);
  let pakket = $state<string | null>(null);

  let profiel = $state.raw<Profiel | null>(null);
  let profielen = $state.raw<Profiel[]>([]);
  let nieuwProfiel = $state(false);

  async function laadProfielen() { profielen = await lijstProfielen(db); }
  function kiesProfiel(p: Profiel) { profiel = p; nieuwProfiel = false; zetTourProfiel(p.id); }
  function wissel() { profiel = null; zetTourProfiel(null); void laadProfielen(); }

  onMount(async () => { inst = await opstart(db); await laadProfielen(); });

  function start(c: Collage, o?: string, p?: string) { collage = { ...c, profielId: profiel?.id ?? null }; opdracht = o ?? null; pakket = p ?? null; }
  function terug() { collage = null; opdracht = null; pakket = null; }
</script>

{#if !inst}
  <main class="laden" aria-busy="true"></main>
{:else if !inst.master || !inst.toestel}
  <EersteStart onKlaar={(i) => (inst = i)} />
{:else if profielenActief(inst) && !profiel}
  {#if nieuwProfiel}
    <NieuwProfiel onKlaar={kiesProfiel} onAnnuleer={() => (nieuwProfiel = false)} />
  {:else}
    <ProfielKiezer {profielen} onGekozen={kiesProfiel} onNieuw={() => (nieuwProfiel = true)} />
  {/if}
{:else if collage}
  <EditorScherm {collage} {opdracht} startPakket={pakket} onTerug={terug} />
{:else}
  <StartScherm onStart={start} {profiel} onWissel={profielenActief(inst) ? wissel : undefined} />
{/if}
<Toast />

<style>
  .laden { min-height: 100dvh; }
</style>
