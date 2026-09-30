export default defineNuxtRouteMiddleware(async () => {
    // Nuxt 4 reuses useFetch payloads across navigation. Authentication must be fresh,
    // especially after logout/account deletion, or /login redirects back to /home.
    const requestFetch = useRequestFetch();
    const data = await requestFetch('/api/user');
    useUser().value = data.user ?? null;
});
