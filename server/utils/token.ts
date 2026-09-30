import {usePrisma} from "~/server/utils/prisma";
import { randomBytes } from "node:crypto";
const generateSecureToken = () => randomBytes(32).toString("hex");
const isWithinExpiration = (expires: number) => expires > Date.now();

const client = usePrisma();

// Token für /api/v1 (Embed v2, Code-Login): 90 Tage, damit Studierende sich nicht alle zwei Wochen
// neu anmelden müssen.
export const generateForeignSessionToken = async (userId: string, days: number = 90) => {
    const token = generateSecureToken();
    const exp = 1000 * 60 * 60 * 24 * days;

    const newToken = await client.thirdPartySession.create({
        data: {
            id: token,
            expires: new Date().getTime() + exp,
            user_id: userId
        }
    });
    return newToken.id;
}

export const generateEmailVerificationToken = async (userId: string) => {
    const EXPIRES_IN = 1000 * 60 * 60 * 2; // 2 hours

    const storedUserTokens = await client.emailVerificationToken.findMany({
        where: {
            user_id: userId
        }
    });

    if (storedUserTokens.length > 0) {
        const reusableStoredToken = storedUserTokens.find((token) => {
            // check if expiration is within 1 hour
            // and reuse the token if true
            return isWithinExpiration(Number(token.expires) - EXPIRES_IN / 2);
        });
        if (reusableStoredToken) return reusableStoredToken.id;
    }
    const token = generateSecureToken();
    await client.emailVerificationToken.create({
        data: {
            id: token,
            expires: new Date().getTime() + EXPIRES_IN,
            user_id: userId
        }
    });

    return token;
};



// Nur lesen, nicht verbrauchen (A29): für die Bestätigungsseite, die ein GET auf den Mail-Link zeigt. Link-Scanner
// in Mailprogrammen rufen Links automatisch auf; das darf den Link weder einlösen noch entwerten.
export const peekEmailVerificationToken = async (token: string) => {
    if (typeof token !== "string" || !token || token.length > 100) return null;
    const storedToken = await client.emailVerificationToken.findUnique({
        where: {id: token},
        select: {expires: true, user: {select: {email: true, lang: true, verified: true}}}
    });
    if (!storedToken || !isWithinExpiration(Number(storedToken.expires))) return null;
    return storedToken.user;
};

// Löst einen Magic Link genau einmal ein (A34). Vorher: lesen, alle Tokens des Kontos löschen, Ergebnis nicht
// auswerten – parallele Aufrufe mit demselben Link bekamen jeweils eine Sitzung. Jetzt bekommt nur die Anfrage,
// die genau diesen, noch gültigen Datensatz löscht, die Konto-Id.
export const validateEmailVerificationToken = async (token: string) => {
    const invalid = () => createError({message: "Invalid token", statusCode: 400});
    if (typeof token !== "string" || !token || token.length > 100) throw invalid();
    const storedToken = await client.emailVerificationToken.findUnique({
        where: {
            id: token
        }
    });
    if (!storedToken) throw invalid();

    const consumed = await client.emailVerificationToken.deleteMany({
        where: {id: token, expires: {gt: BigInt(Date.now())}}
    });
    if (consumed.count !== 1) {
        // abgelaufen (oder parallel schon eingelöst): abgelaufenen Datensatz trotzdem entfernen
        await client.emailVerificationToken.deleteMany({where: {id: token}});
        throw createError({
            message: "Token expired",
            statusCode: 400
        });
    }
    // Weitere Links desselben Kontos verfallen mit der Anmeldung
    await client.emailVerificationToken.deleteMany({
        where: {
            user_id: storedToken.user_id
        }
    });
    return storedToken.user_id;
};
