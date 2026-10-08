<script lang="ts">
  import Icon from './Icon.svelte';
  import type { Element } from '../document/types';
  import type { Editor } from '../editor/store';

  let { editor, el, onKiesFoto }: { editor: Editor; el: Element | null; onKiesFoto: (vakId?: string) => void } = $props();
  const foto = $derived(el?.type === 'foto' ? el : null);
</script>

<h2>Foto</h2>
<button id="foto-kiezen" class="hoofd breed" onclick={() => onKiesFoto(foto && !foto.assetId ? foto.id : undefined)}>
  <Icon name="image" /> {foto && !foto.assetId ? 'Kies foto voor dit vak' : 'Kies een foto'}
</button>
<p class="tip">Je kan ook een foto op de collage slepen of plakken.</p>
<!-- foto-opties -->

<style>
  .breed { width: 100%; margin-bottom: 8px; }
  .tip { color: #6b6470; margin: 0 0 16px; }
</style>
