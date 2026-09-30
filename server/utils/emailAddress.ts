// Prüfung und Normalisierung von Mail-Adressen, die von außen kommen (Signup, Login, Code-Login). A22: vorher nahmen
// die Endpunkte Listen („a@x, b@y“) oder Formen wie „a<opfer@x>“ an; nodemailer verschickte an alle Empfänger, und
// jede Schreibweise war ein neuer Schlüssel fürs Rate-Limit.
// Bewusst strenger als RFC 5321: genau eine Adresse, im Lokalteil nur Buchstaben, Ziffern und . _ + ' -, Domain aus
// mindestens zwei Labels (IDN nur als xn--). Die normalisierte Form (getrimmt, klein) gilt für Rate-Limit, DB und Versand.

const LOCAL = /^[a-z0-9_+'-]+(\.[a-z0-9_+'-]+)*$/
const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/
const TLD = /^(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/

export const normalizeEmail = (input: unknown): string | null => {
    if (typeof input !== "string") return null
    const email = input.trim().toLowerCase()
    if (email.length < 3 || email.length > 254) return null
    const at = email.indexOf("@")
    if (at < 1 || at !== email.lastIndexOf("@")) return null
    const local = email.slice(0, at)
    const domain = email.slice(at + 1)
    if (local.length > 64 || !LOCAL.test(local)) return null
    const labels = domain.split(".")
    if (labels.length < 2 || !labels.every(l => LABEL.test(l))) return null
    if (!TLD.test(labels[labels.length - 1])) return null
    return email
}

// Schlüssel fürs Mail-Rate-Limit pro Postfach (A37): ohne „+tag“ im Lokalteil, weil viele Provider
// opfer+1@…, opfer+2@… ins selbe Postfach zustellen. Nur für den Zähler; gespeichert und verschickt wird die
// normalisierte Adresse unverändert.
export const mailLimitKey = (email: string): string => {
    const lower = email.toLowerCase()
    const at = lower.lastIndexOf("@")
    if (at < 0) return lower
    const plus = lower.indexOf("+")
    return plus >= 0 && plus < at ? lower.slice(0, plus) + lower.slice(at) : lower
}

// Anrede in Mails und Anzeigename. Kein Steuerzeichen (Zeilenumbrüche), keine spitzen Klammern, keine Adressen:
// Der Name steht in Mails, die vom Uni-Mailserver kommen, und darf dort nicht zum Link- oder Phishing-Text werden.
export const MAX_NAME_LENGTH = 100

export const normalizeName = (input: unknown): string | null => {
    if (typeof input !== "string") return null
    const name = input.normalize("NFC").replace(/\s+/g, " ").trim()
    if (name.length > MAX_NAME_LENGTH) return null
    if (/[\p{Cc}\p{Cf}<>]/u.test(name)) return null
    if (/:\/\/|www\.|@/i.test(name)) return null
    // Domain-artige Wörter („evil.example“), damit Mailprogramme sie nicht als Link erkennen
    if (/[a-z0-9-]\.[a-z]{2,}(\/|\b)/i.test(name)) return null
    return name
}

// Zieladresse auf der Bestätigungsseite des Magic Links (A29): „d***@uni-bamberg.de“. Genug, um das eigene Konto
// zu erkennen, ohne die ganze Adresse an jeden zu geben, der den Link sieht.
export const maskEmail = (email: string): string => {
    const at = email.lastIndexOf("@")
    if (at < 1) return "***"
    return email.slice(0, 1) + "***" + email.slice(at)
}
