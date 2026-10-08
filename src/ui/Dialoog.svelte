<script lang="ts">
  let { titel, tekst, knoppen }: { titel: string; tekst: string; knoppen: { label: string; gevaar?: boolean; hoofd?: boolean; actie: () => void }[] } = $props();
</script>

<div class="scherm" role="presentation">
  <div class="dialoog" role="alertdialog" aria-modal="true" aria-labelledby="dialoog-titel">
    <h2 id="dialoog-titel">{titel}</h2>
    <p>{tekst}</p>
    <div class="knoppen">
      {#each knoppen as k}
        <button class:gevaar={k.gevaar} class:hoofd={k.hoofd} onclick={k.actie}>{k.label}</button>
      {/each}
    </div>
  </div>
</div>

<style>
  .scherm { position: fixed; inset: 0; background: rgba(45, 42, 50, 0.45); display: grid; place-items: center; z-index: 90; padding: 16px; }
  .dialoog { background: var(--paneel); border-radius: 28px; padding: 28px; max-width: 460px; box-shadow: var(--schaduw); }
  p { font-size: 1.1rem; line-height: 1.5; }
  .knoppen { display: flex; gap: 12px; justify-content: flex-end; flex-wrap: wrap; }
  .knoppen button { padding: 0 22px; background: var(--creme); }
  .knoppen button.hoofd { background: var(--koraal); color: #fff; }
  .knoppen button.gevaar { background: #fde2e1; }
</style>
