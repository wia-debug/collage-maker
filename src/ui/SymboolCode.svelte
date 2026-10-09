<script lang="ts">
  import Icon from './Icon.svelte';
  import { SYMBOOL_NAMEN } from '../storage/profielen';
  let { titel, symbolen, lengte = 3, fout = '', onKlaar }: { titel: string; symbolen: string[]; lengte?: number; fout?: string; onKlaar: (code: string[]) => void } = $props();
  let code = $state<string[]>([]);

  function tik(s: string) {
    if (code.length >= lengte) return;
    code = [...code, s];
    if (code.length === lengte) {
      const klaar = code;
      code = [];
      onKlaar(klaar);
    }
  }
  function wis() { code = code.slice(0, -1); }
</script>

<div class="code">
  <h2>{titel}</h2>
  <div class="gekozen" role="status" aria-label="{code.length} van {lengte} gekozen">
    {#each Array(lengte) as _, i}<span class="vak">{#if code[i]}<Icon name={code[i]} size={36} />{/if}</span>{/each}
  </div>
  {#if fout}<p class="fout" role="alert">{fout}</p>{/if}
  <div class="toetsen" style:--kolommen={symbolen.length > 9 ? 4 : 3}>
    {#each symbolen as s}
      <button id="symbool-{s}" aria-label={SYMBOOL_NAMEN[s] ?? s} onclick={() => tik(s)}><Icon name={s} size={44} /></button>
    {/each}
  </div>
  <button id="symbool-terug" aria-label="Wis" onclick={wis}><Icon name="backspace" /></button>
</div>

<style>
  .code { display: grid; justify-items: center; gap: 14px; }
  .gekozen { display: flex; gap: 12px; }
  .vak { width: 64px; height: 64px; border-radius: 18px; border: 3px dashed var(--rand); display: grid; place-items: center; background: var(--paneel); }
  .fout { color: #c0392b; font-weight: 700; margin: 0; }
  .toetsen { display: grid; grid-template-columns: repeat(var(--kolommen), 88px); gap: 10px; }
  .toetsen button { height: 88px; background: var(--paneel); box-shadow: var(--schaduw); }
</style>
