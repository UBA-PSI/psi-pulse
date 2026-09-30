import {usePrisma} from "~/server/utils/prisma";
import * as nodemailer from 'nodemailer'
import {EmailEntry} from "~/types/email";
import {renderMailHtml, renderMailText} from "~/server/utils/emailLayout";
import type {MailBlock, MailContent, MailFooter} from "~/server/utils/emailLayout";

// Mails an Studierende: zweisprachig nach User.lang, im Ton des Widgets (docs/embed-v2.md, „Texte für Studierende“).
// Keine Serien, kein Druck, keine Schuldzuweisungen. Jede Zusage hier muss dem Verhalten des Schedulers entsprechen.
// Layout und Nur-Text-Teil: server/utils/emailLayout.ts. Texte hier als Klartext, escapt wird dort (Name, Fragen, Seiten).

const hostUrl = useRuntimeConfig().mailSecrets.HOST_URL
const prisma = usePrisma();

type Lang = "de" | "en"

const langOf = async (email: string): Promise<Lang> => {
    const user = await prisma.user.findUnique({where: {email: email.toLowerCase()}, select: {lang: true}})
    return user?.lang === "en" ? "en" : "de"
}

const greeting = (lang: Lang, name: string) => {
    const n = (name || "").trim()
    return lang === "de" ? (n ? `Hallo ${n},` : "Hallo,") : (n ? `Hello ${n},` : "Hello,")
}

const p = (text: string): MailBlock => ({type: "p", text})
const button = (href: string, label: string): MailBlock => ({type: "button", href, label})

type Unsubscribe = { kind: "all" | "weekly", token: string } | null

const unsubscribeUrl = (unsubscribe: Unsubscribe, lang: Lang) => unsubscribe
    ? `${hostUrl}/unsubscribe/${unsubscribe.kind === "weekly" ? "weekly-emails" : "emails"}/${unsubscribe.token}?lang=${lang}`
    : undefined

const footer = (lang: Lang, unsubscribe: Unsubscribe): MailFooter => {
    const de = lang === "de"
    const links = [
        {href: `${hostUrl}${de ? "/" : "/en/"}#so-gehts`, label: de ? "So funktioniert’s" : "How it works"},
        {href: `${hostUrl}/privacy-policy`, label: de ? "Datenschutz" : "Privacy"},
    ]
    if (unsubscribe) links.push({
        href: unsubscribeUrl(unsubscribe, lang)!,
        label: unsubscribe.kind === "weekly"
            ? (de ? "Keine Wochenauswahl mehr" : "No more weekly selections")
            : (de ? "Keine Mails mehr von psi-pulse" : "No more emails from psi-pulse"),
    })
    return {
        sender: de
            ? "psi-pulse ist ein Angebot des Lehrstuhls für Privatsphäre und Sicherheit in Informationssystemen, Otto-Friedrich-Universität Bamberg, An der Weberei 5, 96047 Bamberg."
            : "psi-pulse is offered by the Chair of Privacy and Security in Information Systems, University of Bamberg, An der Weberei 5, 96047 Bamberg, Germany.",
        links,
    }
}

const send = async (to: string, lang: Lang, subject: string, preheader: string, blocks: MailBlock[], unsubscribe: Unsubscribe = null) => {
    const mail: MailContent = {lang, subject, preheader, blocks, footer: footer(lang, unsubscribe)}
    await sendEmail({
        head: {to: {name: "", address: to}, subject},
        html: renderMailHtml(mail),
        text: renderMailText(mail),
        unsubscribe: unsubscribeUrl(unsubscribe, lang),
    })
}

