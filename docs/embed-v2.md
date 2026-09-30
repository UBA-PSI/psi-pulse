# Pulse Embed v2 – Einbindung in statische Seiten

Ein Skript ohne Abhängigkeiten (lesbar `pulse.js`, minifiziert `pulse.min.js`, rund 7 KB gzip), das Wiederholungsfragen
in beliebige Seiten einbaut: psi-slides `print.html` (auch von `file://`), inf.zone (Hugo), web.psi.
Zum Ausprobieren: `/embed/v2/demo.html?theme=plain|slides|infzone|infzone-dark`.

## Einbinden

Drei gleichwertige Wege, das Verhalten ist identisch:

```html
<!-- 1. vom Pulse-Server (einfach, aber jeder Seitenaufruf lädt von pulse.psi) -->
<script src="https://pulse.psi.uni-bamberg.de/embed/v2/pulse.min.js" defer></script>

<!-- 2. Datei mitliefern (Hugo-Asset o. Ä.) – dann data-host angeben -->
<script src="/js/pulse.min.js" data-host="https://pulse.psi.uni-bamberg.de" defer></script>

<!-- 3. inline (psi-slides: eigenständige HTML-Datei, auch file://) -->
<script data-host="https://pulse.psi.uni-bamberg.de" data-page="Vorlesung 3: Kryptographie">/* Inhalt von pulse.js */</script>
```

Variante 1 bekommt Updates automatisch, vertraut dafür aber dem Pulse-Server bei jedem Aufruf. Ein
`integrity`-Attribut (SRI) passt nicht dazu, weil sich die Datei unter derselben URL ändert. Wer eine geprüfte, feste
Fassung will, liefert die Datei selbst aus (Variante 2 oder 3); Updates sind dann ein bewusster Schritt.

Das Skript darf im `<head>` oder am Ende von `<body>` stehen; es wartet auf `DOMContentLoaded`.
Es ist ein klassisches Skript (kein ES-Modul), damit `document.currentScript` auch inline funktioniert.

## Markup

```html
<pulse-question key="krypto-signatur">
  <p>Was garantiert eine digitale Signatur?</p>                 <!-- Frage: alles außer <details> -->
  <details><summary>Antwort</summary>                            <!-- Antwort: Inhalt ohne <summary> -->
    <p>Authentizität und Integrität …</p>
  </details>
</pulse-question>

<pulse-deck group="Kryptographie">                               <!-- Stapel: zeigt eine Frage nach der anderen -->
  <pulse-question key="…">…</pulse-question>
  <pulse-question key="…">…</pulse-question>
</pulse-deck>

<pulse-summary></pulse-summary>                                  <!-- optional: Stand der Seite, Nutzen, Anmelden -->
<pulse-summary compact></pulse-summary>                          <!-- dasselbe als eine Zeile; <pulse-status> = compact -->
```

- Ohne JavaScript bleibt das normales HTML: Frage sichtbar, Antwort im aufklappbaren `<details>`.
- Frage und Antwort dürfen beliebiges **gerendertes** HTML enthalten (Code, KaTeX, Bilder). An den Server gehen nur
  die Textfassungen (`textContent`), etwa für die Erinnerungsmails.
- `key` (empfohlen): stabiler Schlüssel, eindeutig **pro Seite** (`data-page`). Mit `key` bleibt der Lernstand erhalten,
  wenn der Fragetext korrigiert wird; der Server übernimmt dann den neuen Text. Ohne `key` identifiziert der Text selbst
  die Frage (wie v1).
- `group`: optionale Gruppierung in der Pulse-Oberfläche (an `pulse-question` oder `pulse-deck`).
- v1-Markup wird weiter verstanden: `<pulse-question question="…" answer="…">`, `<pulse-page name="…">`,
  `state-*`-Attribute und der v1-Stapel `<pulse-stack group="…">`. `pulse-stack` ist ein Alias von `pulse-deck`
  (gleiche Darstellung „Frage 1 von n“, `group` wird zum Gruppennamen, gleiche Druckregeln). Fragen-Identität
  (SHA-1 des `question`-Attributs) und Seitenname (`pulse-page[name]`) bleiben wie in v1, der Lernstand bleibt also erhalten.
  web.psi konnte deshalb das Script-Tag tauschen, ohne das Markup anzufassen. Der v1-Client selbst
  (`/integrate/pulse.js`, `pulse.css`, Login per iframe) ist entfernt; `/integrate/*` antwortet mit 410 Gone. Eigene CSS-Regeln, die `pulse-deck`
  ansprechen (etwa die Theme-Variablen unten), müssen `pulse-stack` mit aufzählen.

