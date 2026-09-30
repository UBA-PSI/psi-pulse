<template>
  <div class="h-screen flex items-center justify-center text-center -mb-48">
    <CustomCard>
      <h1 class="mt-4 mb-10 text-center text-3xl font-bold leading-9 tracking-tight text-gray-900 dark:text-white">
        {{ de ? 'E-Mail-Bestätigung' : 'Email Verification' }}
      </h1>
      {{ verificationText }}
    </CustomCard>
  </div>
</template>

<script lang="ts" setup>
const acceptLanguage = useRequestHeaders(['accept-language'])['accept-language']
const de = /^de/i.test(acceptLanguage || (process.client ? navigator.language : '') || 'de')
const verificationText = computed(() => de
  ? 'Falls diese Adresse zu einem psi-pulse-Konto gehört, haben wir Ihnen einen Link geschickt. Bitte sehen Sie im Posteingang und im Spam-Ordner nach.'
  : 'If this address belongs to a psi-pulse account, we have sent you a link. Please check your inbox and spam folder.')
useHead({
  title: de ? 'E-Mail-Bestätigung' : 'Email Verification',
  htmlAttrs: {lang: de ? 'de' : 'en'}
})

definePageMeta({
  layout: "not-authenticated",
});
</script>
