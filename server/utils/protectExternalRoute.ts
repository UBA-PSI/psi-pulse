import {usePrisma} from "~/server/utils/prisma";
import {H3Event} from "h3";
import {PrismaClient} from "@prisma/client";

const prisma = usePrisma();

export default async (event: H3Event) => {
    let authToken = event.headers.get('X-API-KEY')
    let userId = null
    if (authToken != null) {
        let foreignSession = await prisma.thirdPartySession.findUnique({
            where: {
                id: authToken
            }, select: {
                user_id: true,
                expires: true,
            }
        })
        // Abgelaufene Tokens sofort ablehnen, nicht erst nach dem stündlichen Aufräumen (A25)
        userId = foreignSession && Number(foreignSession.expires) > Date.now() ? foreignSession.user_id : null
    }

    if (!userId) {
        throw createError({
            message: "Unauthorized",
            statusCode: 401
        });
    }
    return userId
}
