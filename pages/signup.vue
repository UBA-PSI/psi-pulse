<template>
  <div class="h-screen flex items-center justify-center text-center sm:-mb-48 -mb-20 -mt-8">
    <CustomCard>
      <h1 class="mt-4 mb-10 text-center text-3xl font-bold leading-9 tracking-tight text-gray-900 dark:text-white">
        Sign Up
      </h1>
      <UForm ref="form" :state="state" :validate="validate" class="space-y-4 w-80" @submit="onSubmit">
        <UFormField label="How do you want to be called? (optional)" name="name">
          <UInput v-model="state.name" icon="i-heroicons-user" placeholder="John"/>
        </UFormField>
        <UFormField label="Email" name="email">
          <UInput v-model="state.email" icon="i-heroicons-envelope" placeholder="you@example.com"/>
        </UFormField>
        <UButton :loading="loading" block type="submit">
          Sign Up
        </UButton>
      </UForm>
      <div class="mt-10">
        Already have an account?
        <NuxtLink class="text-primary underline" to="/login">Log in</NuxtLink>
      </div>
    </CustomCard>
  </div>
</template>

<script lang="ts" setup>
import {FetchError} from "ofetch";
import type {FormError, FormSubmitEvent} from "@nuxt/ui";

useHead({
  title: 'Signup'
})

// Angemeldet gibt es hier nichts zu tun: gleich zum Dashboard (die globale Middleware hat den Nutzer schon geladen).
definePageMeta({
  layout: "not-authenticated",
  middleware: () => {
    if (useUser().value) return navigateTo("/home", {replace: true});
  },
});

const validate = (state: any): FormError[] => {
  const errors = []
  if (!state.email) errors.push({name: 'email', message: 'Required'})
  return errors
}
const state = reactive({
  email: undefined,
  name: undefined,
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
        email: event.data.email
      },
      redirect: "manual"
    });
    await navigateTo("/email-verification");
  } catch (e) {
    const err = e as FetchError;
    const message = err.response?._data?.message
    form.value?.setErrors([{name: message === "Invalid name" ? "name" : "email", message}])
  }
  loading.value = false
}
</script>
