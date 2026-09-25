import {PrismaClient} from "@prisma/client";

export default defineEventHandler(async (event) => {
    const authRequest = auth.handleRequest(event);
    const session = await authRequest.validate();
    if (!session) {
        throw createError({
            message: "Unauthorized",
            statusCode: 401
        });
    }
    await auth.invalidateSession(session.sessionId);
    authRequest.setSession(null);

    const client = new PrismaClient();

    await client.user.delete({
        where: {
            id: session.user.userId
        }
    });

    await client.questionProgress.deleteMany({
        where: {
            question: null
        }
    });

    return sendRedirect(event, "/");
});
