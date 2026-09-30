import {usePrisma} from "~/server/utils/prisma";

const prisma = usePrisma();

// Stellt sicher, dass die Frage dem angemeldeten Nutzer gehört (über ihre Seite, wie in questions/index.get).
// Fremde und unbekannte IDs sind beide 404, damit der Endpunkt nicht verrät, ob es eine Frage gibt.
export default async (questionId: string | undefined, userId: string) => {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const question = questionId && uuid.test(questionId)
        ? await prisma.question.findFirst({where: {id: questionId, page: {owner_id: userId}}, select: {id: true}})
        : null
    if (!question) {
        throw createError({message: "Question not found", statusCode: 404})
    }
    return question.id
}
