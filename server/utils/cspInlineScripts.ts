import {createHash} from "node:crypto";

// Freigabe der Inline-Skripte, die Nuxt selbst ins HTML schreibt (A36). Reine Funktion ohne Nuxt-Abhängigkeiten,
// damit scripts/csp-inline-scripts.test.mjs sie direkt mit Node prüfen kann.
//
// Nuxt 4 (SSR, diese Konfiguration) erzeugt genau drei ausführbare Inline-Skripte:
//  1. im <head> das Skript von @nuxtjs/color-mode (setzt den Dunkelmodus vor dem ersten Zeichnen),
//  2. die Importmap im <head>,
//  3. direkt vor den abschließenden Nutzdaten (<script type="application/json" id="__NUXT_DATA__">),
//     die Laufzeit-Konfiguration `window.__NUXT__={};window.__NUXT__.config=…`.
// Alle drei sind für alle Seiten und Anfragen gleich (Build und Laufzeit-Konfiguration ändern sich nicht zur Laufzeit).
//
// Freigegeben wird deshalb nur, was an genau dieser Stelle steht UND inhaltlich dem ersten so gefundenen Skript
// derselben Art entspricht (Inhalt wird beim ersten Auftreten festgehalten). Ein eingeschleustes Skript im
// App-HTML steht vor dem abschließenden Konfigurations-/Datenpaar und bekommt keinen Hash.
// Ein zusätzliches ausführbares Skript im <head> führt dazu, dass dort gar nichts freigegeben wird.

const NUXT_CONFIG_PREFIX = "window.__NUXT__={};window.__NUXT__.config="
const isColorMode = (code: string) => code.startsWith('"use strict";') && code.includes("nuxt-color-mode")

const SCRIPT = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi

type Script = { start: number, end: number, code: string, executable: boolean, nuxtData: boolean }

const scriptsOf = (html: string): Script[] => {
    const out: Script[] = []
    for (const match of html.matchAll(SCRIPT)) {
        const attrs = (match[1] || "").toLowerCase()
        const code = match[2]
        const type = /\stype\s*=\s*"?([^"\s>]+)/.exec(" " + attrs)?.[1]
        const external = /\ssrc\s*=/.test(" " + attrs)
        out.push({
            start: match.index!,
            end: match.index! + match[0].length,
            code,
            // JSON-Daten (__NUXT_DATA__) und externe Skripte brauchen keinen Hash
            executable: !external && (!type || type === "module" || type === "text/javascript" || type === "importmap") && code.trim() !== "",
            nuxtData: type === "application/json" && /\sid\s*=\s*"?__nuxt_data__"?/.test(" " + attrs),
        })
    }
    return out
}

export const cspScriptHash = (code: string) => "sha256-" + createHash("sha256").update(code, "utf8").digest("base64")

type Warn = (message: string) => void

// Liefert eine Funktion html → erlaubte Hashes. Der Zustand (festgehaltene Inhalte) lebt so lange wie die Instanz,
// im Server also einmal pro Prozess.
export const createInlineScriptAllowList = (warn: Warn = (m) => console.warn("[csp] " + m)) => {
    const pinned: { colorMode?: string, nuxtConfig?: string, importMap?: string } = {}
    const pin = (kind: keyof typeof pinned, code: string): string | null => {
        if (pinned[kind] === undefined) pinned[kind] = code
        if (pinned[kind] !== code) {
            warn(`${kind}: Inhalt weicht vom ersten Auftreten ab, wird blockiert`)
            return null
        }
        return cspScriptHash(code)
    }

    return (html: string): string[] => {
        const scripts = scriptsOf(html)
        const headEnd = html.indexOf("</head>")
        const bodyEnd = html.lastIndexOf("</body>")
        const allowed = new Set<Script>()
        const hashes: string[] = []

        // Nuxt 4 emits exactly one importmap and one color-mode script in the head.
        // Pin both payloads; unexpected executable scripts fail closed for the entire head.
        const inHead = headEnd < 0 ? [] : scripts.filter((s) => s.executable && s.end <= headEnd)
        const color = inHead.find(s => isColorMode(s.code))
        const map = inHead.find(s => {
            try {
                const value = JSON.parse(s.code)
                return Object.keys(value).length === 1 && Object.keys(value.imports).length === 1
                    && /^\/_nuxt\/[a-zA-Z0-9_-]+\.js$/.test(value.imports['#entry'])
            } catch { return false }
        })
        if (inHead.length === 2 && color && map) {
            for (const [kind, script] of [['colorMode', color], ['importMap', map]] as const) {
                const h = pin(kind, script.code)
                if (h) { hashes.push(h); allowed.add(script) }
            }
        } else if (inHead.length) {
            warn('Unexpected inline scripts in head; none allowed')
        }

        // Nuxt 4 places config immediately BEFORE the final JSON data script.
        const data = scripts[scripts.length - 1]
        const config = scripts[scripts.length - 2]
        if (data?.nuxtData && config?.executable && config.code.startsWith(NUXT_CONFIG_PREFIX)
            && bodyEnd >= data.end && html.slice(data.end, bodyEnd).trim() === ''
            && html.slice(config.end, data.start).trim() === '') {
            const h = pin('nuxtConfig', config.code)
            if (h) { hashes.push(h); allowed.add(config) }
        }

        for (const s of scripts) {
            if (s.executable && !allowed.has(s)) warn("Inline-Skript wird blockiert: " + s.code.slice(0, 60))
        }
        return hashes
    }
}
