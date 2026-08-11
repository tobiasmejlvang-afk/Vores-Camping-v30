# Vores Camping v30

Den komplette personlige camping-, ferie- og mindeapp – bygget som statisk PWA til GitHub Pages.

## Udgivelse

- Branch: `main`
- GitHub Pages-kilde: `/docs`
- Ingen npm-installation
- Intet build-trin
- Ingen GitHub Action nødvendig

Upload hele projektet til repository-roden og vælg i **Settings → Pages**: `Deploy from a branch` → `main` → `/docs`.

## Appens vigtigste princip

**Find én gang → gem én gang → brug overalt.**

Campingpladsen oprettes én gang og refereres derefter fra besøg, ferier, ruter, billeder, kort, rangliste og feriealbum.

## Implementeret i v30

- Overblik med personligt dashboard, statistik, nedtælling, vejr, kort og Ferie Vagt-status
- Besøgte campingpladser og ønskeliste
- Fælles campingpladsformular med automatisk stedssøgning og manuel registrering
- Campingpladsdetaljer, besøg, billeder, noter, tags og 1–5 stjerner
- Egne vurderingskategorier og standardikoner
- Automatisk Bedst bedømte-rangliste
- MapLibre GL + OpenFreeMap + OpenStreetMap-data
- Besøgte/ønskede markører, stort kort, GPS, søgning og klik-på-kort
- OpenRouteService Directions, geocoding/autocomplete, reverse geocoding, POI, isochrones og elevation
- Bil, HGV/bil+campingvogn, cykel, elcykel, MTB, gang, vandring og kørestol hvor ORS understøtter profilen
- HGV-mål/vægt og valg for motorveje, betalingsveje og færger
- Cykelruter med dato, sværhedsgrad, cykeltype og elcykel-rækkevidde
- Ferier med aktiv ferie, deltagere, kæledyr og tidslinje
- Ferie Vagten med de vedhæftede illustrationer og automatisk ferieopsamling
- Ferie Albummet
- Billeder komprimeres ved upload og gemmes lokalt i IndexedDB
- Vejr via Open-Meteo som separat hjælpefunktion
- Personer og kæledyr oprettes én gang og genbruges
- JSON-backup med billeder; ORS API-nøglen udelades
- Forsøg på migrering af ældre lokale campingdata fra kendte localStorage-navne
- PWA/service worker og responsivt tablet/desktop/mobil-layout

## OpenRouteService

API-nøglen indsættes under **Indstillinger → Kort & OpenRouteService**. Den gemmes separat i browserens localStorage og medtages ikke i appens almindelige backup.

Appen bruger de nye HeiGIT-adresser:

- `https://api.heigit.org/openrouteservice`
- `https://api.heigit.org/pelias/v1`
- `https://api.heigit.org/openpoiservice/v0/pois`
- `https://api.heigit.org/openelevationservice/v0`
- `https://api.heigit.org/vroom/v0`

Den vedhæftede, opryddede ORS-referencepakke er bevaret under `reference/openrouteservice/` som udviklingsreference.

### Om API-nøglen i en statisk app

En nøgle, der bruges direkte fra browser-JavaScript, kan ikke gøres hemmelig på samme måde som på en server. V30 holder den ude af campingdata og backup, men en bruger med adgang til browserens udviklerværktøjer på enheden kan stadig se den. Det er normalt for en ren GitHub Pages-løsning.

## Kort

Standardkortet bruger OpenFreeMaps `liberty`-stil. Under Indstillinger kan der vælges flere OpenFreeMap-stile. Satellit/hybrid er lavet som en valgfri MapLibre style-URL, så appen ikke låses til en bestemt betalings- eller tokenbaseret satellitudbyder.

## Lokal lagring

- Strukturerede campingdata: `localStorage`
- Billedfiler: `IndexedDB`
- ORS API-nøgle: separat `localStorage`-nøgle

Lav jævnligt en backup fra **Indstillinger → Backup & system** – især før browserdata ryddes eller enheden skiftes.

## Netværksafhængige funktioner

Campingdata, lister, vurderinger, ferier og lokalt gemte billeder kan bruges uden API-kald. Følgende kræver internet:

- OpenFreeMap-korttiles og kortstyle
- OpenRouteService-funktioner
- Open-Meteo-vejr
- Lucide/MapLibre CDN-filer ved første indlæsning

Service workeren cacher appens egen shell og vigtigste lokale grafiske filer.
