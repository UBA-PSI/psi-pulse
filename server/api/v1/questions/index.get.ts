import {PrismaClient} from "@prisma/client";
import protectExternalRoute from "~/server/utils/protectExternalRoute";
import {questionCanBeAnswered} from "~/server/utils/questionCanBeAnswered";
import {getQuestionStates} from "~/server/utils/editQuestion";
import {ExternalQuestion, ExternalQuestionState} from "~/types/questions/external";

const prisma = new PrismaClient();

export default defineEventHandler(async (event): Promise<ExternalQuestion[]> => {
    const userId = await protectExternalRoute(event)

    const questions = await prisma.question.findMany({
        where: {
            page: {
                owner_id: userId
            }
        }, select: {
            hash: true,
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
            isOpen: isOpen,
            states: states,
        }
    })
})
