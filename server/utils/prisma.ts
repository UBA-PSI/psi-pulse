import {PrismaPg} from "@prisma/adapter-pg";
import {PrismaClient} from "@prisma/client";

// Ein Client (und damit ein Verbindungspool) für den ganzen Server statt eines pro Datei.
let client: PrismaClient | null = null

export const usePrisma = (): PrismaClient => {
    if (!client) client = new PrismaClient({adapter: new PrismaPg({connectionString: process.env.DATABASE_URL, max: 5, connectionTimeoutMillis: 10000})})
    return client
}
