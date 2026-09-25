import {validateEmailVerificationToken} from "~/server/utils/token";
import {PrismaClient} from "@prisma/client";

const client = new PrismaClient();


export default defineEventHandler(async (event) => {
    const { token } = event.context.params ?? {
        token: ""
    };
    try {
        const userId = await validateEmailVerificationToken(token);
        if (!userId) {
            throw createError({
                status: 400,
                message: "Invalid email verification link"
            });
        }
        const session = await auth.createSession({
            userId: userId,
            attributes: {}
        });
        const authRequest = auth.handleRequest(event);
        authRequest.setSession(session);

        await client.user.update({
            where: {
                id: userId
            },
            data: {
                verified: true
            }
        });

        return sendRedirect(event, "/");
    } catch (e) {
        console.log(e)
        throw createError({
            status: 400,
            message: "Invalid email verification link"
        });
    }
});
