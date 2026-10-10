# Collagemaker

Een offline webapp (PWA) waarmee kinderen van 6 tot 12 jaar collages maken, op iPad, Chromebook en pc. Geen accounts. Foto's blijven op het toestel.

## Aan de slag

- `npm install`
- `npm run dev` start de app lokaal
- `npm test` draait de unit-tests
- `npx playwright test` draait de end-to-endtests (iPad/WebKit en Chromebook/Chromium)

## Documentatie

- [Testen op toestellen](docs/testen-op-toestellen.md)
- [Delen via de server klaarzetten](docs/delen-instellen.md)
- Ontwerp: `docs/superpowers/specs/`

## Licentie

De app gebruikt `@imgly/background-removal` (AGPL-3.0) voor "Achtergrond weg". Wie de app publiek online zet, moet daarom ook de broncode publiek beschikbaar maken. Dat is een stap voor de eigenaar van het project: de repository publiek maken of een andere licentie kiezen. Er is nog niets gepubliceerd.
