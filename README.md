# psi-pulse

psi-pulse puts short review questions into lecture notes and sends them back to readers by email at growing intervals (spaced repetition). The Chair of Privacy and Security in Information Systems (PSI) at the University of Bamberg runs it at [pulse.psi.uni-bamberg.de](https://pulse.psi.uni-bamberg.de/).

The repository contains three parts:

- the **embed script** (`public/embed/v2/pulse.js`), which lecture notes include to show questions in the text,
- the **web app** (Nuxt): accounts, dashboard, settings, the pages behind the links in emails, the scheduler that sends the emails,
- the **home page** (`landing/`), a static site that is served separately (see [Home page](#home-page)).

## How it works

1. A page includes the embed script and marks up questions with `<pulse-question question="…" answer="…">`.
2. Readers answer in the text with "I knew it" or "I didn't". Without signing in, answers stay in the browser.
3. Readers who sign in with their email address get their questions stored in an account. From then on, psi-pulse emails questions that are due for review.
4. How soon a question comes back depends on the previous answers.

## Accounts and sign-in

An account consists of an email address and an optional name. There are two ways to sign in:

| | Embed script | Web app (`/login`, `/signup`) |
|---|---|---|
| Method | six-digit code by email | sign-in link by email |
| Validity | 10 minutes, at most 5 attempts | 2 hours; a new request within the first hour sends the same link again |
| Account | created on first sign-in | created by `/signup` |
| Result | API key for `/api/v1` (`X-API-KEY` header), valid 90 days; every sign-in creates a new key, signing out deletes it | session cookie |

Details:

- **Code storage:** codes are stored as HMAC-SHA256 under `LOGIN_CODE_SECRET`. Without this secret (at least 32 characters) the code sign-in answers 503.
- **Sign-in links:** opening a link does not sign in yet. The page asks for a click (POST with a same-origin check), so link scanners in mail systems cannot use up the link.
- **No account enumeration:** login and signup respond the same way whether an address has an account or not.
- **Unconfirmed accounts:** accounts whose address was never confirmed are deleted after 30 days.
- **Rate limits** (in memory, per instance): at most one mail per address per minute and five per day, plus-aliases included; 200 mail requests per IP per hour. The client IP is taken from `X-Forwarded-For`, so only the reverse proxy may reach the app.
- **Sessions** (`server/utils/auth.ts`): random IDs stored in the database, cookie `auth_session` (HttpOnly, SameSite=Lax, Secure in production). A session stays active for one day and can be renewed for another 14 days of idle time. Requests that change data need an `Origin` header matching the host.
- **Settings:** users can export their data (Art. 20 GDPR), delete their research data, and delete their account (Art. 17 GDPR).
- **Language:** the account language (German or English) is taken from the browser at signup or from the embed script's `lang`. It decides the language of all emails.

## Questions and review intervals

A question is added to the account the first time a signed-in reader answers it in the text. It is stored with its text and answer, page name and URL, an optional group, and its review states.

**States.** Each question has up to six states, each with a label and an offset in days. `INITIAL`, `STATE_1` and `FINAL` are required; `STATE_2` to `STATE_4` are optional and skipped when missing. The defaults are:

| State | `INITIAL` | `STATE_1` | `STATE_2` | `STATE_3` | `STATE_4` | `FINAL` |
|---|---|---|---|---|---|---|
| Label | in-text | 1 day | 2 days | 4 days | 1 week | 2 weeks |
| Offset (days) | 0 | 1 | 2 | 4 | 7 | 14 |

A question is due again once the offset of its current state has passed since the last answer. The rules for moving between states (`server/utils/editQuestion.ts`):

- **"I knew it"** moves the question up one state. Remembering it in `FINAL` moves it to `LONG_TERM`, an extra state that uses the `FINAL` offset.
- **"I didn't" once** keeps the state.
- **"I didn't" again right after** moves the question down one state, and so on with each further miss. From `LONG_TERM` it goes back to `FINAL`.
- **Answers from the weekly email** do not move a question up; a miss there only moves `LONG_TERM` back to `FINAL`.

**Active, neglected, pending.** A question is *active* while it is answered on time. If it is not answered within twice its offset (at least one day), it becomes *neglected*. The next answer makes it *pending*, the one after that *active* again.

**Dashboard.** The dashboard (`/home`) shows the number of questions, the share that is active, the number of days the longest-running question has been on time, and the weekly streak.

**Archive and delete.** Archived questions no longer come back by email, and archiving can be undone. Deleting removes the question.

## Emails

All times are full hours in German time (Europe/Berlin), independent of the server's time zone.

| Email | When |
|---|---|
| Sign-in code / sign-in link | on request (see above) |
| Reminder | at most once a day at the preferred hour (default 14:00), if questions are due |
| Weekly selection | once a week on the preferred day and hour (default Wednesday 16:00) |
| Pause | when reminders or weekly selections are ignored (see below) |
| Welcome back | when a paused user answers a question |
| Pause over | when a pause ends after 14 days |

- **Reminder:** contains up to six due, non-archived questions, chosen at random. Questions from an earlier reminder that is still unanswered are not sent again. The email has one link to answer all questions and, when there are several, one link per question.
- **Weekly selection:** a random choice of non-archived questions, whether due or not (default 6, at most 20). Stepping through the whole selection raises the weekly streak by one. The streak drops to zero if the selection is still unfinished when the next one is due.
- **Pause:** no reaction to reminders for seven days, or an unfinished weekly selection older than 14 days, pauses all emails for 14 days. Answering any question ends the pause early.
- **Weekly emails** are only sent while reminders are switched on. Both can be switched off in the settings.
- **Unsubscribing:** emails carry a `List-Unsubscribe` header. Its link opens a confirmation page instead of unsubscribing directly, because link scanners open links automatically.

## Links in emails

The answer pages behind email links work without signing in. The random tokens in these links grant only what the page needs:

| Link | Valid |
|---|---|
| Reminder ("answer all") | 30 days; each question can be rated once |
| Single question from a reminder | 30 days, single use; replaced by the next reminder |
| Weekly selection | until the selection is finished or the next one replaces it |
| Unsubscribe (all emails / weekly only) | until used; switching emails on again creates a new one |

## Research data (optional)

With the user's consent, every answer (in the text, in the web app or from an email) is logged for research on learning (`QuestionLog`). The log is pseudonymous: it holds no account or question ID. Entries are deleted after one year.

Consent is asked for once, on the answer page after a round of email questions, and only for accounts that are at least 14 days old and have at least five questions. Users can change their decision and delete the logged data in the settings.

## Embed

Websites add questions with the embed script `public/embed/v2/pulse.js` (served as `/embed/v2/pulse.min.js`). It needs no iframe and no third-party cookies, signs in by email code, and also works in local files (`file://`).

- **Documentation:** markup, configuration, styling and the server API are described in [`docs/embed-v2.md`](docs/embed-v2.md).
- **Demo:** `/embed/v2/demo.html`.
- **Old library:** the original library (`/integrate/pulse.js`, sign-in through an `<iframe>`) has been removed, and its old addresses answer with 410 Gone. Its markup (`<pulse-page name>`, `<pulse-stack group>`, `<pulse-question question answer>`) is still understood.

## Development

The app runs on Node 24, Nuxt 4 with Nuxt UI 4 (Tailwind CSS 4), Prisma 7 with the PostgreSQL driver adapter, and PostgreSQL 16. The easiest setup is Docker with an empty database and [Mailpit](https://mailpit.axllent.org/) as a mail catcher:

```bash
cp .env.example .env
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile tools build
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
docker compose -f docker-compose.yml -f docker-compose.dev.yml run --rm migrate
```

The app is then at http://localhost:3000 and Mailpit at http://localhost:8025. To run `npm run dev` without Docker, set the variables listed at the end of `.env.example` directly.

Where things are:

| Path | Contents |
|---|---|
| `pages/`, `components/`, `layouts/` | front end |
| `server/api/` | internal endpoints of the web app |
| `server/api/v1/` | public API for the embed script (`v1` is the API version) |
| `server/plugins/` | scheduler for emails and cleanup (node-cron, one run per minute) |
| `server/utils/email.ts` | email texts |
| `prisma/` | schema and migrations |
| `scripts/e2e-*` | end-to-end tests against the local Docker setup (some need Playwright, see [`docs/dependencies.md`](docs/dependencies.md)) |

`npm run build` also minifies the embed script to `pulse.min.js`, which is not under version control. Dependency maintenance and the September 2026 upgrade are described in [`docs/dependencies.md`](docs/dependencies.md).

## Deployment

`docker-compose.yml` runs the app (distroless Node image), a separate migration image and PostgreSQL.

```bash
cp .env.example .env   # set HOST_URL, DB_PASSWORD, LOGIN_CODE_SECRET (openssl rand -hex 32) and SMTP
docker compose --profile tools build
docker compose up -d
docker compose run --rm migrate   # on first install and after updates with new migrations
```

- **Port:** the app listens on port 8080 (IPv4). Run it behind a reverse proxy that terminates TLS, and make sure only the proxy can reach port 8080, because the app trusts `X-Forwarded-For`.
- **Images:** they are tagged with `PULSE_TAG`. `scripts/build-release.sh` builds tagged amd64 images from a clean `main` that has been pushed to GitHub.
- **The chair's instance** at pulse.psi.uni-bamberg.de is deployed with a script in a private operations repository. It transfers these images, runs the migrations, restarts the app, checks the live site and publishes the home page. Every deployed version is on GitHub, so the source link in the app always matches what runs.

## Home page

`landing/` holds the static home page (German and English), the accessibility statement and the page for developers. `python3 landing/build.py` builds it into `landing/dist/`. At pulse.psi.uni-bamberg.de the reverse proxy serves these pages directly and passes everything else to the app, which is why the app's dashboard lives at `/home`. Details: [`landing/README.md`](landing/README.md).

## Authors and license

psi-pulse was written by Florian Seida, under the name Pulse, as part of a project at the Chair of Privacy and Security in Information Systems (PSI), University of Bamberg. The first commit of this repository is his original version. Since 2026 the chair develops and runs it as psi-pulse.

Licensed under the GNU Affero General Public License v3.0, see [`LICENSE`](LICENSE). If you run a modified version as a network service, you must offer its source code to your users.

Exceptions: the fonts in `landing/static/fonts/` are licensed under the SIL Open Font License 1.1 (license files next to them). The seal of the University of Bamberg (`landing/static/img/ub-siegel-weiss.webp`) is not covered by the AGPL; it may not be used outside the university's own services.
