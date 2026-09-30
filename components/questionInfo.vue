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
        <UDropdownMenu :items="items" :content="{ side: 'bottom', align: 'start' }">
          <UButton :aria-label="t.questionActions" color="neutral" label="" size="xs" trailing-icon="i-heroicons-ellipsis-vertical" variant="ghost"/>
        </UDropdownMenu>
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
            {{ t.showAnswer }}
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

const t = useUiText()
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

const items = computed(() => [
  [{
    label: t.value.archive,
    icon: 'i-heroicons-archive-box-20-solid',
    onSelect: () => {
      archiveQuestion()
    }
  }, {
    label: t.value.viewPage,
    icon: 'i-heroicons-arrow-top-right-on-square-solid',
    // ohne gültige Adresse (z. B. Frage aus einer lokalen Datei) nicht anklickbar
    disabled: pageLink(props.question.pageUrl, props.question.hash) === null,
    onSelect: () => {
      openPageLink(props.question.pageUrl, props.question.hash)
    }
  }]
])
</script>
