# Meerdere elementen kiezen en groeperen — ontwerp

Vult de hoofdspec aan (`2026-10-08-kids-collage-design.md`, §6 "Algemeen"). Alle bestaande regels blijven gelden: geen emoji, alleen symbolen, Nederlandse tekst, knoppen van minstens 56 px, werkt met vinger en muis.

## 1. Doel

Kinderen kunnen meerdere elementen tegelijk kiezen en ze samen verplaatsen, schalen, draaien, kopiëren of wissen. Een keuze kan een vaste groep worden die zich als één ding gedraagt, ook na bewaren, openen en delen.

Succes:

- Een kind sleept een kader rond drie stickers en verplaatst ze samen.
- Het kind maakt er een groep van, bewaart de collage, opent ze later en de groep is er nog.
- Met "Groep los" bewerkt het kind weer één sticker apart.

## 2. Bediening

### Kiezen

- **Selectiekader:** met het selectiegereedschap op een lege plek (de achtergrond) slepen tekent een blauw kader. Bij loslaten wordt alles gekozen waarvan het omhullende vak helemaal binnen het kader valt.
  - Een lid van een groep haalt zijn hele groep mee.
  - Vastgezette elementen worden niet mee gekozen.
  - Een beweging van minder dan 8 schermpixels telt als gewone tik.
- **"Meer kiezen":** knop `#knop-meer` in de bovenbalk (icoon `selection-plus`, tekst "Meer", `aria-pressed`). Staat hij aan, dan voegt elke tik op een element het (met zijn groep) toe aan de keuze of haalt het eruit. De knop gaat vanzelf uit als de keuze leeg wordt of de editor sluit.
- **Shift+klik** doet hetzelfde op de computer.
- **Alles loslaten:** tik op een lege plek zonder te slepen, of druk op Esc.

### Met meer dan één element gekozen

- Eén transformkader rond alles: verplaatsen, schalen met alleen de hoeken (verhouding blijft) en draaien.
- Knoppen in de balk boven het canvas:
  - **Groepeer** `#ctx-groepeer` (icoon `selection-all`), alleen als de keuze niet al precies één groep is;
  - Voor, Achter, Kopie, Draai, Spiegel, Vast en Weg.
- Het zijpaneel gaat dicht.
- Elke actie op de hele keuze is één stap voor ongedaan maken.
- Toetsen:
  - Delete wist de keuze, Ctrl/Cmd+D kopieert ze, de pijltjes schuiven ze en Esc laat alles los.
  - Vastgezette elementen in de keuze worden niet verplaatst, gewist of gekopieerd.

### Groep

- Tikken of slepen op een lid kiest de hele groep. De groep gedraagt zich als één ding.
- In de balk boven het canvas staat **Groep los** `#ctx-groep-los` (icoon `selection-slash`) als de keuze precies één groep is.
- Is één element gekozen (zonder groep), dan blijft de balk zoals nu.
- Draai en Spiegel op een keuze:
  - Draai: elk element draait 15 graden rond het midden van de keuze.
  - Spiegel: spiegelt elk element en spiegelt de x-posities rond het midden van de keuze.
- Kopie:
  - de kopieën verschuiven samen 30 px;
  - de kopie van een groep krijgt een nieuwe groeps-id;
  - de kopieën worden de nieuwe keuze.

## 3. Datamodel

- `Basis.groep?: string`: 16 hex-tekens, of afwezig.
- `leesCollage`:
  - Een aanwezig `groep` dat geen tekst is → `CollageFout('ongeldig')`.
  - Een groep met maar één lid wordt losgemaakt: het veld wordt verwijderd.
- Leden van een groep hoeven niet naast elkaar in de lijst te staan. De volgorde voor/achter blijft per element.

## 4. Editor-store

- `EditorState.selectedIds: string[]` vervangt `selectedId`. Hulpfunctie `enkel(state): Element | null` geeft het element als er precies één gekozen is.
- `select(id | null)`: kiest het element en breidt uit naar zijn groep; null laat alles los.
- `selectMany(ids)`, `toggleSelect(id)`: beide breiden uit naar hele groepen.
- `updateMany(patches: Record<string, Partial<Element>>)`: één stap.
- `duplicateMany(ids)`, `moveMany(ids, richting)`: één stap; `moveMany` houdt de onderlinge volgorde.
- `groepeer(ids)`: geeft alle ids één nieuwe groeps-id en wist hun oude groepen; één stap.
- `groepLos(groep)`: verwijdert het veld bij alle leden; één stap.
- Een bewerking die niets verandert, maakt geen stap.
- Na wissen of ongedaan maken vallen ids die niet meer bestaan uit de keuze.
- De bestaande `add`, `update`, `remove`, `duplicate` en `move` blijven werken voor één element.

## 5. Canvas

- De transformer krijgt alle gekozen, niet-vastgezette nodes:
  - Bij meer dan één node: hoekankers en `keepRatio(true)`.
  - Bij één node: zoals nu.
- Na een transformatie van meerdere nodes gaat voor elke node één `updateMany` met x, y, rotatie en schaal:
  - Foto's met een afbeelding zetten hun schaal om naar breedte en hoogte. De uitsnede blijft ongewijzigd.
  - Andere elementen krijgen schaalX en schaalY.
- Slepen van een gekozen element verplaatst de hele keuze: de andere nodes volgen tijdens het slepen. Bij loslaten gaat er één `updateMany`.
- Het selectiekader is een `Konva.Rect` in de UI-laag. Het omhullende vak van elk element komt uit `getClientRect` ten opzichte van de inhoudslaag.
- Met twee vingers knijpen werkt alleen bij precies één gekozen element.
- Tekenen en gummen laten de keuze los, zoals nu.

## 6. Rondleiding

De editorrondleiding krijgt een stap `#knop-meer`: "Meer kiezen" / "Tik hier en dan op meerdere dingen. Of sleep een kader rond wat je samen wil verplaatsen."

## 7. Testen

- **Unit (store):**
  - kiezen breidt uit naar de groep;
  - `toggleSelect`;
  - groeperen en groep los;
  - een kopie van een groep krijgt een nieuwe groeps-id;
  - `moveMany` houdt de volgorde;
  - elke actie is één stap voor ongedaan maken;
  - de keuze wordt opgeschoond na wissen en na ongedaan maken.
- **Unit (validatie):** `groep` ontbreekt (oude collage); groep als tekst; groep als getal is ongeldig; een groep met één lid wordt losgemaakt.
- **Unit (canvas):**
  - transform op meerdere elementen geeft per element de juiste x, y, schaal en rotatie, en voor een foto breedte en hoogte;
  - het selectiekader kiest alleen elementen die er helemaal binnen vallen, met hun hele groep;
  - een korte tik laat alles los.
- **e2e (iPad en Chromebook):**
  - kader slepen rond twee vormen, Groepeer, de groep verplaatsen, terug naar het startscherm, opnieuw openen: de groep is er nog;
  - "Meer kiezen" met tikken, dan Weg wist beide;
  - Groep los, daarna één element apart kiezen.

## 8. Buiten scope

- Groepen in groepen.
- Elementen binnen een groep aanpassen zonder "Groep los" (bijvoorbeeld met dubbeltikken).
- Uitlijnen of verdelen van meerdere elementen.
