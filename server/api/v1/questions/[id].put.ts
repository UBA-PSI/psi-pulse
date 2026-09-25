import protectExternalRoute from "~/server/utils/protectExternalRoute";
import {updateQuestionState} from "~/server/utils/editQuestion";
import {PrismaClient} from "@prisma/client";
import {ExternalQuestionPostBody} from "~/types/questions/external";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
    const userId = await protectExternalRoute(event)
    if (event.context.params != undefined) {
        const questionHash = event.context.params.id

        const body: ExternalQuestionPostBody = await readBody(event)


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

        await updateQuestionState(question.id, body.remembered, false)

        return "ok"
    }

    throw createError({
        message: "Missing params",
        statusCode: 404
    })
});
