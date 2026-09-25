import {H3Event} from "h3";

export default async (event: H3Event) => {
    const authRequest = auth.handleRequest(event);
    const session = await authRequest.validate();
    if (!session) {
        throw createError({
            message: "Unauthorized",
            statusCode: 401
        });
    }
    return session
}
