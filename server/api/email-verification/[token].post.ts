import {usePrisma} from "~/server/utils/prisma";
import {validateEmailVerificationToken} from "~/server/utils/token";

const client = usePrisma();

// Löst den Magic Link ein (Knopf „Anmelden“ auf der Bestätigungsseite, A29). Nur von der eigenen Herkunft:
// Wie bei allen Cookie-authentifizierten Änderungen: Eine fremde Seite darf den Browser nicht per
// Formular-POST in ein fremdes Konto anmelden. Hier ist noch keine Sitzung vorhanden.
const sameOrigin = (event: Parameters<typeof getRequestHost>[0]) => {
    const origin = getHeader(event, "origin");
    if (!origin) return false;
    try {
        return new URL(origin).host === getRequestHost(event);
    } catch {
        return false;
    }
};

export default defineEventHandler(async (event) => {
    if (!sameOrigin(event)) {
        throw createError({message: "Invalid origin", statusCode: 403});
    }
    const token = event.context.params?.token ?? "";
    let userId: string;
    try {
        userId = await validateEmailVerificationToken(token);
    } catch {
        throw createError({message: "Invalid email verification link", statusCode: 400});
    }
    const session = await auth.createSession({userId, attributes: {}});
    auth.handleRequest(event).setSession(session);
    await client.user.update({where: {id: userId}, data: {verified: true}});
    return {ok: true};
});
