<template>
  <div>
    <QuestionsStackHeadline :offset="questionOffset" :questions="flatQuestions" explanation="A question is ready to be answered again (is open) when the time set for reviewing it, based on your previous answers, has passed."
                            title="Open Questions"/>
    <div v-if="flatQuestions">
      <div v-if="questionOffset < flatQuestions.length">
        <Question
            :getUpdateUrl="getUpdateUrl"
            :nextQuestion="nextQuestion"
            :question="flatQuestions[questionOffset]"
        />
      </div>
      <AllAnswered v-else/>
    </div>
    <LoadingPlaceholder v-else/>
  </div>
</template>

<script lang="ts" setup>
import {onMounted} from "@vue/runtime-core";
import LoadingPlaceholder from "~/components/loadingPlaceholder.vue";
import type {InternalQuestion} from "~/types/questions/internal";
import QuestionsStackHeadline from "~/components/questionsStackHeadline.vue";

const questionOffset = ref(0)

const flatQuestions = ref<InternalQuestion[] | null>(null)

onMounted(async () => {
  flatQuestions.value = await $fetch<InternalQuestion[]>('/api/questions?open=true&archived=false')
})

const nextQuestion = () => {
  questionOffset.value += 1
}

const getUpdateUrl = (questionId: string) => {
  return `/api/questions/${questionId}`
}
</script>

