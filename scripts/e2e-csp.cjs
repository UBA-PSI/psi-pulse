// A36: alle App-Seiten laufen unter der CSP ohne Verstöße (inkl. Dunkelmodus nach Neuladen, Fehlerseite, Widget-Demo).
// Lokal gegen docker-compose.dev.yml; Playwright ist keine Abhängigkeit des Projekts:
//   (cd /tmp/pw && npm i playwright && npx playwright install chromium)
//   NODE_PATH=/tmp/pw/node_modules node scripts/e2e-csp.cjs
// Aufruf auch über scripts/e2e-security.sh (PLAYWRIGHT_NODE_PATH).
const {chromium} = require("playwright")
const {execFileSync} = require("node:child_process")
const crypto = require("node:crypto")

const B = process.env.PULSE_TEST_URL || "http://localhost:3000"
const DB = (sql) => execFileSync("docker", ["exec", process.env.PULSE_TEST_DB || "database", "psql", "-U", "postgres", "-At", "-c", sql]).toString().trim()
const ok = (label, value) => console.log(`  ${label.padEnd(72)} ${value}`)
const rnd = () => crypto.randomBytes(6).toString("hex")

;(async () => {
    // Konto mit Seite, Frage (per Mail-Link beantwortbar) und Wochenauswahl
    const id = "csp" + rnd()
    DB(`insert into "User"(id,email,name,verified,receive_emails,unsubscribe_emails_token,unsubscribe_weekly_emails_token) values ('${id}','csp-${id}@example.org','CSP',true,false,md5(random()::text),md5(random()::text))`)
    DB(`insert into "Page"(id,name,url,owner_id) values (gen_random_uuid(),'CSP-Seite','https://example.org/csp','${id}')`)
    DB(`insert into "Group"(id,name,page_id) select gen_random_uuid(),'no-group',id from "Page" where owner_id='${id}'`)
    const st = DB(`select id from "QuestionState" order by id limit 1`)
    const qtok = "q" + rnd(), rtok = "r" + rnd(), wtok = "w" + rnd()
    DB(`insert into "ReminderEmail"(id,token,user_id) values (gen_random_uuid(),'${rtok}','${id}')`)
    DB(`insert into "WeeklyEmail"(id,token,user_id) values (gen_random_uuid(),'${wtok}','${id}')`)
    const qid = DB(`with qp as (insert into "QuestionProgress"(id,initial_state_id,state_1_id,final_state_id,completed_at,reminder_token) values (gen_random_uuid(),'${st}','${st}','${st}',now()-interval '30 days','${qtok}') returning id)
        insert into "Question"(id,hash,text,answer,group_id,page_id,question_progress_id,reminder_email_id,weekly_email_id)
        select gen_random_uuid(),'csp-${id}','Was prüft die CSP?','Skripte',g.id,p.id,qp.id,(select id from "ReminderEmail" where token='${rtok}'),(select id from "WeeklyEmail" where token='${wtok}')
        from qp, "Page" p join "Group" g on g.page_id=p.id where p.owner_id='${id}' returning id`).split("\n")[0]
    const session = crypto.randomBytes(20).toString("hex")
    const expires = Date.now() + 3600 * 1000
    DB(`insert into "Session"(id,user_id,active_expires,idle_expires) values ('${session}','${id}',${expires},${expires})`)

    const browser = await chromium.launch()
    const context = await browser.newContext({locale: "de-DE"})
    await context.addCookies([{name: "auth_session", value: session, url: B}])
    // Verstöße melden, bevor irgendein Skript der Seite läuft
    await context.addInitScript(() => {
        window.__cspViolations = []
        document.addEventListener("securitypolicyviolation", (e) => {
            window.__cspViolations.push(`${e.violatedDirective} ${e.blockedURI || ""} ${(e.sample || "").slice(0, 40)}`)
        })
    })
    const page = await context.newPage()
    const console_ = []
    page.on("console", (m) => { if (/Content.Security.Policy|Refused to/i.test(m.text())) console_.push(m.text().slice(0, 120)) })

    const check = async (label, path, extra) => {
        console_.length = 0
        const res = await page.goto(B + path, {waitUntil: "networkidle"})
        await page.waitForTimeout(300)
        const v = await page.evaluate(() => window.__cspViolations)
        const csp = res.headers()["content-security-policy"] || ""
        const hashes = (csp.match(/'sha256-/g) || []).length
        const hydrated = await page.evaluate(() => !!document.querySelector("#__nuxt")?.__vue_app__).catch(() => false)
        if (v.length || console_.length) throw new Error(`${label}: CSP violations ${[...v, ...console_]}`)
        if (path !== "/embed/v2/demo.html" && !hydrated) throw new Error(`${label}: not hydrated`)
        const more = extra ? " " + await extra() : ""
        const all = [...v, ...console_]
        ok(`${label} (erwartet 0 Verstöße${extra ? ", " + extra.expected : ""})`,
            `${all.length} Verstöße, ${res.status()}, Hashes ${hashes}, Hydriert ${hydrated ? "ja" : "nein"}${more}` + (all.length ? " – " + all[0] : ""))
    }
    const dark = async () => (await page.evaluate(() => document.documentElement.className)).includes("dark") ? "dunkel" : "hell"
    dark.expected = "dunkel"

    await check("/login", "/login")
    await check("/signup", "/signup")
    await check("/privacy-policy", "/privacy-policy")
    await check("/home", "/home")
    await page.evaluate(() => localStorage.setItem("nuxt-color-mode", "dark"))
    await check("/home im Dunkelmodus nach Neuladen", "/home", dark)
    await check("/questions (dunkel)", "/questions", dark)
    await check("/settings (dunkel)", "/settings", dark)
    await page.evaluate(() => localStorage.setItem("nuxt-color-mode", "light"))
    await check(`Antwortseite Einzelfrage`, `/answer/question/${qid}?token=${qtok}`)
    await check("Antwortseite Erinnerung", `/answer/reminder/${rtok}`)
    await check("Antwortseite Wochenauswahl", `/answer/weekly/${wtok}`)
    await check("Fehlerseite (unbekannter Pfad)", "/gibt-es-nicht-csp")
    await check("Widget-Demo /embed/v2/demo.html", "/embed/v2/demo.html")

    await browser.close()
    DB(`with d as (delete from "Question" where hash='csp-${id}' returning question_progress_id) delete from "QuestionProgress" where id in (select question_progress_id from d)`)
    DB(`delete from "User" where id='${id}'`)
})().catch((e) => { console.error(e); process.exit(1) })
