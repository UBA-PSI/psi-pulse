import {usePrisma} from "~/server/utils/prisma";
import {useScheduler} from "~/server/utils/scheduler"
import {PrismaClient} from "@prisma/client";

export default defineNitroPlugin((nitro) => {
    startScheduler(nitro)
})

const client = usePrisma();
// Datensätze je Abfrage im Minutenlauf (A28)
const SCHEDULER_BATCH = 500;
const CLEANUP_INTERVAL_MS = Number(process.env.PULSE_CLEANUP_INTERVAL_MS) || 60 * 60 * 1000;

function startScheduler(nitro) {
    const scheduler = useScheduler(nitro);

    scheduler.run(async () => {
        try {
            // Nur aktive Fragen prüfen; inaktive wurden früher jede Minute erneut geschrieben.
            // In Chargen nach Id (A28): nie alle aktiven Fragen aller Konten auf einmal im Speicher.
            let lastId: string | undefined
            for (;;) {
                const questions = await client.question.findMany({
                    where: {
                        ...(lastId ? {id: {gt: lastId}} : {}),
                        question_progress: {
                            active: true
                        }
                    },
                    orderBy: {id: "asc"},
                    take: SCHEDULER_BATCH,
                    select: {
                        id: true,
                        question_progress: {
                            select: {
                                id: true,
                                current_state: true,
                                completed_at: true,
                                initial_state: {select: {offset: true}},
                                state_1: {select: {offset: true}},
                                state_2: {select: {offset: true}},
                                state_3: {select: {offset: true}},
                                state_4: {select: {offset: true}},
                                final_state: {select: {offset: true}},
                            }
                        },
                    }
                })
                if (questions.length === 0) break
                lastId = questions[questions.length - 1].id

                const neglected: string[] = []
                for (const question of questions) {
                    const progress = question.question_progress
                    let offset = 0
                    switch (progress.current_state) {
                        case "INITIAL":
                            offset = progress.initial_state.offset
                            break
                        case "STATE_1":
                            offset = progress.state_1.offset
                            break
                        case "STATE_2":
                            offset = progress.state_2?.offset ?? 0
                            break
                        case "STATE_3":
                            offset = progress.state_3?.offset ?? 0
                            break
                        case "STATE_4":
                            offset = progress.state_4?.offset ?? 0
                            break
                        case "FINAL":
                        case "LONG_TERM":
                            offset = progress.final_state.offset
                            break
                    }
                    // Vernachlässigt, wenn seit der letzten Antwort das Doppelte des Abstands vergangen ist. Ein Abstand
                    // unter einem Tag (Stufe „im Text“ nach „nicht gewusst“: 0) zählt wie ein Tag, also frühestens nach
                    // zwei Tagen (A18): die Frage kommt erst mit der nächsten Erinnerungsmail, und die kommt zur gewählten
                    // Uhrzeit, unter Umständen erst am nächsten Tag.
                    const neglectedAfter = new Date(progress.completed_at.getTime() + 2 * Math.max(offset, 1) * 24 * 60 * 60 * 1000)
                    if (neglectedAfter < new Date()) neglected.push(progress.id)
                }
                if (neglected.length > 0) {
                    await client.questionProgress.updateMany({
                        where: {id: {in: neglected}},
                        data: {active: false, active_since: null}
                    })
                }
                if (questions.length < SCHEDULER_BATCH) break
            }

        } catch (e) {
            console.log(e)
            throw e
        }
    }).everyMinute()

    // Aufräumen als eigener Lauf: soll auch dann stattfinden, wenn die Prüfung der Fragen scheitert.
    // Fristen stehen so in den Datenschutzhinweisen.
    let lastCleanup = 0
    scheduler.run(async () => {
        // Fristen sind Tage bis ein Jahr: stündlich genügt (lokale Tests: PULSE_CLEANUP_INTERVAL_MS=60000)
        if (Date.now() - lastCleanup < CLEANUP_INTERVAL_MS) return
        lastCleanup = Date.now()
        try {
            const now = new Date();
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            await client.reminderEmail.deleteMany({where: {sent_at: {lt: thirtyDaysAgo}}});
            // Abgelaufene Login-Codes (Widget), Anmeldelinks und API-Tokens
            await client.loginCode.deleteMany({where: {expires_at: {lt: now}}});
            await client.emailVerificationToken.deleteMany({where: {expires: {lt: BigInt(now.getTime())}}});
            await client.thirdPartySession.deleteMany({where: {expires: {lt: BigInt(now.getTime())}}});
            // Forschungsdaten: Löschung ein Jahr nach Erhebung (Einwilligungstext)
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            await client.questionLog.deleteMany({where: {created_at: {lt: oneYearAgo}}});
            // Konten, deren Anmeldung nie per Mail bestätigt wurde (30 Tage)
            await client.user.deleteMany({where: {verified: false, created_at: {lt: thirtyDaysAgo}}});
        } catch (e) {
            console.log(e)
        }
    }).everyMinute()
}
