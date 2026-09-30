// Gültigkeit der Links in Erinnerungsmails (A26): „Alle beantworten“ und „Nur diese Frage beantworten“ gelten
// 30 Tage ab Versand, so lange bleibt die ReminderEmail stehen (Aufräumen in backgroundScheduler.ts).
// Weekly-Links gelten bis zur nächsten Wochenauswahl, die ein neues Token vergibt (emailScheduler.ts).
export const REMINDER_LINK_DAYS = 30

export const reminderLinksValidSince = () => new Date(Date.now() - REMINDER_LINK_DAYS * 24 * 60 * 60 * 1000)

// Gemeinsame Altersprüfung für alles, was ein Reminder-Token annimmt (A38): Lese- und Antwortpfade, Sprache
// (/api/answer/lang) und Forschungsangebot (/api/research/offer). Vorher prüften die beiden letzten das Alter nicht.
// Als Prisma-Bedingung für ReminderEmail (where: {token, ...reminderLinkActive()}) …
export const reminderLinkActive = () => ({sent_at: {gt: reminderLinksValidSince()}})
// … und für einen schon gelesenen Versandzeitpunkt (Link „Nur diese Frage beantworten“)
export const reminderLinkValid = (sentAt: Date | null | undefined) => !!sentAt && sentAt > reminderLinksValidSince()
