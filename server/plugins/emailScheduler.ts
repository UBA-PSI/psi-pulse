import {usePrisma} from "~/server/utils/prisma";
import {randomInt} from "node:crypto";
import {useScheduler} from "~/server/utils/scheduler"
import {Prisma, PrismaClient} from "@prisma/client";
import {questionCanBeAnswered} from "~/server/utils/questionCanBeAnswered";
import type {EmailEntry, EmailQuestion, SimpleEmailQuestion} from "~/types/email";
import {sendAnotherChance, sendReminderEmail} from "~/server/utils/email";
import {mailErrorCode} from "~/server/utils/mailError";
import {berlinDayKey, berlinMinutesOfDay, berlinParts, berlinWeekKey} from "~/server/utils/berlinTime";

export default defineNitroPlugin((nitro) => {
    startScheduler(nitro)
})

const client = usePrisma();

async function generateReminderEmailContent(userId: string, email: string, unsubscribeEmailsToken: string, oldestReminderSent: Date | null, name: string) {
    const questions = await client.question.findMany({
        where: {
            page: {
                owner_id: userId
            },
            archived: false,
            question_progress: {
                reminder_token: {
                    equals: null
                }
            }
        }, select: {
            page: {
                select: {
                    name: true,
                    url: true,
                }
            },
            group: {
                select: {
                    name: true,
                }
            },
            // Texte erst für die ausgewählten Fragen laden (A28): hier stünden sonst alle Frage- und Antworttexte
            // des Kontos im Speicher
            id: true,
            question_progress: {
                select: {
                    current_state: true,
                    completed_at: true,
                    initial_state: true,
                    state_1: true,
                    state_2: true,
                    state_3: true,
                    state_4: true,
                    final_state: true,
                    reminder_token: true,
                }
            }
        }
    })
    let openQuestions = questions.filter((question) => {
        return questionCanBeAnswered(question)
    })

    if (openQuestions.length === 0) {
        return
    }

    openQuestions = openQuestions.sort(() => 0.5 - Math.random()).slice(0, 6)
    const texts = new Map((await client.question.findMany({
        where: {id: {in: openQuestions.map((question) => question.id)}},
        select: {id: true, text: true}
    })).map((question) => [question.id, question.text]))
    const selectedQuestions: SimpleEmailQuestion[] = openQuestions.map((question) => {
        return {
            group: question.group.name,
            page: question.page.name,
            text: texts.get(question.id) ?? "",
            id: question.id,
            token: question.question_progress.reminder_token
        }
    })

    const ids = selectedQuestions.map((question) => {
        return {id: question.id}
    })
    const createdReminderEmail = await client.reminderEmail.create({
        data: {
            user_id: userId,
            sent_at: new Date(),
            token: makeToken(10),
            questions: {
                connect: ids
            }
        }
    })

    const reminderQuestions: EmailQuestion[] = await Promise.all(selectedQuestions.map(async (question): Promise<EmailQuestion> => {
        const newQuestionToken = makeToken(10)
        await client.question.update({
            where: {
                id: question.id
            },
            data: {
                question_progress: {
                    update: {
                        reminder_token: newQuestionToken
                    }
                }
            }
        });
        return {
            token: newQuestionToken,
            text: question.text,
            id: question.id,
            page: question.page,
            group: question.group,
        }
    }))
    const emailEntry: EmailEntry = {
        token: createdReminderEmail.token,
        questions: reminderQuestions,
    }


    if (oldestReminderSent === null) {
        await client.user.update({
            where: {
                id: userId
            },
            data: {
                oldest_reminder_sent: new Date(),
            }
        })
    }
    await sendReminderEmail(email, emailEntry, unsubscribeEmailsToken, name)
}

// Datensätze je Abfrage im Minutenlauf (A28)
const SCHEDULER_BATCH = 500

// Nur Felder des Kontos; die früher mitgeladenen, ungenutzten Relationen (letzte Erinnerung, Wochenauswahl) entfallen
const USER_SELECT = {
    name: true,
    email: true,
    id: true,
    email_paused_until: true,
    preferred_reminder_hour: true,
    preferred_weekly_hour: true,
    preferred_weekly_email_delivery_day: true,
    weekly_emails_number: true,
    unsubscribe_weekly_emails_token: true,
    unsubscribe_emails_token: true,
    receive_emails: true,
    receive_weekly_emails: true,
    oldest_weekly_sent: true,
    oldest_reminder_sent: true,
    last_weekly_sent: true,
    last_reminder_check: true,
} satisfies Prisma.UserSelect

