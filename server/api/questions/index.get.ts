import {PrismaClient} from "@prisma/client";
import {questionCanBeAnswered} from "~/server/utils/questionCanBeAnswered";
import {getQuestionStates, questionActiveStateGenerator} from "~/server/utils/editQuestion";
import {QueryValue} from "ufo";
import {InternalQuestion} from "~/types/questions/internal";

const prisma = new PrismaClient();

const stringToBoolean = (string: QueryValue): boolean | undefined => {
    if (string === "true") {
        return true
    } else if (string === "false") {
        return false
    } else {
        return undefined
    }
}

export default defineEventHandler(async (event): Promise<InternalQuestion[]> => {
    const session = await protectInternalRoute(event)
    const query = getQuery(event)


    const archived = stringToBoolean(query.archived)
    const open = stringToBoolean(query.open)

    const pages = await prisma.page.findMany({
        where: {
            owner_id: session.user.userId
        }, select: {
            id: true,
            name: true,
            url: true,
            groups: {
                select: {
                    id: true,
                    name: true,
                }
            },
            questions: {
                where: {
                    archived: archived
                },
                select: {
                    id: true,
                    hash: true,
                    text: true,
                    answer: true,
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
                            waiting_for_remembered: true,
                            active: true,
                            active_since: true,
                        }
                    }
                }
            }
        }
    })

    const newQuestions: InternalQuestion[] = []
    pages.forEach((page) => {
        page.groups.forEach((group) => {
            const questions = page.questions.filter((question) => question.group_id == group.id)
            questions.forEach((question) => {
                newQuestions.push({
                    pageName: page.name,
                    pageUrl: page.url,
                    groupName: group.name,
                    id: question.id,
                    hash: question.hash,
                    question: question.text,
                    answer: question.answer,
                    archived: question.archived,
                    isOpen: questionCanBeAnswered(question),
                    currentState: question.question_progress.current_state,
                    states: getQuestionStates(question.question_progress),
                    waitingForRemembered: question.question_progress.waiting_for_remembered,
                    activeSince: question.question_progress.active_since,
                    activeState: questionActiveStateGenerator(question.question_progress),
                })
            })
        })
    })

    if (open !== undefined) {
        return newQuestions.filter((question) => question.isOpen === open)
    }

    return newQuestions
})




