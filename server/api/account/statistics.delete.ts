import {PrismaClient} from "@prisma/client";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
    const authRequest = auth.handleRequest(event);
    const session = await authRequest.validate();

    if (!session) {
        throw createError({
            message: "Unauthorized",
            statusCode: 401
        });
    }

    await prisma.questionLog.deleteMany({
        where: {
            user_id: session?.user.userId
        }
    })
})
