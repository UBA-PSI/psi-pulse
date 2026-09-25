import {PrismaClient} from "@prisma/client";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
    if (!event.context.params) {
        throw createError({
            message: "No id provided",
            statusCode: 404
        })
    }

    const id = event.context.params.id
    await prisma.question.delete({
        where: {
            id: id
        }
    })
})
