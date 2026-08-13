# OpenRouteService – Vores Camping CLEAN v26.2

Denne pakke er ryddet op specifikt til **Vores Camping**.

## Beholdt
- Directions: bil, HGV/campingvogn, cykelprofiler, gang/vandring
- GeoJSON-ruter + to repræsentative GPX-eksempler
- Geocoding: search, autocomplete og reverse
- Matrix
- Isochrones
- Snap
- POI
- Elevation
- Optimization som bonusfunktion
- Én repræsentativ succes-respons pr. relevant profil/tjeneste
- Nye request-templates til bilferie gennem Europa og bil + campingvogn

## Fjernet som unødvendigt
- Python-kildekode til POI-serveren
- setup.py, run.sh og server/test-konfiguration
- tomme/null API-resultater
- præcise dubletter
- gentagne svar med samme struktur
- størstedelen af de mange Snap-, Matrix- og Isochrone-kopier
- overflødige GPX-kopier

De filer er nyttige til udvikling af selve OpenRouteService/OpenPOI, men ikke til en browserbaseret campingapp.

## Det der manglede i originalen
1. Ingen succesfuld wheelchair-response.
2. Structured geocoding-filen var `null`.
3. De almindelige Directions POST JSON-filer var `null`.
4. Ingen målrettet request til bil + campingvogn/HGV-restriktioner.
5. Ingen færdig Europa-bilrute-template.
6. Ingen request-template til alternative ruter.
7. Ingen request-template til rundtur.
8. Ingen POI-batching trods live-API'ets maksimum på 5 `category_ids` pr. filter.

Derfor er disse områder dækket med nye request-templates i `requests/`.

## Anbefalede ORS-moduler i appen
**Kerne:** Directions, Geocoding, POI, Matrix, Isochrones, Snap, Elevation og GPX.
**Bonus:** Optimization.

## Vigtigt om bil + campingvogn
OpenRouteService har ikke en specifik campingvognsprofil. `driving-hgv` kan bruges som en konservativ profil med
længde, bredde, højde, vægt og akseltryk. De faktiske mål skal udfyldes i appens køretøjsprofil.

## Mapper
- `requests/` = rene, app-relevante request-templates
- `responses/` = repræsentative succes-responser fra din upload
- `reference/` = limits, endpoints, profiler og campingrelevante POI-kategorier

Pakken indeholder ingen API-nøgle.
