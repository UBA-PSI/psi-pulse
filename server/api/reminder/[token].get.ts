import {PrismaClient} from "@prisma/client";
import {questionCanBeAnswered} from "~/server/utils/questionCanBeAnswered";
import {getQuestionStates, questionActiveStateGenerator} from "~/server/utils/editQuestion";
import {InternalQuestion} from "~/types/questions/internal";

const prisma = new PrismaClient();

export default defineEventHandler(async (event): Promise<InternalQuestion[]> => {
    if (!event.context.params) {
        throw createError({
            message: "No id provided",
            statusCode: 404
        })
    }

    const reminderToken = event.context.params.token

    if (!reminderToken) {
        throw createError({
            message: "No page id provided",
            statusCode: 404
        })
    }

    let reminder = await prisma.reminderEmail.findUnique({
        where: {
            token: reminderToken
        }, select: {
            id: true,
            questions: {
                where: {
                    archived: false,
                    question_progress: {
                        reminder_token: {
                            not: null
                        }
                    }
                },
                select: {
                    page: {
                        select: {
                            name: true,
                            url: true,
                        }
                    },
                    group: {
                        select: {
                            name: true,
                        }
                    },
                    id: true,
                    text: true,
                    answer: true,
                    hash: true,
                    archived: true,
                    group_id: true,
                    question_progress: {
                        select: {
                            current_state: true,
                            completed_at: true,
                            initial_state: true,
                            state_1: true,
                            state_2: true,
                            state_3: true,
                            state_4: true,
                            final_state: true,
                            waiting_for_remembered: true,
                            active: true,
                            active_since: true,
                        }
                    }
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

    const newQuestions: InternalQuestion[] = []
    reminder.questions.forEach((question) => {
        newQuestions.push({
            pageName: question.page.name,
            pageUrl: question.page.url,
            groupName: question.group.name,
            id: question.id,
            question: question.text,
            answer: question.answer,
            isOpen: questionCanBeAnswered(question),
            currentState: question.question_progress.current_state,
            states: getQuestionStates(question.question_progress),
            hash: question.hash,
            archived: question.archived,
            waitingForRemembered: question.question_progress.waiting_for_remembered,
            activeSince: question.question_progress.active_since,
            activeState: questionActiveStateGenerator(question.question_progress),
        })
    })

    return newQuestions
});
