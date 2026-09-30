import {usePrisma} from "~/server/utils/prisma";
import {PrismaClient} from "@prisma/client";
import protectExternalRoute from "~/server/utils/protectExternalRoute";
import {createHash} from "crypto";
import {ExternalQuestionPutBody} from "~/types/questions/external";
import {updateQuestionState} from "~/server/utils/editQuestion";
import {questionCanBeAnswered} from "~/server/utils/questionCanBeAnswered";
import {safePageUrl} from "~/server/utils/pageUrl";
import {ACCOUNT_QUOTA, lockAccountRow} from "~/server/utils/accountLimits";

const prisma = usePrisma();

export default defineEventHandler(async (event): Promise<String> => {
    const userId = await protectExternalRoute(event)
    const body: ExternalQuestionPutBody = await readBody(event)
    // Typen und Längen wie in [id].put.ts (A23); vorher landeten beliebig große Texte in der DB
    if (!validQuestionBody(body)) {
        throw createError({message: "Invalid question", statusCode: 400})
    }

    // Identität der Frage: SHA-1 eines stabilen Schlüssels (Embed v2, Attribut key)
    // oder, wie bisher, SHA-1 des Fragetexts.
    const questionHash = typeof body.key === "string" && body.key.length > 0 && body.key.length <= 200
        ? createHash('sha1').update("key:" + body.key).digest('hex')
        : createHash('sha1').update(body.question).digest('hex')
    if (questionHash != body.hash) {
        throw createError({
            message: "Hashes do not match",
            statusCode: 404
        })
    }

    if (body.groupName === undefined || body.groupName === null) {
        body.groupName = "no-group"
    }
    const groupName = body.groupName

    // Gibt es die Frage auf dieser Seite schon (z. B. Nachsynchronisieren nach dem Login), zählt der Aufruf als
    // Antwort statt als Neuanlage. Dabei wird nichts angelegt, auch keine Seite oder Gruppe (A28).
    const knownPage = await prisma.page.findUnique({
        where: {name_owner_id: {owner_id: userId, name: body.pageName}},
        select: {id: true}
    })
    const existingId = knownPage ? await findQuestion(prisma, questionHash, knownPage.id) : null
    if (existingId) {
        await answerExisting(existingId, body.remembered === true)
        return "ok"
    }

    // Neuanlage unter der Sperre des Kontos: Kontingente zählen und anlegen in einer Transaktion (A28). Parallele
    // Anfragen desselben Kontos warten aufeinander und können die Grenzen so nicht gemeinsam überschreiten.
    const raced = await prisma.$transaction(async (tx) => {
        await lockAccountRow(tx, userId)

        const questions = await tx.question.count({where: {page: {owner_id: userId}}})
        if (questions >= ACCOUNT_QUOTA.questions) throw quotaExceeded()

        let page = await tx.page.findUnique({
            where: {name_owner_id: {owner_id: userId, name: body.pageName}},
            select: {id: true}
        })
        if (page) {
            // Inzwischen von einer parallelen Anfrage angelegt?
            const id = await findQuestion(tx, questionHash, page.id)
            if (id) return id
        } else {
            if (await tx.page.count({where: {owner_id: userId}}) >= ACCOUNT_QUOTA.pages) throw quotaExceeded()
            // nur http(s), sonst "" (A21)
            page = await tx.page.create({
                data: {url: safePageUrl(body.pageUrl), owner_id: userId, name: body.pageName},
                select: {id: true}
            })
        }

        let group = await tx.group.findUnique({
            where: {name_page_id: {name: groupName, page_id: page.id}},
            select: {id: true}
        })
        if (!group) {
            if (await tx.group.count({where: {page: {owner_id: userId}}}) >= ACCOUNT_QUOTA.groups) throw quotaExceeded()
            group = await tx.group.create({data: {name: groupName, page_id: page.id}, select: {id: true}})
        }

        // Zustände erst nach den Kontingenten: abgelehnte Anfragen legen auch keine QuestionState-Einträge an
        const s = body.states
        const initialState = await getStateId(tx, s ? s.initialStateLabel : "in-text", s ? s.initialStateOffset : 0)
        const firstState = await getStateId(tx, s ? s.state1Label : "1 day", s ? s.state1Offset : 1)
        const secondState = await getStateId(tx, s ? s.state2Label : "2 days", s ? s.state2Offset : 2)
        const thirdState = await getStateId(tx, s ? s.state3Label : "4 days", s ? s.state3Offset : 4)
        const fourthState = await getStateId(tx, s ? s.state4Label : "1 week", s ? s.state4Offset : 7)
        const finalState = await getStateId(tx, s ? s.finalStateLabel : "2 weeks", s ? s.finalStateOffset : 14)

        if (initialState == null || firstState == null || finalState == null) {
            throw createError({
                message: "States not found",
                statusCode: 404
            })
        }

        const progress = await tx.questionProgress.create({
            data: {
                initial_state_id: initialState,
                state_1_id: firstState,
                state_2_id: secondState,
                state_3_id: thirdState,
                state_4_id: fourthState,
                final_state_id: finalState,
                current_state: body.remembered ? "STATE_1" : "INITIAL",
            }
        })

        await tx.question.create({
            data: {
                hash: questionHash,
                text: body.question,
                group_id: group.id,
                page_id: page.id,
                answer: body.answer,
                question_progress_id: progress.id,
            }
        })
        return null
    }, {timeout: 15000})

    if (raced) await answerExisting(raced, body.remembered === true)

    return "ok"
})


