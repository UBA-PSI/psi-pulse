import { randomBytes } from 'node:crypto';
import { createError, getCookie, getHeader, getRequestHost, setCookie, type H3Event } from 'h3';
import { usePrisma } from './prisma';
import type { SessionUser } from '~/types/session';

const ACTIVE_MS = 24 * 60 * 60 * 1000;
const IDLE_MS = 14 * ACTIVE_MS;
type Session = { sessionId: string; user: SessionUser; idlePeriodExpiresAt: Date };

// Keep the existing session table and cookies so deployment does not log users out.
function setSessionCookie(event: H3Event, session: Session | null) {
    setCookie(event, 'auth_session', session?.sessionId ?? '', {
        httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/',
        ...(session ? {expires: session.idlePeriodExpiresAt} : {maxAge: 0}),
    });
}
export const auth = {
    async createSession({userId}: {userId: string; attributes?: Record<string, never>}): Promise<Session> {
        const now = Date.now();
        const session = await usePrisma().session.create({data: {
            id: randomBytes(32).toString('hex'), user_id: userId,
            active_expires: BigInt(now + ACTIVE_MS), idle_expires: BigInt(now + ACTIVE_MS + IDLE_MS),
        }, include: {user: true}});
        return {sessionId: session.id, user: {userId, email: session.user.email, name: session.user.name},
            idlePeriodExpiresAt: new Date(Number(session.idle_expires))};
    },
    async invalidateSession(sessionId: string) {
        await usePrisma().session.deleteMany({where: {id: sessionId}});
    },
    handleRequest(event: H3Event) {
        return {
            setSession: (session: Session | null) => setSessionCookie(event, session),
            async validate(): Promise<Session | null> {
                // Cookie-authenticated mutations must come from the app itself, including logout/delete.
                if (!['GET', 'HEAD', 'OPTIONS'].includes(event.method)) {
                    let sameOrigin = false;
                    try { sameOrigin = new URL(getHeader(event, 'origin') ?? '').host === getRequestHost(event) } catch {}
                    if (!sameOrigin) throw createError({statusCode: 403, message: 'Invalid origin'});
                }
                const id = getCookie(event, 'auth_session');
                if (!id || id.length > 128) return null;
                const client = usePrisma();
                const stored = await client.session.findUnique({where: {id}, include: {user: true}});
                if (!stored) { setSessionCookie(event, null); return null }
                const now = BigInt(Date.now());
                if (stored.idle_expires <= now) {
                    await client.session.deleteMany({where: {id, idle_expires: {lte: now}}});
                    setSessionCookie(event, null);
                    return null;
                }
                if (stored.active_expires <= now) {
                    // Conditional update cannot resurrect a concurrently logged-out session.
                    const updated = await client.session.updateMany({where: {id, idle_expires: {gt: now}}, data: {
                        active_expires: now + BigInt(ACTIVE_MS), idle_expires: now + BigInt(ACTIVE_MS + IDLE_MS),
                    }});
                    if (!updated.count) return null;
                    stored.idle_expires = now + BigInt(ACTIVE_MS + IDLE_MS);
                }
                const session = {sessionId: id, user: {userId: stored.user_id, email: stored.user.email, name: stored.user.name},
                    idlePeriodExpiresAt: new Date(Number(stored.idle_expires))};
                setSessionCookie(event, session);
                return session;
            },
        };
    },
};
