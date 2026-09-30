import {usePrisma} from "~/server/utils/prisma";
import {PrismaClient} from "@prisma/client";
import protectExternalRoute from "~/server/utils/protectExternalRoute";
import {questionCanBeAnswered} from "~/server/utils/questionCanBeAnswered";
import {getQuestionStates} from "~/server/utils/editQuestion";
import {ACCOUNT_QUOTA} from "~/server/utils/accountLimits";
import {ExternalQuestion, ExternalQuestionState} from "~/types/questions/external";

const prisma = usePrisma();

export default defineEventHandler(async (event): Promise<ExternalQuestion[]> => {
    const userId = await protectExternalRoute(event)

    // Keine Paginierung: das Widget (public/embed/v2/pulse.js, refresh) braucht bei jedem Seitenaufruf alle eigenen
    // Fragen auf einmal (Status und Zusammenfassung über Seiten hinweg), und ältere Kopien des Widgets kennen keine
    // Seiten. Stattdessen Obergrenze = Kontingent (A28): mehr Fragen kann ein Konto nicht anlegen.
    const questions = await prisma.question.findMany({
        where: {
            page: {
                owner_id: userId
            }
        },
        orderBy: {id: "asc"},
        take: ACCOUNT_QUOTA.questions,
        select: {
            hash: true,
            page: {
                select: {
                    name: true
                }
            },
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
                }
            },
        }
    })

    return questions.map((question): ExternalQuestion => {
        const isOpen = questionCanBeAnswered(question);
        const states: ExternalQuestionState[] = getQuestionStates(question.question_progress)

        return {
            hash: question.hash,
            pageName: question.page.name,
            isOpen: isOpen,
            states: states,
        }
    })
})
