<template>
<AllAnswered message="You successfully unsubscribed." />
</template>

<script lang="ts" setup>
useHead({
  title: 'Success'
})

definePageMeta({
  layout: "not-authenticated",
});
</script>
