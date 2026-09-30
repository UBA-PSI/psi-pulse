import protectInternalRoute from "~/server/utils/protectInternalRoute";
import {updateQuestionArchived, updateQuestionState} from "~/server/utils/editQuestion";
import {SimpleQuestionUpdate} from "~/types/questions/questions";
import ownQuestion from "~/server/utils/ownQuestion";


export default defineEventHandler(async (event) => {
    const session = await protectInternalRoute(event);
    if (event.context.params != undefined) {
        // Nur eigene Fragen bewerten oder archivieren (vorher reichte irgendeine Anmeldung)
        const questionId = await ownQuestion(event.context.params.id, session.user.userId)
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

