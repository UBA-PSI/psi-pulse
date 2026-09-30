import {usePrisma} from "~/server/utils/prisma";
import {updateQuestionArchived, updateQuestionState} from "~/server/utils/editQuestion";
import {PrismaClient} from "@prisma/client";
import {SimpleQuestionUpdate} from "~/types/questions/questions";
import {isUUID} from "~/server/utils/string";
import {reminderLinkActive} from "~/server/utils/mailLinks";

const prisma = usePrisma();

export default defineEventHandler(async (event) => {
    const query = getQuery(event)
    const token = typeof query.token === "string" ? query.token : ""
    const tokenType = query.tokenType

    if (!token) {
        throw createError({
            message: "No token provided",
            statusCode: 404
        })
    }
    if (!tokenType) {
        throw createError({
            message: "No tokenType provided",
            statusCode: 404
        })
    }

    if (!event.context.params) {
        throw createError({
            message: "No question id provided",
            statusCode: 404
        })
    }

    const questionId = event.context.params.id
    if (!questionId || !isUUID(questionId)) {
        throw createError({
            message: "Question not found",
            statusCode: 404
        })
    }
    const body: SimpleQuestionUpdate = await readBody(event)
    const rating = typeof body?.remembered === "boolean"
    if (!rating && typeof body?.archived !== "boolean") {
        throw createError({
            message: "No valid body provided",
            statusCode: 404
        })
    }
    const notFound = (message: string) => createError({message, statusCode: 404})

    // A26: Ein Mail-Link bewertet jede Frage höchstens einmal. Vorher ließ sich dieselbe Frage mit dem Token
    // beliebig oft bewerten (Stand und QuestionLog jedes Mal). Der Link wird beim Bewerten atomar „verbraucht“
    // (updateMany mit Bedingung), damit auch parallele Anfragen nur einmal zählen.
    // Gültigkeit: Reminder-Links (einzelne Frage und „Alle beantworten“) 30 Tage ab Versand, so lange bleibt die
    // ReminderEmail stehen (backgroundScheduler.ts). Weekly-Links bis zur nächsten Wochenauswahl (neues Token).
    if (tokenType === "question" || tokenType === "reminder") {
        const pending = await prisma.question.findFirst({
            where: {
                id: questionId,
                question_progress: {reminder_token: tokenType === "question" ? token : {not: null}},
                reminder_email: {
                    is: tokenType === "question"
                        ? reminderLinkActive()
                        : {token: token, ...reminderLinkActive()}
                },
            }, select: {
                question_progress_id: true,
                question_progress: {select: {reminder_token: true}},
            }
        })
        if (!pending) throw notFound(tokenType === "question" ? "Question not found" : "Reminder not found")

        if (rating) {
            const claimed = await prisma.questionProgress.updateMany({
                where: {id: pending.question_progress_id, reminder_token: pending.question_progress.reminder_token},
                data: {reminder_token: null}
            })
            if (claimed.count !== 1) throw notFound("Already answered")
        }
    } else if (tokenType === "weekly") {
        const where = {id: questionId, weekly_email: {is: {token: token}}}
        if (rating) {
            // Aus der Wochenauswahl lösen: danach zeigt der Link die Frage nicht mehr und nimmt keine zweite Bewertung an
            const claimed = await prisma.question.updateMany({where, data: {weekly_email_id: null}})
            if (claimed.count !== 1) throw notFound("Weekly not found")
        } else if (!await prisma.question.findFirst({where, select: {id: true}})) {
            throw notFound("Weekly not found")
        }
    } else {
        throw notFound("Invalid tokenType")
    }

    if (rating) {
        await updateQuestionState(questionId, body.remembered!, tokenType === "weekly")
    } else {
        await updateQuestionArchived(questionId, body.archived!)
    }
    return "ok"
});
