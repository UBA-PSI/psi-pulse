<template>
  <div class="h-screen flex items-center justify-center text-center -mb-48" :lang="lang">
    <CustomCard>
      <h1 class="mt-4 mb-10 text-center text-3xl font-bold leading-9 tracking-tight text-gray-900 dark:text-white">
        {{ info?.valid && info.signup ? t.titleSignup : t.title }}
      </h1>
      <!-- Bestätigung statt Anmeldung beim Öffnen (A29): Link-Scanner rufen Mail-Links automatisch auf, und ein
           untergeschobener Link soll niemanden unbemerkt in ein fremdes Konto bringen. -->
      <div v-if="info?.valid && !failed" class="space-y-6 max-w-sm">
        <p>{{ t.as }} <strong class="whitespace-nowrap">{{ info.email }}</strong></p>
        <UButton :loading="busy" block @click="signIn">{{ t.button }}</UButton>
        <p class="text-sm">{{ t.notYou }}</p>
      </div>
      <div v-else class="space-y-6 max-w-sm">
        <p role="alert">{{ t.invalid }}</p>
        <NuxtLink class="text-primary underline" to="/login">{{ t.login }}</NuxtLink>
      </div>
    </CustomCard>
  </div>
</template>

<script lang="ts" setup>
const route = useRoute()
const token = String(route.params.token || "")

const {data: info} = await useFetch(`/api/email-verification/${encodeURIComponent(token)}/info`, {
  key: `email-verification-${token}`
})

// Sprache: ?lang= aus dem Link, sonst die des Kontos, sonst die des Browsers
const acceptLanguage = useRequestHeaders(['accept-language'])['accept-language']
const browserDe = /^de/i.test(acceptLanguage || (process.client ? navigator.language : '') || 'de')
const lang = computed<"de" | "en">(() => {
  if (route.query.lang === "de" || route.query.lang === "en") return route.query.lang
  if (info.value?.lang) return info.value.lang
  return browserDe ? "de" : "en"
})

const TEXT = {
  de: {
    title: "Bei psi-pulse anmelden",
    titleSignup: "Anmeldung bestätigen",
    as: "Sie melden sich an als",
    button: "Anmelden",
    notYou: "Nicht Ihre Adresse oder nicht von Ihnen angefordert? Dann schließen Sie diese Seite einfach.",
    invalid: "Dieser Link ist abgelaufen oder wurde schon benutzt. Fordern Sie auf der Anmeldeseite einen neuen an.",
    login: "Zur Anmeldung",
  },
  en: {
    title: "Sign in to psi-pulse",
    titleSignup: "Confirm your sign-up",
    as: "You are signing in as",
    button: "Sign in",
    notYou: "Not your address, or you did not request this? Then just close this page.",
    invalid: "This link has expired or has already been used. Request a new one on the sign-in page.",
    login: "Go to sign-in",
  },
}
const t = computed(() => TEXT[lang.value])

useHead({title: computed(() => t.value.title), htmlAttrs: {lang}})
definePageMeta({layout: "not-authenticated"})

const busy = ref(false)
const failed = ref(false)

const signIn = async () => {
  busy.value = true
  try {
    await $fetch(`/api/email-verification/${encodeURIComponent(token)}`, {method: "POST"})
    // Voller Seitenaufruf, damit die App die neue Sitzung lädt
    await navigateTo("/home", {external: true})
  } catch {
    failed.value = true
    busy.value = false
  }
}
</script>
