// Größenlimit für Anfragen mit Body (A23). h3 liest einen Body nur mit Content-Length ein (ohne Header bleibt er
// leer), und Node hält die angegebene Länge ein; die Prüfung des Headers genügt also, bevor irgendetwas gelesen wird.
// Läuft nach cors.ts (alphabetisch), damit auch die 413 für /api/v1 die CORS-Header trägt.
const MAX_BODY_BYTES = 256 * 1024

export default defineEventHandler((event) => {
    if (!event.path.startsWith("/api/")) return
    const length = Number(getRequestHeader(event, "content-length") || 0)
    if (length > MAX_BODY_BYTES) {
        throw createError({message: "Request body too large", statusCode: 413})
    }
})
