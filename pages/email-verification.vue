<template>
  <div class="h-screen flex items-center justify-center text-center -mb-48">
    <CustomCard>
      <h1 class="mt-4 mb-10 text-center text-3xl font-bold leading-9 tracking-tight text-gray-900 dark:text-white">
        Email Verification
      </h1>
      Please check your email for a verification link.
    </CustomCard>
  </div>
</template>

<script lang="ts" setup>
useHead({
  title: 'Email Verification'
})

definePageMeta({
  layout: "not-authenticated",
});

onMounted(async () => {
  const url = (window.location != window.parent.location)
      ? document.referrer
      : undefined;
  console.log(url)
  if (url) {
    const pollToken = setInterval(async () => {
      try {
        const token = await $fetch('/api/v1/foreignSession')

        window.parent.postMessage(token, url);
        clearInterval(pollToken);
      } catch (e) {
      }
    }, 1000);
  }
});
</script>
