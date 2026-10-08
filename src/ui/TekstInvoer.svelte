<script lang="ts">
  import Icon from './Icon.svelte';
  let { onKlaar }: { onKlaar: (tekst: string, id: string | null) => void } = $props();
  let open = $state(false);
  let doelId: string | null = null;
  let veld: HTMLTextAreaElement;

  // Moet synchroon vanuit een tik worden aangeroepen: iPad opent het toetsenbord alleen dan.
  export function openen(tekst: string, id: string | null): void {
    doelId = id;
    veld.value = tekst;
    open = true;
    veld.focus();
  }

  function klaar() { open = false; veld.blur(); onKlaar(veld.value, doelId); }
  function annuleer() { open = false; veld.blur(); }
</script>

<div class="tekst-invoer" class:open aria-hidden={!open}>
  <textarea id="tekst-veld" bind:this={veld} rows="2" placeholder="Typ hier je tekst" enterkeyhint="done"
    onkeydown={(e) => { if (e.key === 'Escape') annuleer(); }}></textarea>
  <button id="tekst-annuleer" aria-label="Stop" onclick={annuleer}><Icon name="x" /></button>
  <button id="tekst-klaar" class="hoofd" onclick={klaar}><Icon name="check" /> Klaar</button>
</div>

<style>
  .tekst-invoer { position: fixed; left: 0; right: 0; top: 0; z-index: 70; display: flex; gap: 10px; align-items: center; padding: max(10px, env(safe-area-inset-top)) 12px 10px; background: var(--paneel); box-shadow: var(--schaduw); transform: translateY(-120%); transition: transform 0.2s ease; }
  .tekst-invoer.open { transform: translateY(0); }
  textarea { flex: 1; font-size: 24px; border: 3px solid var(--rand); border-radius: 16px; padding: 10px 14px; resize: none; user-select: text; -webkit-user-select: text; }
</style>
