import {PrismaClient} from "@prisma/client";

const prisma = new PrismaClient();

export default defineEventHandler(async (event): Promise<number> => {
    if (!event.context.params) {
        throw createError({
            message: "No token provided",
            statusCode: 404
        })
    }

    const weeklyToken = event.context.params.token

    const weeklyEmail = await prisma.weeklyEmail.findUnique({
        where: {
            token: weeklyToken,
        }, select: {
            id: true,
            sent_at: true,
            user: {
                select: {
                    id: true,
                    weekly_streak: true,
                    oldest_weekly_sent: true,
                }
            }
        }
    })

    if (!weeklyEmail) {
        throw createError({
            message: "Weekly email not found",
            statusCode: 404
        })
    }

    await prisma.weeklyEmail.delete({
        where: {
            id: weeklyEmail.id
        }
    })

    const updatedUser = await prisma.user.update({
        where: {
            id: weeklyEmail.user.id
        },
        data: {
            weekly_streak: weeklyEmail.user.weekly_streak + 1,
            oldest_weekly_sent: null
        }, select: {
            weekly_streak: true
        }
    })

    return updatedUser.weekly_streak
})
