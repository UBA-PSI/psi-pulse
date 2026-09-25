<template>
  <div class="flex flex-col min-h-screen">
    <header class="bg-white dark:bg-transparent">
      <nav aria-label="Global" class="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8">
        <div class="flex lg:flex-1">
          <nuxt-link class="-m-1.5 p-1.5" to="/">
            <span class="sr-only">Pulse</span>
            <img alt="" class="h-6 w-auto fill-red-300 dark:hidden" src="/logo.svg"/>
            <img alt="" class="h-6 w-auto fill-red-300 hidden dark:inline-block" src="/logo-dark.svg"/>
          </nuxt-link>
        </div>
        <div class="flex lg:hidden">
          <button class="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 " type="button"
                  @click="mobileMenuOpen = true">
            <span class="sr-only">Open main menu</span>
            <UIcon name="i-heroicons-bars-3"/>
          </button>
        </div>
        <div class="hidden lg:flex lg:gap-x-12">
          <nuxt-link v-for="item in navigationHeader" :key="item.name" :target="item.target" :to="item.href"
                     active-class="text-primary"
                     class="dark:text-white text-sm font-semibold leading-6 text-gray-900">{{ item.name }}
          </nuxt-link>
        </div>
        <div class="hidden lg:flex lg:flex-1 lg:justify-end">
          <UButton
              :icon="'i-heroicons-code-bracket'"
              aria-label="Integration"
              color="gray"
              target="_blank"
              to="/integrate" variant="ghost"
          />
          <ClientOnly>
            <UButton
                :icon="isDark ? 'i-heroicons-moon-20-solid' : 'i-heroicons-sun-20-solid'"
                aria-label="Theme"
                color="gray"
                variant="ghost"
                @click="isDark = !isDark"
            />

            <template #fallback>
              <div class="w-8 h-8"/>
            </template>

            <UDropdown :items="items" :popper="{ placement: 'bottom-start' }"
                       :ui="{ item: { disabled: 'cursor-text select-text' }, background: 'dark:bg-gray-900'  }">
              <UButton
                  aria-label="Theme"
                  color="gray"
                  icon="i-heroicons-user"
                  variant="ghost"
              />
              <template #account="{ item }">
                <div class="text-left">
                  <p>
                    Signed in as
                  </p>
                  <p class="max-w-40 truncate font-medium text-gray-900 dark:text-white">
                    {{ item.label }}
                  </p>
                </div>
              </template>

              <template #item="{ item }">
                <span class="truncate">{{ item.label }}</span>
                <UIcon :name="item.icon" class="flex-shrink-0 h-4 w-4 text-gray-400 dark:text-gray-500 ms-auto"/>
              </template>
            </UDropdown>
          </ClientOnly>
        </div>
      </nav>
      <ClientOnly>
        <Dialog :open="mobileMenuOpen" as="div" class="lg:hidden" @close="mobileMenuOpen = false">
          <div class="fixed inset-0 z-10"/>
          <DialogPanel
              class="fixed inset-y-0 right-0 z-10 w-full overflow-y-auto bg-white dark:bg-gray-900 px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
            <div class="flex items-center justify-between">
              <a class="-m-1.5 p-1.5" href="#">
                <span class="sr-only">Pulse</span>
                <img alt="" class="h-6 w-auto fill-red-300 dark:hidden" src="/logo.svg"/>
                <img alt="" class="h-6 w-auto fill-red-300 hidden dark:inline-block" src="/logo-dark.svg"/>
              </a>
              <button class="-m-2.5 rounded-md p-2.5" type="button" @click="mobileMenuOpen = false">
                <span class="sr-only">Close menu</span>
                <UIcon name="i-heroicons-x-mark"/>
              </button>
            </div>
            <div class="mt-6 flow-root">
              <div class="-my-6 divide-y divide-gray-500/10">
                <div class="space-y-2 py-6">
                  <nuxt-link v-for="item in navigationHeader" :key="item.name" :target="item.target" :to="item.href"
                             active-class="text-primary"
                             class="dark:text-white -mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900"
                  >
                    {{ item.name }}
                  </nuxt-link>
                </div>
                <div class="py-6">
                  <UButton
                      :icon="'i-heroicons-code-bracket'"
                      aria-label="Integration"
                      color="gray"
                      target="_blank"
                      to="/integrate" variant="ghost"
                  />
                  <ClientOnly>
                    <UButton
                        :icon="isDark ? 'i-heroicons-moon-20-solid' : 'i-heroicons-sun-20-solid'"
                        aria-label="Theme"
                        color="gray"
                        variant="ghost"
                        @click="isDark = !isDark"
                    />

                    <template #fallback>
                      <div class="w-8 h-8"/>
                    </template>
                  </ClientOnly>
                  <UDropdown :items="items" :popper="{ placement: 'bottom-start' }"
                             :ui="{ item: { disabled: 'cursor-text select-text' }, background: 'dark:bg-gray-900'}">
                    <UButton
                        aria-label="Theme"
                        color="gray"
                        icon="i-heroicons-user"
                        variant="ghost"
                    />
                    <template #account="{ item }">
                      <div class="text-left">
                        <p>
                          Signed in as
                        </p>
                        <p class="max-w-40 truncate font-medium text-gray-900 dark:text-white">
                          {{ item.label }}
                        </p>
                      </div>
                    </template>

                    <template #item="{ item }">
                      <span class="truncate">{{ item.label }}</span>
                      <UIcon :name="item.icon" class="flex-shrink-0 h-4 w-4 text-gray-400 dark:text-gray-500 ms-auto"/>
                    </template>
                  </UDropdown>
                </div>
              </div>
            </div>
          </DialogPanel>
        </Dialog>
      </ClientOnly>
    </header>
    <UDivider class="mb-10"/>
    <main class="flex-grow">
      <slot/>
    </main>
    <FooterBar/>
  </div>
</template>

<script lang="ts" setup>
import {Dialog, DialogPanel} from '@headlessui/vue'

const navigationHeader = [
  {name: 'Home', href: '/', target: ''},
  {name: 'Questions', href: '/questions', target: ''},
  {name: 'Explanation', href: '/explanation', target: '_blank'},
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


const items = [
  [{
    label: user.value.email,
    slot: 'account',
    disabled: true
  }], [{
    label: 'Settings',
    icon: 'i-heroicons-cog-8-tooth',
    click: settings

  }, {
    label: 'Sign out',
    icon: 'i-heroicons-arrow-left-on-rectangle',
    click: handleLogout
  }]
]

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