## Konfiguration

Als `data-*`-Attribut am Script-Tag, alternativ `window.PulseConfig = {…}` vor dem Skript oder `<meta>`:

| Option | Vorgabe | Bedeutung |
|---|---|---|
| `data-host` | Herkunft von `src`, sonst `https://pulse.psi.uni-bamberg.de` | Pulse-Server |
| `data-page` | `<meta name="pulse:page">`, `<pulse-page name>`, `document.title` | Seitenname; gruppiert Fragen im Konto. Pro Vorlesung/Kapitel stabil halten |
| `data-url` | `<meta name="pulse:url">`, `<link rel=canonical>`, sonst Adresse bei http(s) | Link zur Seite in Pulse. Unter `file://` wird **nichts** gesendet, nie ein lokaler Pfad |
| `data-print` | `answers` | Druck: `answers` (Frage + Antwort), `questions` (nur Fragen), `hide` (ganz weglassen) |
| `data-style` | – | `none`: kein Grund-CSS einfügen |

## Aussehen anpassen

Das Widget rendert ins normale DOM (kein Shadow DOM) und erbt Schrift, Farbe und Überschriften der Seite.
Das Grund-CSS liegt in `@layer pulse` und nutzt nur `:where()`-Selektoren: **jede Regel der Seite gewinnt**, ohne
`!important`. Achtung: auch sehr allgemeine Regeln der Seite (`button { … }`) greifen dadurch auf die Widget-Buttons.

**Seiten mit globalem Reset.** Setzt die Seite `* { margin: 0; padding: 0 }` (z. B. `magick.css` auf den VAWi-Seiten),
gewinnt auch diese Regel gegen das Grund-CSS: Box-Innenabstand, Abstände zwischen Label, Frage, Buttons, Antwort und
Hinweisen fallen weg, das Widget wirkt gequetscht. Das ist gewollt (jede Seitenregel gewinnt) und wird nicht im Widget
umgangen. Die Seite setzt die Abstände dann selbst zurück, am besten gleich neben ihren Theme-Variablen; allgemeine
Element-Regeln der Seite für `button`, `input` oder `form` gehören in denselben Block:

```css
/* nach dem Reset der Seite; pulse-stack mit aufzählen, falls v1-Markup */
:is(pulse-question, pulse-deck, pulse-stack) { margin: .75em 0; padding: .75em; }
:is(pulse-deck, pulse-stack) pulse-question { margin: 0; padding: 0; }
:is(pulse-question, pulse-deck, pulse-stack) :is(.pulse-label, .pulse-deck-pos) { margin-bottom: .35em; }
:is(pulse-question, pulse-deck, pulse-stack) :is(.pulse-bar, .pulse-grade, .pulse-deck-nav, .pulse-a) { margin-top: .6em; }
:is(pulse-question, pulse-deck, pulse-stack) .pulse-a { padding-left: .75em; }
:is(pulse-question, pulse-deck, pulse-stack) .pulse-msg:not(:empty) { margin-top: .5em; }
:is(pulse-question, pulse-deck, pulse-stack) .pulse-panel { margin-top: .75em; padding-top: .75em; }
:is(pulse-question, pulse-deck, pulse-stack) .pulse-btn { padding: .4em .9em; }
:is(pulse-question, pulse-deck, pulse-stack) .pulse-form input { padding: .4em .5em; }
```

`--pulse-space` hilft hier nicht: Die Variable wirkt nur über das Grund-CSS, und dessen `margin`/`padding` hebt der
Reset auf. Das Anmeldeformular ordnet seine Felder als Flex-Spalte an; Grid-Regeln der Seite wie
`form label { grid-column: span 2 }` verschieben die Buttons deshalb nicht mehr. Seitenregeln wie
`form button { width: 100% }` oder `form { display: grid; box-shadow: … }` greifen aber weiterhin und sind bei Bedarf
wie oben für die Widget-Elemente zurückzusetzen (`:is(pulse-question, pulse-stack) form :is(input, button) { width: auto; }`).

