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

    const user = await prisma.user.findUnique({
        where: {
            id: session.user.userId
        }, select: {
            name: true,
            email: true,
            weekly_streak: true,
            question_logs: {
                select: {
                    question_state: true,
                    question_id: true,
                    remembered: true,
                    created_at: true,
                }
            },
            pages: {
                select: {
                    name: true,
                    groups: {
                        select: {
                            name: true,
                            questions: {
                                select: {
                                    id: true,
                                    text: true,
                                    answer: true,
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    return user;
})
