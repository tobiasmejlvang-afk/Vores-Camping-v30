# Vores Camping v30.5

Personlig camping-, ferie-, kort-, rute- og mindeapp som statisk PWA.

## Udgivelse på GitHub Pages

1. Læg indholdet af denne pakke i repository-roden.
2. Sørg for at `docs/` ligger direkte i `main`.
3. GitHub → Settings → Pages.
4. Vælg **Deploy from a branch**.
5. Branch: **main**.
6. Folder: **/docs**.

Der kræves ingen npm-installation, intet build-trin og ingen GitHub Action.

## Data og opgradering

v30.5 bruger fortsat `voresCamping.v30.state`. Eksisterende data fra v30.x kan derfor fortsætte ved opgradering på samme domæne/browserprofil.

OpenRouteService- og MapTiler-nøgler gemmes separat i browserens lokale lager og medtages ikke i den almindelige backup.

## Kort

- MapLibre GL er hovedmotor.
- OpenFreeMap/OpenStreetMap-data bruges til standardkort.
- MapTiler kan bruges til Satellite/Hybrid via egen nøgle.
- OpenRouteService bruges til ruter og geografiske værktøjer.
- Google Maps er kun ekstern hjælpefunktion til links og delte ruter.

## v30.5 højdepunkter

- 12 direkte hovedsider uden dybe undermenuer.
- Hurtighandlinger åbner faste sider, ikke modaler.
- Rutevælger: cykel, bil, gåtur og vandretur.
- Nummererede, flytbare start/via/slut-markører og gul rutelinje.
- Google Maps `/dir/`-rute kan indsættes; korte Google-links gemmes som eksternt link.
- Fotobibliotek med relationer til ferie, campingplads, rute, oplevelse og seværdighed.
- Intelligent Ferie Vagt-kontrol af løse minder i aktiv ferieperiode.
- Udvidet Personer/Kæledyr og separate bil-/campingvognsmål.
- Indbygget Testcenter under Indstillinger.
