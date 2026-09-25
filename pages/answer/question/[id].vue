<template>
  <QuestionsStackHeadline :offset="0" :questions="null" title="Question"/>
  <div v-if="question">
    <div v-if="!answered">
      <Question :getUpdateUrl="getUpdateUrl"
                :nextQuestion="nextQuestion"
                :question="question"
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
import type {InternalQuestion} from "~/types/questions/internal";
import QuestionsStackHeadline from "~/components/questionsStackHeadline.vue";
import LoadingPlaceholder from "~/components/loadingPlaceholder.vue";

useHead({
  title: 'Answer Page'
})

definePageMeta({
  layout: "not-authenticated",
});

const route = useRoute();
let question = ref<InternalQuestion | null>(null);
let errorMessage = ref<string | null>(null);
const answered = ref(false)

onMounted(async () => {
  if (!route.query.token) {
    errorMessage.value = "No token provided";
    return;
  }
  try {
    question.value = await $fetch(`/api/questions/${route.params.id}?token=${route.query.token}&archived=false&open=true`)
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
  answered.value = true
}

const getUpdateUrl = (questionId: string) => {
  return `/api/answer/${questionId}?token=${route.query.token}&tokenType=question`
}
</script>
