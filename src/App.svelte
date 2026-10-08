<script lang="ts">
  import StartScherm from './ui/StartScherm.svelte';
  import EditorScherm from './ui/EditorScherm.svelte';
  import Toast from './ui/Toast.svelte';
  import type { Collage } from './document/types';

  let collage = $state.raw<Collage | null>(null);
  let opdracht = $state<string | null>(null);
  let pakket = $state<string | null>(null);
</script>

{#if collage}
  <EditorScherm {collage} {opdracht} startPakket={pakket} onTerug={() => { collage = null; opdracht = null; pakket = null; }} />
{:else}
  <StartScherm onStart={(c, o, p) => { collage = c; opdracht = o ?? null; pakket = p ?? null; }} />
{/if}
<Toast />
