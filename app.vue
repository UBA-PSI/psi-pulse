<template>
  <div class="dark:bg-gray-900">
    <UContainer>
      <NuxtLayout >
        <NuxtPage/>
      </NuxtLayout>
    </UContainer>
    <UNotifications/>
  </div>
</template>
<script lang="ts" setup>
import '~/assets/css/global.css'
import '~/assets/css/docs.css'

useHead({
  titleTemplate: '%s · Pulse',
  link: [
    {rel: 'icon', type: 'image/x-icon', href: '/logo.svg'}
  ]
})
</script>
