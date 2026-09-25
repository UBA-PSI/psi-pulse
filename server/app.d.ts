declare namespace Lucia {
    type Auth = import("./utils/lucia").Auth;
    type DatabaseUserAttributes = {
        email: string;
        name: string;
        preferred_reminder_email_delivery_time: Date;
        preferred_weekly_email_delivery_time: Date;
        preferred_weekly_email_delivery_day: number;
        unsubscribe_emails_token: string;
        unsubscribe_weekly_emails_token: string;
        log_questions: boolean;
    };
    type DatabaseSessionAttributes = {};
}
