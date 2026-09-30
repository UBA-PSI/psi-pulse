import {usePrisma} from "~/server/utils/prisma";
import {deleteResearchData} from "~/server/utils/research";
import {PrismaClient} from "@prisma/client";

export default defineEventHandler(async (event) => {
    const authRequest = auth.handleRequest(event);
    const session = await authRequest.validate();
    if (!session) {
        throw createError({
            message: "Unauthorized",
            statusCode: 401
        });
    }
    await auth.invalidateSession(session.sessionId);
    authRequest.setSession(null);

    const client = usePrisma();

    // Forschungsdaten hängen nicht mehr per Fremdschlüssel am Konto: vorher über das Pseudonym löschen.
    // Beides in einer Transaktion unter der Sperre der Kontozeile (A31): eine parallel laufende Bewertung wartet
    // und findet danach kein Konto mehr, legt also keinen Eintrag unter dem alten Pseudonym an.
    await client.$transaction(async (tx) => {
        await deleteResearchData(session.user.userId, tx);
        await tx.user.delete({
            where: {
                id: session.user.userId
            }
        });
    });

    await client.questionProgress.deleteMany({
        where: {
            question: null
        }
    });

    return sendRedirect(event, "/");
});
