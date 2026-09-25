<template>
  <div class="mx-auto max-w-xl px-4 py-8 sm:px-6 lg:px-8">
    <div class="rounded-md bg-green-50 dark:bg-green-400 p-4 dark:bg-opacity-10">
      <div class="flex items-center">
        <div class="flex-shrink-0 flex self-center">
          <UIcon aria-hidden="true" class=" h-5 w-5 text-green-400 dark:text-green-500" name="i-heroicons-check-circle"/>
        </div>
        <div class="ml-3">
          <p class="text-sm font-medium text-green-800 dark:text-green-300">{{ displayedMessage }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
const props = defineProps<{
  message?: string
}>()

const displayedMessage = props.message ?? 'All questions have been answered!'
</script>
