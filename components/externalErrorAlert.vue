<template>
  <div class="mx-auto max-w-xl px-4 py-8 sm:px-6 lg:px-8">
    <div class="rounded-md bg-red-50 p-4">
      <div class="flex">
        <div class="flex-shrink-0">
          <UIcon aria-hidden="true" class="h-5 w-5 text-red-400" name="i-heroicons-x-circle"/>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800">An error occurred</h3>
          <div class="mt-2 text-sm text-red-700">
            <p>{{ props.errorMessage }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
const props = defineProps<{
  errorMessage: string
}>()

</script>
