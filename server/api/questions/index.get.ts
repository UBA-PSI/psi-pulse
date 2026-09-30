import {usePrisma} from "~/server/utils/prisma";
import {safePageUrl} from "~/server/utils/pageUrl";
import {PrismaClient} from "@prisma/client";
import {questionCanBeAnswered} from "~/server/utils/questionCanBeAnswered";
import {getQuestionStates, questionActiveStateGenerator} from "~/server/utils/editQuestion";
import {QueryValue} from "ufo";
import {InternalQuestion} from "~/types/questions/internal";
import {ACCOUNT_QUOTA} from "~/server/utils/accountLimits";

const prisma = usePrisma();

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

    // Keine Paginierung: die Fragenliste (pages/questions.vue) sucht, filtert und sortiert im Browser über alle
    // Fragen. Obergrenze = Kontingent pro Konto (A28), direkt als eine Abfrage über die Fragen statt verschachtelt
    // über alle Seiten und Gruppen.
    const questions = await prisma.question.findMany({
        where: {
            page: {owner_id: session.user.userId},
            archived: archived,
        },
        orderBy: [{page: {name: "asc"}}, {group: {name: "asc"}}, {id: "asc"}],
        take: ACCOUNT_QUOTA.questions,
        select: {
            id: true,
            hash: true,
            text: true,
            answer: true,
            archived: true,
            page: {select: {name: true, url: true}},
            group: {select: {name: true}},
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
    })

    const newQuestions: InternalQuestion[] = questions.map((question) => ({
        pageName: question.page.name,
        pageUrl: safePageUrl(question.page.url),
        groupName: question.group.name,
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
    }))

    if (open !== undefined) {
        return newQuestions.filter((question) => question.isOpen === open)
    }

    return newQuestions
})
