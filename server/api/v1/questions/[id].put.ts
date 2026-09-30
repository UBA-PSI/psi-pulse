import {usePrisma} from "~/server/utils/prisma";
import protectExternalRoute from "~/server/utils/protectExternalRoute";
import {updateQuestionState} from "~/server/utils/editQuestion";
import {PrismaClient} from "@prisma/client";
import {ExternalQuestionPostBody} from "~/types/questions/external";

const prisma = usePrisma();

export default defineEventHandler(async (event) => {
    const userId = await protectExternalRoute(event)
    if (event.context.params != undefined) {
        const questionHash = event.context.params.id

        const body: ExternalQuestionPostBody = await readBody(event)
        // Seitenname wie beim Anlegen begrenzt; ohne echtes remembered keine Bewertung (sonst zählte es als „nicht gewusst“)
        if (!body || typeof body.pageName !== "string" || body.pageName.length < 1 || body.pageName.length > 200
            || typeof body.remembered !== "boolean") {
            throw createError({message: "Invalid body", statusCode: 400})
        }

        const page = await prisma.page.findUnique({
            where: {
                name_owner_id: {
                    owner_id: userId,
                    name: body.pageName
                }
            }
        })
        if (!page) {
            throw createError({
                message: "Page not found",
                statusCode: 404
            })
        }

        const question = await prisma.question.findUnique({
            where: {
                hash_page_id: {
                    hash: questionHash,
                    page_id: page.id
                }
            }, select: {
                id: true,
            }
        })

        if (!question) {
            throw createError({
                message: "Question not found",
                statusCode: 404
            })
        }

        if (typeof body.question === "string" && typeof body.answer === "string"
            && body.question.length > 0 && body.question.length <= 5000 && body.answer.length <= 20000) {
            await prisma.question.update({
                where: {id: question.id},
                data: {text: body.question, answer: body.answer}
            })
        }

        await updateQuestionState(question.id, body.remembered, false)

        return "ok"
    }

    throw createError({
        message: "Missing params",
        statusCode: 404
    })
});
