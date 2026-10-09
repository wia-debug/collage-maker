<script lang="ts">
  import { onMount } from 'svelte';
  import StartScherm from './ui/StartScherm.svelte';
  import EditorScherm from './ui/EditorScherm.svelte';
  import EersteStart from './ui/EersteStart.svelte';
  import Toast from './ui/Toast.svelte';
  import type { Collage } from './document/types';
  import { db } from './storage/db';
  import { opstart } from './storage/opstart';
  import type { Instellingen } from './storage/instellingen';

  let inst = $state.raw<Instellingen | null>(null);
  let collage = $state.raw<Collage | null>(null);
  let opdracht = $state<string | null>(null);
  let pakket = $state<string | null>(null);

  onMount(async () => { inst = await opstart(db); });

  function start(c: Collage, o?: string, p?: string) { collage = c; opdracht = o ?? null; pakket = p ?? null; }
  function terug() { collage = null; opdracht = null; pakket = null; }
</script>

{#if !inst}
  <main class="laden" aria-busy="true"></main>
{:else if !inst.master || !inst.toestel}
  <EersteStart onKlaar={(i) => (inst = i)} />
{:else if collage}
  <EditorScherm {collage} {opdracht} startPakket={pakket} onTerug={terug} />
{:else}
  <StartScherm onStart={start} />
{/if}
<Toast />

<style>
  .laden { min-height: 100dvh; }
</style>
