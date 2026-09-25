import {useScheduler} from "#scheduler"
import {PrismaClient} from "@prisma/client";
import {questionCanBeAnswered} from "~/server/utils/questionCanBeAnswered";
import type {EmailEntry, EmailQuestion, SimpleEmailQuestion} from "~/types/email";
import {sendAnotherChance, sendReminderEmail, sendStreakLostEmail} from "~/server/utils/email";

export default defineNitroPlugin(() => {
    startScheduler()
})

const client = new PrismaClient();

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
            id: true,
            text: true,
            answer: true,
            group_id: true,
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
    const selectedQuestions: SimpleEmailQuestion[] = openQuestions.map((question) => {
        return {
            group: question.group.name,
            page: question.page.name,
            text: question.text,
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

function startScheduler() {
    const scheduler = useScheduler();

    scheduler.run(async () => {
        try {

            const users = await client.user.findMany({
                where: {
                    verified: true
                },
                select: {
                    name: true,
                    reminder_emails: {
                        select: {
                            id: true,
                            sent_at: true,
                        },
                        orderBy: {
                            sent_at: 'desc'
                        },
                        take: 1
                    },
                    email: true,
                    id: true,
                    email_paused_until: true,
                    preferred_reminder_email_delivery_time: true,
                    preferred_weekly_email_delivery_time: true,
                    preferred_weekly_email_delivery_day: true,
                    weekly_emails_number: true,
                    unsubscribe_weekly_emails_token: true,
                    unsubscribe_emails_token: true,
                    receive_emails: true,
                    receive_weekly_emails: true,
                    weekly_email: true,
                    oldest_weekly_sent: true,
                    oldest_reminder_sent: true,
                    last_weekly_sent: true,
                    last_reminder_check: true,
                }
            })

            for (const user of users) {
                if (user.email_paused_until !== null) {
                    const now = new Date()
                    if (now > user.email_paused_until) {
                        await sendAnotherChance(user.email, user.name, user.unsubscribe_emails_token!!)
                        await client.user.update({
                            where: {
                                id: user.id
                            },
                            data: {
                                email_paused_until: null
                            }
                        })
                    }

                } else if (user.receive_emails) {
                    // Reminder email
                    let lastReminderSent = user.last_reminder_check
                    if (user.last_reminder_check === null) {
                        const nowDate = new Date()
                        nowDate.setDate(nowDate.getDate() - 1)
                        lastReminderSent = nowDate
                    }
                    if (lastReminderSent !== null) {
                        const nowDate = new Date()
                        const alreadyDeliveredToday = lastReminderSent.toDateString() === nowDate.toDateString()
                        const currentMinutes = nowDate.getHours() * 60 + nowDate.getMinutes()
                        const preferredMinutes = user.preferred_reminder_email_delivery_time.getHours() * 60 + user.preferred_reminder_email_delivery_time.getMinutes()

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
                            await generateReminderEmailContent(user.id, user.email, user.unsubscribe_emails_token!!, user.oldest_reminder_sent, user.name)
                        }

                        const oldestReminderSent = user.oldest_reminder_sent ?? new Date()
                        const sevenDaysAgo = new Date(nowDate.getTime() - (7 * 24 * 60 * 60 * 1000))
                        if (oldestReminderSent < sevenDaysAgo) {
                            await client.user.update({
                                where: {
                                    id: user.id
                                },
                                data: {
                                    oldest_reminder_sent: null
                                }
                            })
                            await pauseUserEmails(user.id, user.email, user.name, user.unsubscribe_emails_token!!)
                        }
                    }

                    // Weekly email
                    if (user.receive_weekly_emails) {
                        const nowDate = new Date()
                        let sameWeek = null
                        if (user.last_weekly_sent !== null) {
                            sameWeek = isSameWeek(nowDate, user.last_weekly_sent)
                        }

                        const currentMinutes = nowDate.getHours() * 60 + nowDate.getMinutes()
                        const preferredMinutes = user.preferred_weekly_email_delivery_time.getHours() * 60 + user.preferred_weekly_email_delivery_time.getMinutes()

                        const afterPreferredDeliveryTime = currentMinutes >= preferredMinutes
                        const sameDay = nowDate.getDay() === user.preferred_weekly_email_delivery_day


                        const oldestWeeklyEmailSent = user.oldest_weekly_sent ?? new Date()
                        const fourteenDaysAgo = new Date(nowDate.getTime() - (14 * 24 * 60 * 60 * 1000))
                        if (oldestWeeklyEmailSent < fourteenDaysAgo) {
                            await client.user.update({
                                where: {
                                    id: user.id
                                },
                                data: {
                                    oldest_weekly_sent: null,
                                    weekly_streak: 0
                                }
                            })
                            await pauseUserEmails(user.id, user.email, user.name, user.unsubscribe_emails_token!!)
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
                                await sendStreakLostEmail(user.email, user.name, user.unsubscribe_weekly_emails_token!!)
                            }
                            await generateWeeklyEmailContent(user.id, user.name, user.email, user.unsubscribe_weekly_emails_token!!, user.weekly_emails_number, user.oldest_weekly_sent)
                        }
                    }
                }
            }
        } catch (e) {
            console.log(e)
            throw e
        }
    }).everyMinute();
}

const pauseUserEmails = async (userId: string, email: string, name: string, unsubscribeToken: string) => {
    const pauseUntil = new Date(new Date().getTime() + (14 * 24 * 60 * 60 * 1000))
    await client.user.update({
        where: {
            id: userId
        },
        data: {
            email_paused_until: pauseUntil
        }
    })
    await sendPauseEmail(email, name, unsubscribeToken)
}

const generateWeeklyEmailContent = async (userId: string, name: string, email: string, unsubscribeWeeklyEmailsToken: string, number: number, oldestSent: Date | null) => {
    const questions = await client.question.findMany({
        where: {
            page: {
                owner_id: userId
            }
        }
    })

    const selectedQuestions = questions.sort(() => 0.5 - Math.random()).slice(0, number)
    const token = makeToken(10)
    if (selectedQuestions.length > 0) {
        const newEmail = await client.weeklyEmail.upsert({
            where: {
                user_id: userId
            },
            create: {
                user_id: userId,
                sent_at: new Date(),
                token: token,
                questions: {
                    connect: selectedQuestions.map((question) => {
                        return {
                            id: question.id
                        }
                    })
                }
            },
            update: {
                sent_at: new Date(),
                token: token,
                questions: {
                    connect: selectedQuestions.map((question) => {
                        return {
                            id: question.id
                        }
                    })
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

function isSameWeek(date1: Date, date2: Date) {
    function getMonday(d: Date) {
        let day = d.getDay(),
            diff = d.getDate() - day + (day == 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    }

    let monday1 = getMonday(new Date(date1));
    let monday2 = getMonday(new Date(date2));

    return monday1.getFullYear() === monday2.getFullYear() &&
        monday1.getMonth() === monday2.getMonth() &&
        monday1.getDate() === monday2.getDate();
}

export function makeToken(length: number) {
    let result = '';
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}
