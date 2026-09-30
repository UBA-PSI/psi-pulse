import {usePrisma} from "~/server/utils/prisma";
import {PrismaClient} from "@prisma/client";
import {timingSafeEqual} from "node:crypto";
import {hashLoginCode} from "~/server/utils/loginCode";
import {generateForeignSessionToken} from "~/server/utils/token";
import {createPulseUser} from "~/server/utils/users";
import {isUUID} from "~/server/utils/string";
import {normalizeName} from "~/server/utils/emailAddress";

const prisma = usePrisma();
const MAX_ATTEMPTS = 5;

// Schritt 2 des Code-Logins: Code prüfen, bei Bedarf Konto anlegen, API-Token ausgeben.
export default defineEventHandler(async (event) => {
    const {requestId, code, name, logQuestions} = await readBody<{
        requestId: unknown, code: unknown, name: unknown, logQuestions: unknown
    }>(event);

    const invalid = () => createError({message: "Invalid or expired code", statusCode: 400});
    if (typeof requestId !== "string" || !isUUID(requestId) || typeof code !== "string" || !/^\d{6}$/.test(code)) {
        throw invalid();
    }

    assertRateLimit(event, "verify", [{key: "ip", windowMs: 60 * 60 * 1000, max: 300}]);

    // Versuch VOR dem Vergleich atomar zählen: parallele Anfragen können die Grenze nicht umgehen
    // (vorher: lesen, vergleichen, dann getrennt hochzählen – per Race beliebig viele Versuche).
    const counted = await prisma.loginCode.updateMany({
        where: {id: requestId, attempts: {lt: MAX_ATTEMPTS}, expires_at: {gt: new Date()}},
        data: {attempts: {increment: 1}}
    });
    if (counted.count !== 1) throw invalid();
    const request = await prisma.loginCode.findUnique({where: {id: requestId}});
    if (!request) throw invalid();

    const given = Buffer.from(hashLoginCode(request.email, code));
    const stored = Buffer.from(request.code_hash);
    if (given.length !== stored.length || !timingSafeEqual(given, stored)) {
        throw invalid();
    }
    // A34: Code genau einmal einlösen. Vorher löschte jede Anfrage mit richtigem Code alle Codes der Adresse, ohne das
    // Ergebnis auszuwerten; parallele Anfragen bekamen so je ein eigenes 90-Tage-Token.
    const consumed = await prisma.loginCode.deleteMany({where: {id: requestId, expires_at: {gt: new Date()}}});
    if (consumed.count !== 1) throw invalid();
    await prisma.loginCode.deleteMany({where: {email: request.email}});

    let user = await prisma.user.findUnique({where: {email: request.email}});
    let newAccount = false;
    if (!user) {
        // Ohne Angabe keine Anrede aus dem Adressteil („Hallo,“ statt „Hallo max.mustermann,“)
        // Ungültige Namen (Zeilenumbrüche, Links, zu lang) nicht speichern, den Login aber nicht scheitern lassen
        const displayName = normalizeName(name) ?? "";
        try {
            const created = await createPulseUser(request.email, displayName, false, true, request.lang);
            user = await prisma.user.findUnique({where: {id: created.userId}});
            newAccount = true;
        } catch (e) {
            // Gleichzeitige Bestätigung hat das Konto schon angelegt
            user = await prisma.user.findUnique({where: {email: request.email}});
            if (!user) throw e;
        }
    } else if (!user.verified) {
        user = await prisma.user.update({where: {id: user.id}, data: {verified: true}});
    }

    const token = await generateForeignSessionToken(user!.id, 90);
    return {token, newAccount, name: user!.name};
});
