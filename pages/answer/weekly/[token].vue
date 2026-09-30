<template>
  <QuestionsStackHeadline :offset="questionOffset" :questions="flatQuestions" :title="t.weeklyHeading"/>
  <div v-if="flatQuestions">
    <div v-if="questionOffset < flatQuestions.length">
      <Question :getUpdateUrl="getUpdateUrl"
                :nextQuestion="nextQuestion"
                :question="flatQuestions[questionOffset]"
      />
    </div>
    <div v-else>
      <AllAnswered v-if="streak != null" :message="t.weeklyDone(streak)"/>
      <AllAnswered v-else-if="completeFailed"/>
      <LoadingPlaceholder v-else/>
    </div>
  </div>

  <LoadingPlaceholder v-else-if="!errorMessage"/>
  <ExternalErrorAlert v-if="errorMessage" :errorMessage="errorMessage"/>
  <ResearchInvite kind="weekly" :token="String(route.params.token)"
                  :visible="!!flatQuestions && questionOffset >= flatQuestions.length"/>
</template>
<script lang="ts" setup>
import {onMounted} from "@vue/runtime-core";
import type {InternalQuestion} from "~/types/questions/internal";
import QuestionsStackHeadline from "~/components/questionsStackHeadline.vue";

definePageMeta({
  layout: "not-authenticated",
});

const route = useRoute();
const t = useUiText()
useHead({title: computed(() => t.value.weeklyTitle)})
// Sprache des Kontos über das Token aus der Mail, sonst ?lang= bzw. Accept-Language
await useAnswerPageLang({kind: "weekly", token: String(route.params.token ?? "")})

let errorMessage = ref<string | null>(null);
const flatQuestions = ref<InternalQuestion[] | null>(null)
const questionOffset = ref(0)
// Wochenserie nach dem Abschließen (weekly/[token].put.ts zählt sie hoch; sachlich melden, ohne Druck)
const streak = ref<number | null>(null)
const completeFailed = ref(false)

onMounted(async () => {
  if (!route.params.token) {
    errorMessage.value = t.value.linkInvalid;
    return;
  }
  try {
    flatQuestions.value = await $fetch(`/api/weekly/${route.params.token}`)
    // Alle Fragen inzwischen archiviert: nichts zu beantworten, sonst bliebe die Seite beim Laden stehen
    if (flatQuestions.value && flatQuestions.value.length === 0) await weeklyCompleted()
  } catch (e) {
    errorMessage.value = answerErrorText(e, t.value)
  }
})

const nextQuestion = () => {
  if (flatQuestions.value == null) return
  questionOffset.value += 1
  if (questionOffset.value >= flatQuestions.value.length) {
    weeklyCompleted()
  }
}

const getUpdateUrl = (questionId: string) => {
  return `/api/answer/${questionId}?token=${route.params.token}&tokenType=weekly`
}

const weeklyCompleted = async () => {
  try {
    streak.value = await $fetch<number>(`/api/weekly/${route.params.token}`, {
      method: "put",
    })
  } catch {
    completeFailed.value = true
  }
}
</script>
