<template>
  <div class="overflow-hidden rounded-lg ">
    <div class="border-b border-gray-900/10 dark:border-white/10 px-4 py-5 sm:px-6">
      <div class="flex justify-between text-sm text-gray-500 dark:text-gray-400">
        <p v-if="question.groupName === 'no-group'">
          {{ question.pageName }}
        </p>
        <p v-else>
          {{ question.pageName }} – {{ question.groupName }}
        </p>
        <UDropdown :items="items" :popper="{ placement: 'bottom-start' }">
          <UButton color="white" label="" size="2xs" trailing-icon="i-heroicons-ellipsis-vertical" variant="ghost"/>
        </UDropdown>
      </div>
      <div class="flex justify-between mt-1">
        <h2 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
          {{ question.question }}
        </h2>
        <QuestionActiveBadge :active-since="question.activeSince" :active-state="question.activeState"/>
      </div>
    </div>
    <div class="px-4 py-5 sm:p-6">
      <div v-if="showAnswer">
        <p class="text-center">{{ question.answer }}</p>
      </div>
      <div v-else class="flex items-center justify-center">
        <div>
          <UButton @click="showAnswer = true">
            Show Answer
          </UButton>
        </div>
      </div>
    </div>
    <div v-if="showAnswer" class="border-t border-gray-900/10 dark:border-white/10 px-4 py-4 sm:px-6">
      <QuestionProgress :aimed-answer="aimedAnswer" :question="question"/>
    </div>
  </div>
</template>
<script lang="ts" setup>

import type {SimpleQuestionUpdate} from "~/types/questions/questions";
import type {InternalQuestion} from "~/types/questions/internal";

const props = defineProps<{
  question: InternalQuestion,
  afterArchive: () => void
}>()

const showAnswer = ref(false)


const archiveQuestion = async () => {
  props.question.archived = true
  const body: SimpleQuestionUpdate = {
    remembered: null,
    archived: true
  }
  await $fetch(`/api/questions/${props.question.id}`, {
    method: "PUT",
    body: body
  })
  props.afterArchive()
}

const aimedAnswer = ref<boolean | null>(null)

const items = [
  [{
    label: 'Archive',
    icon: 'i-heroicons-archive-box-20-solid',
    click: () => {
      archiveQuestion()
    }
  }, {
    label: 'View Page',
    icon: 'i-heroicons-arrow-top-right-on-square-solid',
    click: () => {
      window.open(props.question.pageUrl + '#' + props.question.hash, '_blank')
    }
  }]
]
</script>
