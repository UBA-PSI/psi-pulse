<template>
  <div class="mx-auto max-w-xl px-4 py-8 sm:px-6 lg:px-8">
    <CustomCard>
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
          <div v-if="answered ===null">
            <p class="text-center">{{ question.answer }}</p>
            <div class="flex gap-x-6 mt-6">
              <UButton block class="flex-1" icon="i-heroicons-x-mark"
                       @click="updateQuestion(false)" @mouseout="resetAimedAnswer()"
                       @mouseover="setAimedAnswer(false)">
                {{ t.forgotten }}
              </UButton>
              <UButton block class="flex-1" icon="i-heroicons-check"
                       @click="updateQuestion(true)" @mouseout="resetAimedAnswer()"
                       @mouseover="setAimedAnswer(true)">
                {{ t.remembered }}
              </UButton>
            </div>
          </div>
          <div v-else>
            <p class="text-center" role="status">{{ t.submitted }}</p>
          </div>
        </div>
        <div v-else class="flex items-center justify-center">
          <div class="flex-1"></div>
          <div>
            <UButton @click="showAnswer = true">
              {{ t.showAnswer }}
            </UButton>
          </div>
          <div class="flex-1 grid justify-items-end">
            <UButton class="" variant="soft" @click="nextQuestion">{{ t.skip }}</UButton>
          </div>
        </div>
      </div>
      <div v-if="showAnswer" class="border-t border-gray-900/10 dark:border-white/10 px-4 py-4 sm:px-6">
        <QuestionProgress :aimed-answer="aimedAnswer" :question="question"/>
      </div>
    </CustomCard>
  </div>
</template>
<script lang="ts" setup>

import type {SimpleQuestionUpdate} from "~/types/questions/questions";
import type {InternalQuestion} from "~/types/questions/internal";

const props = defineProps<{
  question: InternalQuestion,
  nextQuestion: () => void
  getUpdateUrl: (questionId: string) => string
}>()

const t = useUiText()
const showAnswer = ref(false)
const toast = useToast()
const answered = ref<boolean | null>(null)

const updateQuestion = async (remembered: boolean) => {
  const body: SimpleQuestionUpdate = {
    remembered: remembered,
    archived: null
  }
  await $fetch(props.getUpdateUrl(props.question.id), {
    method: "PUT",
    body: body
  })

  answered.value = remembered
  await new Promise(resolve => setTimeout(resolve, 500));
  showAnswer.value = false
  props.nextQuestion()
  answered.value = null
}

const archiveQuestion = async () => {
  const body: SimpleQuestionUpdate = {
    remembered: null,
    archived: true
  }
  await $fetch(props.getUpdateUrl(props.question.id), {
    method: "PUT",
    body: body
  })
  toast.add({
    title: t.value.archivedTitle(props.question.question),
    description: t.value.archivedText,
    icon: "i-heroicons-archive-box",
  })
  showAnswer.value = false
  props.nextQuestion()
  answered.value = null
}

const aimedAnswer = ref<boolean | null>(null)

const resetAimedAnswer = () => {
  aimedAnswer.value = null
}

const setAimedAnswer = (remembered: boolean) => {
  aimedAnswer.value = remembered
}

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
