<template>
  <div class="flex flex-col min-h-screen">
    <main class="flex-grow">
      <slot/>
    </main>
    <FooterBar/>
  </div>
</template>

<script lang="ts" setup>
import {Dialog, DialogPanel} from '@headlessui/vue'


const navigationHeader = [
  {name: 'Home', href: '/'},
  {name: 'Questions', href: '/questions'}
]

const mobileMenuOpen = ref(false)

const handleLogout = async () => {
  await $fetch("/api/logout", {
    method: "POST",
    redirect: "manual"
  });
  await navigateTo("/login");
};

const settings = async () => {
  await navigateTo("/settings");
};

const user = useAuthenticatedUser();

const colorMode = useColorMode()

const isDark = computed({
  get() {
    return colorMode.value === 'dark'
  },
  set() {
    colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
  }
})
</script>
