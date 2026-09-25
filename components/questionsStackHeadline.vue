<template>
  <div class="mx-auto max-w-xl px-4 pt-24 sm:px-6 lg:px-8 flex justify-between items-center">
    <div class="flex">
      <h1 class="text-base font-semibold leading-7 dark:text-white">{{ title }}</h1>
      <UPopover v-if="explanation != null" :ui="{wrapper: 'flex items-center'}" mode="hover">
        <UIcon class="ml-4" name="i-heroicons-information-circle"/>
        <template #panel>
          <div class="p-4 max-w-sm">
            {{ explanation }}
          </div>
        </template>
      </UPopover>
    </div>
    <span v-if="questions && questions.length > 0 && questions.length >= offset + 1"
          class="text-sm text-gray-500 dark:text-gray-400">{{ offset + 1 }} / {{ questions.length }}</span>
  </div>
</template>

<script lang="ts" setup>
const props = defineProps<{
  title: string
  questions: any[] | null
  offset: number
  explanation?: string
}>()
</script>
