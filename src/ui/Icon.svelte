<script lang="ts">
  import { iconSvg } from './icons';
  let { name, size = 28 }: { name: string; size?: number } = $props();
</script>

<span class="icoon" style:width="{size}px" style:height="{size}px" aria-hidden="true">{@html iconSvg(name) ?? ''}</span>

<style>
  .icoon { display: inline-flex; flex: none; }
  .icoon :global(svg) { width: 100%; height: 100%; }
</style>