const MAX_NAME = 200
const MAX_STATE_LABEL = 50
const MAX_OFFSET_DAYS = 3650

const isText = (v: unknown, min: number, max: number): v is string =>
    typeof v === "string" && v.length >= min && v.length <= max
const isOptionalText = (v: unknown, max: number) => v === undefined || v === null || isText(v, 1, max)

// Abstände der Zustände (Embed: state-…-Attribute) legen Einträge in QuestionState an: nur kurze Labels, ganze Tage
// Fehlt Label oder Abstand, gilt der Zustand wie bisher als nicht gesetzt (getStateId liefert dann null).
const validState = (label: unknown, offset: unknown, required: boolean) =>
    label === null || label === undefined || offset === null || offset === undefined
        ? !required
        : isText(label, 1, MAX_STATE_LABEL) && Number.isInteger(offset) && (offset as number) >= 0 && (offset as number) <= MAX_OFFSET_DAYS

const validQuestionBody = (body: ExternalQuestionPutBody | null | undefined): boolean => {
    if (!body || typeof body !== "object") return false
    if (!isText(body.question, 1, 5000) || !isText(body.answer, 0, 20000)) return false
    if (!isText(body.hash, 1, 64) || !isText(body.pageName, 1, MAX_NAME)) return false
    if (!isOptionalText(body.groupName, MAX_NAME)) return false
    if (body.remembered !== undefined && typeof body.remembered !== "boolean") return false
    const s = body.states
    if (s === null || s === undefined) return true
    if (typeof s !== "object") return false
    return validState(s.initialStateLabel, s.initialStateOffset, true)
        && validState(s.state1Label, s.state1Offset, true)
        && validState(s.state2Label, s.state2Offset, false)
        && validState(s.state3Label, s.state3Offset, false)
        && validState(s.state4Label, s.state4Offset, false)
        && validState(s.finalStateLabel, s.finalStateOffset, true)
}

const quotaExceeded = () => createError({message: "Quota exceeded", statusCode: 403})

type Db = Pick<PrismaClient, "question" | "questionState">

const findQuestion = async (db: Db, hash: string, pageId: string): Promise<string | null> =>
    (await db.question.findUnique({where: {hash_page_id: {hash, page_id: pageId}}, select: {id: true}}))?.id ?? null

// Nur wenn die Frage wieder dran ist; sonst würden Wiederholungsabstände übersprungen
// (z. B. beim Übertragen alter Browser-Antworten nach dem Login).
const answerExisting = async (questionId: string, remembered: boolean) => {
    const existing = await prisma.question.findUnique({
        where: {id: questionId},
        select: {
            id: true,
            question_progress: {
                select: {
                    current_state: true, completed_at: true, initial_state: true, state_1: true, state_2: true,
                    state_3: true, state_4: true, final_state: true,
                }
            }
        }
    })
    if (existing && questionCanBeAnswered(existing)) {
        await updateQuestionState(existing.id, remembered, false)
    }
}

const getStateId = async (db: Db, label: string | null | undefined, offset: number | null | undefined): Promise<string | null> => {
    if (label == null || offset == null) {
        return null
    }
    // upsert: Zustände sind global, eine parallele Anlage desselben Zustands soll nicht scheitern
    const state = await db.questionState.upsert({
        where: {label_offset: {offset, label}},
        create: {offset, label},
        update: {},
        select: {id: true}
    })
    return state.id
}
