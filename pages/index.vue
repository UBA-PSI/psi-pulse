<template>
  <div/>
</template>

<script lang="ts" setup>
// In Produktion liefert Caddy auf bew unter / die statische Startseite (landing/) aus, diese Seite
// erreicht dann niemand. Sie bleibt für die lokale Entwicklung und als Rückfall, falls der Proxy
// / doch an die App gibt: angemeldet zum Dashboard, sonst zur Anmeldung. Die Weiterleitung steht
// in der Middleware, damit kein Layout rendert (das Standard-Layout verlangt einen angemeldeten Nutzer).
definePageMeta({
  layout: false,
  middleware: () => navigateTo(useUser().value ? "/home" : "/login", {replace: true}),
});
</script>
