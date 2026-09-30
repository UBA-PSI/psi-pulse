// Link für „Seite öffnen“: nur absolute http(s)-Adressen, sonst null (A21). Der Server filtert schon beim Speichern
// und Ausgeben (server/utils/pageUrl.ts); diese Prüfung schützt zusätzlich, falls doch etwas anderes ankommt.
export const pageLink = (pageUrl: string | null | undefined, hash: string): string | null => {
    if (!pageUrl) return null
    try {
        const url = new URL(pageUrl)
        if (url.protocol !== "http:" && url.protocol !== "https:") return null
        url.hash = hash
        return url.href
    } catch {
        return null
    }
}

// Neuer Tab ohne window.opener und ohne Referrer: die eingebettete Seite erfährt nichts über die App.
export const openPageLink = (pageUrl: string | null | undefined, hash: string) => {
    const link = pageLink(pageUrl, hash)
    if (link) window.open(link, "_blank", "noopener,noreferrer")
}
