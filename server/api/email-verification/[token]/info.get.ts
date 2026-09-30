import {peekEmailVerificationToken} from "~/server/utils/token";
import {maskEmail} from "~/server/utils/emailAddress";

// Daten für die Bestätigungsseite des Magic Links (A29), nur lesend: maskierte Zieladresse und Sprache des Kontos.
export default defineEventHandler(async (event): Promise<{ valid: boolean, email?: string, lang?: "de" | "en", signup?: boolean }> => {
    const user = await peekEmailVerificationToken(event.context.params?.token ?? "");
    if (!user) return {valid: false};
    return {valid: true, email: maskEmail(user.email), lang: user.lang === "en" ? "en" : "de", signup: !user.verified};
});
