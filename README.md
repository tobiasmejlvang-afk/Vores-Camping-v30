# Vores Camping v30.1 – Stabilitet & Finish

Personlig camping-, ferie- og mindeapp som statisk PWA til GitHub Pages.

## Udgivelse

- Branch: `main`
- GitHub Pages-kilde: `/docs`
- Ingen npm-installation
- Intet build-trin
- Ingen GitHub Action nødvendig

Upload indholdet af denne pakke til repository-roden og lad GitHub Pages udgive `main /docs`.

## Opgradering fra v30

v30.1 beholder samme lokale datanøgle (`voresCamping.v30.state`), så eksisterende v30-data fortsætter direkte efter udskiftning af filerne. Tag stadig en backup i appen før opgradering.

ORS- og MapTiler-nøgler gemmes separat i browserens lokale lager og medtages ikke i almindelige camping-backups.

## Vigtigste ændringer i v30.1

- Cykelrute-redigering bevarer sværhedsgrad, cykeltype og elcykel-rækkevidder.
- Flere cykler kan tilknyttes samme cykelrute.
- Rutestop har egne noter og kan få billeder.
- Ruter har detaljevisning og deling via enhedens delingsfunktion med clipboard-fallback.
- Ferie Vagtens automatiske opsamling respekteres konsekvent ved besøg, noter, ruter og billeder.
- Ferie Albummet viser kun afsluttede ferier.
- Billeder kan åbnes stort, bladres i og slettes fra appen.
- Feriedetaljen viser billedgalleri og billeder indgår i feriehistorien.
- Oplevelser kan registreres og indgår i feriens tidslinje.
- Bedst bedømte viser også vinder i hver vurderingskategori.
- Datoer bruger lokal kalenderdato i stedet for UTC-dato.
- Uret på Overblik opdateres løbende.
- MapTiler Satellite v4 og Hybrid v4 er indbygget som MapLibre-kortvalg.
- MapTiler API-nøglen gemmes separat fra campingdata og backup.
- Service-worker cache er versionsløftet og inkluderer alle anvendte Ferie Vagt-figurer.

## Kort

Standardkort:
- MapLibre GL
- OpenFreeMap
- OpenStreetMap-data

Satellit/hybrid:
- MapTiler Satellite v4
- MapTiler Hybrid v4
- Kræver egen MapTiler API-nøgle under `Indstillinger → Kort & ORS`

Geografiske værktøjer:
- OpenRouteService via `api.heigit.org`
- ORS-nøgle indsættes under `Indstillinger → Kort & ORS`

## Test

Se `TEST-REPORT.md`.
