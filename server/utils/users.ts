import { randomBytes } from "node:crypto";
import { usePrisma } from "./prisma";
import {makeToken} from "~/server/plugins/emailScheduler";

// Legt ein Pulse-Konto mit den Standard-Einstellungen an (Signup-Seite und Widget).
// Reminder 14 Uhr, Weekly mittwochs 16 Uhr, jeweils deutsche Zeit (server/utils/berlinTime.ts).
export const createPulseUser = async (email: string, name: string, logQuestions: boolean, verified: boolean, lang: string = "de") => {

    const user = await usePrisma().user.create({
        data: {
            id: randomBytes(16).toString("hex"),
            name: name,
            email: email.toLowerCase(),
            preferred_reminder_hour: 14,
            preferred_weekly_hour: 16,
            preferred_weekly_email_delivery_day: 3,
            unsubscribe_emails_token: makeToken(32),
            unsubscribe_weekly_emails_token: makeToken(32),
            log_questions: logQuestions,
            verified: verified,
            lang: lang === "en" ? "en" : "de"
        }
    });
    return {userId: user.id, email: user.email, name: user.name};
}
