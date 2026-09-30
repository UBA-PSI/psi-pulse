// A17: Einstellungsseite in verschiedenen Browser-Zeitzonen. Gewählte Stunde = gespeicherte Stunde = angezeigte Stunde.
// Lokal gegen docker-compose.dev.yml; Playwright ist keine Abhängigkeit des Projekts:
//   (cd /tmp/pw && npm i playwright && npx playwright install chromium)
//   NODE_PATH=/tmp/pw/node_modules node scripts/e2e-settings-tz.cjs
// Aufruf auch über scripts/e2e-scheduler.sh (PLAYWRIGHT_NODE_PATH).
const {chromium} = require("playwright")
const {execFileSync} = require("node:child_process")
const crypto = require("node:crypto")

const B = process.env.PULSE_TEST_URL || "http://localhost:3000"
const DB = (sql) => execFileSync("docker", ["exec", process.env.PULSE_TEST_DB || "database", "psql", "-U", "postgres", "-At", "-c", sql]).toString().trim()
const ok = (label, value) => console.log(`  ${label.padEnd(70)} ${value}`)

const NEW_SCHEMA = DB(`select count(*) from information_schema.columns where table_name='User' and column_name='preferred_reminder_hour'`) === "1"
const hoursSql = (id) => NEW_SCHEMA
    ? `select preferred_reminder_hour || '|' || preferred_weekly_hour from "User" where id='${id}'`
    : `select extract(hour from preferred_reminder_email_delivery_time) || '|' || extract(hour from preferred_weekly_email_delivery_time) from "User" where id='${id}'`

;(async () => {
    const id = "tz" + crypto.randomBytes(6).toString("hex")
    const email = `tz-ui-${id}@example.org`
    // Konto wie bei der Anmeldung: Vorgaben 14 und 16 Uhr (altes Schema: 14/16 Uhr UTC wie createPulseUser im Container)
    if (NEW_SCHEMA) {
        DB(`insert into "User"(id,email,name,verified,receive_emails,unsubscribe_emails_token,unsubscribe_weekly_emails_token) values ('${id}','${email}','TZ',true,false,md5(random()::text),md5(random()::text))`)
    } else {
        DB(`insert into "User"(id,email,name,verified,receive_emails,preferred_reminder_email_delivery_time,preferred_weekly_email_delivery_time,preferred_weekly_email_delivery_day,unsubscribe_emails_token,unsubscribe_weekly_emails_token) values ('${id}','${email}','TZ',true,false,date_trunc('day',now() at time zone 'UTC')+interval '14 hours',date_trunc('day',now() at time zone 'UTC')+interval '16 hours',3,md5(random()::text),md5(random()::text))`)
    }
    // Mails an, damit die Uhrzeit-Felder sichtbar sind; der Scheduler findet keine Fragen, schickt also nichts
    DB(`update "User" set receive_emails=true where id='${id}'`)
    const session = crypto.randomBytes(20).toString("hex")
    const expires = Date.now() + 3600 * 1000
    DB(`insert into "Session"(id,user_id,active_expires,idle_expires) values ('${session}','${id}',${expires},${expires})`)

    const browser = await chromium.launch()
    const open = async (timezoneId) => {
        const context = await browser.newContext({timezoneId, locale: "de-DE"})
        await context.addCookies([{name: "auth_session", value: session, url: B}])
        const page = await context.newPage()
        await page.goto(`${B}/settings`)
        const selects = page.getByRole("combobox")
        await selects.nth(2).waitFor() // Erinnerung, Wochen-Uhrzeit, Wochentag
        await page.waitForFunction(() => document.querySelector('[role="combobox"]')?.textContent.includes(":00"))
        const shown = async () => `${(await selects.nth(0).innerText()).replace(":00", "").trim()}|${(await selects.nth(1).innerText()).replace(":00", "").trim()}`
        const save = async () => {
            const put = page.waitForResponse((r) => r.url().endsWith("/api/account") && r.request().method() === "PUT")
            await page.locator("button[type=submit]").click()
            return (await put).status()
        }
        return {context, page, selects, shown, save}
    }

    console.log("A17 Einstellungsseite, Browser in New York")
    let ny = await open("America/New_York")
    ok("Anzeige der Vorgaben (erwartet 14|16)", await ny.shown())
    await ny.selects.nth(0).click()
    await ny.page.getByRole("option", {name: "9:00", exact: true}).click()
    await ny.selects.nth(1).click()
    await ny.page.getByRole("option", {name: "18:00", exact: true}).click()
    ok("Speichern 9 und 18 Uhr: Status (erwartet 200)", await ny.save())
    ok("gespeichert (erwartet 9|18)", DB(hoursSql(id)))
    await ny.page.reload()
    await ny.selects.nth(2).waitFor()
    await ny.page.waitForFunction(() => document.querySelector('[role="combobox"]')?.textContent.includes(":00"))
    ok("Anzeige nach Neuladen in New York (erwartet 9|18)", await ny.shown())
    await ny.context.close()

    console.log("A17 Einstellungsseite, Browser in Berlin")
    const be = await open("Europe/Berlin")
    ok("Anzeige in Berlin (erwartet 9|18)", await be.shown())
    ok("unverändert speichern: Status (erwartet 200)", await be.save())
    ok("gespeichert, nichts verrutscht (erwartet 9|18)", DB(hoursSql(id)))
    ok("Hinweis zur Zeitzone sichtbar (erwartet true)", String(await be.page.getByText(/Deutsche Zeit|German time/).first().isVisible().catch(() => false)))
    await be.context.close()

    await browser.close()
    DB(`delete from "User" where id='${id}'`)
})().catch((e) => { console.error(e); process.exit(1) })
