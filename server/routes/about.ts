// /about war die Erklärseite der App. Sie ist in den Abschnitt „So funktioniert’s“ der statischen
// Startseite (landing/, von Caddy auf bew ausgeliefert) aufgegangen. Die Adresse bleibt als
// Umleitung, weil ältere Mails und eingebettete Widgets noch auf /about?lang=de|en verlinken.
// Ohne Methodensuffix, damit auch HEAD (Link-Prüfer) umgeleitet wird.
export default defineEventHandler((event) => {
    const q = getQuery(event).lang
    const lang = q === 'de' || q === 'en'
        ? q
        : (/^de/i.test(getRequestHeader(event, 'accept-language') || '') ? 'de' : 'en')
    setResponseHeader(event, 'Vary', 'Accept-Language')
    return sendRedirect(event, lang === 'de' ? '/#so-gehts' : '/en/#so-gehts', 302)
})
