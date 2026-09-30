<template>
  <AllAnswered :message="message" />
</template>
<script lang="ts" setup>
const route = useRoute()
const lang = computed(() => route.query.lang === "en" ? "en" : "de")
const message = computed(() => lang.value === "de" ? "Erledigt. Sie bekommen diese Mails nicht mehr." : "Done. You will no longer receive these emails.")
useHead({title: computed(() => lang.value === "de" ? "Abbestellt" : "Unsubscribed"), htmlAttrs: {lang}})
definePageMeta({layout: "not-authenticated"});
</script>
