import {usePrisma} from "~/server/utils/prisma";
import {RESEARCH_CONSENT_VERSION} from "~/server/utils/research";
import {lockAccountRow} from "~/server/utils/accountLimits";
import {mailErrorCode} from "~/server/utils/mailError";
import {CurrentState, PrismaClient, QuestionProgress} from "@prisma/client";
import {SimpleQuestionState} from "~/types/questions/questions";
import type {ReducedQuestionProgress} from "~/types/database";
import {QuestionActiveState} from "~/types/questions/internal";

const prisma = usePrisma();

export const getQuestionStates = (progress: ReducedQuestionProgress): SimpleQuestionState[] => {
    const states: SimpleQuestionState[] = []
    for (const stateName of ["INITIAL", "STATE_1", "STATE_2", "STATE_3", "STATE_4", "FINAL"]) {
        const state = stateGenerator(progress, stateName as CurrentState)
        if (state != null) {
            states.push(state)
        }
    }
    return states
}

const stateGenerator = (progress: ReducedQuestionProgress, state: CurrentState): SimpleQuestionState | null => {
    if (state === "STATE_2" && progress.state_2 == null) {
        return null
    } else if (state === "STATE_3" && progress.state_3 == null) {
        return null
    } else if (state === "STATE_4" && progress.state_4 == null) {
        return null
    } else {
        const reached = stateToNumber(progress.current_state) > stateToNumber(state)
        let label = progress.initial_state.label
        switch (state) {
            case "INITIAL":
                label = progress.initial_state.label
                break
            case "STATE_1":
                label = progress.state_1.label
                break
            case "STATE_2":
                label = progress.state_2!!.label
                break
            case "STATE_3":
                label = progress.state_3!!.label
                break
            case "STATE_4":
                label = progress.state_4!!.label
                break
            case "FINAL":
                label = progress.final_state.label
                break
        }
        return {
            label: label,
            reached: reached,
        }

    }
}

const stateToNumber = (state: CurrentState): number => {
    switch (state) {
        case "INITIAL":
            return 0
        case "STATE_1":
            return 1
        case "STATE_2":
            return 2
        case "STATE_3":
            return 3
        case "STATE_4":
            return 4
        case "FINAL":
            return 5
        case "LONG_TERM":
            return 6
    }
    return -1
}

export const updateQuestionArchived = async (questionId: string, archived: boolean) => {
    await prisma.question.update({
        where: {
            id: questionId
        },
        data: {
            archived: archived
        }
    })
}

