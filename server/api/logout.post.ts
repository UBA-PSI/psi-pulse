export default defineEventHandler(async (event) => {
    const authRequest = auth.handleRequest(event);
    const session = await authRequest.validate();
    if (!session) {
        throw createError({
            message: "Unauthorized",
            statusCode: 401
        });
    }
    await auth.invalidateSession(session.sessionId);
    authRequest.setSession(null);
    return sendRedirect(event, "/login");
});
