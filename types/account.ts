export interface UpdateAccountBody {
    name: string;
    preferredReminderDeliveryTime: string;
    preferredWeeklyDeliveryTime: string;
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
    preferredReminderDeliverTime: Date;
    preferredWeeklyDeliverTime: Date;
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