Variablen (am Widget oder einem Vorfahren setzen):

| Variable | Vorgabe | Wofür |
|---|---|---|
| `--pulse-accent` | `currentColor` (gefüllter Button: `CanvasText`) | Buttons, Label, Links, Fokusring |
| `--pulse-on-accent` | `Canvas` | Schrift auf gefülltem Button |
| `--pulse-rule` | 25 % der Textfarbe | Rahmen, Trennlinie vor der Antwort |
| `--pulse-bg` | transparent | Hintergrund der Box |
| `--pulse-radius` | `.4em` | Ecken von Box, Buttons, Feldern |
| `--pulse-ui-font` | erbt | Schrift für Buttons, Label, Hinweise |
| `--pulse-ui-size` | `.85em` | Größe dieser UI-Texte |
| `--pulse-muted` | 70 % der Textfarbe | Hinweise und Statusmeldungen |
| `--pulse-space` | `.75em` | Innen- und Außenabstand der Box |
| `--pulse-error` | `#b3261e` | Fehlermeldungen im Login |

Klassen für gezielte Anpassungen: `.pulse-label`, `.pulse-q`, `.pulse-a`, `.pulse-bar`, `.pulse-btn`, `.pulse-primary`,
`.pulse-reveal`, `.pulse-yes`, `.pulse-no`, `.pulse-msg`, `.pulse-panel`, `.pulse-form`, `.pulse-deck-pos`, `.pulse-next`.
Zustand am Element: `data-pulse-state="new|open|scheduled|answered"`.

### psi-slides print.html (getestet in der Demo)

```css
pulse-question, pulse-deck, pulse-status {
  --pulse-accent: var(--emph); --pulse-rule: var(--rule); --pulse-radius: var(--radius-card);
  --pulse-ui-font: var(--sans); --pulse-muted: var(--ink-soft); --pulse-on-accent: var(--paper);
  --pulse-bg: color-mix(in oklch, var(--ink) 4%, transparent);
}
```

### inf.zone / Hextra (entschieden: Variante „Rahmen“, getestet hell und dunkel)

```css
pulse-question, pulse-deck, pulse-status {
  --pulse-accent: hsl(var(--primary-hue) var(--primary-saturation) 38%);
  --pulse-rule: #d1d5db; --pulse-radius: .5rem; --pulse-on-accent: #fff;
}
.dark pulse-question, .dark pulse-deck, .dark pulse-status {
  --pulse-accent: hsl(var(--primary-hue) var(--primary-saturation) 72%);
  --pulse-rule: #374151; --pulse-on-accent: #111827;
}
```

## Zusammenfassung und eigene Darstellung

Kein Overlay, kein schwebender Knopf: Die Seite entscheidet, ob und wo sie den Stand zeigt.

- `<pulse-summary>`: Titel, ein Punkt je Frage (Sprunglink), Stand in Worten, darunter ohne Anmeldung der Nutzen
  („nach 1, 2, 4, 7 und 14 Tagen per E-Mail …“) mit „Per E-Mail wiederholen“, angemeldet „Fällige Frage öffnen“;
  Links „So funktioniert’s“ (Startseite `/#so-gehts` bzw. `/en/#so-gehts`), Datenschutzhinweise, Abmelden bzw. lokale Antworten löschen.
- `<pulse-summary compact>` (oder `<pulse-status>`): eine Zeile mit dem Stand, Punkte, Erklärung und Links in einem
  `<details>` „Mehr zu Pulse“.
- Punkte (`.pulse-dots li[data-state]`): `new` leer, `known` voll, `unknown` halb, `saved` hell, `due` in `--pulse-due`
  (Vorgabe `#b45309`). Für Screenreader ausgeblendet; der Satz daneben trägt die Information.
- Am Element: `data-logged-in="true|false"`, `data-due="<n>"`, z. B. um die Box nur bei fälligen Fragen zu zeigen.
- Eigene Darstellung: `document.addEventListener("pulse:update", e => …)` mit `e.detail =
  {total, answered, known, saved, due, totalDue, loggedIn, expired, name, local, items: [{id, state, text}]}`.
  Aktionen: `Pulse.login(element)` (Formular in `element`), `Pulse.logout()`, `Pulse.clearLocal()`, `Pulse.nextDue()`,
  `Pulse.state()`.

