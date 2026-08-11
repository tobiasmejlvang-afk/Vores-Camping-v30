# Test Report – Vores Camping v30.1

Dato: 11. august 2026

## Resultat

**Bestået.**

### JavaScript / PWA
- `app.js`: Node syntax check bestået.
- `sw.js`: Node syntax check bestået.
- `manifest.webmanifest`: JSON-validering bestået.
- Service worker cache-version: `vores-camping-v30-1-shell`.

### UI- og funktionstest
37/37 automatiserede browser-harness-tests bestået uden runtime page errors.

Testen dækkede blandt andet:
- Alle 11 hovednavigationer.
- Ferie Album filtrerer planlagte og aktive ferier fra.
- Ferie Vagt auto-opsamling fra: besøg, noter og ruter forvælges ikke automatisk.
- Cykelrute-redigering bevarer sværhedsgrad, elcykeltype samt start/slut-rækkevidde.
- Flere cykler på samme rute.
- Rutedetalje, stopnoter og delingsknap.
- Bedst i hver vurderingskategori.
- Feriens oplevelser og billeder i detalje/tidslinje.
- Klikbart billedgalleri, stor billedviser og slettefunktion.
- MapTiler API-felt og Satellite/Hybrid-kortvalg.
- Ferie Vagtens pause-status.
- Lokal dansk dato.
- Ingen JavaScript runtime page errors i testforløbet.

### Responsive tests
Bestået uden vandret overflow eller runtime-fejl:
- Samsung Galaxy Tab S8 Ultra landscape: 1848×1152.
- Samsung Galaxy Tab S8 Ultra portrait: 1152×1848.
- Windows: 1440×900.
- Mobil: 412×915.

## Eksterne tjenester

Appens request-logik og UI er gennemgået, men denne pakke indeholder bevidst ingen private/personlige API-nøgler. Fuld live-test af ORS-kvoter, MapTiler-konto, GPS-tilladelser, `navigator.share()` og fysisk enhedsadfærd skal derfor ske på den konkrete enhed med brugerens egne nøgler/tilladelser.

Appens kerne er fortsat designet til at kunne bruges, selv hvis vejr/geografiske tjenester midlertidigt fejler. Offlinekort er begrænset til browser-/runtime-cache; appen leverer ikke en komplet downloadbar offline tile-database.
