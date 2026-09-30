import {usePrisma} from "~/server/utils/prisma";
import {normalizeName} from "~/server/utils/emailAddress";
import {setResearchConsent} from "~/server/utils/research";
import {PrismaClient} from "@prisma/client";
import protectInternalRoute from "~/server/utils/protectInternalRoute";
import {makeToken} from "~/server/plugins/emailScheduler";
import {UpdateAccountBody} from "~/types/account";
import {parseHour} from "~/server/utils/berlinTime";

const prisma = usePrisma();
const MAX_WEEKLY_QUESTIONS = 20;
// Volle Stunde 0–23, als Zahl oder Ziffern-String (Auswahlfeld der Einstellungen)
const isHour = (v: unknown) => (typeof v === "number" || (typeof v === "string" && /^\d{1,2}$/.test(v)))
    && Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) <= 23;

export default defineEventHandler(async (event) => {
    const session = await protectInternalRoute(event)
    const body: UpdateAccountBody = await readBody(event)

    // Stunden gelten in deutscher Zeit und werden als Zahl gespeichert (A17): keine Umrechnung über die
    // Zeitzone des Servers oder des Browsers.
    const reminderHour = parseHour(body.preferredReminderDeliveryTime)
    const weeklyHour = parseHour(body.preferredWeeklyDeliveryTime)
    const weeklyDay = Number(body.preferredWeeklyDeliveryDay)
    if (reminderHour === null || weeklyHour === null || !Number.isInteger(weeklyDay) || weeklyDay < 0 || weeklyDay > 6) {
        throw createError({
            message: "Invalid delivery time or day",
            statusCode: 400
        })
    }

    // A27/A24: Eingaben prüfen, statt sie ungeprüft an Prisma zu geben (vorher 500 mit Prisma-Meldung oder
    // beliebig lange Namen und Wochenzahlen). Das Eingabefeld der Wochenzahl liefert einen String.
    const name = normalizeName(body?.name)
    const weeklyNumber = Number(body?.weeklyEmailsNumber)
    if (name === null
        || !Number.isInteger(weeklyNumber) || weeklyNumber < 1 || weeklyNumber > MAX_WEEKLY_QUESTIONS
        || typeof body.receiveEmails !== "boolean" || typeof body.receiveWeeklyEmails !== "boolean"
        || !isHour(body.preferredReminderDeliveryTime) || !isHour(body.preferredWeeklyDeliveryTime)
        || !Number.isInteger(body.preferredWeeklyDeliveryDay) || body.preferredWeeklyDeliveryDay < 0 || body.preferredWeeklyDeliveryDay > 6) {
        throw createError({message: "Invalid account settings", statusCode: 400})
    }
    body.name = name
    body.weeklyEmailsNumber = weeklyNumber

    // Abmelde-Tokens nur serverseitig (A27): vorhandene behalten, fehlende neu erzeugen, beim Abbestellen löschen.
    // Vorher übernahm der Endpunkt sie aus dem Body; ein Konto konnte sich so ein vorhersagbares Token setzen.
    const tokens = await prisma.user.findUnique({
        where: {id: session.user.userId},
        select: {unsubscribe_emails_token: true, unsubscribe_weekly_emails_token: true}
    })
    const unsubscribeEmailsToken = body.receiveEmails ? (tokens?.unsubscribe_emails_token ?? makeToken(32)) : null
    const unsubscribeWeeklyEmailsToken = body.receiveWeeklyEmails ? (tokens?.unsubscribe_weekly_emails_token ?? makeToken(32)) : null

    await prisma.user.update({
        where: {
            id: session.user.userId
        },
        data: {
            name: body.name,
            preferred_reminder_hour: reminderHour,
            preferred_weekly_hour: weeklyHour,
            preferred_weekly_email_delivery_day: weeklyDay,
            receive_emails: body.receiveEmails,
            receive_weekly_emails: body.receiveWeeklyEmails,
            weekly_emails_number: body.weeklyEmailsNumber,
            unsubscribe_emails_token: unsubscribeEmailsToken,
            unsubscribe_weekly_emails_token: unsubscribeWeeklyEmailsToken,
        }
    })

    // Forschungs-Einwilligung nur bei Änderung; Widerruf löscht nicht automatisch (dafür „Statistik löschen“)
    const current = await prisma.user.findUnique({where: {id: session.user.userId}, select: {log_questions: true}})
    if (typeof body.logQuestions === "boolean" && current && body.logQuestions !== current.log_questions) {
        await setResearchConsent(session.user.userId, body.logQuestions, false)
    }

    return "ok"
});

