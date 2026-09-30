<template>
  <UserStats :stats="stats"/>
  <Questions/>
</template>

<script lang="ts" setup>
import UserStats from "~/components/userStats.vue";
import type {AccountStats} from "~/types/account";

useHead({
  title: 'Home'
})

definePageMeta({
  middleware: ["protected"],
});

const stats = ref<AccountStats | null>(null);

onMounted(async () => {
  stats.value = await $fetch("/api/account/stats");
});
</script>
