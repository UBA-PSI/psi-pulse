<template>
  <UApp><div class="dark:bg-gray-900">
    <UContainer>
      <NuxtLayout >
        <NuxtPage/>
      </NuxtLayout>
    </UContainer>
  </div></UApp>
</template>
<script lang="ts" setup>
import '~/assets/css/global.css'

// Die Oberfläche ist englisch; Seiten mit deutscher oder umschaltbarer Sprache setzen lang selbst (B1)
useHead({
  htmlAttrs: {lang: 'en'},
  titleTemplate: '%s · psi-pulse',
  link: [
    {rel: 'icon', type: 'image/x-icon', href: '/logo.svg'}
  ]
})
</script>
