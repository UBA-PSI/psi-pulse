import {usePrisma} from "~/server/utils/prisma";
import {PrismaClientKnownRequestError} from "@prisma/client/runtime/library";
import {createPulseUser} from "~/server/utils/users";
import {sendLoginLink, sendSignupLink} from "~/server/utils/email";
import {PrismaClient} from "@prisma/client";
import {normalizeEmail, normalizeName} from "~/server/utils/emailAddress";

const prisma = usePrisma();

export default defineEventHandler(async (event) => {
    const body = await readBody<{
        email: unknown;
        name: unknown;
        logQuestions: false;
    }>(event);
    // Genau eine Adresse, normalisiert für Rate-Limit, DB und Versand (A22)
    const email = normalizeEmail(body?.email);
    if (!email) {
        throw createError({
            message: "Invalid email",
            statusCode: 400
        });
    }
    // Name ist optional (wie beim Widget); nur ein angegebener, aber unzulässiger Name wird abgelehnt
    const name = body?.name == null ? "" : normalizeName(body.name);
    if (name === null) {
        throw createError({
            message: "Invalid name",
            statusCode: 400
        });
    }

    assertMailRateLimit(event, email);

    try {
        // Einwilligung zur Forschung wird nicht beim Signup erfragt (eigener Moment, components/researchInvite.vue)
        const lang = /^de/i.test(getHeader(event, "accept-language") || "de") ? "de" : "en";
        const user = await createPulseUser(email, name, false, false, lang);

        const token = await generateEmailVerificationToken(user.userId);
        // Ohne Namen: die Adresse ist noch nicht bestätigt, der Name kommt von wem auch immer das Formular ausfüllt
        await sendSignupLink(email, token)
        return sendRedirect(event, "/email-verification");
    } catch (e) {
        if (
            e as PrismaClientKnownRequestError && (e as PrismaClientKnownRequestError).code === "P2002"
        ) {
            // Adresse existiert schon: Login-Link statt Fehlermeldung, damit die Antwort
            // nicht verrät, ob jemand ein Konto hat.
            const user = await prisma.user.findFirst({where: {email}});
            if (user) {
                const token = await generateEmailVerificationToken(user.id);
                await sendLoginLink(user.email, token, user.verified ? user.name : "");
            }
            return sendRedirect(event, "/email-verification");
        }
        console.error(e);
        throw createError({
            message: "An unknown error occurred",
            statusCode: 500
        });
    }
});
