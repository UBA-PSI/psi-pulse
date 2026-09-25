import protectInternalRoute from "~/server/utils/protectInternalRoute";
import {updateQuestionArchived, updateQuestionState} from "~/server/utils/editQuestion";
import {SimpleQuestionUpdate} from "~/types/questions/questions";


export default defineEventHandler(async (event) => {
    await protectInternalRoute(event);
    if (event.context.params != undefined) {
        const questionId = event.context.params.id
        const body: SimpleQuestionUpdate = await readBody(event)

        if (body.remembered != null) {
            await updateQuestionState(questionId, body.remembered, false)
        } else if (body.archived != null) {
            await updateQuestionArchived(questionId, body.archived)
        } else {
            throw createError({
                message: "No valid body provided",
                statusCode: 404
            })
        }

        return "ok"
    }

    throw createError({
        message: "Missing params",
        statusCode: 404
    })
});

