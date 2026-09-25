import {generateEmailVerificationToken} from "~/server/utils/token";
import {sendLoginLink} from "~/server/utils/email";

export default defineEventHandler(async (event) => {
    const authRequest = auth.handleRequest(event);
    const session = await authRequest.validate();
    if (!session) {
        throw createError({
            status: 401
        });
    }
    try {
        const token = await generateEmailVerificationToken(session.user.userId);
        await sendLoginLink(session.user.email, token, session.user.name);
        return {};
    } catch {
        throw createError({
            message: "An unknown error occurred",
            statusCode: 500
        });
    }
});
