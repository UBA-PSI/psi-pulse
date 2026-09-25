export default defineNuxtConfig({
    modules: [
        'nuxt-scheduler',
        '@nuxt/ui'
    ],
    devtools: {
        enabled: false
    },
    runtimeConfig: {
        mailSecrets: {
            EMAIL_HOST: process.env.EMAIL_HOST,
            EMAIL_USER: process.env.EMAIL_USER,
            EMAIL_PASS: process.env.EMAIL_PASS,
            HOST_URL: process.env.HOST_URL
        },
        public: {
            HOST_URL: process.env.HOST_URL
        }
    },
})
