<script lang="ts">
  let { label, min, max, stap = 1, waarde, onWijzig, onLive, onAnnuleer }: { label: string; min: number; max: number; stap?: number; waarde: number; onWijzig: (v: number) => void; onLive?: (v: number) => void; onAnnuleer?: () => void } = $props();
  const id = $derived('schuif-' + label.toLowerCase().replace(/\s+/g, '-'));
  // Een voorbeeld dat nog niet met 'change' is bevestigd; bij loslaten of focusverlies zonder change wordt het geannuleerd.
  let openVoorbeeld = false;

  function live(v: number) { openVoorbeeld = true; onLive?.(v); }
  function wijzig(v: number) { openVoorbeeld = false; onWijzig(v); }
  function klaarZonderWijziging() {
    if (!openVoorbeeld) return;
    openVoorbeeld = false;
    onAnnuleer?.();
  }
  // 'change' volgt in dezelfde taak op het loslaten; wacht even zodat die eerst kan komen.
  function losgelaten() { setTimeout(klaarZonderWijziging, 0); }
</script>

<div class="schuif">
  <label for={id}>{label}</label>
  <input {id} type="range" {min} {max} step={stap} value={waarde}
    oninput={(e) => live(Number(e.currentTarget.value))}
    onchange={(e) => wijzig(Number(e.currentTarget.value))}
    onpointerup={losgelaten} onpointercancel={losgelaten} onblur={klaarZonderWijziging} />
</div>

<style>
  .schuif { margin-bottom: 14px; }
  label { display: block; font-weight: 700; margin-bottom: 4px; }
</style>