export const updateQuestionState = async (questionId: string, remembered: boolean, isWeekly: boolean) => {
    const question = await prisma.question.findUnique({
        where: {
            id: questionId
        }, select: {
            id: true,
            page: {
                select: {
                    id: true,
                    owner: {
                        select: {
                            id: true,
                            email_paused_until: true,
                            log_questions: true,
                            research_pseudonym: true,
                        }
                    },
                    name: true,
                }
            },
            hash: true,
            group: {
                select: {
                    name: true
                }
            },
            group_id: true,
            reminder_email_id: true,
            question_progress: {
                select: {
                    id: true,
                    waiting_for_remembered: true,
                    current_state: true,
                    reminder_token: true,
                    completed_at: true,
                    initial_state_id: true,
                    state_1_id: true,
                    state_2_id: true,
                    state_3_id: true,
                    state_4_id: true,
                    final_state_id: true,
                    active: true,
                    active_since: true,
                }
            },
        }
    })
    if (!question) {
        throw createError({
            message: "Question not found",
            statusCode: 404
        })
    }

    if (remembered) {
        let nextState = question.question_progress.current_state
        if (nextQuestionState(question.question_progress) && !isWeekly) {
            nextState = nextQuestionState(question.question_progress)
        }

        let activeSince = undefined
        let active = undefined

        if (!isWeekly) {
            activeSince = question.question_progress.active_since === null ? new Date() : question.question_progress.active_since
            active = question.question_progress.active_since != null
        }

        await prisma.questionProgress.update({
            where: {
                id: question.question_progress.id
            },
            data: {
                current_state: nextState,
                completed_at: isWeekly ? undefined : new Date(),
                reminder_token: null,
                waiting_for_remembered: false,
                active_since: activeSince,
                active: active,
            }
        })
    } else {
        let newState = question.question_progress.current_state
        if ((question.question_progress.waiting_for_remembered && !isWeekly) || question.question_progress.current_state === "LONG_TERM") {
            newState = previousQuestionState(question.question_progress)
        }
        await prisma.questionProgress.update({
            where: {
                id: question.question_progress.id
            },
            data: {
                current_state: newState,
                completed_at: isWeekly ? undefined : new Date(),
                reminder_token: null,
                waiting_for_remembered: true,
                active_since: question.question_progress.active_since === null ? new Date() : question.question_progress.active_since,
                active: question.question_progress.active_since != null
            }
        })
    }

    if (question.reminder_email_id != null) {
        await prisma.user.update({
            where: {
                id: question.page.owner.id
            },
            data: {
                oldest_reminder_sent: null
            }
        })

        const reminderEmail = await prisma.reminderEmail.findUnique({
            where: {
                id: question.reminder_email_id
            }, select: {
                questions: {
                    where: {
                        question_progress: {
                            reminder_token: {
                                not: null
                            }
                        }
                    },
                    select: {
                        id: true
                    }
                }
            }
        })

        if (reminderEmail != null && reminderEmail.questions.length === 0) {
            await prisma.reminderEmail.delete({
                where: {
                    id: question.reminder_email_id
                }
            })
        }
    }

    // Forschungsdaten nur mit Einwilligung, pseudonym: keine Konto-Id, keine Frage-Id (die führte über die Seite
    // zum Konto), nur Frage-Hash und Seitenname.
    // Einwilligung und Pseudonym unter der Sperre der Kontozeile erneut lesen (A31): Löschen und Widerruf
    // (research.ts) sperren dieselbe Zeile, eine laufende Bewertung kann sie also nicht mehr überholen. Der frühe
    // Wert oben dient nur als Abkürzung – ohne Einwilligung braucht es keine Sperre.
    const owner = question.page.owner
    if (owner.log_questions && owner.research_pseudonym) await prisma.$transaction(async (tx) => {
        const current = await lockAccountRow(tx, owner.id)
        if (!current?.log_questions || !current.research_pseudonym) return
        await tx.questionLog.create({
            data: {
                pseudonym: current.research_pseudonym,
                question_hash: question.hash,
                page_name: question.page.name,
                group_name: question.group.name === "no-group" ? null : question.group.name,
                remembered: remembered,
                question_state: question.question_progress.current_state,
                question_type: isWeekly ? "WEEKLY" : "REMINDER",
                consent_version: current.research_consent_version || RESEARCH_CONSENT_VERSION,
            }
        })
    })

    // Pause beenden, wenn eine Frage beantwortet wird. Erst beenden (bedingt, damit parallele Antworten nur eine
    // Mail auslösen), dann die Mail – und nur, wenn das Konto Mails will und einen gültigen Abmeldelink hat (A32).
    // Beides frisch gelesen: „Keine Mails mehr“ kann seit dem Laden oben gesetzt worden sein.
    if (question.page.owner.email_paused_until != null) {
        const ended = await prisma.user.updateMany({
            where: {id: question.page.owner.id, email_paused_until: {not: null}},
            data: {email_paused_until: null}
        })
        const recipient = ended.count === 1 ? await prisma.user.findUnique({
            where: {id: question.page.owner.id},
            select: {email: true, name: true, receive_emails: true, unsubscribe_emails_token: true}
        }) : null
        if (recipient?.receive_emails && recipient.unsubscribe_emails_token) {
            // Die Bewertung ist gespeichert; ein Versandfehler soll sie nicht als gescheitert melden
            await sendUnpauseEmail(recipient.email, recipient.name, recipient.unsubscribe_emails_token)
                .catch((e) => console.error("[editQuestion] Wiederaufnahme-Mail nicht verschickt:", mailErrorCode(e)))
        }
    }
}

const nextQuestionState = (progress: QuestionProgress): CurrentState => {
    let nextState: CurrentState | null = null
    if (progress.current_state === "INITIAL") {
        nextState = "STATE_1"
    } else if (progress.current_state === "STATE_1") {
        if (progress.state_2_id != null) {
            nextState = "STATE_2"
        }
    } else if (progress.current_state === "STATE_2") {
        if (progress.state_3_id != null) {
            nextState = "STATE_3"
        }
    } else if (progress.current_state === "STATE_3") {
        if (progress.state_4_id != null) {
            nextState = "STATE_4"
        }
    } else if (progress.current_state === "STATE_4") {
        nextState = "FINAL"
    } else if (progress.current_state === "FINAL") {
        nextState = "LONG_TERM"
    } else if (progress.current_state === "LONG_TERM") {
        nextState = "LONG_TERM"
    }
    if (nextState === null) {
        nextState = "FINAL"
    }
    return nextState
}

const previousQuestionState = (progress: QuestionProgress): CurrentState => {
    let nextState: CurrentState | null = null
    if (progress.current_state === "INITIAL") {
        nextState = "INITIAL"
    } else if (progress.current_state === "STATE_1") {
        nextState = "INITIAL"
    } else if (progress.current_state === "STATE_2") {
        nextState = "STATE_1"
    } else if (progress.current_state === "STATE_3") {
        nextState = "STATE_2"
    } else if (progress.current_state === "STATE_4") {
        nextState = "STATE_3"
    } else if (progress.current_state === "FINAL") {
        nextState = "STATE_4"
    } else if (progress.current_state === "LONG_TERM") {
        nextState = "FINAL"
    }
    if (nextState === null) {
        console.log("something is wrong here")
        nextState = "FINAL"
    }
    return nextState
}

export const questionActiveStateGenerator = (progress: {
    active: boolean,
    active_since: Date | null,
}): QuestionActiveState => {
    if (progress.active) {
        return QuestionActiveState.ACTIVE
    } else if (progress.active_since != null) {
        return QuestionActiveState.PENDING
    }
    return QuestionActiveState.NEGLECTED
}