type SchedulerUser = Prisma.UserGetPayload<{ select: typeof USER_SELECT }>

const processUser = async (user: SchedulerUser) => {
    if (user.email_paused_until !== null) {
        const now = new Date()
        if (now > user.email_paused_until) {
            // Erst die Pause beenden, dann die Mail (A33): scheitert der Versand dauerhaft, hängt das Konto sonst jede
            // Minute im selben Zustand. Die Mail nur, wenn das Konto Mails will und einen Abmeldelink hat (A32);
            // sonst endet die Pause still.
            await client.user.update({
                where: {
                    id: user.id
                },
                data: {
                    email_paused_until: null
                }
            })
            if (user.receive_emails && user.unsubscribe_emails_token) {
                await sendAnotherChance(user.email, user.name, user.unsubscribe_emails_token)
            }
        }

    } else if (user.receive_emails && user.unsubscribe_emails_token) {
        // Reminder email
        const lastReminderSent = user.last_reminder_check
        const nowDate = new Date()
        // Tag und Uhrzeit in deutscher Zeit, unabhängig von der Zeitzone des Servers (A17)
        const alreadyDeliveredToday = lastReminderSent !== null && berlinDayKey(lastReminderSent) === berlinDayKey(nowDate)
        const currentMinutes = berlinMinutesOfDay(nowDate)
        const preferredMinutes = user.preferred_reminder_hour * 60

        const afterPreferredDeliveryTime = currentMinutes >= preferredMinutes

        if (!alreadyDeliveredToday && afterPreferredDeliveryTime) {
            await client.user.update({
                where: {
                    id: user.id
                },
                data: {
                    last_reminder_check: new Date()
                }
            })
            await generateReminderEmailContent(user.id, user.email, user.unsubscribe_emails_token, user.oldest_reminder_sent, user.name)
        }

        const oldestReminderSent = user.oldest_reminder_sent ?? new Date()
        const sevenDaysAgo = new Date(nowDate.getTime() - (7 * 24 * 60 * 60 * 1000))
        if (oldestReminderSent < sevenDaysAgo) {
            // Pausiert: in diesem Lauf keine Wochenauswahl mehr (sonst ginge sie direkt nach der Pause-Mail raus)
            await pauseUserEmails(user)
            return
        }

        // Weekly email
        if (user.receive_weekly_emails && user.unsubscribe_weekly_emails_token) {
            const nowDate = new Date()
            let sameWeek = null
            if (user.last_weekly_sent !== null) {
                sameWeek = isSameWeek(nowDate, user.last_weekly_sent)
            }

            const currentMinutes = berlinMinutesOfDay(nowDate)
            const preferredMinutes = user.preferred_weekly_hour * 60

            const afterPreferredDeliveryTime = currentMinutes >= preferredMinutes
            const sameDay = berlinParts(nowDate).weekday === user.preferred_weekly_email_delivery_day


            const oldestWeeklyEmailSent = user.oldest_weekly_sent ?? new Date()
            const fourteenDaysAgo = new Date(nowDate.getTime() - (14 * 24 * 60 * 60 * 1000))
            if (oldestWeeklyEmailSent < fourteenDaysAgo) {
                await pauseUserEmails(user)
            } else if (!sameWeek && afterPreferredDeliveryTime && sameDay) {
                if (user.oldest_weekly_sent != null) {
                    await client.user.update({
                        where: {
                            id: user.id
                        },
                        data: {
                            weekly_streak: 0
                        }
                    })
                    // Keine eigene Mail mehr für eine verlorene Serie: Widget und Startseite versprechen höchstens eine Erinnerung am Tag
                    // plus die Wochenauswahl; Gamification-Mails widersprechen dem (Microcopy-Review).
                }
                await generateWeeklyEmailContent(user.id, user.name, user.email, user.unsubscribe_weekly_emails_token, user.weekly_emails_number, user.oldest_weekly_sent)
            }
        }
    }
}

