import type {Prisma} from "@prisma/client";

// Kontingente pro Konto (A28). Stand 09/2026: rund 950 Fragen in 17 Konten insgesamt; die Grenzen liegen um
// Größenordnungen darüber und sollen nur verhindern, dass ein einzelnes Konto die Datenbank und die einzige Instanz
// belastet. Geprüft beim Anlegen (server/api/v1/questions/index.post.ts); Listen geben höchstens so viele Fragen aus.
export const ACCOUNT_QUOTA = {
    questions: 5000,
    pages: 500,
    groups: 2000,
} as const

// Sperrt die Zeile des Kontos bis zum Ende der Transaktion (SELECT … FOR UPDATE). Serialisiert pro Konto:
// Kontingentprüfung und Anlage (A28) sowie Forschungsprotokoll, Löschung und Widerruf (A31).
// Gibt die gewünschten Spalten zurück (null, wenn es das Konto nicht mehr gibt).
export const lockAccountRow = async (tx: Prisma.TransactionClient, userId: string) => {
    const rows = await tx.$queryRaw<{
        log_questions: boolean,
        research_pseudonym: string | null,
        research_consent_version: string | null,
    }[]>`SELECT log_questions, research_pseudonym, research_consent_version FROM "User" WHERE id = ${userId} FOR UPDATE`
    return rows[0] ?? null
}
