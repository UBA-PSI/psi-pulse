import {PrismaClientKnownRequestError} from "@prisma/client/runtime/library";
import {makeToken} from "~/server/plugins/emailScheduler";
import {sendSignupLink} from "~/server/utils/email";

const isValidEmail = (maybeEmail: unknown): maybeEmail is string => {
    if (typeof maybeEmail !== "string") return false;
    if (maybeEmail.length > 255) return false;
    const emailRegexp = /^.+@.+$/; // [one or more character]@[one or more character]
    return emailRegexp.test(maybeEmail);
};

export default defineEventHandler(async (event) => {
    const {email, name, logQuestions} = await readBody<{
        email: unknown;
        name: unknown;
        logQuestions: false;
    }>(event);
    // basic check
    if (!isValidEmail(email)) {
        throw createError({
            message: "Invalid email",
            statusCode: 400
        });
    }
    if (typeof name !== "string") {
        throw createError({
            message: "Invalid name",
            statusCode: 400
        });
    }

    try {
        const twoPm = new Date();
        twoPm.setHours(14, 0, 0, 0);
        const fourPm = new Date();
        fourPm.setHours(16, 0, 0, 0);

        const user = await auth.createUser({
            key: {
                providerId: "email",
                providerUserId: email.toLowerCase(),
                password: null
            },
            attributes: {
                name: name,
                email: email.toLowerCase(),
                preferred_reminder_email_delivery_time: twoPm,
                preferred_weekly_email_delivery_time: fourPm,
                preferred_weekly_email_delivery_day: 3,
                unsubscribe_emails_token: makeToken(32),
                unsubscribe_weekly_emails_token: makeToken(32),
                log_questions: logQuestions
            }
        });

        const token = await generateEmailVerificationToken(user.userId);
        await sendSignupLink(email, token, name)
        return sendRedirect(event, "/email-verification");
    } catch (e) {
        if (
            e as PrismaClientKnownRequestError && (e as PrismaClientKnownRequestError).code === "P2002"
        ) {
            throw createError({
                message: "Email already taken",
                statusCode: 400
            });
        }
        throw createError({
            message: "An unknown error occurred" + e,
            statusCode: 500
        });
    }
});
