import {redeemOffer} from "~/server/utils/research";

// Entscheidung aus dem Forschungsangebot auf den Antwortseiten. Jedes Angebot gilt genau einmal und nur, solange
// das Konto noch nicht entschieden hat (A30); sonst 400.
export default defineEventHandler(async (event) => {
    const {offer, consent} = await readBody<{ offer: unknown, consent: unknown }>(event)
    if (typeof consent !== "boolean" || !(await redeemOffer(offer, consent))) {
        throw createError({message: "Invalid offer", statusCode: 400})
    }
    return {ok: true}
})
