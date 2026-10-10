<script lang="ts">
  import Icon from './Icon.svelte';
  import InfoVenster from './InfoVenster.svelte';
  let open = $state(false);
</script>

<footer class="voet">
  <button id="knop-privacy" class="privacy" onclick={() => (open = true)}><Icon name="shield-check" size={22} /> Privacy</button>
  <span class="gemaakt">Gemaakt door Claude and Me <span class="hart"><Icon name="heart" size={20} /></span></span>
</footer>

{#if open}
  <InfoVenster id="privacy" titel="Privacy en cookies" onSluit={() => (open = false)}>
    <h3>Kort gezegd</h3>
    <ul>
      <li>Deze app gebruikt <strong>geen cookies</strong>, geen reclame en geen tracking.</li>
      <li>Er is geen account nodig. We vragen geen naam, e-mail of andere gegevens.</li>
      <li>Collages, foto's, profielen en instellingen worden alleen op dit toestel bewaard (in de opslag van de browser).</li>
    </ul>
    <h3>Foto's</h3>
    <p>Foto's blijven op het toestel. Ook "Achtergrond weg" werkt op het toestel zelf: alleen het hulpmiddel wordt de eerste keer van onze eigen site gedownload, de foto gaat nergens heen.</p>
    <h3>Delen</h3>
    <ul>
      <li>Bij delen gaat de collage rechtstreeks en versleuteld van toestel naar toestel.</li>
      <li>Om elkaar te vinden gebruiken de toestellen een publieke verbindingsserver (PeerJS). Die ziet het IP-adres en de deelcode, niet de collage.</li>
      <li>Blokkeert het netwerk rechtstreeks delen, dan kan de collage via onze server gaan, maar alleen als de leerkracht (of het kind, als de leerkracht dat zo instelt) toestemming geeft. Ze wordt gewist zodra ze opgehaald is, en in elk geval na 1 dag.</li>
    </ul>
    <h3>Alles wissen</h3>
    <p>De leerkracht kan alles wissen in het leerkrachtmenu. Op een gedeelde iPad worden oude collages na 60 dagen vanzelf gewist. Op een Chromebook wist de browser alles bij het afmelden.</p>
  </InfoVenster>
{/if}

<style>
  .voet { margin-top: auto; padding-top: 24px; display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; justify-content: center; color: #6b6470; font-size: 0.95rem; }
  .privacy { background: transparent; color: #6b6470; gap: 6px; padding: 0 12px; font-size: 0.95rem; }
  .gemaakt { display: inline-flex; align-items: center; gap: 6px; }
  .hart { color: #ff4f9a; display: inline-flex; }
</style>
