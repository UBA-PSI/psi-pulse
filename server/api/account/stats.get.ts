import {usePrisma} from "~/server/utils/prisma";
import protectInternalRoute from "~/server/utils/protectInternalRoute";
import {PrismaClient} from "@prisma/client";
import {AccountStats} from "~/types/account";

const prisma = usePrisma();

export default defineEventHandler(async (event): Promise<AccountStats> => {
    const session = await protectInternalRoute(event)

    const user = await prisma.user.findUnique({
        where: {
            id: session.user.userId
        }, select: {
            id: true,
            weekly_streak: true,
            pages: {
                select: {
                    questions: {
                        select: {
                            id: true,
                            question_progress: {
                                select: {
                                    active: true,
                                    active_since: true,
                                }
                            }
                        }
                    }
                }
            }
        }
    })

    if (!user) throw createError({
        message: "User not found",
        statusCode: 404
    })

    const allQuestions = user.pages.flatMap(page => page.questions)
    let oldestQuestion = new Date()
    if (allQuestions.length > 0) {
        const foundOldestQuestion = allQuestions.reduce((prev, curr) => {
            if (!prev.question_progress.active_since) {
                return curr
            }
            if (!curr.question_progress.active_since) {
                return prev
            }
            if (prev.question_progress.active_since < curr.question_progress.active_since) {
                return prev
            } else {
                return curr
            }
        })
        if (foundOldestQuestion.question_progress.active_since) {
            oldestQuestion = foundOldestQuestion.question_progress.active_since
        }
    }

    const activeQuestions = allQuestions.filter(question => question.question_progress.active)

    const answer: AccountStats = {
        questions: allQuestions.length,
        activeQuestion: activeQuestions.length,
        oldestQuestion: oldestQuestion,
        weeklyStreak: user.weekly_streak
    }
    return answer
})
