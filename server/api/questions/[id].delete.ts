import {usePrisma} from "~/server/utils/prisma";
import protectInternalRoute from "~/server/utils/protectInternalRoute";
import ownQuestion from "~/server/utils/ownQuestion";

const prisma = usePrisma();

// Nur angemeldet und nur eigene Fragen (vorher ohne jede Prüfung: wer eine Frage-ID kannte, etwa aus einem
// Link in einer Erinnerungsmail, konnte sie löschen).
export default defineEventHandler(async (event) => {
    const session = await protectInternalRoute(event);
    const id = await ownQuestion(event.context.params?.id, session.user.userId)
    await prisma.question.delete({
        where: {
            id: id
        }
    })
})
