# Arbeitsplan

Reihenfolge nach Risiko: erst reproduzierbar bauen, dann Datenschutz und Sicherheit, dann Oberfläche.
Jeder Block ein eigener Branch und ein eigener Deploy.

## 1. Reproduzierbarer Build (`build/reproducible`) – ausgerollt als `2976f2f`

- [x] Prüfen, ob der Produktivstand heute noch baut: ja, aus dem Lockfile (Prisma 5.8.0, Nuxt 3.9.1)
- [x] Dockerfile: `npm ci`, Stages build/migrate/runtime, Runtime als User `node`
- [x] Migrationen als eigener Schritt `docker compose run --rm migrate` statt bei jedem Start (O10)
- [x] Image-Tags pinnen: `node:22-bookworm-slim`, `postgres:16` (O5)
- [x] Lokale Entwicklungsumgebung: `docker-compose.dev.yml` mit leerer DB und Mailpit
- [x] Mail-Zugangsdaten zur Laufzeit (`NUXT_MAIL_SECRETS_*`) statt im Bundle (O11), `.dockerignore`
- [x] Deploy-Runbook: Ops-Repo `docs/runbooks/02-deploy-new-build.md`; Volume-Name fest, Images per `PULSE_TAG`
- [x] Build auf dem Mac (amd64 per buildx), Übertragung per `docker save | ssh … docker load`; amd64-Rauchtest grün

## 2. Datenschutz und Sicherheit (`fix/privacy-security`) – ausgerollt als `2976f2f`

- [x] A11: Nutzereingaben (Name) in Mails HTML-escapen
- [x] A0: `QuestionLog` nur mit `log_questions`; Lösch-SQL für Altdaten liegt im Ops-Runbook 02 (Ausführung nach Freigabe)
- [x] A1b: nicht bestätigte Konten nach 30 Tagen löschen
- [x] A2: Rate-Limit für Login- und Signup-Mails (pro Adresse und IP)
- [x] A3: Lucia `env: "PROD"` (Secure-Cookie)
- [x] A4: einheitliche Antwort beim Login, keine Account-Enumeration
- [x] Scheduler prüft nur noch aktive Fragen (vorher: jede Minute alle Fragen neu geschrieben)
- [x] Tests: `scripts/e2e-privacy.sh`
- [x] A9: Token-Laufzeiten, Kommentare und README angleichen
- [ ] Ein gemeinsamer PrismaClient statt `new PrismaClient()` pro Datei (Log: „10th instance of Prisma Client“)
- [ ] A6: `npm audit`, Dependency-Updates (Nuxt 3.x aktuell, Prisma 5/6), Ablösung von Lucia v2 planen

## 2b. Embed v2 für statische Seiten (`feat/embed-v2`)

- [x] Neuer Client `public/embed/v2/pulse.js` (+ `.min.js`, ~7 KB gzip): Light DOM, `@layer`, CSS-Variablen, DE/EN, a11y, Druck
- [x] Code-Login im Widget (`/api/v1/auth/request|verify|logout`), Registrierung im Widget, Token 90 Tage
- [x] `key`-Attribut für stabile Fragen-IDs, `POST` idempotent, Textkorrektur per `PUT`
- [x] Ohne Anmeldung keine Anfragen an Pulse; unter `file://` keine lokalen Pfade an den Server
- [x] Tokens in Mail-Links mit `crypto.randomInt` statt `Math.random` (A12)
- [x] Doku `docs/embed-v2.md`, Demo `/embed/v2/demo.html`, Tests `scripts/e2e-embed-api.sh`
- [x] `<pulse-summary>` (voll/kompakt), Ereignis `pulse:update`, `window.Pulse`; Erklärseite `/about` (DE/EN)
- [x] Microcopy-Review umgesetzt (Widget); Streak-Mail entfernt, Pause-Mail höchstens einmal
- [x] Mails zweisprachig (User.lang) und im Ton des Widgets, Absender und Betreff mit „Uni Bamberg“, List-Unsubscribe,
      Anrede ohne Adressteil; Abmeldeseiten DE/EN (Bestätigung bleibt: Link-Scanner rufen Links automatisch auf)
- [x] /about an die Widget-Texte angleichen (Pause, Noten-Satz, Speicherung im Browser)
- [x] Forschungs-Einwilligung: pseudonyme Einträge (ohne Konto-/Frage-Id), Löschung nach einem Jahr, einmalige Frage
      auf der Antwortseite nach einer Mail-Runde (Konto ≥ 14 Tage, ≥ 5 Fragen); Fragebogen: spätere Einladung per Mail
      an alle, Einwilligung erst am Fragebogen,
      Altbestand v0 bis zur neuen Entscheidung; Signup ohne Statistik-Schalter; Tests `scripts/e2e-research.sh`
