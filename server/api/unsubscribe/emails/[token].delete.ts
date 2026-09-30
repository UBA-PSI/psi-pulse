import {usePrisma} from "~/server/utils/prisma";
import {PrismaClient} from "@prisma/client";

const prisma = usePrisma();

export default defineEventHandler(async (event) => {
    if (!event.context.params) {
        throw createError({
            message: "No token provided",
            statusCode: 404
        })
    }

    const token = event.context.params.token
    try {
        await prisma.user.update({
            where: {
                unsubscribe_emails_token: token
            },
            data: {
                receive_emails: false,
                unsubscribe_emails_token: null
            }
        })
    } catch (e) {
        const error = e as Error
        if (error.message.includes('Record to update not found.')) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Token not found',
            });
        }
    }
})
