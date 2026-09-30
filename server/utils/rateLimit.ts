import type {H3Event} from "h3";
import {mailLimitKey} from "~/server/utils/emailAddress";

// Begrenzt Anfragen, die ohne Anmeldung Mails auslösen oder Codes prüfen, damit niemand über Pulse und den
// Uni-Mailserver fremde Postfächer flutet oder Codes durchprobiert.
// Zähler liegen im Speicher: genügt für eine Instanz, nach einem Neustart beginnen sie neu.
// Die Client-IP kommt aus X-Forwarded-For. Nur Caddy auf bew erreicht Port 8080 (Firewall, psi-ansible
// docker_user_firewall) und setzt den Header neu, deshalb ist er vertrauenswürdig.

const DAY = 24 * 60 * 60 * 1000

type Rule = { key: "mail" | "ip", windowMs: number, max: number }

// Je Adresse streng (Schutz der Empfänger), je IP großzügig: ganze Hörsäle teilen sich eine NAT-Adresse.
const MAIL_RULES: Rule[] = [
    {key: "mail", windowMs: 60 * 1000, max: 1},
    {key: "mail", windowMs: DAY, max: 5},
    {key: "ip", windowMs: 60 * 60 * 1000, max: 200},
]

const hits = new Map<string, number[]>()
let lastPrune = 0

// Einträge bleiben höchstens einen Tag (plus zehn Minuten) im Speicher.
const prune = (now: number) => {
    if (now - lastPrune < 10 * 60 * 1000) return
    lastPrune = now
    for (const [key, times] of hits) {
        const recent = times.filter(t => now - t < DAY)
        if (recent.length === 0) hits.delete(key)
        else hits.set(key, recent)
    }
}

export const assertRateLimit = (event: H3Event, bucket: string, rules: Rule[], email?: string) => {
    const now = Date.now()
    prune(now)
    const keys: Record<string, string> = {
        ip: bucket + ":ip:" + (getRequestIP(event, {xForwardedFor: true}) ?? "unknown"),
    }
    // Plus-Aliase zählen fürs selbe Postfach (A37)
    if (email) keys.mail = bucket + ":mail:" + mailLimitKey(email)
    const recent = (key: string) => (hits.get(key) ?? []).filter(t => now - t < DAY)

    for (const rule of rules) {
        const key = keys[rule.key]
        if (!key) continue
        if (recent(key).filter(t => now - t < rule.windowMs).length >= rule.max) {
            throw createError({
                message: "Too many requests. Please wait a moment and try again.",
                statusCode: 429
            });
        }
    }
    for (const key of Object.values(keys)) hits.set(key, [...recent(key), now])
}

export const assertMailRateLimit = (event: H3Event, email: string) => assertRateLimit(event, "mail", MAIL_RULES, email)
