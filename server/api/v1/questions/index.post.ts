import {PrismaClient} from "@prisma/client";
import protectExternalRoute from "~/server/utils/protectExternalRoute";
import {createHash} from "crypto";
import {ExternalQuestionPutBody} from "~/types/questions/external";

const prisma = new PrismaClient();

export default defineEventHandler(async (event): Promise<String> => {
    const userId = await protectExternalRoute(event)
    const body: ExternalQuestionPutBody = await readBody(event)

    const questionHash = createHash('sha1').update(body.question).digest('hex')
    if (questionHash != body.hash) {
        throw createError({
            message: "Hashes do not match",
            statusCode: 404
        })
    }

    const page = await prisma.page.upsert(
        {
            where: {
                name_owner_id: {
                    owner_id: userId,
                    name: body.pageName
                }
            },
            create: {
                url: body.pageUrl,
                owner_id: userId,
                name: body.pageName
            },
            update: {}
        }
    )

    if (body.groupName === undefined || body.groupName === null) {
        body.groupName = "no-group"
    }
    let group = await prisma.group.upsert(
        {
            where: {
                name_page_id: {
                    name: body.groupName,
                    page_id: page.id
                }
            },
            create: {
                name: body.groupName,
                page_id: page.id
            },
            update: {}
        }
    )

    const initialLabel = body.states ? body.states.initialStateLabel : "in-text";
    const initialOffset = body.states ? body.states.initialStateOffset : 0;
    const initialState = await getStateId(initialLabel, initialOffset)

    const firstLabel = body.states ? body.states.state1Label : "1 day";
    const firstOffset = body.states ? body.states.state1Offset : 1;
    const firstState = await getStateId(firstLabel, firstOffset)

    const secondLabel = body.states ? body.states.state2Label : "2 days";
    const secondOffset = body.states ? body.states.state2Offset : 2;
    const secondState = await getStateId(secondLabel, secondOffset)

    const thirdLabel = body.states ? body.states.state3Label : "4 days";
    const thirdOffset = body.states ? body.states.state3Offset : 4;
    const thirdState = await getStateId(thirdLabel, thirdOffset)

    const fourthLabel = body.states ? body.states.state4Label : "1 week";
    const fourthOffset = body.states ? body.states.state4Offset : 7;
    const fourthState = await getStateId(fourthLabel, fourthOffset)


    const finalLabel = body.states ? body.states.finalStateLabel : "2 weeks";
    const finalOffset = body.states ? body.states.finalStateOffset : 14;
    const finalState = await getStateId(finalLabel, finalOffset)

    if (initialState == null || firstState == null || finalState == null) {
        throw createError({
            message: "States not found",
            statusCode: 404
        })
    }

    const progress = await prisma.questionProgress.create({
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

    await prisma.question.create({
        data: {
            hash: questionHash,
            text: body.question,
            group_id: group.id,
            page_id: page.id,
            answer: body.answer,
            question_progress_id: progress.id,
        }
    })

    return "ok"
})


const getStateId = async (label: string | null, offset: number | null): Promise<string | null> => {
    if (label == null || offset == null) {
        return null
    } else {
        let initialState = await prisma.questionState.findUnique({
            where: {
                label_offset: {
                    offset: offset,
                    label: label,
                }
            }
        })
        if (!initialState) {
            initialState = await prisma.questionState.create({
                data: {
                    offset: offset,
                    label: label,
                }
            })
        }
        return initialState.id
    }
}