// Login-Code für das eingebettete Widget (Embed v2). Sprache der Seite, auf der angefordert wurde.
// Gültigkeit: LoginCode.expires_at = 10 Minuten (server/api/v1/auth/request.post.ts).
export const sendLoginCode = async (email: string, code: string, lang: string) => {
    const l: Lang = lang === "en" ? "en" : "de"
    const blocks: MailBlock[] = l === "de"
        ? [p("Hallo,"), p("Ihr Code lautet:"), {type: "code", code},
            p("Geben Sie ihn auf der Seite ein, auf der Sie begonnen haben. Er gilt 10 Minuten."),
            p("Sie haben ihn in einem Skript oder auf einer Vorlesungsseite angefordert, um Fragen zum Selbsttest per Mail zu wiederholen."),
            p("Falls Sie nichts angefordert haben, ignorieren Sie diese Mail einfach.")]
        : [p("Hello,"), p("your code is:"), {type: "code", code},
            p("Enter it on the page where you started. It is valid for 10 minutes."),
            p("You requested it in course material or on a lecture page to review self-test questions by email."),
            p("If you did not request this, simply ignore this email.")]
    await send(email, l,
        l === "de" ? `Uni Bamberg · psi-pulse: Ihr Code ${code}` : `Uni Bamberg · psi-pulse: your code ${code}`,
        l === "de" ? `Ihr Code: ${code}. Er gilt 10 Minuten.` : `Your code: ${code}. It is valid for 10 minutes.`,
        blocks)
}

// Anmeldung über die Pulse-Seite (Magic Link). Gültigkeit: generateEmailVerificationToken, 2 Stunden.
const verificationBlocks = (l: Lang, name: string, url: string, intro: string, label: string, ignore: string): MailBlock[] => [
    p(greeting(l, name)), p(intro), button(url, label),
    p(l === "de" ? `Der Link gilt zwei Stunden. ${ignore}` : `The link is valid for two hours. ${ignore}`),
    {
        type: "fallback", href: url,
        text: l === "de" ? "Falls der Button nicht funktioniert, kopieren Sie diese Adresse in Ihren Browser:" : "If the button does not work, copy this address into your browser:",
    },
]

// Ohne Anrede mit Namen: Die Adresse ist noch nicht bestätigt, den Namen hat eingegeben, wer das Formular ausgefüllt hat
// (A22). Sonst ließe sich über psi-pulse Text in Mails an fremde Adressen schreiben.
export const sendSignupLink = async (email: string, token: string) => {
    const l = await langOf(email)
    const url = `${hostUrl}/api/email-verification/${token}`
    const blocks = l === "de"
        ? verificationBlocks(l, "", url, "bitte bestätigen Sie Ihre Anmeldung bei psi-pulse.", "Anmeldung bestätigen", "Falls Sie sich nicht angemeldet haben, ignorieren Sie diese Mail.")
        : verificationBlocks(l, "", url, "please confirm your sign-up for psi-pulse.", "Confirm sign-up", "If you did not sign up, ignore this email.")
    await send(email, l,
        l === "de" ? "Uni Bamberg · psi-pulse: Anmeldung bestätigen" : "Uni Bamberg · psi-pulse: confirm your sign-up",
        l === "de" ? "Mit dem Link bestätigen Sie Ihre Anmeldung. Er gilt zwei Stunden." : "Use the link to confirm your sign-up. It is valid for two hours.",
        blocks)
}

// name nur für bestätigte Konten übergeben (Aufrufer), sonst ""
export const sendLoginLink = async (email: string, token: string, name: string) => {
    const l = await langOf(email)
    const url = `${hostUrl}/api/email-verification/${token}`
    const blocks = l === "de"
        ? verificationBlocks(l, name, url, "mit diesem Link melden Sie sich bei psi-pulse an.", "Bei psi-pulse anmelden", "Falls Sie das nicht angefordert haben, ignorieren Sie diese Mail.")
        : verificationBlocks(l, name, url, "use this link to sign in to psi-pulse.", "Sign in to psi-pulse", "If you did not request this, ignore this email.")
    await send(email, l,
        l === "de" ? "Uni Bamberg · psi-pulse: Ihr Anmeldelink" : "Uni Bamberg · psi-pulse: your sign-in link",
        l === "de" ? "Ihr Link zur Anmeldung. Er gilt zwei Stunden." : "Your sign-in link. It is valid for two hours.",
        blocks)
}

