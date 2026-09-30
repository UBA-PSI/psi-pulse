import {usePrisma} from "~/server/utils/prisma";
import {deleteResearchData} from "~/server/utils/research";
import {PrismaClient} from "@prisma/client";

const prisma = usePrisma();

export default defineEventHandler(async (event) => {
    const authRequest = auth.handleRequest(event);
    const session = await authRequest.validate();

    if (!session) {
        throw createError({
            message: "Unauthorized",
            statusCode: 401
        });
    }

    await deleteResearchData(session.user.userId)
})
