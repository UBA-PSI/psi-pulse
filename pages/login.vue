<template>
  <div class="h-screen flex items-center justify-center text-center sm:-mb-48 -mb-20 -mt-8">
    <CustomCard>
      <h1 class="mt-4 mb-10 text-center text-3xl font-bold leading-9 tracking-tight text-gray-900 dark:text-white">
        Log In
      </h1>
      <UForm ref="form" :state="state" :validate="validate" class="space-y-4 w-80" @submit="onSubmit">
        <UFormGroup label="Email" name="email">
          <UInput v-model="state.email" icon="i-heroicons-envelope" placeholder="you@example.com"/>
        </UFormGroup>
        <UButton :loading="loading" block type="submit">
          Login
        </UButton>
      </UForm>
      <div class="mt-10">
        Not a member?
        <NuxtLink class="text-primary" to="/signup">Sign up</NuxtLink>
      </div>
    </CustomCard>
  </div>
</template>

<script lang="ts" setup>
import {FetchError} from "ofetch";
import type {FormError, FormSubmitEvent} from "#ui/types";

useHead({
  title: 'Login'
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
const state = reactive({
  email: undefined,
})

const validate = (state: any): FormError[] => {
  const errors = []
  if (!state.email) errors.push({path: 'email', message: 'Required'})
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
    form.value?.setErrors([{"path": "email", "message": err.response._data.message}])
  }
  loading.value = false
}

</script>
