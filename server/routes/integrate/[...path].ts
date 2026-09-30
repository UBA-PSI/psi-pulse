// Der alte Einbettungs-Client v1 (/integrate/pulse.js, pulse.css, *.min.*) und die Anleitung /integrate
// sind entfernt (A13). 410 statt Umleitung auf Embed v2: v2 ist kein Ersatz ohne Änderung an der
// einbettenden Seite (anderes CSS, kein iframe, neue Anmeldung), eine Umleitung würde auf unbekannten
// Seiten still ein anderes Widget laden. 410 sagt Caches und Link-Prüfern, dass die Adresse wegbleibt.
// Ohne Methodensuffix, damit auch HEAD beantwortet wird. /integrate selbst: ../integrate.ts.
export default defineEventHandler((event) => {
    setResponseStatus(event, 410, 'Gone')
    setResponseHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
    setResponseHeader(event, 'Cache-Control', 'public, max-age=86400')
    return 'psi-pulse: Der alte Einbettungs-Client (v1) wurde entfernt. Nachfolger: /embed/v2/pulse.min.js\n'
        + 'psi-pulse: The old embedding client (v1) has been removed. Successor: /embed/v2/pulse.min.js\n'
})
