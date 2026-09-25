import {generateRandomString, isWithinExpiration} from "lucia/utils";
import {PrismaClient} from "@prisma/client";

const client = new PrismaClient();

export const generateForeignSessionToken = async (userId: string) => {
    const token = generateRandomString(63);
    const exp = 1000 * 60 * 60 * 24 * 12; // 12 hours

    const newToken = await client.thirdPartySession.create({
        data: {
            id: token,
            expires: new Date().getTime() + exp,
            user_id: userId
        }
    });
    return newToken.id;
}

export const generateEmailVerificationToken = async (userId: string) => {
    const EXPIRES_IN = 1000 * 60 * 60 * 2; // 2 hours

    const storedUserTokens = await client.emailVerificationToken.findMany({
        where: {
            user_id: userId
        }
    });

    if (storedUserTokens.length > 0) {
        const reusableStoredToken = storedUserTokens.find((token) => {
            // check if expiration is within 1 hour
            // and reuse the token if true
            return isWithinExpiration(Number(token.expires) - EXPIRES_IN / 2);
        });
        if (reusableStoredToken) return reusableStoredToken.id;
    }
    const token = generateRandomString(63);
    await client.emailVerificationToken.create({
        data: {
            id: token,
            expires: new Date().getTime() + EXPIRES_IN,
            user_id: userId
        }
    });

    return token;
};



export const validateEmailVerificationToken = async (token: string) => {
    const storedToken = await client.emailVerificationToken.findUnique({
        where: {
            id: token
        }
    });

    if (!storedToken) throw createError({
        message: "Invalid token",
        statusCode: 400
    });
    await client.emailVerificationToken.deleteMany({
        where: {
            user_id: storedToken.user_id
        }
    });

    const tokenExpires = Number(storedToken.expires);
    if (!isWithinExpiration(tokenExpires)) {
        throw createError({
            message: "Token expired",
            statusCode: 400
        });
    }
    return storedToken.user_id;
};
