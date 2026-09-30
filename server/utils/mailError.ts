// Kurzbeschreibung eines Versandfehlers fürs Log, ohne personenbezogene Details: nodemailer schreibt Empfänger-
// adressen in die Meldung („Can't send mail - all recipients were rejected: 550 <…>“), deshalb nur Code und Status.
export const mailErrorCode = (e: unknown): string => {
    const err = e as { code?: unknown, responseCode?: unknown, name?: unknown } | null
    const parts = [err?.code, err?.responseCode].filter((x) => typeof x === "string" || typeof x === "number")
    return parts.length ? parts.join(" ") : String(err?.name || "Error")
}
