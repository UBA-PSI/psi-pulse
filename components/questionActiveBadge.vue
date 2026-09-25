<template>
  <UBadge v-if="activeState === 'NEGLECTED'" class="whitespace-nowrap h-6" color="red" variant="subtle">
    Neglected
  </UBadge>
  <UBadge v-else-if="activeState === 'PENDING'" class="whitespace-nowrap h-6" color="orange" variant="subtle">
    Pending
  </UBadge>
  <UBadge v-else-if="activeState === 'ACTIVE'" class="whitespace-nowrap h-6" color="green" variant="subtle">
    Active for {{ daysSince }} days
  </UBadge>
</template>

<script lang="ts" setup>
import {QuestionActiveState} from "~/types/questions/internal";

const props = defineProps<{
  activeState: QuestionActiveState
  activeSince: string | null
}>()

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
