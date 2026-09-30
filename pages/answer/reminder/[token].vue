<template>
  <QuestionsStackHeadline :offset="questionOffset" :questions="flatQuestions" :title="t.reminderTitle"/>
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
  <ResearchInvite kind="reminder" :token="String(route.params.token)"
                  :visible="!!flatQuestions && questionOffset >= flatQuestions.length"/>
</template>
<script lang="ts" setup>
import {onMounted} from "@vue/runtime-core";
import LoadingPlaceholder from "~/components/loadingPlaceholder.vue";
import type {InternalQuestion} from "~/types/questions/internal";
import QuestionsStackHeadline from "~/components/questionsStackHeadline.vue";

definePageMeta({
  layout: "not-authenticated",
});

const route = useRoute();
const t = useUiText()
useHead({title: computed(() => t.value.reminderTitle)})
// Sprache des Kontos über das Token aus der Mail, sonst ?lang= bzw. Accept-Language
await useAnswerPageLang({kind: "reminder", token: String(route.params.token ?? "")})

let errorMessage = ref<string | null>(null);
const flatQuestions = ref<InternalQuestion[] | null>(null)
const questionOffset = ref(0)

onMounted(async () => {
  if (!route.params.token) {
    errorMessage.value = t.value.linkInvalid;
    return;
  }
  try {
    flatQuestions.value = await $fetch(`/api/reminder/${route.params.token}`)
  } catch (e) {
    errorMessage.value = answerErrorText(e, t.value)
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