## Texte für Studierende (Microcopy)

Nach einem adversarialen Review aus Sicht von Erstnutzern (Erstsemester am Handy, berufsbegleitend Studierende):

- Sichtbar sind nur drei Begriffe: **Frage**, **gewusst / nicht gewusst**, **kommt per Mail wieder**. Nicht verwenden:
  Konto, gespeichert, Registrierung, fällig, Stapel, lokal, Stufe. „Pulse“ nur als Name, nicht als handelnde Figur.
- Der Aufwand steht **vor** der Anmeldung (`loginIntro`): Abstände, höchstens eine Erinnerung am Tag plus mittwochs eine
  Auswahl, Pause bei fehlender Reaktion, Abbestellen per Link. Jede Zusage muss dem tatsächlichen Mailversand entsprechen.
- Kein Druck, keine Gamification: keine Gesamtzahl fälliger Fragen, keine Serien.
- Die Kurzform zeigt keine Punkte (ohne Legende nicht lesbar); der volle Block zeigt sie neben dem Titel.
- Die Statistik-Einwilligung gehört nicht in den Login-Dialog (siehe PLAN.md: eigener Moment nach einer Wiederholungsrunde).
- Label der Frage: „Selbsttest“ (inf.zone: Rahmen = Selbsttest).

## Verhalten

- **Ohne Anmeldung**: keinerlei Anfragen an Pulse. „Gewusst/Nicht gewusst“ wird im `localStorage` der Seite gespeichert
  (`pulse:v2:pending`).
- **Anmeldung** im Widget (Link „Per E-Mail wiederholen“ oder `<pulse-status>`): E-Mail-Adresse → 6-stelliger Code per
  Mail (10 Minuten gültig, 5 Versuche; auf dem Server nur als HMAC mit Server-Geheimnis gespeichert) → Token (90 Tage) im `localStorage` (`pulse:v2:token`). Unbekannte Adressen
  bekommen dabei ein Konto; Name und Statistik-Einwilligung sind optional. Kein iframe, keine Cookies von Dritten,
  funktioniert unter `file://`.
- Nach der Anmeldung werden die lokal gespeicherten Antworten (Frage- und Antworttext, Seitenname, Seitenadresse,
  gewusst/nicht gewusst) in das Konto übertragen und lokal gelöscht.
- Abmelden löscht Token, Name und lokal gespeicherte Antworten im Browser und den Token auf dem Server (sofern
  erreichbar; sonst läuft er nach 90 Tagen ab und wird dann gelöscht). Ohne Anmeldung bietet `<pulse-status>` an,
  lokal gespeicherte Antworten zu löschen.
- Ein Token des v1-Clients (`pulse-token`) wird **nicht** übernommen, sondern entfernt (Befund A13 im Ops-Repo). Angemeldet lädt das Widget einmal pro
  Seitenaufruf den Stand aller eigenen Fragen (`GET /api/v1/questions`) und zeigt, ob eine Frage fällig ist.
- `localStorage` gilt pro Herkunft: web.psi, inf.zone und `file://` brauchen jeweils eine eigene Anmeldung.
- Stapel: „Nächste Frage“ erscheint, sobald die aktuelle Frage beantwortet ist. Angemeldet gilt das auch für Fragen,
  die gerade nicht wieder dran sind: Sie tragen den Hinweis „Diese Frage kommt später per Mail wieder“, lassen sich
  aufdecken, aber nicht bewerten, und man blättert ohne Bewertung weiter. Beim Laden rücken fällige und neue Fragen nach
  vorn, die übrigen ans Ende; auf dem letzten Platz steht „Alle Fragen hier beantwortet.“ Eine Anmeldung mitten im
  Stapel lässt die aktuelle Frage und den Button stehen.
- Druck: Buttons, Hinweise und Status verschwinden; Stapel werden ausgeklappt (siehe `data-print`).
- Aufbau: Label, Frage, Button „Antwort zeigen“, darunter die Antwort, darunter die Bewertung. Beim Aufdecken bleibt
  der Button an seinem Platz; nur Inhalt *unter* dem Widget verschiebt sich, wie bei `<details>`.
