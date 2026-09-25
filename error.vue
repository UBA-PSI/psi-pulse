<template>
  <NuxtLayout>
    <main class="grid min-h-full place-items-center bg-white px-6 py-24 sm:py-32 lg:px-8">
      <div class="text-center">
        <p class="text-base font-semibold text-primary">Unknown error</p>
        <h1 class="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">{{ error.message }}</h1>
        <p class="mt-6 text-base leading-7 text-gray-600">Sorry, something went wrong.</p>
        <div class="mt-10 flex items-center justify-center gap-x-6">
          <UButton to="/">Go back home</UButton>
          <a class="text-sm font-semibold text-gray-900" href="mailto:florian.seida@stud.uni-bamberg.de">Contact us
            <span aria-hidden="true">&rarr;</span></a>
        </div>
      </div>
    </main>
  </NuxtLayout>
</template>
<script setup>
const error = useError()
const handleError = () => {
  clearError({
    redirect: '/'
  })
}
</script>
