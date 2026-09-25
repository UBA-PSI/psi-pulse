import {lucia} from "lucia";
import {h3} from "lucia/middleware";
import {prisma} from "@lucia-auth/adapter-prisma";
import {PrismaClient} from "@prisma/client";

const client = new PrismaClient();

export const auth = lucia({
    env: "DEV", // "PROD" if deployed to HTTPS
    middleware: h3(),
    adapter: prisma(client),

    getUserAttributes: (data) => {
        return {
            email: data.email,
            name: data.name,
        };
    }
});

export type Auth = typeof auth;
