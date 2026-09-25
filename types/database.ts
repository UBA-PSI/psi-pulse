import type {CurrentState} from "@prisma/client";

export interface ReducedQuestionProgress {
    current_state: CurrentState,
    initial_state: ReducedQuestionState,
    state_1: ReducedQuestionState,
    state_2: ReducedQuestionState | null,
    state_3: ReducedQuestionState | null,
    state_4: ReducedQuestionState | null,
    final_state: ReducedQuestionState,
}

export interface ReducedQuestionState {
    label: string,
}
