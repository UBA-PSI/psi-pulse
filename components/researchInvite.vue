<template>
  <!-- Einwilligung zur Forschung: nur nach einer abgeschlossenen Runde aus einer Mail, nur einmal, nichts vorausgewählt.
       Nicht direkt in der Mail, weil Link-Scanner in Mailprogrammen Links automatisch aufrufen. -->
  <section v-if="visible && offer && !done" :lang="lang" class="mx-auto max-w-xl px-4 pb-8 sm:px-6 lg:px-8">
    <div class="rounded-md border border-gray-200 dark:border-gray-700 p-4 space-y-3 text-sm leading-relaxed">
      <h2 class="font-semibold text-base">{{ t.title }}</h2>
      <p>{{ t.what }}</p>
      <p>{{ t.how }}</p>
      <p>{{ t.voluntary }}</p>
      <div class="flex flex-wrap gap-2">
        <UButton :loading="busy" color="primary" variant="solid" @click="decide(true)">{{ t.yes }}</UButton>
        <UButton :loading="busy" color="primary" variant="solid" @click="decide(false)">{{ t.no }}</UButton>
      </div>
      <p class="text-xs"><NuxtLink to="/privacy-policy" class="underline">{{ t.privacy }}</NuxtLink></p>
      <p v-if="error" role="alert" class="text-red-600">{{ t.error }}</p>
    </div>
  </section>
  <p v-else-if="visible && done" :lang="lang" role="status" class="mx-auto max-w-xl px-4 pb-8 text-sm">{{ done }}</p>
</template>

<script lang="ts" setup>
// visible: erst nach der letzten Antwort zeigen; das Angebot wird aber schon beim Laden geholt,
// weil das Reminder-Token mit der letzten Antwort gelöscht wird.
const props = defineProps<{ kind: "reminder" | "weekly", token: string, visible: boolean }>()

const offer = ref<string | null>(null)
const lang = ref<"de" | "en">("de")
const busy = ref(false)
const done = ref<string | null>(null)
const error = ref(false)

const TEXT = {
  de: {
    title: "Dürfen wir Ihre Antworten für die Forschung nutzen?",
    what: "Der Lehrstuhl für Privatsphäre und Sicherheit untersucht, wie Wiederholungsfragen beim Lernen helfen. Dafür würden wir ab jetzt zu jeder Ihrer Antworten speichern, welche Frage es war, wann Sie geantwortet haben und ob Sie die Antwort wussten.",
    how: "Diese Daten liegen ohne Ihre E-Mail-Adresse und Ihren Namen unter einer Zufallskennung, werden nur für diese Forschung ausgewertet und nach einem Jahr gelöscht. Einen daraus erstellten anonymisierten Datensatz, der keinen Rückschluss auf Sie zulässt, bewahren wir nach den Regeln guter wissenschaftlicher Praxis zehn Jahre auf und veröffentlichen ihn gegebenenfalls zusammen mit den Ergebnissen.",
    voluntary: "Die Teilnahme ist freiwillig, psi-pulse funktioniert ohne sie genauso, und Ihre Antworten fließen nicht in Noten ein. Sie können jederzeit in den Einstellungen widerrufen.",
    yes: "Ja, einverstanden", no: "Nein, danke", privacy: "Datenschutzhinweise",
    thanksYes: "Danke! Sie können das jederzeit in den Einstellungen ändern.",
    thanksNo: "In Ordnung. Wir fragen nicht noch einmal.",
    error: "Das hat nicht geklappt. Bitte später noch einmal versuchen."
  },
  en: {
    title: "May we use your answers for research?",
    what: "The Chair of Privacy and Security studies how review questions help learning. From now on we would store, for each of your answers, which question it was, when you answered and whether you knew the answer.",
    how: "These data are kept without your email address and name under a random identifier, analysed only for this research and deleted after one year. An anonymised dataset derived from them, which does not allow conclusions about you, is kept for ten years under the rules of good scientific practice and may be published together with the results.",
    voluntary: "Taking part is voluntary, psi-pulse works the same without it, and your answers do not count towards any grade. You can withdraw at any time in the settings.",
    yes: "Yes, I agree", no: "No, thanks", privacy: "Privacy policy",
    thanksYes: "Thank you! You can change this at any time in the settings.",
    thanksNo: "All right. We will not ask again.",
    error: "That did not work. Please try again later."
  }
}
const t = computed(() => TEXT[lang.value])

onMounted(async () => {
  try {
    const res = await $fetch<{ ask: boolean, offer?: string, lang?: "de" | "en" }>("/api/research/offer", {query: {kind: props.kind, token: props.token}})
    if (res.ask && res.offer) {
      offer.value = res.offer
      lang.value = res.lang === "en" ? "en" : "de"
    }
  } catch { /* kein Angebot */ }
})

const decide = async (consent: boolean) => {
  busy.value = true
  error.value = false
  try {
    await $fetch("/api/research/decision", {method: "POST", body: {offer: offer.value, consent}})
    done.value = consent ? t.value.thanksYes : t.value.thanksNo
  } catch {
    error.value = true
  } finally {
    busy.value = false
  }
}
</script>