function startScheduler(nitro) {
    const scheduler = useScheduler(nitro);

    scheduler.run(async () => {
        try {
            // Konten in Chargen nach Id (A28): nie alle Konten auf einmal im Speicher
            let lastId: string | undefined
            let failed = 0
            let lastError = ""
            for (;;) {
                const users = await client.user.findMany({
                    where: {
                        verified: true,
                        ...(lastId ? {id: {gt: lastId}} : {}),
                    },
                    orderBy: {id: "asc"},
                    take: SCHEDULER_BATCH,
                    select: USER_SELECT,
                })
                if (users.length === 0) break
                lastId = users[users.length - 1].id
                // Fehler pro Konto isolieren (A33): ein Konto mit dauerhaftem Versandfehler hält die übrigen nicht auf.
                // Im Log nur der Fehlercode, keine Adresse oder Konto-Id.
                for (const user of users) {
                    try {
                        await processUser(user)
                    } catch (e) {
                        failed++
                        lastError = mailErrorCode(e)
                    }
                }
                if (users.length < SCHEDULER_BATCH) break
            }
            if (failed > 0) console.error(`[emailScheduler] ${failed} Konto/Konten in diesem Lauf übersprungen, zuletzt: ${lastError}`)
        } catch (e) {
            console.log(e)
            throw e
        }
    }).everyMinute();
}

// Pausiert alle Mails für 14 Tage. Beide Zähler zurücksetzen: Blieb der andere stehen (etwa eine offene Wochenauswahl
// bei einer Pause wegen ignorierter Reminder), war er nach der Pause abgelaufen und das Konto wurde in der Minute nach
// dem Pausenende erneut pausiert, mit zweiter Pause-Mail. Eine offene Wochenauswahl beendet die Serie wie sonst auch.
const pauseUserEmails = async (user: SchedulerUser) => {
    const pauseUntil = new Date(new Date().getTime() + (14 * 24 * 60 * 60 * 1000))
    await client.user.update({
        where: {
            id: user.id
        },
        data: {
            email_paused_until: pauseUntil,
            oldest_reminder_sent: null,
            oldest_weekly_sent: null,
            ...(user.oldest_weekly_sent !== null ? {weekly_streak: 0} : {}),
        }
    })
    await sendPauseEmail(user.email, user.name, user.unsubscribe_emails_token!)
}

const generateWeeklyEmailContent = async (userId: string, name: string, email: string, unsubscribeWeeklyEmailsToken: string, number: number, oldestSent: Date | null) => {
    // Archivierte Fragen schon bei der Auswahl ausschließen, sonst fehlen sie erst beim Anzeigen und die Auswahl
    // ist kleiner als eingestellt (A19).
    const questions = await client.question.findMany({
        where: {
            page: {
                owner_id: userId
            },
            archived: false
        },
        select: {
            id: true
        }
    })

    const selectedQuestions = questions.sort(() => 0.5 - Math.random()).slice(0, number)
    const token = makeToken(10)
    if (selectedQuestions.length > 0) {
        const ids = selectedQuestions.map((question) => ({id: question.id}))
        // Die neue Auswahl ersetzt die vorige vollständig (set statt connect): eine offene Auswahl wuchs sonst jede
        // Woche um die neuen Fragen (A19). Ob die vorige abgeschlossen war, entscheidet der Aufrufer vorher
        // (Serie); abgeschlossene Auswahlen löscht weekly/[token].put.ts.
        const newEmail = await client.weeklyEmail.upsert({
            where: {
                user_id: userId
            },
            create: {
                user_id: userId,
                sent_at: new Date(),
                token: token,
                questions: {
                    connect: ids
                }
            },
            update: {
                sent_at: new Date(),
                token: token,
                questions: {
                    set: ids
                }
            }
        })

        await client.user.update({
            where: {
                id: userId
            },
            data: {
                last_weekly_sent: new Date(),
                oldest_weekly_sent: oldestSent === null ? new Date() : oldestSent
            }
        })
        await sendWeeklyEmail(email, name, newEmail.token, unsubscribeWeeklyEmailsToken)
    }
}

// Woche von Montag bis Sonntag in deutscher Zeit
function isSameWeek(date1: Date, date2: Date) {
    return berlinWeekKey(date1) === berlinWeekKey(date2)
}

// Tokens in Mail-Links erlauben Aktionen ohne Login (Antworten, Abmelden): kryptografischer Zufall.
export function makeToken(length: number) {
    let result = '';
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < length; i++) {
        result += characters.charAt(randomInt(characters.length));
    }
    return result;
}
