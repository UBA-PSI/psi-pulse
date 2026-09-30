// Ziel der Links in Anmelde- und Signup-Mails. Setzt keine Sitzung mehr (A29, Login-CSRF): Vorher meldete schon
// das Öffnen des Links den Browser an, auch einen fremden, dem jemand seinen eigenen Link untergeschoben hat.
// Jetzt nur Weiterleitung auf die Bestätigungsseite; angemeldet wird erst mit dem Knopf dort (POST, Origin-Prüfung).
// Das Token wird hier weder geprüft noch verbraucht, damit Link-Scanner der Mailprogramme nichts entwerten.
export default defineEventHandler((event) => {
    const token = event.context.params?.token ?? "";
    if (!/^[A-Za-z0-9]{1,100}$/.test(token)) {
        return sendRedirect(event, "/email-verification/invalid");
    }
    const lang = getQuery(event).lang;
    const suffix = lang === "de" || lang === "en" ? `?lang=${lang}` : "";
    return sendRedirect(event, `/email-verification/${token}${suffix}`);
});
