<template>
  <div class="mt-8 flex justify-center" :lang="lang">
    <div class="max-w-2xl w-full space-y-4">
      <p class="font-semibold">{{ t.question }}</p>
      <p class="text-sm">{{ t.note }}</p>
      <!-- Bewusst mit Bestätigung: Link-Scanner in Mailprogrammen rufen Links automatisch auf -->
      <UButton color="error" @click="handleUnsubscribe">{{ t.button }}</UButton>
      <p v-if="errorMessage" role="alert">{{ errorMessage }}</p>
    </div>
  </div>
</template>
<script lang="ts" setup>
import {FetchError} from "ofetch";

const route = useRoute();
const lang = computed(() => route.query.lang === "en" ? "en" : "de")
const TEXT = {
  de: {question: "Möchten Sie keine Mails mehr von psi-pulse bekommen?", note: "Ihre Fragen bleiben erhalten; Sie können die Mails in den Einstellungen wieder einschalten.", button: "Keine Mails mehr", error: "Das hat nicht geklappt. Der Link ist womöglich veraltet."},
  en: {question: "Do you want to stop all emails from psi-pulse?", note: "Your questions are kept; you can turn emails back on in the settings.", button: "Stop all emails", error: "That did not work. The link may be out of date."}
}
const t = computed(() => TEXT[lang.value])

useHead({title: computed(() => lang.value === "de" ? "Abbestellen" : "Unsubscribe"), htmlAttrs: {lang}})
definePageMeta({layout: "not-authenticated"});

let errorMessage = ref<string | null>(null);

const handleUnsubscribe = async () => {
  try {
    await $fetch(`/api/unsubscribe/emails/${route.params.token}`, {method: "DELETE"})
    await navigateTo(`/unsubscribe/success?lang=${lang.value}`);
  } catch (e) {
    const err = e as FetchError;
    errorMessage.value = t.value.error
  }
}
</script>
