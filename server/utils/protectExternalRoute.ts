import {H3Event} from "h3";
import {PrismaClient} from "@prisma/client";

const prisma = new PrismaClient();

export default async (event: H3Event) => {
    let authToken = event.headers.get('X-API-KEY')
    let userId = null
    if (authToken != null) {
        let foreignSession = await prisma.thirdPartySession.findUnique({
            where: {
                id: authToken
            }, select: {
                user_id: true
            }
        })
        userId = foreignSession ? foreignSession.user_id : null
    }

    if (!userId) {
        throw createError({
            message: "Unauthorized",
            statusCode: 401
        });
    }
    return userId
}
