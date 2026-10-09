<script lang="ts">
  import Icon from './Icon.svelte';
  let { titel, lengte = 6, fout = '', onKlaar }: { titel: string; lengte?: number; fout?: string; onKlaar: (code: string) => void } = $props();
  let code = $state('');

  function tik(c: string) {
    if (code.length >= lengte) return;
    code += c;
    if (code.length === lengte) {
      const klaar = code;
      code = '';
      onKlaar(klaar);
    }
  }
  function wis() { code = code.slice(0, -1); }
  function toets(e: KeyboardEvent) {
    if ((e.target as HTMLElement | null)?.closest?.('input, textarea')) return;
    if (/^[0-9]$/.test(e.key)) { tik(e.key); e.preventDefault(); }
    else if (e.key === 'Backspace') { wis(); e.preventDefault(); }
  }
</script>

<svelte:window onkeydown={toets} />

<div class="code">
  <h2>{titel}</h2>
  <div class="bolletjes" role="status" aria-label="{code.length} van {lengte} cijfers">
    {#each Array(lengte) as _, i}<span class:vol={i < code.length}></span>{/each}
  </div>
  {#if fout}<p class="fout" role="alert">{fout}</p>{/if}
  <div class="toetsen">
    {#each ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as c}
      <button id="cijfer-{c}" onclick={() => tik(c)}>{c}</button>
    {/each}
    <span></span>
    <button id="cijfer-0" onclick={() => tik('0')}>0</button>
    <button id="cijfer-terug" aria-label="Wis" onclick={wis}><Icon name="backspace" /></button>
  </div>
</div>

<style>
  .code { display: grid; justify-items: center; gap: 14px; }
  .bolletjes { display: flex; gap: 12px; }
  .bolletjes span { width: 20px; height: 20px; border-radius: 50%; border: 3px solid var(--inkt); }
  .bolletjes span.vol { background: var(--inkt); }
  .fout { color: #c0392b; font-weight: 700; margin: 0; }
  .toetsen { display: grid; grid-template-columns: repeat(3, 80px); gap: 10px; }
  .toetsen button { height: 72px; font-size: 1.8rem; background: var(--paneel); box-shadow: var(--schaduw); }
</style>
