# Developer Guide – Pulse

Pulse is a web application for learning flashcards based on spaced repetition. Spaced repetition can be defined as [a method of reviewing material at systematic intervals](https://www.kpu.ca/sites/default/files/Learning%20Centres/Think_SpacedRepetition_LA.pdf). At systematic intervals, Pulse displays questions to the users. The user previously added these questions by visiting websites integrating Pulse in their texts. By integrating Pulse, website owners can design questions that the user can learn. The user must then answer if he remembered the Pulse question's answer (further called 'answer the question'). Depending on whether the user remembered or not, the question will be asked by Pulse more or less frequently.
# Web App
The Pulse web app is Pulse's central component. As the central component, it manages user authentication and the user's questions, and automatically sends out emails. To accomplish this functionality, Pulse introduces different kinds of tokens.
## **Account**
Each person who wants to use Pulse needs their own Pulse account. A Pulse account requires, besides a name, only an email address, as the authentication is passwordless through a magic link. The web app's authentication and accounts are used by the web app itself and third-party websites integrating Pulse. These third-party websites use the web app and its authentication to store and update Pulse questions for users. How third-party access works is further described in the Third-Party Token section and the Embed chapter.

In the web application, the user can get an overview of all stored questions, answer questions, and customize their account. If the user does want a copy of its data (Art. 20 GDPR), an export button can be found in the user settings. The user settings also do provide an account delete button (Art. 17 GDPR).
## Question Lifecycle
A Pulse question walks through different states to archive spaced repetition. Additional features are implemented in Pulse to increase the effectiveness of Pulse.

The lifecycle of a question always begins at a third-party website. The third-party website implements Pulse and provides designed Pulse questions. Each Pulse question consists of a question, an answer to the question, the current page name, and the states it walks through. Additionally, a group can be defined to categorize the questions further within a page. By answering the question once, the question is added to the user's account, and stepping through the different states starts. How to write Pulse questions into a page is described in [`docs/embed-v2.md`](docs/embed-v2.md).

Each question can walk through a maximum of six states. Each state is characterized by a label and an offset. The offset describes after how many days the question is open to be answered again in its current state after answering it the last time. While the first state describes how many days the question is asked again if the user cannot remember answering it for the first time, the final state defines how many times the user gets asked the question again if he can always remember. The state will increase if the user remembers the answer to a question again and has not previously forgotten it. The state will not increase but stay the same if the user previously forgot the answer to the question. The state will also stay the same if the user has previously remembered the question but has now forgotten it. If the user forgets a question twice in a row, the question falls back to the previous state. Overall, the goal is to keep all questions in their final state.

Pulse introduces an additional property to the Pulse question to increase user motivation. This property describes how active a user is learning a question. A question is *active* if the user always answers the question within the current state's offset since the question is opened. If the user misses answering the question within the offset once, the question is *neglected*. Answering then the question again with the offset makes it *pending*. After answering the question two times in a row, the question is marked as active again. How many of the added questions are active are displayed on the user's home screen. Additionally, on the home screen, the oldest active question is displayed. Both types of information should motivate the user to continue learning.

There are two options if the user does not want to be asked a question again. The first option is to archive the question. The question will not be checked for being opened. The second option is to delete the question entirely.
## Emails
Pulse features additional types of emails besides the required login email containing the magic link. These additional types aim to increase interaction with Pulse and, therefore, the learning effectivity.
### Reminder
Reminder emails help the user become aware of open questions and keep them active. A reminder email is sent once a day and contains a maximum of six non-archived open questions. If there are more than six non-archived open questions, the questions get selected randomly. All remaining questions walk through the same process the following day as long as they are not sent out.

A reminder email consists of two important elements. The first element is the list of the selected questions. For each question, a dedicated answer button exists, enabling answering only chosen questions. The second element is the *answer all questions* button, so the user does not need to open all questions after each other.

Not reacting to a reminder email can have multiple consequences. The first consequence is that the user may miss answering the questions in time and, therefore, get neglected. If the user does not answer at least one question of a reminder email for more than a week, another consequence is that sending out reminder emails is paused as the user gets *paused.*

Reminders are enabled by default but can be disabled. If reminders are enabled, the user can customize the preferred delivery time.
### Weekly
The goal of weekly emails is to keep the user active by sending out a number of random, non-archived questions once a week. Sending out an email once a week prevents complete silence of Pulse in case all questions are in states with an offset of more than a week. Answering all questions of the weekly emails within a week rewards the user with an increase in the user's weekly streak. The weekly streak is displayed on the user's home screen next to the active questions and the oldest active question. Answering and not remembering the questions will only drop questions from the long-term state to the final state but will not further affect the question.

Ignoring weekly emails has multiple consequences. If the user does not answer all questions of a weekly email before the next one is sent out, one consequence is that the weekly streak is reset. If the user ignores two weekly emails in a row, the user gets paused, like ignoring too many reminder emails.

Weekly emails are enabled by default but can be disabled by the user. They are automatically disabled if reminders and, therefore, emails are disabled entirely. If weeklies are enabled, the user can customize the preferred delivery day, time, and number of maximum selected questions.
### Pause
As previously described, users can get paused if they ignore weekly or reminder emails to experience active consequences for not learning. If the user gets pauses, Pulse sends a pause email. The pause email contains a generic description of why email notifications are paused for the user.

There are multiple ways to get unpaused. If the user starts interacting again with Pulse by answering at least one question, an unpause email is sent welcoming the user back. If the user does not interact with Pulse for two weeks after being paused, he gets unpaused automatically. When the user gets unpaused automatically, an email is sent out stating that Pulse gives the user 'another chance.'
## Tokens
Pulse uses different tokens for different access permissions. Web authentication uses random, server-side database sessions in `server/utils/auth.ts` and an HttpOnly, Secure, SameSite=Lax cookie. Existing Lucia sessions remain compatible; Lucia itself has been removed. Sessions have a one-day active window, followed by fourteen days of idle validity, and renew on use after the active window. Cookie-authenticated mutations require a matching Origin header.
### Magic Link Token
The magic link token is used for account login by email. For login by email, an email contains a link with the token that authenticates the login and then provides a bearer token. The magic link token is valid for 2 hours.
### Question Token
Each question can have a token that allows updating the question. The question is only updated with this token through a reminder email. The reminder email uses this token to allow answering single questions instead of all reminded questions at once. The token is valid indefinitely but will be deleted once the associated question is answered.
### Third-Party Token
The third-party token allows reading, adding, and updating questions at the versioned endpoints `/api/v1/`. The embed script uses these endpoints to interact with Pulse; it obtains the token by a six-digit code sent by email (`/api/v1/auth/request` and `/api/v1/auth/verify`). Each token belongs to one user, while a user can have multiple third-party tokens for various websites. The token is valid for 90 days.
### Reminder Token
The reminder token enables answering all reminder questions at once without logging in and is used in a reminder email. The token is valid for 30 days.
### Weekly Token
The weekly token enables answering all weekly questions at once without logging in and is used in a weekly email. The token is indefinitely valid but will be overwritten after seven days with the one for the following weekly email.
# Embed
Websites add Pulse questions with the embed script `public/embed/v2/pulse.js` (served as `/embed/v2/pulse.min.js`). It needs no iframe and no third-party cookies, logs in by email code and also works in local files (`file://`). Markup, configuration, styling and the server API are described in [`docs/embed-v2.md`](docs/embed-v2.md); a demo is at `/embed/v2/demo.html`.

The original library (`/integrate/pulse.js` and `pulse.css`, login through an `<iframe>`) has been removed. Its markup (`<pulse-page name>`, `<pulse-stack group>`, `<pulse-question question answer>`) is still understood by the embed script. The old addresses under `/integrate/` answer with 410 Gone.
# Development
Pulse runs on Node 24 LTS, Nuxt 4, Nuxt UI 4 / Tailwind CSS 4, Prisma 7 with the PostgreSQL driver adapter, and database-backed sessions. `node-cron` schedules non-overlapping minute jobs and stops them on shutdown. Prisma relies on Postgres as a database, which must be provided for development. To be able to develop Pulse further, first rename `.env.example` file to `.env` and modify it to your needs. Then, install all required packages by running `npm ci` and generate the necessary Prisma client by running `npx prisma generate`. Finally, run `npm run dev` to start Pulse in development mode.

NuxtJS supports both the front end and the back end. The pages of the front end can be found in `/pages`, and visual components that are implemented within the pages can be found in `/components`. The front end accesses REST endpoints provided by the backend, which can be found in `/server/api`. All endpoints dedicated to external use, for example, for the embed script, are placed in the version folder `/server/api/v1` (`v1` is the API version, not the removed original library). All remaining endpoints in `/server/api` are for internal use only. All scheduled tasks like sending emails, disabling active questions, or deleting expired entries can be found in `/server/plugins`. The email footer can be customized in `/server/utils/email.ts`.

The embed script is part of the NuxtJS project. `npm run build` minifies `public/embed/v2/pulse.js` to `pulse.min.js` (`npm run minify-embed`); the minified file is not under version control.
# Deployment
Pulse can easily be deployed using the `docker-compose.yml` file, which automatically deploys the web app with the embed script and the required Postgres database. First, copy `.env.example` to `.env` and modify it to your needs. Finally, run `docker-compose up —build -d` and wait a few minutes for the application to build. Pulse will then be available on port 3000.   

Dependency maintenance and the September 2026 migration: [docs/dependencies.md](docs/dependencies.md).
# Authors and license
Pulse was written by Florian Seida as part of his bachelor's thesis at the Chair of Privacy and Security in Information Systems (PSI), University of Bamberg. The first commit of this repository is his original version. Since 2026 the chair develops and runs it as psi-pulse.

Licensed under the GNU Affero General Public License v3.0, see [`LICENSE`](LICENSE). If you run a modified version as a network service, you must offer its source code to your users.
