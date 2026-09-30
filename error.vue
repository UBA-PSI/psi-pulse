<template>
  <!-- Das Standard-Layout verlangt einen angemeldeten Nutzer (useAuthenticatedUser) und würfe hier selbst
       einen Fehler; nicht angemeldete Besucher bekamen deshalb eine leere Seite. -->
  <NuxtLayout :name="user ? 'default' : 'not-authenticated'">
    <main class="grid min-h-full place-items-center px-6 py-24 sm:py-32 lg:px-8">
      <div class="text-center">
        <p class="text-base font-semibold text-primary">{{ notFound ? 'Error 404' : 'Error' }}</p>
        <h1 class="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {{ notFound ? 'Page not found' : 'Something went wrong' }}
        </h1>
        <p class="mt-6 text-base leading-7 text-gray-600 dark:text-gray-300">
          {{ notFound ? 'This address does not exist on psi-pulse.' : error?.message }}
        </p>
        <div class="mt-10 flex items-center justify-center gap-x-6">
          <UButton to="/">Go to the home page</UButton>
          <a class="text-sm font-semibold text-gray-900 dark:text-white underline" href="mailto:dh.psi@uni-bamberg.de">Contact us
            <span aria-hidden="true">&rarr;</span></a>
        </div>
      </div>
    </main>
  </NuxtLayout>
</template>
<script setup>
const error = useError()
const user = useUser()
const notFound = computed(() => error.value?.statusCode === 404)
</script>
