<script lang="ts">
  let { titel, deel }: { titel: string; deel: number | null } = $props();
</script>

<div class="scherm" role="presentation">
  <div class="dialoog" role="dialog" aria-modal="true" aria-labelledby="voortgang-titel">
    <h2 id="voortgang-titel">{titel}</h2>
    <div id="voortgang" class="balk" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={deel === null ? undefined : Math.round(deel * 100)}>
      <span class:onbepaald={deel === null} style:width={deel === null ? '40%' : `${Math.round(deel * 100)}%`}></span>
    </div>
  </div>
</div>

<style>
  .scherm { position: fixed; inset: 0; background: rgba(45, 42, 50, 0.45); display: grid; place-items: center; z-index: 92; padding: 16px; }
  .dialoog { background: var(--paneel); border-radius: 28px; padding: 28px; width: min(460px, 100%); display: grid; gap: 16px; text-align: center; }
  h2 { margin: 0; }
  .balk { height: 22px; border-radius: 11px; background: var(--creme); overflow: hidden; }
  .balk span { display: block; height: 100%; background: var(--koraal); border-radius: 11px; transition: width 0.2s; }
  .onbepaald { animation: heen 1.2s ease-in-out infinite alternate; }
  @keyframes heen { from { margin-left: 0; } to { margin-left: 60%; } }
  @media (prefers-reduced-motion: reduce) { .onbepaald { animation: none; } }
</style>
