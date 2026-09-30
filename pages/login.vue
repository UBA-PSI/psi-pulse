<template>
  <div class="h-screen flex items-center justify-center text-center sm:-mb-48 -mb-20 -mt-8">
    <CustomCard>
      <h1 class="mt-4 mb-10 text-center text-3xl font-bold leading-9 tracking-tight text-gray-900 dark:text-white">
        Log In
      </h1>
      <UForm ref="form" :state="state" :validate="validate" class="space-y-4 w-80" @submit="onSubmit">
        <UFormField label="Email" name="email">
          <UInput v-model="state.email" icon="i-heroicons-envelope" placeholder="you@example.com"/>
        </UFormField>
        <UButton :loading="loading" block type="submit">
          Login
        </UButton>
      </UForm>
      <div class="mt-10">
        No account yet?
        <NuxtLink class="text-primary underline" to="/signup">Sign up</NuxtLink>
      </div>
    </CustomCard>
  </div>
</template>

<script lang="ts" setup>
import {FetchError} from "ofetch";
import type {FormError, FormSubmitEvent} from "@nuxt/ui";

useHead({
  title: 'Login'
})

// Angemeldet gibt es hier nichts zu tun: gleich zum Dashboard (die globale Middleware hat den Nutzer schon geladen).
definePageMeta({
  layout: "not-authenticated",
  middleware: () => {
    if (useUser().value) return navigateTo("/home", {replace: true});
  },
});

const state = reactive({
  email: undefined,
})

const validate = (state: any): FormError[] => {
  const errors = []
  if (!state.email) errors.push({name: 'email', message: 'Required'})
  return errors
}

const loading = ref(false)
const form = ref()

async function onSubmit(event: FormSubmitEvent<any>) {
  loading.value = true
  try {
    await $fetch("/api/login", {
      method: "POST",
      body: {
        email: event.data.email
      },
      redirect: "manual"
    });
    await navigateTo("/email-verification");
  } catch (e) {
    const err = e as FetchError;
    form.value?.setErrors([{"name": "email", "message": err.response._data.message}])
  }
  loading.value = false
}

</script>
