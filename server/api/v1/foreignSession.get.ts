import {generateForeignSessionToken} from "~/server/utils/token";

export default defineEventHandler(async (event): Promise<string> => {
    const authRequest = auth.handleRequest(event);
    const session = await authRequest.validate();

    if (!session) {
        throw createError({
            status: 401
        });
    }

    return generateForeignSessionToken(session.user.userId)
});
