<template>
  <!-- Ohne Schuldzuweisung: neutral statt rot (Regeln: userStats.vue) -->
  <UBadge v-if="activeState === 'NEGLECTED'" class="whitespace-nowrap h-6 text-gray-700 dark:text-gray-200" color="neutral" variant="subtle">
    {{ t.badgeNeglected }}
  </UBadge>
  <UBadge v-else-if="activeState === 'PENDING'" class="whitespace-nowrap h-6 text-gray-700 dark:text-gray-200" color="neutral" variant="subtle">
    {{ t.badgePending }}
  </UBadge>
  <UBadge v-else-if="activeState === 'ACTIVE'" class="whitespace-nowrap h-6 text-green-700" color="success" variant="subtle">
    {{ t.badgeActive(daysSince) }}
  </UBadge>
</template>

<script lang="ts" setup>
import {QuestionActiveState} from "~/types/questions/internal";

const props = defineProps<{
  activeState: QuestionActiveState
  activeSince: string | null
}>()
const t = useUiText()

const daysSince = computed(() => {
  const today = new Date();
  let pastDate = new Date();
  if (props.activeSince) {
    pastDate = new Date(props.activeSince);
  }
  const differenceInMilliseconds = today.getTime() - pastDate.getTime();
  return Math.floor(differenceInMilliseconds / (1000 * 60 * 60 * 24));
})


</script>