// Pause nach unbeantworteten Mails (Reminder 7 Tage, Wochenauswahl 14 Tage). Während der Pause verschickt der
// Scheduler gar nichts; nach 14 Tagen geht es von selbst weiter (sendAnotherChance). Wer vorher eine Frage
// beantwortet, beendet die Pause (editQuestion.ts, sendUnpauseEmail).
export const sendPauseEmail = async (email: string, name: string, unsubscribeToken: string) => {
    const l = await langOf(email)
    const blocks = l === "de"
        ? [p(greeting(l, name)),
            p("auf die letzten Mails von psi-pulse kam keine Antwort. Deshalb bekommen Sie jetzt zwei Wochen lang keine Mails; danach meldet sich psi-pulse von selbst wieder."),
            p("Wenn Sie vorher weitermachen möchten, beantworten Sie einfach eine Frage."),
            button(`${hostUrl}/home`, "Zu Ihren Fragen")]
        : [p(greeting(l, name)),
            p("there was no response to the last emails from psi-pulse, so you will not get any emails for two weeks. After that, psi-pulse will resume by itself."),
            p("If you want to continue earlier, just answer a question."),
            button(`${hostUrl}/home`, "Go to your questions")]
    await send(email, l,
        l === "de" ? "psi-pulse pausiert zwei Wochen" : "psi-pulse pauses for two weeks",
        l === "de" ? "Zwei Wochen keine Mails, danach geht es von selbst weiter." : "No emails for two weeks, then it resumes by itself.",
        blocks, {kind: "all", token: unsubscribeToken})
}

export const sendUnpauseEmail = async (email: string, name: string, unsubscribeToken: string) => {
    const l = await langOf(email)
    const blocks = l === "de"
        ? [p(greeting(l, name)), p("Sie haben wieder eine Frage beantwortet. Ab jetzt kommen die Erinnerungen wieder.")]
        : [p(greeting(l, name)), p("You answered a question again. Reminders resume from now on.")]
    await send(email, l,
        l === "de" ? "psi-pulse erinnert Sie wieder" : "psi-pulse reminders resume",
        l === "de" ? "Die Pause ist beendet, die Erinnerungen kommen wieder." : "The pause is over, reminders resume.",
        blocks, {kind: "all", token: unsubscribeToken})
}

export const sendAnotherChance = async (email: string, name: string, unsubscribeToken: string) => {
    const l = await langOf(email)
    const blocks = l === "de"
        ? [p(greeting(l, name)), p("die zweiwöchige Pause ist vorbei. Ab heute kommen die Erinnerungen wieder."),
            button(`${hostUrl}/home`, "Zu Ihren Fragen"),
            p("Wenn Sie keine Mails mehr möchten, bestellen Sie sie unten ab.")]
        : [p(greeting(l, name)), p("the two-week pause is over. Reminders resume today."),
            button(`${hostUrl}/home`, "Go to your questions"),
            p("If you no longer want emails, unsubscribe below.")]
    await send(email, l,
        l === "de" ? "psi-pulse erinnert Sie wieder" : "psi-pulse reminders resume",
        l === "de" ? "Die zweiwöchige Pause ist vorbei." : "The two-week pause is over.",
        blocks, {kind: "all", token: unsubscribeToken})
}

// Links auf die Antwortseiten tragen ?lang= als Rückfall, falls das Token schon verbraucht ist.
// Je Frage: Herkunft (Seite · Gruppe), Fragetext und – bei mehreren Fragen – ein Link nur für diese Frage
const questionItems = (lang: Lang, data: EmailEntry, withLinks: boolean): MailBlock => ({
    type: "items",
    items: data.questions.map((question) => ({
        meta: (lang === "de" ? "Aus: " : "From: ") + (question.group === "no-group" ? question.page : `${question.page} · ${question.group}`),
        title: question.text,
        ...(withLinks ? {
            href: `${hostUrl}/answer/question/${question.id}?token=${question.token}&lang=${lang}`,
            label: lang === "de" ? "Nur diese Frage beantworten" : "Answer only this question",
        } : {}),
    })),
})

const shorten = (s: string, max: number) => s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s

