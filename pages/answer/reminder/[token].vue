<template>
  <QuestionsStackHeadline :offset="questionOffset" :questions="flatQuestions" title="Remaining Questions"/>
  <div v-if="flatQuestions">
    <div v-if="questionOffset < flatQuestions.length">
      <Question :getUpdateUrl="getUpdateUrl"
                :nextQuestion="nextQuestion"
                :question="flatQuestions[questionOffset]"
      />
    </div>
    <AllAnswered v-else/>
  </div>
  <LoadingPlaceholder v-else-if="!errorMessage"/>
  <ExternalErrorAlert v-if="errorMessage" :errorMessage="errorMessage"/>
</template>
<script lang="ts" setup>
import {onMounted} from "@vue/runtime-core";
import {FetchError} from "ofetch";
import LoadingPlaceholder from "~/components/loadingPlaceholder.vue";
import type {InternalQuestion} from "~/types/questions/internal";
import QuestionsStackHeadline from "~/components/questionsStackHeadline.vue";

useHead({
  title: 'Answer Page'
})

definePageMeta({
  layout: "not-authenticated",
});

const route = useRoute();
let errorMessage = ref<string | null>(null);
const flatQuestions = ref<InternalQuestion[] | null>(null)
const questionOffset = ref(0)

onMounted(async () => {
  if (!route.params.token) {
    errorMessage.value = "No token provided";
    return;
  }
  try {
    flatQuestions.value = await $fetch(`/api/reminder/${route.params.token}`)
  } catch (e) {
    const err = e as FetchError;
    if (err.response == undefined) {
      errorMessage.value = "Unknown error"
      return
    }
    errorMessage.value = err.response._data.message
  }
})

const nextQuestion = () => {
  if (flatQuestions.value == null) return
  questionOffset.value += 1
}

const getUpdateUrl = (questionId: string) => {
  return `/api/answer/${questionId}?token=${route.params.token}&tokenType=reminder`
}
</script>
