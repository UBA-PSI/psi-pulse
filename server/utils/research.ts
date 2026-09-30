import {usePrisma} from "~/server/utils/prisma";
import {Prisma, PrismaClient} from "@prisma/client";
import {lockAccountRow} from "~/server/utils/accountLimits";
import {createHmac, randomUUID, timingSafeEqual} from "node:crypto";

// Einwilligung zur Forschung (Antwort-Statistik). Text der Einwilligung: components/researchInvite.vue.
// Bei Textänderungen Version erhöhen; gespeichert wird die Version, der zugestimmt wurde.
export const RESEARCH_CONSENT_VERSION = "2026-09-v2" // v2: anonymisierter Datensatz, zehn Jahre, ggf. Veröffentlichung
// Gefragt wird erst nach einer Weile Nutzung: Konto mindestens so alt, mindestens so viele Fragen im Konto.
const MIN_ACCOUNT_DAYS = 14
const MIN_QUESTIONS = 5

const prisma = usePrisma();

const secret = () => {
    const s = String(useRuntimeConfig().loginCodeSecret || "")
    if (s.length < 32) throw createError({message: "Not configured", statusCode: 503})
    return s
}

// Kurzlebiger, signierter Nachweis „dieses Konto wurde über einen Mail-Link gefragt“ (die Mail-Tokens verfallen
// teils schon beim Beantworten der letzten Frage, deshalb wird das Angebot beim Laden der Seite ausgestellt).
// A30: Das Angebot nennt die Einwilligungsversion, für die es gilt, und wird mit redeemOffer genau einmal eingelöst.
// Vorher blieb es zwei Stunden beliebig oft verwendbar und konnte eine spätere Entscheidung oder einen Widerruf
// in den Einstellungen überschreiben (erneut einschalten bzw. Forschungsdaten löschen).
export const signOffer = (userId: string) => {
    const exp = Date.now() + 2 * 60 * 60 * 1000
    const payload = `${userId}.${exp}.${RESEARCH_CONSENT_VERSION}`
    const mac = createHmac("sha256", secret()).update("research-offer:" + payload).digest("hex")
    return `${payload}.${mac}`
}

export const verifyOffer = (offer: unknown): string | null => {
    if (typeof offer !== "string" || offer.length > 300) return null
    const parts = offer.split(".")
    if (parts.length !== 4) return null
    const [userId, exp, version, mac] = parts
    const expected = createHmac("sha256", secret()).update(`research-offer:${userId}.${exp}.${version}`).digest("hex")
    if (mac.length !== expected.length || !timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null
    if (Number(exp) < Date.now()) return null
    // Angebote zu einem älteren Einwilligungstext gelten nicht mehr
    if (version !== RESEARCH_CONSENT_VERSION) return null
    return userId
}

// Löst ein Angebot ein (A30). Angeboten wird nur, solange research_decided_at leer ist (shouldAsk); der Übergang
// von leer auf „entschieden“ ist der Einmalwert: updateMany mit Bedingung, nur bei count === 1 gilt die Entscheidung.
// Damit zählt von parallelen Anfragen genau eine, ein benutztes Angebot bleibt wertlos, und jede Entscheidung in den
// Einstellungen (setResearchConsent setzt research_decided_at) entwertet alle älteren Angebote. Kein Schemafeld nötig.
export const redeemOffer = async (offer: unknown, consent: boolean): Promise<boolean> => {
    const userId = verifyOffer(offer)
    if (!userId) return false
    const claimed = await prisma.user.updateMany({
        where: {id: userId, research_decided_at: null},
        data: {research_decided_at: new Date()}
    })
    if (claimed.count !== 1) return false
    await setResearchConsent(userId, consent, !consent)
    return true
}

export const shouldAsk = async (userId: string): Promise<boolean> => {
    const user = await prisma.user.findUnique({
        where: {id: userId},
        select: {research_decided_at: true, created_at: true, verified: true}
    })
    if (!user || !user.verified || user.research_decided_at) return false
    if (Date.now() - user.created_at.getTime() < MIN_ACCOUNT_DAYS * 24 * 60 * 60 * 1000) return false
    const questions = await prisma.question.count({where: {page: {owner_id: userId}}})
    return questions >= MIN_QUESTIONS
}

// Ja: Pseudonym anlegen (falls nötig), ab jetzt protokollieren. Nein/Widerruf: nicht mehr protokollieren;
// bei Nein aus dem Angebot werden auch vorhandene Einträge gelöscht und das Pseudonym getrennt.
export const setResearchConsent = async (userId: string, consent: boolean, deleteExisting: boolean) => {
    const user = await prisma.user.findUnique({where: {id: userId}, select: {research_pseudonym: true}})
    if (!user) return
    const now = new Date()
    if (consent) {
        await prisma.user.update({
            where: {id: userId},
            data: {
                log_questions: true,
                research_pseudonym: user.research_pseudonym || randomUUID(),
                research_decided_at: now,
                research_consent_at: now,
                research_consent_version: RESEARCH_CONSENT_VERSION,
            }
        })
    } else {
        if (deleteExisting && user.research_pseudonym) await deleteResearchData(userId)
        await prisma.user.update({
            where: {id: userId},
            data: {log_questions: false, research_decided_at: now}
        })
    }
}

// Löscht die Forschungsdaten und trennt das Pseudonym vom Konto – unter der Sperre der Kontozeile (A31), wie das
// Protokollieren einer Bewertung (editQuestion.ts). Eine parallel laufende Bewertung schreibt danach nichts mehr
// unter dem alten Pseudonym. Mit tx läuft die Löschung in einer Transaktion des Aufrufers (Kontolöschung).
export const deleteResearchData = async (userId: string, tx?: Prisma.TransactionClient) => {
    const run = async (t: Prisma.TransactionClient) => {
        const user = await lockAccountRow(t, userId)
        if (user?.research_pseudonym) {
            await t.questionLog.deleteMany({where: {pseudonym: user.research_pseudonym}})
            await t.user.update({where: {id: userId}, data: {research_pseudonym: null}})
        }
    }
    if (tx) await run(tx)
    else await prisma.$transaction(run)
}

export const countResearchData = async (pseudonym: string | null) =>
    pseudonym ? prisma.questionLog.count({where: {pseudonym}}) : 0
