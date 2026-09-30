export default defineNuxtConfig({
    srcDir: '.',
    ui: { fonts: false },
    compatibilityDate: '2026-09-27',
    css: ['~/assets/css/ui.css'],
    icon: { serverBundle: { collections: ['heroicons'] } },
    modules: [
        '@nuxt/ui'
    ],
    // Impressum ist das der Lehrstuhlseite (keine eigene Fassung pflegen)
    routeRules: {
        '/imprint': {redirect: {to: 'https://www.uni-bamberg.de/psi/kontaktnavigation/impressum/', statusCode: 301}}
    },
    devtools: {
        enabled: false
    },
    // Werte werden zur Laufzeit über NUXT_MAIL_SECRETS_* und NUXT_PUBLIC_HOST_URL gesetzt
    // (siehe docker-compose.yml). Hier keine process.env-Werte eintragen: Nuxt würde sie
    // beim Build ins Server-Bundle schreiben.
    runtimeConfig: {
        loginCodeSecret: '',
        mailSecrets: {
            EMAIL_HOST: '',
            EMAIL_PORT: 587,
            EMAIL_REQUIRE_TLS: true,
            EMAIL_USER: '',
            EMAIL_PASS: '',
            HOST_URL: ''
        },
        public: {
            HOST_URL: ''
        }
    },
})
