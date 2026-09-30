<template>
  <div class="mx-auto max-w-xl px-4 pt-24 sm:px-6 lg:px-8">
    <div class="flex justify-between items-center">
      <h1 class="text-base font-semibold leading-7 dark:text-white">{{ title }}</h1>
      <span v-if="questions && questions.length > 0 && questions.length >= offset + 1"
            class="text-sm text-gray-500 dark:text-gray-400">{{ t.position(offset + 1, questions.length) }}</span>
    </div>
    <!-- Sichtbar statt Tooltip: per Tastatur und Touch erreichbar (WCAG 2.1.1, 1.4.13) -->
    <p v-if="explanation != null" class="mt-1 text-sm text-gray-600 dark:text-gray-300">{{ explanation }}</p>
  </div>
</template>

<script lang="ts" setup>
const props = defineProps<{
  title: string
  questions: any[] | null
  offset: number
  explanation?: string
}>()
const t = useUiText()
</script>
