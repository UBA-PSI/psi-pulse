import {usePrisma} from "~/server/utils/prisma";
import {PrismaClient} from "@prisma/client";
import {sendLoginLink} from "~/server/utils/email";
import {normalizeEmail} from "~/server/utils/emailAddress";

const prisma = usePrisma();

export default defineEventHandler(async (event) => {
    const body = await readBody<{
        email: unknown;
    }>(event);

    // Genau eine Adresse, normalisiert für Rate-Limit, DB und Versand (A22)
    const email = normalizeEmail(body?.email);
    if (!email) {
        throw createError({
            message: "Invalid email",
            statusCode: 400
        });
    }

    assertMailRateLimit(event, email);

    const user = await prisma.user.findFirst({
        where: {
            email
        }
    });

    // Gleiche Antwort für bekannte und unbekannte Adressen: kein Rückschluss darauf,
    // wer ein Konto hat. Mail geht nur an registrierte Adressen.
    if (user) {
        const token = await generateEmailVerificationToken(user.id);
        // Anrede nur für bestätigte Konten: bei unbestätigten stammt der Name aus einem fremden Signup-Formular
        await sendLoginLink(user.email, token, user.verified ? user.name : "");
    }
    return sendRedirect(event, "/email-verification");

});
