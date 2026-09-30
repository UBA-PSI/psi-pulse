import {createInlineScriptAllowList} from "~/server/utils/cspInlineScripts";

// Content-Security-Policy der App (A21, zweite Schutzschicht neben der URL-Prüfung).
// Skripte nur von der eigenen Herkunft; die drei Inline-Skripte, die Nuxt selbst ins HTML schreibt, sind per
// Hash erlaubt. Damit laufen weder eingeschleuste <script>-Blöcke noch javascript:-URLs noch on*-Attribute.
// Styles bleiben 'unsafe-inline': Nuxt UI und Tailwind-Icons liefern <style>-Blöcke, Popper/Headless UI setzen
// Inline-Styles. CSS-Injektion ist deutlich weniger gefährlich als Skript und hier ohne Umbau nicht zu vermeiden.
// frame-ancestors 'none' wie im Caddy-Header auf bew (psi-ansible bew.yml); beide Header gelten nebeneinander.

const COMMON = [
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
]

const pagePolicy = (scriptHashes: string[]) => [
    "default-src 'self'",
    ["script-src 'self'", ...scriptHashes.map(h => `'${h}'`)].join(" "),
    "style-src 'self' 'unsafe-inline'",
    // Tailwind-Icons (Nuxt UI) sind data:-URLs in CSS-Masken
    "img-src 'self' data:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "form-action 'self'",
    ...COMMON,
].join("; ")

// Statische Demo des Widgets (public/embed/v2/demo.html): Widget-CSS als <style>, API auf derselben Herkunft
const EMBED_POLICY = [
    "default-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "connect-src 'self'",
    "form-action 'none'",
    ...COMMON,
].join("; ")

// API-Antworten sind JSON; falls ein Browser eine davon doch als Dokument öffnet, darf dort nichts laufen
const API_POLICY = ["default-src 'none'", ...COMMON].join("; ")

// Inline-Skripte, die Nuxt selbst erzeugt (Laufzeit-Konfiguration, @nuxtjs/color-mode): nur an ihrer festen Stelle
// und mit dem beim ersten Auftreten festgehaltenen Inhalt (A36, server/utils/cspInlineScripts.ts). Alles andere
// bekommt keinen Hash und wird vom Browser blockiert.
const inlineScriptHashes = createInlineScriptAllowList()

export default defineNitroPlugin((nitroApp) => {
    // Im Entwicklungsmodus (nuxt dev) schreibt Vite eigene Inline-Skripte: dort keine CSP
    if (import.meta.dev) return

    nitroApp.hooks.hook("request", (event) => {
        const path = event.path || ""
        if (path.startsWith("/embed/")) setResponseHeader(event, "Content-Security-Policy", EMBED_POLICY)
        else if (path.startsWith("/api/")) setResponseHeader(event, "Content-Security-Policy", API_POLICY)
    })

    // Nach allen render:html-Hooks (color-mode fügt sein Skript dort ein): fertiges HTML hashen
    nitroApp.hooks.hook("render:response", (response) => {
        if (typeof response.body !== "string") return
        const type = String(response.headers?.["content-type"] || "")
        if (!type.includes("text/html")) return
        response.headers = {
            ...response.headers,
            "content-security-policy": pagePolicy(inlineScriptHashes(response.body)),
        }
    })
})
