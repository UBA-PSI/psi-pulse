<template>
  <div class="flex flex-col items-center justify-center flex-1 px-6 py-14 sm:px-14"><span
      aria-hidden="true"
      class="i-heroicons-arrow-path-20-solid w-6 h-6 mx-auto text-gray-400 dark:text-gray-500 mb-4 animate-spin"></span>
    <p class="text-sm text-center text-gray-900 dark:text-white">{{ t.loading }}</p></div>
</template>
<script lang="ts" setup>
const t = useUiText()
</script>
