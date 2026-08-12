# Test Report – Vores Camping v30.2

## Automatiske checks
- `node --check docs/app.js`: bestået.
- `node --check docs/sw.js`: bestået.
- PWA-manifest JSON: bestået.
- Kontrol af lokale shell-filer: bestået.

## Chromium UI-smoke test
Testet med et inline Chromium-harness, fordi testmiljøet blokerer direkte browser-navigation til localhost/file-URL'er. Selve appens DOM, JavaScript og interaktioner blev indlæst i Chromium med testdata.

### Sider
Bestået:
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

### Hurtige handlinger/formularer
Bestået:
- Find campingplads.
- Tilføj campingplads-valg.
- Ny rute.
- Ny oplevelse.
- Ny seværdighed.
- Nyt notat.
- Start ferie.
- Google Maps-/eksternt kortlink-felt på campingpladsformularen.

### Nye indstillinger
Bestået:
- 7 indstillingsområder.
- Forsidesektioner kan vises/skjules.
- Coverkontrol er til stede.
- Tema/udseende-kontroller er til stede.
- Nulstil indstillinger er til stede.

## Responsive checks
Ingen vandret overflow i UI-smoke test ved:
- Samsung Galaxy Tab S8 Ultra landscape: 1848 × 1152.
- Samsung Galaxy Tab S8 Ultra portrait: 1152 × 1848.
- Windows: 1440 × 900.
- Mobil: 412 × 915.

## Begrænsninger i testmiljøet
- ORS, MapTiler, live OpenFreeMap og enhedens rigtige GPS kræver netværk/API-nøgler/enhedstilladelser og er derfor ikke live-testet med brugerens private nøgler.
- Browsermiljøet blokerede direkte navigation til localhost/file-URL, så den interaktive smoke-test blev kørt via Chromium `set_content` med kort- og vejrtjenester stubbet/fallbacket.
