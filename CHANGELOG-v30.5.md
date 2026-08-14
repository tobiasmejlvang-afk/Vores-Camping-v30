# Vores Camping v30.5 – ændringer

## Navigation og hurtighandlinger
- Hovednavigationen er gjort direkte: Overblik, Kort, Campingpladser, Cykelruter, Seværdigheder, Oplevelser, Vores Ferier, Ferie Albummet, Ferie Vagten, Notater, Vejrudsigten og Indstillinger.
- Hurtighandlinger åbner faste arbejdsider i stedet for pop-up-dialoger.
- Tilføj Ny Rute starter med valg mellem Cykelrute, Bilrute, Gåtur og Vandretur.

## Ruter og kort
- Ruteeditoren bruger nummererede markører med start/via/slut-roller.
- Start = lyseblå, via = orange, slut = rød, rutelinje = gul.
- Punkter kan tilføjes via kortklik, gemte markører, søgning og genvejsknapper.
- Via-punkter kan flyttes op/ned, og markører er flytbare direkte på kortet.
- Noter og billeder kan gemmes pr. stop; billeder kan også tilknyttes hele ruten.
- Ruter kan tilknyttes campingplads og ferie, åbnes igen, redigeres, vises og deles.
- Google Maps `/dir/`-links kan indsættes og udtrækkes til rutepunkter, når linket indeholder læsbare punkter.
- Korte `maps.app.goo.gl`-links bevares som eksterne hjælpelinks, da browseren ikke kan udlæse Googles viderestilling direkte.
- Hovedkortet viser kun Besøgte og Vil besøge som standard; øvrige punkter vælges med filtre, og gemte ruter vises kun efter aktivt valg.

## Området omkring og rækkevidde
- Radius op til 50 km.
- 11 søgekategorier: campingpladser, cykelruter, seværdigheder, restauranter, butikker, naturparker, rekreative områder, campingrelaterede steder, badestrand, badesø og tankstation.
- Rækkeviddekort: 10, 15, 30, 45, 60, 90 og 120 minutter.
- Udgangspunkt kan vælges fra GPS, kort, gemt punkt eller adresse.

## Billeder og minder
- Nyt Fotobibliotek med upload, søgning, stor visning, sletning og relationer.
- Billeder kan knyttes til ferie, campingplads, rute, oplevelse og seværdighed; rute-stop håndteres i ruteeditoren.
- Feriealbum-dias bruger flere minder fra afsluttede ferier.

## Ferie Vagten
- Kontrolrunde finder campingpladser, besøg, ruter, noter, oplevelser, seværdigheder og billeder fra aktiv ferieperiode, som mangler ferie-tilknytning.
- “Tilknyt alle” forbinder fundet indhold med den aktive ferie.
- Vagtens figur og overvågede indholdstyper kan konfigureres.

## Personer, kæledyr og køretøj
- Personer: gruppe, navn, kaldenavn, fødselsdag, rolle og cykel.
- Egne persongrupper kan oprettes og vedligeholdes.
- Kæledyr: navn, fødselsdag, race, ejer og relation.
- Bil/HGV og campingvogn/HGV har separate dimensioner; samlet rutekonfiguration beregnes automatisk.

## Indstillinger og Testcenter
- Udvidede indstillinger for ur, dato, nedtælling, vejr, Ferie Vagten, Ferie Albummet, personer, kæledyr og køretøjsmål.
- Detaljeret udseende for elementer, faner, bokse, menu, knapper og ikoner.
- Kortindstillinger for OpenFreeMap, egen MapLibre style-URL, MapTiler, ORS og Google Maps-hjælper.
- Nyt Testcenter til kort, MapLibre, OpenFreeMap, OSM, ORS, Google Maps-hjælper, knapper, hurtighandlinger, automatik, Ferie Vagten og Ferie Albummet.

## Stabilitet
- Rettet rutepunktlogik, så et eksplicit via-punkt ikke overskrives, når slutpunkt tilføjes.
- Service worker bruger network-first for appens kernefiler og navigation, så nye GitHub Pages-versioner opdateres mere pålideligt.
- Samme v30-datalager er bevaret for opgraderingskompatibilitet.
