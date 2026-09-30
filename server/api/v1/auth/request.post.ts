import {usePrisma} from "~/server/utils/prisma";
import {PrismaClient} from "@prisma/client";
import {randomInt} from "node:crypto";
import {hashLoginCode} from "~/server/utils/loginCode";
import {sendLoginCode} from "~/server/utils/email";
import {normalizeEmail} from "~/server/utils/emailAddress";

const prisma = usePrisma();

// Schritt 1 des Code-Logins im Widget: schickt einen 6-stelligen Code an die Adresse.
// Antwort ist für bekannte und unbekannte Adressen gleich (Konto entsteht erst beim Bestätigen).
export default defineEventHandler(async (event) => {
    const body = await readBody<{ email: unknown, lang: unknown }>(event);
    const lang = body?.lang;

    // Genau eine Adresse, normalisiert für Rate-Limit, DB und Versand (A22)
    const normalized = normalizeEmail(body?.email);
    if (!normalized) {
        throw createError({message: "Invalid email", statusCode: 400});
    }
    assertMailRateLimit(event, normalized);

    const code = String(randomInt(0, 1000000)).padStart(6, "0");
    const language = lang === "en" ? "en" : "de";
    const request = await prisma.loginCode.create({
        data: {
            email: normalized,
            code_hash: hashLoginCode(normalized, code),
            lang: language,
            expires_at: new Date(Date.now() + 10 * 60 * 1000),
        }
    });
    await sendLoginCode(normalized, code, language);
    return {requestId: request.id};
});
