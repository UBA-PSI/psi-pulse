<template>
  <div class="mt-8 flex justify-center">
    <div class="flex justify-between max-w-2xl w-full items-center">
      Do you really want to unsubscribe from all emails?
      <UButton color="red" @click="handleUnsubscribe">
        Unsubscribe
      </UButton>
      <div v-if="errorMessage">
        <div>{{ errorMessage }}</div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import {FetchError} from "ofetch";

useHead({
  title: 'Unsubscribe From Emails'
})

definePageMeta({
  layout: "not-authenticated",
});


const route = useRoute();
let errorMessage = ref<string | null>(null);

const handleUnsubscribe = async () => {
  try {
    await $fetch(`/api/unsubscribe/emails/${route.params.token}`, {
      method: "DELETE"
    })
    await navigateTo("/unsubscribe/success");
  } catch (e) {
    const err = e as FetchError;
    if (err.response == undefined) {
      errorMessage.value = "Unknown error"
      return
    }
    errorMessage.value = err.response._data.message
  }
}
</script>
