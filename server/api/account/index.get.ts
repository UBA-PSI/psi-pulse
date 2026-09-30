import {usePrisma} from "~/server/utils/prisma";
import {countResearchData} from "~/server/utils/research";
import protectInternalRoute from "~/server/utils/protectInternalRoute";
import {PrismaClient} from "@prisma/client";
import {GetAccountResponse} from "~/types/account";

const prisma = usePrisma();

export default defineEventHandler(async (event): Promise<GetAccountResponse> => {
    const session = await protectInternalRoute(event)

    const user = await prisma.user.findUnique({
        where: {
            id: session.user.userId
        }, select: {
            name: true,
            preferred_reminder_hour: true,
            preferred_weekly_hour: true,
            preferred_weekly_email_delivery_day: true,
            receive_emails: true,
            receive_weekly_emails: true,
            weekly_emails_number: true,
            unsubscribe_emails_token: true,
            unsubscribe_weekly_emails_token: true,
            log_questions: true,
            research_pseudonym: true
        }
    })

    if (!user) throw createError({
        message: "User not found",
        statusCode: 404
    })

    return {
        name: user.name,
        preferredReminderDeliverTime: user.preferred_reminder_hour,
        preferredWeeklyDeliverTime: user.preferred_weekly_hour,
        preferredWeeklyDeliverDay: user.preferred_weekly_email_delivery_day,
        receiveEmails: user.receive_emails,
        receiveWeeklyEmails: user.receive_weekly_emails,
        weeklyEmailsNumber: user.weekly_emails_number,
        unsubscribeEmailsToken: user.unsubscribe_emails_token,
        unsubscribeWeeklyEmailsToken: user.unsubscribe_weekly_emails_token,
        logQuestions: user.log_questions,
        loggedQuestions: await countResearchData(user.research_pseudonym)
    }
})
