import {Prisma} from '@prisma/client';


export const questionsSelector: Prisma.QuestionSelect = {
    id: true,
    hash: true,
    text: true,
    answer: true,
    group_id: true,
    archived: true,
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
            waiting_for_remembered: true,
            active: true,
            active_since: true,
        }
    }
};
