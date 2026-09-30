export interface UpdateAccountBody {
    name: string;
    // volle Stunde 0–23, deutsche Zeit (Europe/Berlin)
    preferredReminderDeliveryTime: number | string;
    preferredWeeklyDeliveryTime: number | string;
    preferredWeeklyDeliveryDay: number;
    receiveEmails: boolean,
    receiveWeeklyEmails: boolean,
    weeklyEmailsNumber: number,
    unsubscribeEmailsToken: string | null
    unsubscribeWeeklyEmailsToken: string | null,
    logQuestions: boolean
}

export interface GetAccountResponse {
    name: string;
    // volle Stunde 0–23, deutsche Zeit (Europe/Berlin)
    preferredReminderDeliverTime: number;
    preferredWeeklyDeliverTime: number;
    preferredWeeklyDeliverDay: number;
    receiveEmails: boolean,
    receiveWeeklyEmails: boolean,
    weeklyEmailsNumber: number,
    unsubscribeEmailsToken: string | null,
    unsubscribeWeeklyEmailsToken: string | null
    logQuestions: boolean
    loggedQuestions: number
}

export interface AccountStats {
    questions: number
    activeQuestion: number
    oldestQuestion: Date
    weeklyStreak: number
}
