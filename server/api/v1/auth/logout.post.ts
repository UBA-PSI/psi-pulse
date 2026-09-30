import {usePrisma} from "~/server/utils/prisma";
import {PrismaClient} from "@prisma/client";

const prisma = usePrisma();

// Beendet die Widget-Anmeldung: löscht den übergebenen API-Token.
export default defineEventHandler(async (event) => {
    const token = event.headers.get("X-API-KEY");
    if (token) {
        await prisma.thirdPartySession.deleteMany({where: {id: token}});
    }
    return {};
});
