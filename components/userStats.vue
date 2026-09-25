<template>
  <div class="mx-auto max-w-7xl border border-gray-900/10 dark:border-white/10 rounded-xl overflow-auto mt-6 ">
    <div class="grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-4">
      <div v-for="stat in stats" :key="stat.name" class=" px-4 py-6 sm:px-6 lg:px-8">
        <div class="text-sm font-medium leading-6 text-gray-500 dark:text-gray-400 flex items-center">
          <p>{{ stat.name }}</p>
          <UPopover mode="hover" :ui="{wrapper: 'flex items-center'}">
            <UIcon  class="ml-4" name="i-heroicons-information-circle"/>
            <template #panel>
              <div class="p-4 max-w-sm">
                {{ stat.explanation }}
              </div>
            </template>
          </UPopover>
        </div>
        <p class="mt-2">
          <span v-if="stat.value != null" class="flex items-baseline gap-x-2">
              <span class="text-3xl font-semibold tracking-tight dark:text-white">
            {{ stat.value }}
          </span>
            <span v-if="stat.unit" class="text-sm text-gray-500 dark:text-gray-400">{{ stat.unit }}</span>
          </span>
          <span v-else class="flex items-baseline gap-x-2">
            <USkeleton class="h-9 w-12"/>
            <USkeleton class="h-4 w-8"/>
          </span>
        </p>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>

import type {AccountStats} from "~/types/account";


const props = defineProps<{
  stats: AccountStats | null
}>()

const activeRatio = computed(() => {
  if (props.stats === null) return 0
  if (props.stats.questions === 0) return 0
  if (props.stats.activeQuestion === 0) return 0
  const rel =  props.stats.activeQuestion / props.stats.questions * 100
  return Math.floor(rel)
})

const stats = computed(() => {
  if (props.stats === null) {
    return [
      {
        name: 'Added questions',
        value: null,
        unit: '',
        explanation: 'The number of questions you answered at least once. The more questions added to Pulse, the more you will remember.'
      },
      {
        name: 'Active questions',
        value: null,
        unit: '%',
        explanation: ' Active questions have been answered within their offset. For example, if a question has been reappeared seven days after it was answered the last time, you answered it within seven days. You should keep all your questions active.'
      },
      {
        name: 'Oldest active question',
        value: null,
        unit: 'days',
        explanation: 'Always try to keep your questions active for as long as possible. The longer you keep them active, the more you will remember them.'
      },
      {
        name: 'Outdoing yourself for',
        value: null,
        unit: 'weeks',
        explanation: 'Don\'t get lazy and always answer additional weekly questions within seven days. If you don\'t, you will lose your weekly streak.'
      },
    ]
  }
  return [
    {
      name: 'Added questions',
      value: props.stats.questions,
      unit: '',
      explanation: 'The number of questions you answered at least once. The more questions added to Pulse, the more you will remember.'
    },
    {
      name: 'Active questions',
      value: activeRatio.value,
      unit: '%',
      explanation: ' Active questions have been answered within their offset. For example, if a question has been reappeared seven days after it was answered the last time, you answered it within seven days. You should keep all your questions active.'
    },
    {
      name: 'Oldest active question',
      value: daysSince(props.stats.oldestQuestion),
      unit: 'days',
      explanation: 'Always try to keep your questions active for as long as possible. The longer you keep them active, the more you will remember them.'
    },
    {
      name: 'Outdoing yourself for',
      value: props.stats.weeklyStreak,
      unit: 'weeks',
      explanation: 'Don\'t get lazy and always answer additional weekly questions within seven days. If you don\'t, you will lose your weekly streak.'
    },
  ]
})

function daysSince(date: Date) {
  const today = new Date();
  const pastDate = new Date(date);
  const differenceInMilliseconds = today.getTime() - pastDate.getTime();
  return Math.floor(differenceInMilliseconds / (1000 * 60 * 60 * 24));
}


</script>
