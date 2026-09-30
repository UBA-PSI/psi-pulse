import {usePrisma} from "~/server/utils/prisma";
import {PrismaClient} from "@prisma/client";
import type {CurrentState} from "@prisma/client";

const prisma = usePrisma();

// Auskunft und Datenübertragbarkeit (Art. 15/20 DSGVO, A35): alle zum Konto gespeicherten Inhalte und Zustände,
// ohne Geheimnisse (Abmelde-Tokens, Mail-Link-Tokens, Sitzungen, API-Tokens, Passwort-/Code-Hashes).
// Aufbau (Format "psi-pulse-export/2"; die Felder von Version 1 bleiben an ihrer Stelle):
//   format, exported_at
//   name, email, weekly_streak, research_pseudonym           – wie bisher
//   account:    created_at, verified, lang
//   settings:   receive_emails, receive_weekly_emails, preferred_reminder_hour, preferred_weekly_hour,
//               preferred_weekly_day (0 = Sonntag), weekly_emails_number, lang, email_paused_until
//               (Stunden und Tag in deutscher Zeit, Europe/Berlin)
//   mail_state: last_reminder_check, oldest_reminder_sent, last_weekly_sent, oldest_weekly_sent
//   research:   consent, consent_version, consent_at, decided_at, pseudonym
//   pages[]:    name, url, groups[]: name, questions[]:
//               id, text, answer, archived, in_weekly_selection,
//               learning: stage (INITIAL, STATE_1…4, FINAL, LONG_TERM), stage_label,
//                         last_answered_at (letzte Bewertung außerhalb der Wochenauswahl, sonst Anlage),
//                         next_due_at, active, active_since, waiting_for_remembered,
//                         stages[]: stage, label, offset_days
//   research_data[]: question_hash, page_name, group_name, question_state, question_type, remembered, created_at
const STAGES: { stage: CurrentState, key: "initial_state" | "state_1" | "state_2" | "state_3" | "state_4" | "final_state" }[] = [
    {stage: "INITIAL", key: "initial_state"},
    {stage: "STATE_1", key: "state_1"},
    {stage: "STATE_2", key: "state_2"},
    {stage: "STATE_3", key: "state_3"},
    {stage: "STATE_4", key: "state_4"},
    {stage: "FINAL", key: "final_state"},
]
const STATE = {select: {label: true, offset: true}} as const

export default defineEventHandler(async (event) => {
    const authRequest = auth.handleRequest(event);
    const session = await authRequest.validate();

    if (!session) {
        throw createError({
            message: "Unauthorized",
            statusCode: 401
        });
    }

    const user = await prisma.user.findUnique({
        where: {
            id: session.user.userId
        }, select: {
            name: true,
            email: true,
            created_at: true,
            verified: true,
            lang: true,
            weekly_streak: true,
            receive_emails: true,
            receive_weekly_emails: true,
            preferred_reminder_hour: true,
            preferred_weekly_hour: true,
            preferred_weekly_email_delivery_day: true,
            weekly_emails_number: true,
            email_paused_until: true,
            last_reminder_check: true,
            oldest_reminder_sent: true,
            last_weekly_sent: true,
            oldest_weekly_sent: true,
            log_questions: true,
            research_pseudonym: true,
            research_consent_version: true,
            research_consent_at: true,
            research_decided_at: true,
            pages: {
                select: {
                    name: true,
                    url: true,
                    groups: {
                        select: {
                            name: true,
                            questions: {
                                select: {
                                    id: true,
                                    text: true,
                                    answer: true,
                                    archived: true,
                                    weekly_email_id: true,
                                    question_progress: {
                                        select: {
                                            current_state: true,
                                            completed_at: true,
                                            active: true,
                                            active_since: true,
                                            waiting_for_remembered: true,
                                            initial_state: STATE,
                                            state_1: STATE,
                                            state_2: STATE,
                                            state_3: STATE,
                                            state_4: STATE,
                                            final_state: STATE,
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    });
    if (!user) {
        throw createError({message: "Unauthorized", statusCode: 401});
    }

    // Forschungsdaten über das Pseudonym dazulegen
    const research_data = user.research_pseudonym
        ? await prisma.questionLog.findMany({
            where: {pseudonym: user.research_pseudonym},
            select: {question_hash: true, page_name: true, group_name: true, question_state: true, question_type: true, remembered: true, created_at: true}
        })
        : [];

    return {
        format: "psi-pulse-export/2",
        exported_at: new Date(),
        name: user.name,
        email: user.email,
        weekly_streak: user.weekly_streak,
        research_pseudonym: user.research_pseudonym,
        account: {
            created_at: user.created_at,
            verified: user.verified,
            lang: user.lang,
        },
        settings: {
            receive_emails: user.receive_emails,
            receive_weekly_emails: user.receive_weekly_emails,
            preferred_reminder_hour: user.preferred_reminder_hour,
            preferred_weekly_hour: user.preferred_weekly_hour,
            preferred_weekly_day: user.preferred_weekly_email_delivery_day,
            weekly_emails_number: user.weekly_emails_number,
            lang: user.lang,
            email_paused_until: user.email_paused_until,
        },
        mail_state: {
            last_reminder_check: user.last_reminder_check,
            oldest_reminder_sent: user.oldest_reminder_sent,
            last_weekly_sent: user.last_weekly_sent,
            oldest_weekly_sent: user.oldest_weekly_sent,
        },
        research: {
            consent: user.log_questions,
            consent_version: user.research_consent_version,
            consent_at: user.research_consent_at,
            decided_at: user.research_decided_at,
            pseudonym: user.research_pseudonym,
        },
        pages: user.pages.map((page) => ({
            name: page.name,
            url: page.url,
            groups: page.groups.map((group) => ({
                name: group.name,
                questions: group.questions.map((question) => {
                    const p = question.question_progress
                    const stages = STAGES.flatMap(({stage, key}) => {
                        const s = p[key]
                        return s ? [{stage, label: s.label, offset_days: s.offset}] : []
                    })
                    // Fälligkeit wie questionCanBeAnswered: letzte Antwort + Abstand der aktuellen Stufe
                    // (LONG_TERM nutzt den Abstand der letzten Stufe)
                    const current = stages.find((s) => s.stage === (p.current_state === "LONG_TERM" ? "FINAL" : p.current_state))
                    const nextDue = new Date(p.completed_at)
                    nextDue.setDate(nextDue.getDate() + (current?.offset_days ?? 0))
                    return {
                        id: question.id,
                        text: question.text,
                        answer: question.answer,
                        archived: question.archived,
                        in_weekly_selection: question.weekly_email_id != null,
                        learning: {
                            stage: p.current_state,
                            stage_label: current?.label ?? null,
                            last_answered_at: p.completed_at,
                            next_due_at: nextDue,
                            active: p.active,
                            active_since: p.active_since,
                            waiting_for_remembered: p.waiting_for_remembered,
                            stages,
                        },
                    }
                }),
            })),
        })),
        research_data,
    };
})
