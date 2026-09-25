import {updateQuestionArchived, updateQuestionState} from "~/server/utils/editQuestion";
import {PrismaClient} from "@prisma/client";
import {SimpleQuestionUpdate} from "~/types/questions/questions";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
    const query = getQuery(event)
    const token = query.token as string
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

    if (tokenType === "question") {
        const question = await prisma.question.findFirst({
            where: {
                question_progress: {
                    reminder_token: token
                }
            }, select: {
                id: true
            }
        })

        if (!question) {
            throw createError({
                message: "Question not found",
                statusCode: 404
            })
        }

        if (question.id !== questionId) {
            throw createError({
                message: "Not matching tokens",
                statusCode: 404
            })
        }
    }  else if (tokenType === "reminder") {
        const reminder = await prisma.reminderEmail.findFirst({
            where: {
                token: token
            }, select: {
                questions: {
                    select: {
                        id: true
                    }
                }
            }
        })

        if (!reminder) {
            throw createError({
                message: "Reminder not found",
                statusCode: 404
            })
        }

        if (!reminder.questions.map(question => question.id).includes(questionId)) {
            throw createError({
                message: "Not matching tokens",
                statusCode: 404
            })
        }
    } else if (tokenType === "weekly") {
        const weekly = await prisma.weeklyEmail.findFirst({
            where: {
                token: token
            }, select: {
                questions: {
                    select: {
                        id: true
                    }
                }
            }
        })

        if (!weekly) {
            throw createError({
                message: "Weekly not found",
                statusCode: 404
            })
        }

        if (!weekly.questions.map(question => question.id).includes(questionId)) {
            throw createError({
                message: "Not matching tokens",
                statusCode: 404
            })
        }
    } else {
        throw createError({
            message: "Invalid tokenType",
            statusCode: 404
        })
    }

    if (event.context.params != undefined) {
        const questionId = event.context.params.id
        const body: SimpleQuestionUpdate = await readBody(event)

        if (body.remembered != null) {
            await updateQuestionState(questionId, body.remembered, tokenType === "weekly")
        } else if (body.archived != null) {
            await updateQuestionArchived(questionId, body.archived)
        } else {
            throw createError({
                message: "No valid body provided",
                statusCode: 404
            })
        }

        return "ok"
    }

    throw createError({
        message: "Missing params",
        statusCode: 404
    })
});
