# Vores Camping v30.4

Personlig camping-, ferie- og mindeapp som statisk PWA til GitHub Pages.

## Denne version
v30.4 bygger videre på v30.3 med fokus på faste arbejdssider og et stærkere kort-/ruteværktøj:

- Hurtige handlinger åbner som faste sider i hovedindholdet i stedet for pop-up-dialoger.
- Ny rute har et delt arbejdsområde med rutepunkter og stort kort.
- Rutepunkter nummereres direkte på kortet: start lyseblå, via orange og slut rød, alle med hvid kant.
- Beregnet rutelinje er gul.
- Via-punkter kan tilføjes ved kortklik, gemte kortpunkter eller søgning og kan flyttes op/ned.
- Genveje til Start ved campingplads, Stop ved interessepunkt og Slut ved campingplads.
- Området omkring har radius op til 50 km og 11 søgekategorier.
- Rækkeviddekort understøtter 10, 15, 30, 45, 60, 90 og 120 minutter samt GPS, gemt punkt, kortklik og adressesøgning.
- Det store kort viser som standard kun besøgte campingpladser og ønskesteder. Andre gemte punkter kræver aktive filtre.
- Gemte ruter vises først, når en bestemt rute vælges.
- Google Maps er fortsat kun ekstern hjælpefunktion; MapLibre er hovedkortet.

## Udgivelse
1. Læg projektet i dit GitHub-repository.
2. Behold `docs/` i `main`-branchen.
3. GitHub → Settings → Pages.
4. Vælg **Deploy from a branch**.
5. Branch: `main`.
6. Folder: `/docs`.

Ingen npm-installation, build-proces eller GitHub Action er nødvendig.

## Kort og API'er
- MapLibre GL JS.
- OpenFreeMap / OpenStreetMap som standardkort.
- MapTiler Satellite v4 og Hybrid v4 kan bruges med egen MapTiler API-nøgle.
- OpenRouteService bruges til bl.a. geocoding, directions, isochrones og POI.
- Google Maps bruges kun som ekstern hjælpefunktion.

## Data
- Almindelige appdata: browserens localStorage.
- Billeder: IndexedDB.
- ORS- og MapTiler-nøgler: separat localStorage og ikke i almindelig backup.
- v30.4 bruger fortsat `voresCamping.v30.state`, så eksisterende v30/v30.1/v30.2/v30.3-data bevares.

Se `CHANGELOG-v30.4.md` og `TEST-REPORT.md` for detaljer.
