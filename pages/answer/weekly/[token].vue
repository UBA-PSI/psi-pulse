<template>
  <QuestionsStackHeadline :offset="questionOffset" :questions="flatQuestions" title="Remaining Questions"/>
  <div v-if="flatQuestions">
    <div v-if="questionOffset < flatQuestions.length">
      <Question :getUpdateUrl="getUpdateUrl"
                :nextQuestion="nextQuestion"
                :question="flatQuestions[questionOffset]"
      />
    </div>
    <div v-else>
      <AllAnswered/>
      <div v-if="streakHold != null">
        <div v-if="streakHold > 0">
          <div class="mx-auto max-w-xl px-4 sm:px-6 lg:px-8">
            <div class="rounded-md bg-green-50 p-4">
              <div class="flex">
                <div class="flex-shrink-0">
                  <UIcon aria-hidden="true" class="h-5 w-5 text-green-400" name="i-heroicons-check-circle"/>
                </div>
                <div class="ml-3">
                  <p class="text-sm font-medium text-green-800">
                    Congrats! You answered your weekly question in time. Your weekly streak is now {{ streakHold }}.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else>
          <div class="mx-auto max-w-xl px-4  sm:px-6 lg:px-8">
            <div class="rounded-md bg-yellow-50 p-4">
              <div class="flex">
                <div class="flex-shrink-0">
                  <UIcon aria-hidden="true" class="h-5 w-5 text-yellow-400" name="i-heroicons-exclamation-triangle"/>
                </div>
                <div class="ml-3">
                  <p class="text-sm font-medium text-yellow-800">
                    Oh no! You didn't answer your weekly question in time
                    and lost your {{ streakHold }} streak. Hurry up and answer your next weekly question in time to get
                    it back!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <LoadingPlaceholder v-else/>
    </div>
  </div>

  <LoadingPlaceholder v-else-if="!errorMessage"/>
  <ExternalErrorAlert v-if="errorMessage" :errorMessage="errorMessage"/>
</template>
<script lang="ts" setup>
import {onMounted} from "@vue/runtime-core";
import type {InternalQuestion} from "~/types/questions/internal";
import {FetchError} from "ofetch";
import QuestionsStackHeadline from "~/components/questionsStackHeadline.vue";

useHead({
  title: 'Answer Weekly'
})

definePageMeta({
  layout: "not-authenticated",
});

const route = useRoute();
let errorMessage = ref<string | null>(null);
const flatQuestions = ref<InternalQuestion[] | null>(null)
const questionOffset = ref(0)
const streakHold = ref<number | null>(null)

onMounted(async () => {
  if (!route.params.token) {
    errorMessage.value = "No token provided";
    return;
  }
  try {
    flatQuestions.value = await $fetch(`/api/weekly/${route.params.token}`)
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
  if (questionOffset.value >= flatQuestions.value.length) {
    weeklyCompleted()
  }
}

const getUpdateUrl = (questionId: string) => {
  return `/api/answer/${questionId}?token=${route.params.token}&tokenType=weekly`
}

const weeklyCompleted = async () => {
  streakHold.value = await $fetch(`/api/weekly/${route.params.token}`, {
    method: "put",
  })
}
</script>
