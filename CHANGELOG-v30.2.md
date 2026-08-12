# Vores Camping v30.2 – Navigation & Personligt Overblik

Denne version bygger videre på v30.1 og implementerer ændringerne fra det vedhæftede specifikationsdokument.

## Overblik
- Personligt coverområde med app-logo.
- Ur med lokal dato og klokkeslæt samt vejrstatus.
- Nedtælling til næste campingtur kan vises/skjules.
- Nyt automatisk diasshow fra afsluttede ferier i Ferie Albummet.
- Stort oversigtskort.
- Statistik: besøgte campingpladser, ønskesteder, lande, cykelruter og ferier.
- Seneste campingbesøg.
- Bedst bedømte campingpladser.
- Udvalgte ønskesteder.
- Seneste cykelruter.
- Aktiv Ferie Vagt-status.
- Forsidens sektioner kan vises/skjules og flyttes op/ned under Indstillinger.

## Hurtige handlinger
- Find campingplads.
- Tilføj campingplads med valg mellem Er besøgt, Ønskested og fælles Gem-formular.
- Tilføj ny rute.
- Tilføj oplevelse.
- Tilføj seværdighed.
- Upload billeder.
- Tilføj notat.
- Start ferie.
- Åbn stort kort.

## Navigation
- Overblik.
- Kort.
- Campingpladser → Er besøgt / Ønskested.
- Cykelruter.
- Seværdigheder → Er besøgt / Ønskested.
- Oplevelser → Er besøgt / Ønskested.
- Vores Ferier.
- Ferie Albummet.
- Ferie Vagten.
- Notater.
- Vejrudsigten.
- Indstillinger.
- Bedst bedømte er fortsat tilgængelig fra campingpladslisterne og Overblik, men fylder ikke hovednavigationen.

## Nye datafunktioner
- Ny fælles datamodel for seværdigheder med status, dato, sted, GPS, ferie, campingplads, tags, noter og billeder.
- Oplevelser er udvidet til samme Besøgt/Ønskested-princip og kan redigeres, slettes og få billeder.
- Notater har nu egen hovedside, dato og mulighed for tilknytning til ferie og campingplads.
- Seværdigheder og oplevelser kan automatisk knyttes til den aktive ferie, når Ferie Vagten er aktiv.
- Feriedetaljen viser og samler oplevelser, seværdigheder og notater i historien.

## Indstillinger
- Generelt: appnavn, forsidetekster, næste campingtur og nedtælling.
- Forside: personligt cover, synlige sektioner, rækkefølge og kompakt/normal/luftig visning.
- Udseende: tema, primær farve, skalering, elementstørrelse, korthøjde, bokse, knapper og ikoner.
- Kort: MapLibre/OpenFreeMap, MapTiler satellit/hybrid, egen style-URL, ORS API-nøgle og forbindelsestest.
- Campingpladser: standardstatus, standardsortering, statusnavne og vurderingskategorier.
- Ferie: Ferie Vagten, feriealbum-dias, personer og kæledyr.
- System: billedkomprimering, eksport, import, sikkerhedskopi, ryd data og nulstil indstillinger.

## Google Maps som hjælpefunktion
- Campingpladser har nu felt til et gemt Google Maps-/eksternt kortlink.
- Hvis intet link er gemt, kan GPS-koordinater fortsat åbnes i Google Maps.
- Seværdigheder og oplevelser med GPS kan åbnes eksternt i Google Maps.
- Appens primære kortmotor er fortsat MapLibre.

## Kompatibilitet
- State-key er fortsat `voresCamping.v30.state`, så eksisterende v30/v30.1-data genbruges.
- Nye felter tilføjes med standardværdier ved indlæsning.
- API-nøgler opbevares fortsat separat fra den almindelige backup.
