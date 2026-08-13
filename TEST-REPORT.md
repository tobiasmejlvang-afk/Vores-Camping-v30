# Test Report – Vores Camping v30.3

## Statiske checks
- `node --check docs/app.js`: bestået.
- `node --check docs/sw.js`: bestået.
- `manifest.webmanifest` JSON-validering: bestået.
- Service worker cache-navn opdateret til v30.3.

## Chromium UI-smoke test
Testmiljøet blokerer direkte browsernavigation til localhost, så appen blev indlæst i Chromium med inline shell og lokale test-stubs for netværk/geolocation. Appens egen DOM, routing, state og UI-logik blev kørt uændret.

### Sider – bestået
- Overblik.
- Kort/fallback.
- Campingpladser · Er besøgt.
- Campingpladser · Ønskested.
- Cykelruter.
- Seværdigheder · Er besøgt.
- Seværdigheder · Ønskested.
- Oplevelser · Er besøgt.
- Oplevelser · Ønskested.
- Vores Ferier.
- Ferie Albummet.
- Ferie Vagten.
- Notater.
- Vejrudsigten/fallback.
- Indstillinger.
- Bedst bedømte.

### Hurtige handlinger – bestået
- Find campingplads.
- Tilføj campingplads.
- Tilføj ny rute.
- Tilføj oplevelse.
- Tilføj seværdighed.
- Upload billeder.
- Tilføj notat.
- Start ferie.
- Åbn stort kort.

### v30.3-indstillinger – bestået
- 8 indstillingsområder vises: Generelt, Forside, Funktioner, Udseende, Kort, Campingpladser, Ferie og System.
- Ur-toggle findes og påvirker Overblik.
- Nedtælling-toggle findes og påvirker Overblik.
- Vejr-toggle findes og påvirker Overblik.
- Alle tre funktioner kan skjules samtidigt uden runtime-fejl.
- Menuindstilling anvendes på UI'et.
- Fanestil anvendes på UI'et.
- Ferie Album-dias-indstilling ligger under Forside.

## Responsive checks – bestået uden vandret overflow
- Samsung Galaxy Tab S8 Ultra landscape: 1848 × 1152.
- Samsung Galaxy Tab S8 Ultra portrait: 1152 × 1848.
- Windows: 1440 × 900.
- Mobil: 412 × 915.

## Runtime
- Ingen JavaScript `pageerror` i UI-smoke testen.

## Begrænsninger
- Live OpenRouteService, MapTiler, OpenFreeMap, Open-Meteo og GPS kræver netværk/API-nøgler/enhedstilladelser og er derfor ikke testet med brugerens private nøgler i dette lokale harness.
