# Vores Camping v30.2

Personlig camping-, ferie- og mindeapp som statisk PWA til GitHub Pages.

## Udgivelse
1. Læg projektet i GitHub-repository.
2. Behold `docs/` i `main`-branchen.
3. GitHub → Settings → Pages.
4. Vælg **Deploy from a branch**.
5. Branch: `main`.
6. Folder: `/docs`.

Ingen npm-installation, build-proces eller GitHub Action er nødvendig.

## Kort
- MapLibre GL JS.
- OpenFreeMap / OpenStreetMap som standardkort.
- MapTiler Satellite v4 og Hybrid v4 kan bruges med egen MapTiler API-nøgle.
- OpenRouteService bruges til geocoding, directions, isochrones, POI og elevation.
- Google Maps bruges kun som ekstern hjælpefunktion.

## Data
- Almindelige appdata: browserens localStorage.
- Billeder: IndexedDB.
- ORS- og MapTiler-nøgler: separat localStorage og ikke i almindelig backup.
- v30.2 bruger samme state-key som v30/v30.1, så eksisterende data bevares.

Se `CHANGELOG-v30.2.md` og `TEST-REPORT.md` for detaljer.
