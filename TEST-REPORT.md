# Vores Camping v30 – testnoter

Dato: 2026-08-11

## Automatiske/statiske kontroller

- `app.js`: bestået `node --check`
- `sw.js`: bestået `node --check`
- `manifest.webmanifest`: valideret som JSON
- Alle lokale filer refereret direkte fra `index.html` findes
- PWA-ikoner findes i 192×192 og 512×512
- GitHub Pages `/docs`-struktur findes og `.nojekyll` er tilføjet
- Ingen npm-, build- eller GitHub Actions-afhængighed

## Browsermiljø

Containerens Chromium-headless kunne ikke afslutte selv en minimal screenshot-test i testmiljøet pga. runtime/DBus-problemer. Det er derfor ikke brugt som godkendelseskriterium. JavaScript-syntaks og filintegritet er kontrolleret separat.

## Eksterne integrationer

Live ORS-rutetest kræver brugerens egen API-nøgle og kan testes direkte i appen under Indstillinger. Kort og vejr har fejl-fallback, så resten af appen fortsætter ved API/netværksfejl.
