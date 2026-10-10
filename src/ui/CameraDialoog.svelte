<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import Icon from './Icon.svelte';
  import { aantalCameras, CameraFout, neemFoto, startCamera, stopCamera } from '../import/camera';

  let { onFoto, onKiesBestand, onSluit }: { onFoto: (b: Blob) => void; onKiesBestand: () => void; onSluit: () => void } = $props();
  let video = $state<HTMLVideoElement>();
  let stroom = $state.raw<MediaStream | null>(null);
  let kant = $state<'user' | 'environment'>('environment');
  let meer = $state(false);
  let fout = $state('');
  let genomen = $state.raw<{ blob: Blob; url: string } | null>(null);
  let weg = false;
  let start = $state(false);
  let generatie = 0;

  async function zetAan() {
    const mijn = ++generatie;
    stopCamera(stroom);
    stroom = null;
    fout = '';
    start = true;
    try {
      const s = await startCamera(kant);
      // Een oudere aanvraag (snel wisselen) of de dialoog is al dicht: die stroom meteen stoppen.
      if (weg || mijn !== generatie) { stopCamera(s); return; }
      stroom = s;
      if (video) { video.srcObject = s; await video.play().catch(() => {}); }
    } catch (e) {
      if (weg || mijn !== generatie) return;
      fout = e instanceof CameraFout && e.code === 'geweigerd'
        ? 'De camera mag niet aan. Vraag je juf of meester, of kies een foto.'
        : 'Ik vind geen camera. Kies een foto.';
    } finally {
      if (mijn === generatie) start = false;
    }
  }

  // Na "Opnieuw" bestaat het video-element opnieuw: de stroom er weer aan hangen.
  $effect(() => {
    if (video && stroom && !video.srcObject) { video.srcObject = stroom; void video.play().catch(() => {}); }
  });

  async function neem() {
    if (!video || video.videoWidth === 0) return; // camera nog niet klaar
    try {
      const blob = await neemFoto(video);
      if (weg) return;
      genomen = { blob, url: URL.createObjectURL(blob) };
    } catch { /* geen beeld: gewoon opnieuw tikken */ }
  }
  function opnieuw() { if (genomen) URL.revokeObjectURL(genomen.url); genomen = null; }
  function gebruik() { if (genomen) onFoto(genomen.blob); }
  function wissel() { kant = kant === 'user' ? 'environment' : 'user'; void zetAan(); }

  onMount(async () => { meer = (await aantalCameras()) > 1; await zetAan(); });
  onDestroy(() => { weg = true; stopCamera(stroom); if (genomen) URL.revokeObjectURL(genomen.url); });
</script>

<div class="scherm" role="presentation">
  <div class="dialoog" role="dialog" aria-modal="true" aria-labelledby="camera-titel">
    <h2 id="camera-titel">Camera</h2>
    {#if fout}
      <p id="camera-fout" class="fout" role="alert"><Icon name="warning" /> {fout}</p>
      <button id="camera-kies-foto" class="hoofd" onclick={onKiesBestand}><Icon name="image" /> Kies foto</button>
    {:else if genomen}
      <img src={genomen.url} alt="Genomen foto" />
      <div class="knoppen">
        <button id="camera-gebruik" class="hoofd" onclick={gebruik}><Icon name="check" /> Gebruik</button>
        <button id="camera-opnieuw" onclick={opnieuw}><Icon name="arrow-counter-clockwise" /> Opnieuw</button>
      </div>
    {:else}
      <!-- svelte-ignore a11y_media_has_caption -->
      <video id="camera-video" bind:this={video} playsinline muted class:spiegel={kant === 'user'}></video>
      <div class="knoppen">
        <button id="camera-neem" class="hoofd" onclick={neem}><Icon name="camera" /> Neem foto</button>
        {#if meer}<button id="camera-wissel" disabled={start} onclick={wissel}><Icon name="camera-rotate" /> Wissel camera</button>{/if}
      </div>
    {/if}
    <button id="camera-sluit" onclick={onSluit}>Sluiten</button>
  </div>
</div>

<style>
  .scherm { position: fixed; inset: 0; background: rgba(45, 42, 50, 0.6); display: grid; place-items: center; z-index: 90; padding: 16px; }
  .dialoog { background: var(--paneel); border-radius: 28px; padding: 20px; width: min(720px, 100%); display: grid; gap: 14px; max-height: 100%; overflow-y: auto; }
  video, img { width: 100%; max-height: 60dvh; object-fit: contain; border-radius: 18px; background: #000; }
  .spiegel { transform: scaleX(-1); }
  .knoppen { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
  .knoppen button, .dialoog > button { padding: 0 22px; background: var(--creme); }
  .hoofd { background: var(--koraal) !important; color: #fff; }
  .fout { color: #c0392b; font-weight: 700; display: flex; gap: 8px; align-items: center; margin: 0; }
</style>
