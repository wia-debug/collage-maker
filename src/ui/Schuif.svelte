<script lang="ts">
  let { label, min, max, stap = 1, waarde, onWijzig, onLive }: { label: string; min: number; max: number; stap?: number; waarde: number; onWijzig: (v: number) => void; onLive?: (v: number) => void } = $props();
  const id = $derived('schuif-' + label.toLowerCase().replace(/\s+/g, '-'));
</script>

<div class="schuif">
  <label for={id}>{label}</label>
  <input {id} type="range" {min} {max} step={stap} value={waarde} oninput={(e) => onLive?.(Number(e.currentTarget.value))} onchange={(e) => onWijzig(Number(e.currentTarget.value))} />
</div>

<style>
  .schuif { margin-bottom: 14px; }
  label { display: block; font-weight: 700; margin-bottom: 4px; }
</style>
