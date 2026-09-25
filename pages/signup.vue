<template>
  <div class="h-screen flex items-center justify-center text-center sm:-mb-48 -mb-20 -mt-8">
    <CustomCard>
      <h1 class="mt-4 mb-10 text-center text-3xl font-bold leading-9 tracking-tight text-gray-900 dark:text-white">
        Sign Up
      </h1>
      <UForm ref="form" :state="state" :validate="validate" class="space-y-4 w-80" @submit="onSubmit">
        <UFormGroup label="How do want to be called?" name="name">
          <UInput v-model="state.name" icon="i-heroicons-user" placeholder="John"/>
        </UFormGroup>
        <UFormGroup label="Email" name="email">
          <UInput v-model="state.email" icon="i-heroicons-envelope" placeholder="you@example.com"/>
        </UFormGroup>
        <div class="flex items-center justify-between sm:col-span-6 just">
                  <span class="flex flex-grow flex-col text-left">
                    <span class="block font-medium text-gray-700 dark:text-gray-200 text-sm">Statistics</span>
                    <span
                        class="text-sm text-gray-500">Collect usage data to enable more comprehensive analysis. <nuxt-link
                        class="text-sm text-primary" to="/privacy-policy">Learn more</nuxt-link></span>
                  </span>
          <UToggle v-model="state.logQuestions"/>
        </div>
        <UButton :loading="loading" block type="submit">
          Sign Up
        </UButton>
      </UForm>
      <div class="mt-10">
        Already a member?
        <NuxtLink class="text-primary" to="/login">Log in</NuxtLink>
      </div>
    </CustomCard>
  </div>
</template>

<script lang="ts" setup>
import {FetchError} from "ofetch";
import type {FormError, FormSubmitEvent} from "#ui/types";

useHead({
  title: 'Signup'
})

definePageMeta({
  layout: "not-authenticated",
});

const user = useUser();
onMounted(async () => {
  if (user.value) {
    const token = await $fetch('/api/v1/foreignSession')
    const url = (window.location != window.parent.location)
        ? document.referrer
        : document.location.href;
    window.parent.postMessage(token, url);
    await navigateTo("/");
  }
});

const validate = (state: any): FormError[] => {
  const errors = []
  if (!state.email) errors.push({path: 'email', message: 'Required'})
  if (!state.name) errors.push({path: 'name', message: 'Required'})
  return errors
}
const state = reactive({
  email: undefined,
  name: undefined,
  logQuestions: false
})
const loading = ref(false)
const form = ref()


async function onSubmit(event: FormSubmitEvent<any>) {
  loading.value = true
  try {
    await $fetch("/api/signup", {
      method: "POST",
      body: {
        name: event.data.name,
        email: event.data.email,
        logQuestions: event.data.logQuestions
      },
      redirect: "manual"
    });
    await navigateTo("/email-verification");
  } catch (e) {
    const err = e as FetchError;
    form.value?.setErrors([{"path": "email", "message": err.response._data.message}])
  }
  loading.value = false
}
</script>
