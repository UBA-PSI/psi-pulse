import {usePrisma} from "~/server/utils/prisma";
import {isUUID} from "~/server/utils/string";
import {reminderLinkActive, reminderLinkValid} from "~/server/utils/mailLinks";

const prisma = usePrisma();

// Sprache des Kontos für die Antwortseiten aus den Mails (/answer/...), nur lesend.
// Nachweis über das Token aus der Mail; ohne gültiges Token lang: null (die Seite nimmt dann ?lang= bzw. Accept-Language).
// Nach der letzten Antwort ist das Token verbraucht, deshalb hängen die Mail-Links zusätzlich ?lang= an.
export default defineEventHandler(async (event): Promise<{ lang: "de" | "en" | null }> => {
    const {kind, token, id} = getQuery(event)
    if (typeof token !== "string" || token.length < 5 || token.length > 100) return {lang: null}
    let lang: string | null | undefined = null
    if (kind === "reminder") {
        // Reminder-Links gelten 30 Tage ab Versand, wie in den Antwortpfaden (A38)
        lang = (await prisma.reminderEmail.findUnique({where: {token, ...reminderLinkActive()}, select: {user: {select: {lang: true}}}}))?.user.lang
    } else if (kind === "weekly") {
        lang = (await prisma.weeklyEmail.findUnique({where: {token}, select: {user: {select: {lang: true}}}}))?.user.lang
    } else if (kind === "question" && typeof id === "string" && isUUID(id)) {
        const question = await prisma.question.findUnique({
            where: {id},
            select: {
                question_progress: {select: {reminder_token: true}},
                reminder_email: {select: {sent_at: true}},
                page: {select: {owner: {select: {lang: true}}}}
            }
        })
        if (question && question.question_progress.reminder_token === token && reminderLinkValid(question.reminder_email?.sent_at)) {
            lang = question.page.owner.lang
        }
    }
    return {lang: lang === "en" ? "en" : lang === "de" ? "de" : null}
})