- Sprache (DE/EN) nach dem nächsten `lang`-Attribut, also auch gemischt auf einer Seite. Fehlt `lang` ganz, gilt die
  Browsersprache; einbettende Seiten sollten `lang` am `<html>` setzen.
- Beim Aufdecken springt der Fokus auf „Gewusst“. Wer Fragen per Skript aufdeckt, löst damit ein Scrollen aus.
- Barrierefreiheit: echte Buttons mit `aria-expanded`/`aria-controls`, Statusmeldungen über `role="status"`,
  Fokus springt nach dem Bewerten zurück, Formularfelder mit `<label>`, sichtbarer Fokusring.

## Voraussetzungen auf der einbettenden Seite

- CSP (falls vorhanden): `script-src` für den Pulse-Server bzw. `'unsafe-inline'`/Hash bei Inline-Einbettung,
  `connect-src https://pulse.psi.uni-bamberg.de`. Kein `frame-src` nötig.
- Datenschutzhinweise der Seite: Ohne Anmeldung überträgt das eingebettete Skript nichts an Pulse
  (bei Variante 1 lädt der Browser nur das Skript von pulse.psi). Mit Anmeldung gelten die Datenschutzhinweise von Pulse.

## Hinweise für die Integration

**psi-slides** (`build.js`, `lint.js`):
- Nur in `print.html` (und ggf. `print-notes.html`) einbauen, nicht in audience/speaker: Skript inline in
  `renderDocument()` neben `PRINT_JS`, CSS-Zuordnung oben in `PRINT_CSS`.
- `data-page` aus dem Titel der Vorlesung, `data-url` aus einer öffentlichen URL im Frontmatter, falls vorhanden.
- Autorensyntax z. B. als Direktive, die Markdown in Frage und Antwort erlaubt:
  ```
  ::: pulse {#krypto-signatur}
  Was garantiert eine digitale Signatur?
  ---
  Authentizität und Integrität …
  :::
  ```
  → `<pulse-question key="krypto-signatur"><p>…</p><details><summary>Antwort</summary><p>…</p></details></pulse-question>`

**inf.zone** (Hugo/Hextra):
- Shortcode `layouts/shortcodes/pulse.html`, z. B. `{{< pulse key="…" frage="…" >}}Antwort in Markdown{{< /pulse >}}`,
  optional `pulse-deck` als umschließender Shortcode.
- Skript als Asset nur auf Seiten mit Fragen: in `layouts/partials/custom/head-end.html` mit `.HasShortcode "pulse"`.
- Gestaltung entschieden: dünner Rahmen in `--pulse-rule`, Label in Akzentfarbe (Snippet oben). Die Regel „keine
  weiteren Kasten-Varianten“ in der `CLAUDE.md` von inf.zone um eine Zeile ergänzen: Rahmen = Wiederholungsfrage
  (interaktiv, Label „Selbsttest“). Nicht wie „Tipps“ grau hinterlegen, das ist dort das Signal für optionale Hilfe.

## Server-API (für eigene Clients)

| Methode, Pfad | Zweck |
|---|---|
| `POST /api/v1/auth/request` `{email, lang}` | Code per Mail; Antwort `{requestId}` (gleich für bekannte und unbekannte Adressen) |
| `POST /api/v1/auth/verify` `{requestId, code, name?, logQuestions?}` | `{token, newAccount, name}` |
| `POST /api/v1/auth/logout` (Header `X-API-KEY`) | Token löschen |
| `GET /api/v1/questions` | `[{hash, isOpen, states}]` |
| `POST /api/v1/questions` | Frage anlegen und erste Antwort; idempotent. `hash` = SHA-1 von `"key:"+key` oder vom Fragetext |
| `PUT /api/v1/questions/{hash}` `{remembered, pageName, question?, answer?}` | Antwort auf fällige Frage, optional Textkorrektur |

Server-Konfiguration: `LOGIN_CODE_SECRET` in `.env` (mindestens 32 Zeichen, `openssl rand -hex 32`); ohne Geheimnis
antwortet `/api/v1/auth/request` mit 503.

Tests: `scripts/e2e-embed-api.sh` (API), `scripts/e2e-privacy.sh` (Datenschutz), Demo-Seite im Browser.
