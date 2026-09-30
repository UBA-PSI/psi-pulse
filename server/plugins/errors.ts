// 5xx-Fehler ohne interne Details an den Client (A24). Vorher gingen Prisma- und Node-Meldungen (mit Nutzer-Id,
// Tabellen- und Spaltennamen) als message in der JSON-Antwort bzw. auf der Fehlerseite hinaus.
// Der Fehler wird mit allen Details geloggt und dann erst an den Fehler-Handler von Nuxt weitergereicht
// (JSON für API-Anfragen, sonst error.vue). 4xx-Meldungen stammen aus unserem Code und bleiben.
export default defineNitroPlugin((nitroApp) => {
    const handle = nitroApp.h3App.options.onError
    if (!handle) return
    nitroApp.h3App.options.onError = (error, event) => {
        const status = Number(error?.statusCode) || 500
        if (status >= 500) {
            console.error("[error]", status, event.path, error?.cause ?? error)
            error.message = "Internal Server Error"
            error.statusMessage = "Internal Server Error"
            error.data = undefined
            error.cause = undefined
            error.stack = ""
        }
        return handle(error, event)
    }
})
