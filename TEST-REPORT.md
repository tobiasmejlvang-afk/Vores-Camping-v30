# Vores Camping v30.5 – Test Report

Dato: 14. august 2026

## Resultat

**40/40 automatiserede UI-/logikchecks bestået** i Chromium-testharness.

**0 registrerede JavaScript runtime-fejl** i de gennemførte flows.

## Kontrolleret

- 12 direkte hovednavigationer.
- 9 hurtighandlinger åbner faste sider uden modal.
- 4 rutetyper: cykel, bil, gåtur, vandretur.
- Fast ruteeditor med kort.
- Start/via/slut-farver og nummerering.
- Gemte kortpunkter kan tilføjes til ruten.
- Via-punkter kan omarrangeres.
- Stopnoter og stopbilleder er tilgængelige.
- Billeder til hele ruten er tilgængelige.
- Rute gemmes med korrekt rutetype og alle stop.
- Google Maps `/dir/`-rute med tre koordinatpunkter importeres som tre rutepunkter.
- Ferie Vagten opdager løst indhold i aktiv ferieperiode.
- Ferie Vagtens “Tilknyt alle” knytter campingplads, oplevelse og seværdighed til aktiv ferie.
- Hovedkortets standardfiltre viser kun Besøgte/Vil besøge campingpladser.
- Gemte ruter er skjult, indtil en rute aktivt vælges.
- Rækkeviddevalg indeholder 10–120 minutter og flere udgangskilder.
- Området omkring indeholder radius op til 50 km og 11 kategorier.
- Indstillinger indeholder 7 hovedsektioner og Testcenter med 12 testkort.
- Separate HGV-felter til bil og campingvogn.
- Persongrupper og udvidede ur/nedtælling/vejr-indstillinger.
- MapLibre/MapTiler/ORS/Google-hjælperkontroller findes.
- Responsive tests uden vandret overflow på:
  - Samsung Galaxy Tab S8 Ultra 1848×1152.
  - Samsung Galaxy Tab S8 Ultra 1152×1848.
  - Windows 1440×900.
  - Mobil 412×915.

## Statisk validering

- `app.js`: Node JavaScript syntax check bestået.
- `sw.js`: Node JavaScript syntax check bestået.
- `manifest.webmanifest`: gyldig JSON.
- Service worker cache-navn: `vores-camping-v30-5-shell`.
- Datalager: `voresCamping.v30.state` bevaret.

## Eksterne tjenester

Live-kald med brugerens private ORS- og MapTiler-nøgler er ikke udført i denne testpakke. Appens request-/UI-logik er testet med kontrollerede svar, og det indbyggede Testcenter kan udføre forbindelsestest med nøglerne på den enhed, hvor appen bruges.

Google Maps er testet som hjælpefunktion/linkformat, ikke som primær kortmotor.
