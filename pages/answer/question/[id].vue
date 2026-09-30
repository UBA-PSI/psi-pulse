<template>
  <QuestionsStackHeadline :offset="0" :questions="null" :title="t.answerQuestionHeading"/>
  <div v-if="question">
    <div v-if="!answered">
      <Question :getUpdateUrl="getUpdateUrl"
                :nextQuestion="nextQuestion"
                :question="question"
      />
    </div>
    <AllAnswered v-else :message="t.questionDone"/>
  </div>
  <LoadingPlaceholder v-else-if="!errorMessage && !notDue"/>
  <AllAnswered v-if="notDue" :message="t.notDue"/>
  <ExternalErrorAlert v-if="errorMessage" :errorMessage="errorMessage"/>
</template>
<script lang="ts" setup>
import {onMounted} from "@vue/runtime-core";
import type {InternalQuestion} from "~/types/questions/internal";
import QuestionsStackHeadline from "~/components/questionsStackHeadline.vue";
import LoadingPlaceholder from "~/components/loadingPlaceholder.vue";

definePageMeta({
  layout: "not-authenticated",
});

const route = useRoute();
const t = useUiText()
useHead({title: computed(() => t.value.answerQuestionTitle)})
// Sprache des Kontos über das Token aus der Mail, sonst ?lang= bzw. Accept-Language
await useAnswerPageLang({kind: "question", id: String(route.params.id), token: String(route.query.token ?? "")})

let question = ref<InternalQuestion | null>(null);
let errorMessage = ref<string | null>(null);
const notDue = ref(false)
const answered = ref(false)

onMounted(async () => {
  if (!route.query.token) {
    errorMessage.value = t.value.linkInvalid;
    return;
  }
  try {
    question.value = await $fetch(`/api/questions/${route.params.id}?token=${route.query.token}&archived=false&open=true`)
    // null: Token stimmt, die Frage ist aber gerade nicht dran
    if (!question.value) notDue.value = true
  } catch (e) {
    errorMessage.value = answerErrorText(e, t.value)
  }
})

const nextQuestion = () => {
  answered.value = true
}

const getUpdateUrl = (questionId: string) => {
  return `/api/answer/${questionId}?token=${route.query.token}&tokenType=question`
}
</script>