- [x] Serie bleibt (Entscheidung DH), Texte sachlich: Dashboard-Kennzahlen neu erklärt (Regeln aus Scheduler und
      `editQuestion.ts`), Wochenseite meldet die Serie ohne Druck
- [x] Antwortseiten aus den Mails (/answer/...) DE/EN: Sprache des Kontos über `/api/answer/lang` (Token aus der Mail),
      sonst `?lang=` bzw. Accept-Language; `<html lang>` schon beim Server-Rendern. Mail-Links: `?lang=` bzw. `&lang=` anhängen
- [x] Nach Code-Review: v1-Token nicht übernehmen (A13), Login-Codes als HMAC, Abmelde-Tokens rotiert (Migration),
      Aufräumen von Codes/Tokens als eigener Scheduler-Lauf, Rate-Limiter hält Adressen höchstens einen Tag,
      Abmelden löscht lokale Antworten
- [x] Ausrollen (Runbook wie 02; vorher `LOGIN_CODE_SECRET` in `/root/pulse/.env`)
- [x] web.psi (`teaching/vawi/`, 10 Kapitel) auf v2 umgestellt; `<pulse-stack>` als Alias in v2
- [x] `teaching/vawi/test.html` auf v2 umgestellt: keine Seite auf web.psi bindet mehr `/integrate/` ein
- [x] v1-Client entfernt (A13, `chore/remove-v1-client`): `public/integrate/`, `/api/v1/foreignSession`, iframe-/postMessage-Logik
      in Login, Signup und E-Mail-Bestätigung, `/integrate` (Anleitung) und `/explanation`; `/integrate/*` → 410,
      `/explanation` → wie `/about`; Build-Argument `HOST_URL` und `css-minify` entfallen
- [ ] Nach dem Ausrollen: Caddy (psi-ansible `bew.yml`) für die App `frame-ancestors 'none'` statt web.psi

## 2c. Startseite (`landing/`) – ausgerollt als `38ad60e`, Startseite zuletzt `02b4dec`

- [x] Statische Startseite DE/EN auf bew (Caddy: `/`, `/en/`, `/assets/`), Rest an die VM; Dashboard unter `/home`
- [x] Dienstname psi-pulse in Startseite, App, Mails und Widget
- [x] Layout nach psi-slides.org, Schriften IBM Plex Sans/JetBrains Mono/Copse lokal, Demo mit echtem Widget
- [x] `/about` leitet auf den Abschnitt „So funktioniert’s“ der Startseite um (302, `lang` bzw. Accept-Language); Mails und Widget verlinken direkt `/#so-gehts` bzw. `/en/#so-gehts`
- [x] Erklärung zur Barrierefreiheit unter `/barrierefreiheit/` und `/en/accessibility/`, im Footer verlinkt (B9)

## 3. Zweisprachigkeit und Barrierefreiheit (`feat/i18n-a11y`)

- [ ] `@nuxtjs/i18n` mit DE/EN, Sprache aus Browser bzw. `lang` der einbettenden Seite
- [x] Widget: zweisprachig mit `lang` erledigt in Embed v2; der v1-Client (B7) ist entfernt
- [x] Mails zweisprachig bzw. in der Sprache des Kontos (mit Embed v2, `User.lang`)
- [x] App: B1 `lang` am `<html>`, B2 Namen für die Schalter in den Einstellungen, B3 Kontraste (Uni-Blau als primary), B4 Links unterstreichen
- [x] Widget v1: B5–B8 entfallen, die Vorlesungsskripte nutzen Embed v2 (axe 0 Befunde)
- [ ] `nested-interactive` (axe): UDropdown/USelectMenu von Nuxt UI 2 legen einen `<button>` in ein `div role=button`
- [x] Erklärungen hinter Info-Symbolen (Hover-Tooltips) sichtbar bzw. als `<details>` auf Übersicht und Fragenliste
      (WCAG 2.1.1, 1.4.13)
- [ ] Microcopy-Liste aus `a11y-microcopy.md` abarbeiten (erledigt: „How do you want to be called?“, Seitentitel; explanation.vue ist entfernt)

## 4. Rechtstexte (`feat/legal-pages`)

- [ ] Datenschutzhinweise (Entwurf `privacy-policy.md` im Ops-Repo): DE online seit `1e75f30`, EN fehlt, DSB-Abstimmung steht aus
- [x] Impressum: `/imprint` leitet aufs Impressum der Lehrstuhlseite um
- [x] Erklärung zur Barrierefreiheit (B9) mit Feedback-Kontakt (siehe 2c)
- [ ] Link auf den Quelltext im Footer (AGPL-tauglich)

## 5. Veröffentlichung

- [x] Lizenz-Mail von Florian (AGPL-3.0), LICENSE und Autorennennung
- [ ] Nach `uba-psi/psi-pulse`: Originalstand als Commit von Florian, danach die Weiterentwicklung als ein Commit
