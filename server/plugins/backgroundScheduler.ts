import {useScheduler} from "#scheduler"
import {PrismaClient} from "@prisma/client";

export default defineNitroPlugin(() => {
    startScheduler()
})

const client = new PrismaClient();

function startScheduler() {
    const scheduler = useScheduler();

    scheduler.run(async () => {
        try {
            const questions = await client.question.findMany({
                select: {
                    id: true,
                    question_progress: {
                        select: {
                            current_state: true,
                            completed_at: true,
                            initial_state: true,
                            state_1: true,
                            state_2: true,
                            state_3: true,
                            state_4: true,
                            final_state: true,
                        }
                    },
                }
            })

            for (const question of questions) {
                const currentDate = question.question_progress.completed_at
                switch (question.question_progress.current_state) {
                    case "INITIAL":
                        currentDate.setDate(currentDate.getDate() + question.question_progress.initial_state.offset * 2)
                        break
                    case "STATE_1":
                        currentDate.setDate(currentDate.getDate() + question.question_progress.state_1.offset * 2)
                        break
                    case "STATE_2":
                        if (question.question_progress.state_2 != null) {
                            currentDate.setDate(currentDate.getDate() + question.question_progress.state_2.offset * 2)
                        }
                        break
                    case "STATE_3":
                        if (question.question_progress.state_3 != null) {
                            currentDate.setDate(currentDate.getDate() + question.question_progress.state_3.offset * 2)
                        }
                        break
                    case "STATE_4":
                        if (question.question_progress.state_4 != null) {
                            currentDate.setDate(currentDate.getDate() + question.question_progress.state_4.offset * 2)
                        }
                        break
                    case "FINAL":
                        currentDate.setDate(currentDate.getDate() + question.question_progress.final_state.offset * 2)
                        break
                    case "LONG_TERM":
                        currentDate.setDate(currentDate.getDate() + question.question_progress.final_state.offset * 2)
                        break
                }
                if (currentDate < new Date()) {
                    await client.question.update({
                        where: {
                            id: question.id
                        },
                        data: {
                            question_progress: {
                                update: {
                                    active: false,
                                    active_since: null,
                                }
                            }
                        }
                    })

                }
            }

            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            await client.reminderEmail.deleteMany({
                where: {
                    sent_at: {
                        lt: thirtyDaysAgo
                    }
                }
            });
        } catch (e) {
            console.log(e)
            throw e
        }
    }).everyMinute()
}
