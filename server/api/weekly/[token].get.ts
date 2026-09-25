import {PrismaClient} from "@prisma/client";
import {InternalQuestion} from "~/types/questions/internal";
import {getQuestionStates, questionActiveStateGenerator} from "~/server/utils/editQuestion";

const prisma = new PrismaClient();

export default defineEventHandler(async (event): Promise<InternalQuestion[]> => {
    if (!event.context.params) {
        throw createError({
            message: "No token provided",
            statusCode: 404
        })
    }

    const weeklyToken = event.context.params.token

    if (!weeklyToken) {
        throw createError({
            message: "No token provided",
            statusCode: 404
        })
    }

    let weekly = await prisma.weeklyEmail.findUnique({
        where: {
            token: weeklyToken,
        }, select: {
            questions: {
                where: {
                    archived: false
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
                    group_id: true,
                    archived: true,
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
                            reminder_token: true,
                            waiting_for_remembered: true,
                            active: true,
                            active_since: true,
                        }
                    }
                }
            }
        }
    })

    if (!weekly) {
        throw createError({
            message: "Weekly expired or invalid link",
            statusCode: 404
        })
    }

    const newQuestions: InternalQuestion[] = []
    weekly.questions.forEach(question => {
        newQuestions.push({
            id: question.id,
            question: question.text,
            answer: question.answer,
            hash: question.hash,
            archived: question.archived,
            currentState: question.question_progress.current_state,
            isOpen: questionCanBeAnswered(question),
            pageName: question.page.name,
            pageUrl: question.page.url,
            groupName: question.group.name,
            states: getQuestionStates(question.question_progress),
            waitingForRemembered: question.question_progress.waiting_for_remembered,
            activeSince: question.question_progress.active_since,
            activeState: questionActiveStateGenerator(question.question_progress),
        })
    })

    return newQuestions
})
