<template>
  <footer>
    <div class="mx-auto max-w-7xl overflow-hidden px-6 py-8 lg:px-8">
      <nav aria-label="Footer" class="-mb-6 columns-2 sm:flex sm:justify-center sm:space-x-12">
        <div v-for="item in navigationFooter.main" :key="item.name" class="pb-6">
          <a :href="item.href" target="_blank" class="text-sm leading-6 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">{{ item.name }}</a>
        </div>
      </nav>
    </div>
  </footer>
</template>
<script lang="ts" setup>
const t = useUiText()
const lang = useUiLang()
const navigationFooter = computed(() => ({
  main: [
    {name: t.value.imprint, href: 'https://www.uni-bamberg.de/psi/kontaktnavigation/impressum/'},
    {name: t.value.privacy, href: `/privacy-policy?lang=${lang.value}`},
  ],
}))
</script>
