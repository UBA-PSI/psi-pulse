import {PrismaClient} from "@prisma/client";
import {sendLoginLink} from "~/server/utils/email";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
    const {email} = await readBody<{
        email: unknown;
    }>(event);

    if (typeof email !== "string" || email.length < 1 || email.length > 255) {
        throw createError({
            message: "Invalid email",
            statusCode: 400
        });
    }

    const user = await prisma.user.findFirst({
        where: {
            email: email.toLowerCase()
        }
    });

    if (!user) {
        throw createError({
            message: "Unknown email",
            statusCode: 400
        });
    }

    const token = await generateEmailVerificationToken(user.id);
    await sendLoginLink(email, token, user.name);
    return sendRedirect(event, "/email-verification");

});
