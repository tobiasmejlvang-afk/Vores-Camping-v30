# Test Report – Vores Camping v30.4

## Kontroller udført

### Statisk validering
- `app.js` består `node --check`.
- `manifest.webmanifest` kan parses som gyldig JSON.
- Service worker cache-navn er opdateret til v30.4.
- Alle lokale service-worker shell-filer findes.

### UI-smoketest i Chromium DOM-harness
Testmiljøet bruger den rigtige appkode og DOM med stubbet MapLibre/netværk, fordi direkte localhost-navigation er blokeret i dette runtime-miljø.

Bestået:
- Overblik starter.
- Ny Rute åbner `#/rute-form` som fast side.
- Find Campingplads åbner fast side.
- Tilføj Campingplads åbner fast valgside/formular.
- Tilføj Oplevelse åbner fast side.
- Tilføj Seværdighed åbner fast side.
- Upload Billeder åbner fast side.
- Tilføj Notat åbner fast side.
- Start Ferie åbner fast side.
- Åbn Stort Kort åbner kortsiden.
- Kortfiltrering har 6 afkrydsningsfelter, hvor kun 2 standardfiltre er aktive.
- Ingen gemt rute er valgt som standard.
- Rækkeviddetider er præcist 10/15/30/45/60/90/120 minutter.
- Området omkring har 11 kategorier.
- Radiusvælgeren går til 50 km.
- Ingen JavaScript-runtimefejl i den samlede smoke-sekvens.

### Seeded rute-/korttest
Med eksempeldata blev følgende verificeret:
- Start ved gemt campingplads kan vælges.
- Via ved gemt interessepunkt kan vælges.
- Slut ved gemt campingplads kan vælges.
- Punkterne gemmes i korrekt rækkefølge og med navne.
- Markørlaget bruger lyseblå start, orange via og rød slut.
- Nummeret leveres som MapLibre symboltekst fra punktets `n`-egenskab.
- Ruten gemmes med koordinater og stopmetadata.
- Gemte ruter er ikke tegnet på hovedkortet som standard.
- Valgt gemt rute kan tegnes eksplicit.
- Ingen runtimefejl i seeded testen.

### Responsive test
Ingen vandret overflow ved:
- Samsung Galaxy Tab S8 Ultra liggende: 1848 × 1152.
- Samsung Galaxy Tab S8 Ultra stående: 1152 × 1848.
- Windows: 1440 × 900.
- Mobil: 412 × 915.

## Eksterne tjenester
Live end-to-end-kald med brugerens private API-nøgler kan ikke verificeres i testpakken. Koden bygger requests til ORS fra nøglen, der indsættes lokalt i appens Indstillinger. GPS kræver desuden browser-/enhedstilladelse.

## Resultat
v30.4 består den lokale syntax-, DOM-, rute-/kort- og responsive testpakke uden registrerede JavaScript-runtimefejl i de testede flows.
