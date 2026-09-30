# Startseite (landing)

Statische, zweisprachige Startseite von psi-pulse: `/` (Deutsch) und `/en/` (Englisch), dazu die Erklärung zur
Barrierefreiheit unter `/barrierefreiheit/` und `/en/accessibility/` und die Seite für Lehrende und Entwickler
(Einbinden, Gestalten, Lernlogik) unter `/entwickler/` und `/en/developers/`. Sie wird nicht von der
Nuxt-App ausgeliefert, sondern von Caddy auf `bew`. So lässt sie sich unabhängig von App-Deploys ändern und
bleibt erreichbar, wenn die App-VM steht.

```
src/page.html        Vorlage der Startseite mit {{ schluessel }}-Platzhaltern (Aufbau, Literaturangaben)
src/legal.html       Vorlage der Erklärung zur Barrierefreiheit
src/developers.html  Vorlage der Seite für Entwickler (Abschnitte mit Inhaltsverzeichnis)
src/_*.html          Kopf, Navigation und Fuß, eingebunden mit {{> _datei.html }}
src/de.toml, en.toml Texte je Sprache (Startseite, Navigation, Fuß); beide müssen dieselben Schlüssel haben
src/barrierefreiheit.de.toml, .en.toml
                     Texte der Erklärung; Datum als [[OFFEN: …]], bis es gesetzt ist, bricht deploy.sh ab
src/entwickler.de.toml, .en.toml
                     Texte der Seite für Entwickler; Codebeispiele als code.<name>.src/.lang/.label,
                     der Build hebt sie hervor (HTML, CSS) und setzt sie als {{ code_<name> }} ein.
                     Die Lernlogik dort ist aus dem Code belegt: bei Änderungen am Mailversand nachziehen
static/              CSS, Schriften (IBM Plex Sans und JetBrains Mono wie psi-slides.org,
                     Copse für Überschriften nach Uni-CD; OFL-Lizenzen daneben), Siegel, Favicon → /assets/
build.py             erzeugt dist/ (nur Python-Standardbibliothek, ab 3.11)
deploy.sh            baut und kopiert dist/ per rsync nach bew
```

```sh
python3 landing/build.py     # Vorschau: dist/ mit einem beliebigen Webserver ausliefern
landing/deploy.sh -n         # zeigt, was übertragen würde
landing/deploy.sh
```

Die Demo-Fragen im Abschnitt „Ausprobieren“ sind echte Pulse-Fragen (Embed v2, `/embed/v2/pulse.min.js` aus der
App). In der lokalen Vorschau fehlt das Skript, dann bleiben sie als aufklappbare Antworten stehen. Wer sich über die
Demo anmeldet, hat die drei Fragen danach in seinem Konto (Seite „Pulse – Startseite“).

## Routing auf bew

Caddy schreibt `/` intern auf `/index.html` um und liefert `/index.html`, `/barrierefreiheit/`, `/entwickler/`, `/en/*` und `/assets/*` aus
`/var/www/pulse.psi.uni-bamberg.de`; alles andere geht an die App (Port 8080 der Pulse-VM). Die App hat deshalb
keine Seite mehr unter `/`: das Dashboard liegt unter `/home`, Login und Signup leiten dorthin weiter.
Neue Pfade der Startseite müssen in `psi-ansible` (`inventory/group_vars/bew.yml`) eingetragen werden,
sonst landen sie bei der App.

## Datenschutz

Keine externen Ressourcen, keine Cookies, kein Tracking. Caddy protokolliert für diese Domain keine Zugriffe
(siehe Datenschutzhinweise; Logging nur nach Prüfung der Policy einschalten).
