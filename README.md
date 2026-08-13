# Vores Camping v30.3

Personlig camping-, ferie- og mindeapp som statisk PWA til GitHub Pages.

## Denne version
v30.3 opdaterer især Overblik og Indstillinger efter den seneste specifikation:
- Ur, Nedtælling og aktuelt vejr kan styres separat under **Indstillinger → Funktioner**.
- Forsidekontroller samles under **Indstillinger → Forside**, herunder cover, sektioner, rækkefølge, kompakt/luftig visning og Ferie Album-dias.
- Udseende har nu særskilt styring af menu og faner samt tema, farver, skalering, elementstørrelse, kort, bokse, knapper og ikoner.
- Den eksisterende hovednavigation, Seværdigheder, Oplevelser, Notater, Vores Ferier, Ferie Albummet og Ferie Vagten bevares.

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
- v30.3 bruger fortsat `voresCamping.v30.state`, så eksisterende v30/v30.1/v30.2-data bevares.

Se `CHANGELOG-v30.3.md` og `TEST-REPORT.md` for detaljer.
