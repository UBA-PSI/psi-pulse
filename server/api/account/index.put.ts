import {PrismaClient} from "@prisma/client";
import protectInternalRoute from "~/server/utils/protectInternalRoute";
import {makeToken} from "~/server/plugins/emailScheduler";
import {UpdateAccountBody} from "~/types/account";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
    const session = await protectInternalRoute(event)
    const body: UpdateAccountBody = await readBody(event)

    const newReminderDeliveryTime = new Date();
    newReminderDeliveryTime.setHours(parseInt(body.preferredReminderDeliveryTime, 10), 0, 0, 0);
    const newWeeklyDeliveryTime = new Date();
    newWeeklyDeliveryTime.setHours(parseInt(body.preferredWeeklyDeliveryTime, 10), 0, 0, 0);

    let unsubscribeEmailsToken = null
    if (body.receiveEmails && body.unsubscribeEmailsToken !== null) {
        unsubscribeEmailsToken = body.unsubscribeEmailsToken
    } else if (body.receiveEmails && body.unsubscribeEmailsToken === null) {
        unsubscribeEmailsToken = makeToken(32)
    }

    let unsubscribeWeeklyEmailsToken = null
    if (body.receiveWeeklyEmails && body.unsubscribeWeeklyEmailsToken !== null) {
        unsubscribeWeeklyEmailsToken = body.unsubscribeWeeklyEmailsToken
    } else if (body.receiveWeeklyEmails && body.unsubscribeWeeklyEmailsToken === null) {
        unsubscribeWeeklyEmailsToken = makeToken(32)
    }

    await prisma.user.update({
        where: {
            id: session.user.userId
        },
        data: {
            name: body.name,
            preferred_reminder_email_delivery_time: newReminderDeliveryTime,
            preferred_weekly_email_delivery_time: newWeeklyDeliveryTime,
            preferred_weekly_email_delivery_day: body.preferredWeeklyDeliveryDay,
            receive_emails: body.receiveEmails,
            receive_weekly_emails: body.receiveWeeklyEmails,
            weekly_emails_number: body.weeklyEmailsNumber,
            unsubscribe_emails_token: unsubscribeEmailsToken,
            unsubscribe_weekly_emails_token: unsubscribeWeeklyEmailsToken,
            log_questions: body.logQuestions
        }
    })

    return "ok"
});

