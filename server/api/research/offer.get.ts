import {usePrisma} from "~/server/utils/prisma";
import {PrismaClient} from "@prisma/client";
import {shouldAsk, signOffer} from "~/server/utils/research";
import {reminderLinkActive} from "~/server/utils/mailLinks";

const prisma = usePrisma();

// Angebot zur Forschungs-Einwilligung auf den Antwortseiten aus den Mails.
// Nachweis über das Token aus der Mail (Reminder oder Wochenauswahl).
export default defineEventHandler(async (event) => {
    const {kind, token} = getQuery(event)
    if (typeof token !== "string" || token.length < 5 || token.length > 100) return {ask: false}
    let userId: string | null = null
    if (kind === "reminder") {
        // Reminder-Links gelten 30 Tage ab Versand, wie in den Antwortpfaden (A38)
        userId = (await prisma.reminderEmail.findUnique({where: {token, ...reminderLinkActive()}, select: {user_id: true}}))?.user_id ?? null
    } else if (kind === "weekly") {
        userId = (await prisma.weeklyEmail.findUnique({where: {token}, select: {user_id: true}}))?.user_id ?? null
    }
    if (!userId || !(await shouldAsk(userId))) return {ask: false}
    const user = await prisma.user.findUnique({where: {id: userId}, select: {lang: true}})
    return {ask: true, offer: signOffer(userId), lang: user?.lang === "en" ? "en" : "de"}
})