export const sendReminderEmail = async (email: string, data: EmailEntry, unsubscribeToken: string, name: string) => {
    const l = await langOf(email)
    const n = data.questions.length
    const all = `${hostUrl}/answer/reminder/${data.token}?lang=${l}`
    const blocks: MailBlock[] = l === "de"
        ? [p(greeting(l, name)), p(n === 1 ? "heute ist diese Frage zum Wiederholen dran:" : `heute sind diese ${n} Fragen zum Wiederholen dran:`),
            button(all, n === 1 ? "Frage beantworten" : "Alle beantworten")]
        : [p(greeting(l, name)), p(n === 1 ? "this question is up for review today:" : `these ${n} questions are up for review today:`),
            button(all, n === 1 ? "Answer the question" : "Answer all")]
    if (n > 1) blocks.push(questionItems(l, data, true))
    else blocks.splice(2, 0, questionItems(l, data, false)) // eine Frage: erst die Frage, dann der Button
    const subject = l === "de"
        ? `psi-pulse: ${n === 1 ? "1 Frage" : `${n} Fragen`} zum Wiederholen`
        : `psi-pulse: ${n === 1 ? "1 question" : `${n} questions`} to review`
    const first = shorten(data.questions[0]?.text ?? "", 90)
    await send(email, l, subject,
        l === "de" ? `Heute zum Wiederholen: ${first}` : `Up for review today: ${first}`,
        blocks, {kind: "all", token: unsubscribeToken})
}

// Wochenauswahl: WeeklyEmail wird pro Nutzer per upsert überschrieben. Der Link gilt, bis die Auswahl beantwortet
// ist oder die nächste Wochenauswahl ihn durch einen neuen ersetzt (emailScheduler.ts, generateWeeklyEmailContent).
export const sendWeeklyEmail = async (email: string, name: string, weeklyToken: string, unsubscribeToken: string) => {
    const l = await langOf(email)
    const url = `${hostUrl}/answer/weekly/${weeklyToken}?lang=${l}`
    const blocks = l === "de"
        ? [p(greeting(l, name)), p("hier ist Ihre Auswahl für diese Woche."), button(url, "Fragen beantworten"),
            p("Sie haben dafür bis zur nächsten Wochenauswahl Zeit: So lange gilt dieser Link, danach ersetzt ihn der Link der neuen Auswahl.")]
        : [p(greeting(l, name)), p("here is your selection for this week."), button(url, "Answer the questions"),
            p("You have until your next weekly selection: this link works until then and is then replaced by the link of the new selection.")]
    await send(email, l,
        l === "de" ? "psi-pulse: Ihre Wochenauswahl" : "psi-pulse: your weekly selection",
        l === "de" ? "Ihre Auswahl für diese Woche. Der Link gilt bis zur nächsten Auswahl." : "Your selection for this week. The link works until the next one.",
        blocks, {kind: "weekly", token: unsubscribeToken})
}

interface IEmailData {
    // Empfänger als Objekt: nodemailer wertet dann keine Liste oder „Name <adresse>“ aus einem String aus (A22)
    head: { to: { name: string, address: string }, subject: string },
    html: string,
    text: string,
    unsubscribe?: string
}

// Ein Transport für alle Mails; nodemailer baut die Verbindung pro Versand auf.
let transporter: nodemailer.Transporter | null = null
const getTransporter = () => {
    if (transporter) return transporter
    const mailSecrets = useRuntimeConfig().mailSecrets
    transporter = nodemailer.createTransport({
        host: mailSecrets.EMAIL_HOST,
        port: Number(mailSecrets.EMAIL_PORT),
        secure: false,
        requireTLS: String(mailSecrets.EMAIL_REQUIRE_TLS) !== 'false',
        auth: {
            user: mailSecrets.EMAIL_USER,
            pass: mailSecrets.EMAIL_PASS
        },
    })
    return transporter
}

export const sendEmail = async (data: IEmailData) => {
    await getTransporter().sendMail({
        from: {name: 'psi-pulse · Universität Bamberg', address: 'pulse.psi@uni-bamberg.de'},
        to: data.head.to,
        subject: data.head.subject,
        text: data.text,
        html: data.html,
        // Mailprogramme zeigen damit einen eigenen „Abbestellen“-Knopf (führt auf die Bestätigungsseite)
        list: data.unsubscribe ? {unsubscribe: data.unsubscribe} : undefined
    })
}
