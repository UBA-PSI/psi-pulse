// Adresse der Seite, auf der eine Frage eingebettet ist. Die App öffnet sie über „Seite öffnen“ in einem neuen Tab
// (components/question.vue, questionInfo.vue). Sie kommt ungeprüft aus dem Widget, also von jeder beliebigen Seite:
// Nur absolute http(s)-Adressen werden gespeichert und ausgegeben, sonst "" (A21: javascript:-URLs liefen sonst mit
// der Sitzung der App). Kein Grund, die ganze Frage abzulehnen: das Widget schickt unter file:// gar keine Adresse.
export const MAX_PAGE_URL_LENGTH = 2048

export const safePageUrl = (input: unknown): string => {
    if (typeof input !== "string") return ""
    const value = input.trim()
    if (value.length === 0 || value.length > MAX_PAGE_URL_LENGTH) return ""
    let url: URL
    try {
        url = new URL(value)
    } catch {
        return ""
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") return ""
    // Zugangsdaten in der Adresse würden beim Öffnen mitgeschickt und in der App angezeigt
    if (url.username || url.password) return ""
    const href = url.href
    return href.length <= MAX_PAGE_URL_LENGTH ? href : ""
}
