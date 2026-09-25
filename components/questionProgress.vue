<template>
  <nav aria-label="Progress">
    <ol class="flex items-center  justify-between w-full mb-6 px-4 pr-8" role="list">
      <li v-for="(step, stepIdx) in steps" :key="step.label"
          :style="calculateStepStyle(stepIdx, steps.length)"
          class="relative flex flex-col items-center">
        <template v-if="step.state === 'LEAVING'">
          <div aria-hidden="true" class="absolute inset-0 flex items-center">
            <div class="h-0.5 w-full bg-primary"/>
          </div>
          <span class="relative flex h-5 w-5 items-center justify-center rounded-full bg-primary">
            <UIcon aria-hidden="true" class="h-3 w-3 text-white" name="i-heroicons-check"/>
            <span class="sr-only">{{ step.label }}</span>
          </span>
        </template>
        <template v-else-if="step.state === 'REACHED'">
          <div aria-hidden="true" class="absolute inset-0 flex items-center">
            <div class="h-0.5 w-full bg-gray-900/10 dark:bg-white/10"/>
          </div>
          <span class="relative flex h-5 w-5 items-center justify-center rounded-full bg-primary">
            <UIcon aria-hidden="true" class="h-3 w-3 text-white" name="i-heroicons-check"/>
            <span class="sr-only">{{ step.label }}</span>
          </span>
        </template>
        <template v-else-if="step.state === 'UNCERTAIN'">
          <div aria-hidden="true" class="absolute inset-0 flex items-center">
            <div class="h-0.5 w-full bg-gray-900/10 dark:bg-white/10"/>
          </div>
          <span aria-current="step"
                class="relative flex h-5 w-5 items-center justify-center rounded-full border-2 border-primary bg-white dark:bg-gray-900">
            <span aria-hidden="true" class="h-2.5 w-2.5 rounded-full bg-primary"/>
            <span class="sr-only">{{ step.label }}</span>
          </span>
        </template>
        <template v-else>
          <div aria-hidden="true" class="absolute inset-0 flex items-center">
            <div class="h-0.5 w-full bg-gray-900/10 dark:bg-white/10"/>
          </div>
          <span
              class="group relative flex h-5 w-5 items-center justify-center rounded-full border-2 border-gray-900/10 dark:border-white/10 bg-white dark:bg-gray-900">
            <span aria-hidden="true" class="h-2.5 w-2.5 rounded-full bg-transparent "/>
            <span class="sr-only">{{ step.label }}</span>
          </span>
        </template>
        <span class="fixed mt-6">
          <span aria-current="step" class="block text-sm font-medium text-gray-900 dark:text-white">{{
              step.label
            }}</span>
        </span>
      </li>
    </ol>
  </nav>
</template>

<script lang="ts" setup>
import type {ProgressState} from "~/types/questions/questions.js";
import {ProgressQuestionStateEn} from "~/types/questions/questions.js";
import type {InternalQuestion} from "~/types/questions/internal";

const props = defineProps<{
  aimedAnswer: boolean | null,
  question: InternalQuestion
}>()

function calculateStepStyle(stepIdx: number, stepsLength: number) {
  const stepPercentage = 100 / stepsLength;
  let offset = "0.5rem"
  if (stepsLength === 3) {
    offset = "-2.45rem"
  } else if (stepsLength === 4) {
    offset = "-0.5rem"
  } else if (stepsLength === 5) {
    offset = "0.3rem"
  }
  return stepIdx !== stepsLength - 1
      ? `padding-right: calc(${stepPercentage}% - ${offset})`
      : '';
}


const steps: ComputedRef<ProgressState[]> = computed(() => {
  const steps: ProgressState[] = []
  for (let i = 0; i < props.question.states.length; i++) {
    const state = props.question.states[i]
    const nextState = props.question.states[i + 1]
    const previousState = props.question.states[i - 1]
    let currentState = ProgressQuestionStateEn.NOT_REACHED
    if (nextState) {
      if (props.question.waitingForRemembered) {
        if (state.reached && !nextState.reached) {
          if (props.aimedAnswer === null) {
            currentState = ProgressQuestionStateEn.UNCERTAIN
          } else if (props.aimedAnswer) {
            currentState = ProgressQuestionStateEn.REACHED
          } else {
            currentState = ProgressQuestionStateEn.NOT_REACHED
          }
        } else {
          const nextNextState = props.question.states[i + 2]
          if (state.reached && nextNextState !== undefined && (props.aimedAnswer === null || props.aimedAnswer)) {
            currentState = ProgressQuestionStateEn.LEAVING
          } else if (state.reached && nextNextState.reached) {
            currentState = ProgressQuestionStateEn.LEAVING
          } else if (state.reached && i + 1 < props.question.states.length - 1) {
            currentState = ProgressQuestionStateEn.REACHED
          } else {
            if (previousState === undefined && !state.reached) {
              if (props.aimedAnswer === null) {
                currentState = ProgressQuestionStateEn.UNCERTAIN
              } else if (props.aimedAnswer) {
                currentState = ProgressQuestionStateEn.REACHED
              } else {
                currentState = ProgressQuestionStateEn.NOT_REACHED
              }
            }
          }
        }
      } else {
        // if INITIAL
        if (previousState === undefined && !state.reached) {
          if (props.aimedAnswer === null) {
            currentState = ProgressQuestionStateEn.UNCERTAIN
          } else if (props.aimedAnswer) {
            currentState = ProgressQuestionStateEn.REACHED
          } else {
            currentState = ProgressQuestionStateEn.NOT_REACHED
          }
        } else if (!state.reached && previousState.reached && props.aimedAnswer === null) {
          currentState = ProgressQuestionStateEn.NOT_REACHED
        } else if (!state.reached && previousState.reached && props.aimedAnswer === true) {
          currentState = ProgressQuestionStateEn.REACHED
        } else if (state.reached && (props.aimedAnswer === null || props.aimedAnswer || (nextState.reached && i + 1 < props.question.states.length - 1))) {
          currentState = ProgressQuestionStateEn.LEAVING
        } else if (state.reached && (props.aimedAnswer === false)) {
          currentState = ProgressQuestionStateEn.REACHED
        }
      }
    } else {
      if (props.aimedAnswer && previousState.reached && !props.question.waitingForRemembered) {
        currentState = ProgressQuestionStateEn.REACHED
      } else if (props.aimedAnswer === false) {
        currentState = ProgressQuestionStateEn.NOT_REACHED
      } else if (previousState.reached && state.reached) {
        currentState = ProgressQuestionStateEn.UNCERTAIN
      }
    }
    steps.push({
      label: state.label,
      state: currentState
    })
  }
  // console.log(steps)
  return steps
})


</script>
