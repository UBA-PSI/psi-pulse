import {PrismaClient} from "@prisma/client";
import {questionCanBeAnswered} from "~/server/utils/questionCanBeAnswered";
import {getQuestionStates, questionActiveStateGenerator} from "~/server/utils/editQuestion";
import {InternalQuestion} from "~/types/questions/internal";
import {SimpleQuestionState} from "~/types/questions/questions";
import {isUUID} from "~/server/utils/string";

const prisma = new PrismaClient();

export default defineEventHandler(async (event): Promise<InternalQuestion | null> => {
    if (!event.context.params) {
        throw createError({
            message: "No question id provided",
            statusCode: 404
        })
    }

    const questionId = event.context.params.id
    const query = getQuery(event)

    if (!questionId) {
        throw createError({
            message: "No question id provided",
            statusCode: 404
        })
    }

    if (!query.token) {
        throw createError({
            message: "No token provided",
            statusCode: 404
        })
    }

    if (!isUUID(questionId)) {
        throw createError({
            message: "Invalid question id",
            statusCode: 404
        })
    }

    const question = await prisma.question.findUnique({
        where: {
            id: questionId,
        }, select: {
            id: true,
            text: true,
            answer: true,
            group_id: true,
            hash: true,
            archived: true,
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
    })

    if (!question) {
        throw createError({
            message: "Question not found",
            statusCode: 404
        })
    }
    if (question.question_progress.reminder_token !== query.token) {
        throw createError({
            message: "Not matching tokens",
            statusCode: 404
        })
    }

    const isOpen = questionCanBeAnswered(question)
    const states: SimpleQuestionState[] = getQuestionStates(question.question_progress)

    const newQuestion: InternalQuestion = {
        pageName: question.page.name,
        pageUrl: question.page.url,
        groupName: question.group.name,
        id: question.id,
        question: question.text,
        answer: question.answer,
        isOpen: isOpen,
        currentState: question.question_progress.current_state,
        states: states,
        hash: question.hash,
        archived: question.archived,
        waitingForRemembered: question.question_progress.waiting_for_remembered,
        activeSince: question.question_progress.active_since,
        activeState: questionActiveStateGenerator(question.question_progress),
    }

    if (!newQuestion.isOpen) {
        return null
    }
    return newQuestion
});
