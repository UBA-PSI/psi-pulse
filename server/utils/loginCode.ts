import {createHmac} from "node:crypto";

// Login-Codes haben nur 10^6 mögliche Werte; ein einfacher Hash wäre sofort umkehrbar.
// Deshalb HMAC mit einem Server-Geheimnis (NUXT_LOGIN_CODE_SECRET), das nicht in der DB liegt.
export const hashLoginCode = (email: string, code: string): string => {
    const secret = String(useRuntimeConfig().loginCodeSecret || "")
    if (secret.length < 32) {
        throw createError({message: "Login codes are not configured", statusCode: 503})
    }
    return createHmac("sha256", secret).update(email + ":" + code).digest("hex")
}
